import { SET_ACTION_STATUS_MESSAGE } from "../actionStatus";
import { getPlaylistMembership, setVideoInPlaylist } from "../youtube/api";
import { hasConfiguredYouTubeAuth } from "../youtube/auth";
import { adjustCachedYouTubePlaylistItemCount, ensureYouTubePlaylistCache,
  readLastUsedYouTubePlaylistId, readYouTubePlaylistCache,
  refreshYouTubePlaylistCache, writeLastUsedYouTubePlaylistId } from "../youtube/playlistCache";
import type { YouTubePlaylist, YouTubePlaylistMembership } from "../youtube/types";
import type { YouTubeVideoContext } from "../youtube/videoContext";
import { createFuzzyFilter } from "../search";
import { createPicker, type ViewController } from "./Picker";

type MembershipState = { membership: YouTubePlaylistMembership | null } | { error: string };

export function mountYouTubePlaylistPicker(container: HTMLElement, video: YouTubeVideoContext): ViewController {
  const states = new Map<string, MembershipState>();
  const pending = new Set<string>();
  const controller = new AbortController();
  let queue: YouTubePlaylist[] = [];
  let workers = 0;
  let generation = 0;
  let lastUsed: string | null = null;
  const configured = hasConfiguredYouTubeAuth();
  const fuzzyFilter = createFuzzyFilter<YouTubePlaylist>({ keys: ["title", "description"] });
  const picker = createPicker<YouTubePlaylist>(container, {
    placeholder: "Search playlists...", emptyLabel: "No playlists match your search.",
    itemLabel: "playlists", selectLabel: "Select",
    filter(items, query) {
      if (query.trim()) return fuzzyFilter(items, query);
      return [...items].sort((a, b) => Number(b.id === lastUsed) - Number(a.id === lastUsed));
    },
    describe(playlist) {
      const state = states.get(playlist.id);
      const count = `${playlist.itemCount} video${playlist.itemCount === 1 ? "" : "s"}`;
      if (!state) return { title: playlist.title, subtitle: `${count} · Checking membership…`,
        icon: "playlist-add", actionLabel: "Checking…", disabled: true };
      if ("error" in state) return { title: playlist.title, subtitle: "Could not check membership. Retry to continue.",
        icon: "playlist-add", actionLabel: "Retry" };
      return { title: playlist.title, subtitle: state.membership ? `${count} · Already added` : count,
        icon: state.membership ? "check" : "playlist-add", actionLabel: state.membership ? "Remove" : "Add" };
    },
    onVisible(items) {
      for (const playlist of items) {
        if (!states.has(playlist.id) && !pending.has(playlist.id)) {
          pending.add(playlist.id);
          queue.push(playlist);
        }
      }
      startChecks();
    },
    async onSelect(playlist) {
      const state = states.get(playlist.id);
      if (!state || "error" in state) {
        // Retrying a failed check only reads state; it never mutates a playlist.
        states.delete(playlist.id);
        picker.refresh();
        return;
      }
      const action = state.membership ? "remove" : "add";
      let result;
      try {
        result = await setVideoInPlaylist(action, playlist, video, {
          interactive: false, signal: controller.signal,
        });
      } catch (error) {
        states.delete(playlist.id);
        void sendBadge("warning");
        throw error;
      }
      // API success remains success if a preference, count, or badge update fails.
      const delta = result.action === "added" ? 1 : result.action === "removed" ? -1 : 0;
      await Promise.allSettled([
        writeLastUsedYouTubePlaylistId(playlist.id),
        delta ? adjustCachedYouTubePlaylistItemCount(playlist.id, delta) : Promise.resolve(),
        sendBadge(action === "add" ? "saved" : "removed"),
      ]);
      window.close();
    },
  });
  picker.root.classList.add("youtube-picker");
  picker.input.classList.add("search-input--youtube");
  const controls = document.createElement("div");
  controls.className = "playlist-controls";
  const connect = document.createElement("button");
  connect.type = "button";
  connect.className = "text-button";
  connect.textContent = "Connect YouTube";
  connect.disabled = !configured;
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "text-button";
  refresh.textContent = "Refresh";
  refresh.title = "Refresh playlists";
  refresh.hidden = true;
  controls.append(connect, refresh);
  picker.root.insertBefore(controls, picker.scroller);

  async function sendBadge(status: "saved" | "removed" | "warning") {
    if (video.tabId === undefined) return;
    await chrome.runtime.sendMessage({ type: SET_ACTION_STATUS_MESSAGE, status, tabId: video.tabId })
      .catch(error => console.warn("Could not update status badge", error));
  }
  function startChecks() {
    if (picker?.destroyed || controller.signal.aborted) return;
    while (workers < 4 && queue.length) {
      workers++;
      void checkQueue();
    }
  }
  async function checkQueue() {
    try {
      while (queue.length && !picker.destroyed) {
        const playlist = queue.shift()!;
        const requestGeneration = generation;
        let state: MembershipState;
        try {
          state = { membership: await getPlaylistMembership(playlist.id, video.videoId, {
            interactive: false, signal: controller.signal,
          }) };
        } catch (error) {
          state = { error: error instanceof Error ? error.message : String(error) };
        }
        if (picker.destroyed) return;
        if (requestGeneration === generation) {
          states.set(playlist.id, state);
          pending.delete(playlist.id);
          picker.refresh();
        }
      }
    } finally { workers--; startChecks(); }
  }
  async function load(interactive = false, forceRefresh = false) {
    connect.disabled = true;
    refresh.disabled = true;
    picker.setError("");
    picker.setLoading(true);
    try {
      lastUsed = await readLastUsedYouTubePlaylistId();
      if (picker.destroyed) return;
      if (!forceRefresh) {
        const cached = await readYouTubePlaylistCache();
        if (picker.destroyed) return;
        if (cached?.playlists.length) {
          picker.setItems(cached.playlists);
          picker.setLoading(false);
        }
      }
      const cache = forceRefresh
        ? await refreshYouTubePlaylistCache({ interactive, signal: controller.signal })
        : await ensureYouTubePlaylistCache({ interactive, signal: controller.signal });
      if (picker.destroyed) return;
      picker.setItems(cache.playlists);
      refresh.hidden = false;
      connect.textContent = "Reconnect";
      connect.title = "Reconnect YouTube";
      if (!cache.playlists.length) picker.setError("Your account has no playlists. Create one in YouTube, then refresh.");
    } catch (error) {
      if (!picker.destroyed) picker.setError(error);
    } finally {
      if (!picker.destroyed) {
        picker.setLoading(false);
        connect.disabled = !configured;
        refresh.disabled = false;
      }
    }
  }
  connect.addEventListener("click", () => {
    if (picker.busy) return;
    generation++; states.clear(); pending.clear(); queue = [];
    void load(true, true);
  });
  refresh.addEventListener("click", () => {
    if (picker.busy) return;
    generation++; states.clear(); pending.clear(); queue = [];
    void load(false, true);
  });
  if (configured) void load();
  else {
    picker.setLoading(false);
    picker.setError("YouTube is not available in this build. You can still save this page as a bookmark with Ctrl+D.");
  }
  return { destroy() { generation++; controller.abort(); queue = []; picker.destroy(); } };
}
