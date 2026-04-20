import Fuse from "fuse.js";
import { SET_ACTION_STATUS_MESSAGE } from "../actionStatus";
import { createIcon } from "../popup/icons";
import { toggleVideoInPlaylist } from "../youtube/api";
import { hasConfiguredYouTubeAuth } from "../youtube/auth";
import {
  adjustCachedYouTubePlaylistItemCount,
  ensureYouTubePlaylistCache,
  readLastUsedYouTubePlaylistId,
  readYouTubePlaylistCache,
  refreshYouTubePlaylistCache,
  writeLastUsedYouTubePlaylistId,
} from "../youtube/playlistCache";
import type { YouTubePlaylist } from "../youtube/types";
import type { YouTubeVideoContext } from "../youtube/videoContext";

interface ViewController {
  destroy(): void;
}

function createEmptyState(label: string) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = label;
  return emptyState;
}

function createAlert(kind: "warning" | "error", message: string) {
  const alert = document.createElement("div");
  alert.className = `status-alert status-alert--${kind}`;
  alert.textContent = message;
  return alert;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function promoteLastUsedPlaylist(
  playlists: YouTubePlaylist[],
  lastUsedPlaylistId: string | null,
): YouTubePlaylist[] {
  if (!lastUsedPlaylistId) {
    return playlists;
  }

  const promotedPlaylistIndex = playlists.findIndex(
    (playlist) => playlist.id === lastUsedPlaylistId,
  );

  if (promotedPlaylistIndex <= 0) {
    return playlists;
  }

  const promotedPlaylist = playlists[promotedPlaylistIndex];
  return [
    promotedPlaylist,
    ...playlists.slice(0, promotedPlaylistIndex),
    ...playlists.slice(promotedPlaylistIndex + 1),
  ];
}

function createPlaylistSearch(playlists: YouTubePlaylist[]) {
  return new Fuse(playlists, {
    keys: ["title", "description"],
    threshold: 0.3,
  });
}

export function mountYouTubePlaylistPicker(
  container: HTMLElement,
  video: YouTubeVideoContext,
): ViewController {
  let destroyed = false;
  let playlists: YouTubePlaylist[] = [];
  let filtered: YouTubePlaylist[] = [];
  let searchTerm = "";
  let activeIndex = 0;
  let isLoading = true;
  let isSubmitting = false;
  let errorMessage: string | null = null;
  let lastUsedPlaylistId: string | null = null;
  let selectedItem: HTMLLIElement | null = null;
  let selectedButton: HTMLButtonElement | null = null;
  let fuse: Fuse<YouTubePlaylist> | null = null;
  const hasYouTubeAuthConfig = hasConfiguredYouTubeAuth();

  const root = document.createElement("section");
  root.className = "popup-view youtube-picker";

  const input = document.createElement("input");
  input.className = "search-input search-input--youtube";
  input.type = "text";
  input.placeholder = "Search playlists...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Search playlists");

  const alerts = document.createElement("div");
  alerts.className = "status-alerts";

  const scroller = document.createElement("div");
  scroller.className = "results-scroller";

  const list = document.createElement("ul");
  list.className = "result-list";

  const highlight = document.createElement("div");
  highlight.className = "selection-highlight";
  highlight.hidden = true;

  list.append(highlight);
  scroller.append(list);
  root.append(input, alerts, scroller);
  container.replaceChildren(root);

  const focusInput = () => {
    if (destroyed || isLoading || isSubmitting) {
      return;
    }

    requestAnimationFrame(() => {
      input.focus();
    });
  };

  const updateHighlight = () => {
    if (!selectedItem || !selectedButton) {
      highlight.hidden = true;
      return;
    }

    const gutter = 3;
    highlight.hidden = false;
    highlight.style.top = `${selectedItem.offsetTop}px`;
    highlight.style.height = `${selectedButton.offsetHeight}px`;
    highlight.style.width = `${Math.max(selectedButton.offsetWidth - gutter * 2, 0)}px`;
    highlight.style.left = `${gutter}px`;
    selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const syncFiltered = () => {
    if (!searchTerm) {
      filtered = promoteLastUsedPlaylist(playlists, lastUsedPlaylistId);
    } else {
      if (!fuse) {
        fuse = createPlaylistSearch(playlists);
      }

      filtered = fuse.search(searchTerm).map((result) => result.item);
    }

    if (filtered.length === 0) {
      activeIndex = 0;
      return;
    }

    const maxDisplayedIndex = Math.min(filtered.length - 1, 19);
    activeIndex = Math.min(activeIndex, maxDisplayedIndex);
  };

  const render = () => {
    input.value = searchTerm;
    input.disabled = isLoading || isSubmitting;
    alerts.replaceChildren();

    if (!hasYouTubeAuthConfig) {
      alerts.append(
        createAlert(
          "warning",
          "Add VITE_YOUTUBE_CLIENT_ID to .env before connecting YouTube.",
        ),
      );
    }

    if (errorMessage) {
      alerts.append(createAlert("error", errorMessage));
    }

    if (playlists.length === 0 && !isLoading) {
      const emptyBox = document.createElement("div");
      emptyBox.className = "empty-action-box";

      const copy = document.createElement("p");
      copy.className = "empty-action-copy";
      copy.textContent = "Connect YouTube to load your playlists into the quick picker.";

      const connectButton = document.createElement("button");
      connectButton.type = "button";
      connectButton.className = "primary-button primary-button--youtube";
      connectButton.textContent = "Connect YouTube";
      connectButton.disabled = !hasYouTubeAuthConfig || isSubmitting || isLoading;
      connectButton.addEventListener("click", () => {
        void handleConnect();
      });

      emptyBox.append(copy, connectButton);
      scroller.replaceChildren(emptyBox);
      highlight.hidden = true;
      return;
    }

    scroller.replaceChildren(list);
    list.replaceChildren(highlight);
    selectedItem = null;
    selectedButton = null;

    if (isLoading && playlists.length === 0) {
      list.append(createEmptyState("Loading playlists…"));
      updateHighlight();
      return;
    }

    if (filtered.length === 0) {
      list.append(createEmptyState("No playlists match your search."));
      updateHighlight();
      return;
    }

    filtered.slice(0, 20).forEach((playlist, index) => {
      const isSelected = index === activeIndex;

      const listItem = document.createElement("li");
      listItem.className = "result-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = `result-button${isSelected ? " is-selected" : ""}`;
      button.disabled = isSubmitting;
      button.addEventListener("click", () => {
        void handleTogglePlaylist(playlist);
      });

      const icon = document.createElement("span");
      icon.className = "row-icon";
      icon.append(createIcon("playlist-add", 16));

      const copy = document.createElement("span");
      copy.className = "row-text";

      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = playlist.title;

      const subtitle = document.createElement("span");
      subtitle.className = "row-subtitle";
      subtitle.textContent = `${playlist.itemCount} video${playlist.itemCount === 1 ? "" : "s"}`;

      copy.append(title, subtitle);
      button.append(icon, copy);
      listItem.append(button);
      list.append(listItem);

      if (isSelected) {
        selectedItem = listItem;
        selectedButton = button;
      }
    });

    requestAnimationFrame(() => {
      if (!destroyed) {
        updateHighlight();
      }
    });
  };

  const applyPlaylistSelection = async (nextPlaylists: YouTubePlaylist[]) => {
    playlists = nextPlaylists;
    fuse = null;
    lastUsedPlaylistId = await readLastUsedYouTubePlaylistId();

    if (destroyed) {
      return;
    }

    activeIndex = 0;
    syncFiltered();
  };

  const loadPlaylists = async (options?: {
    interactive?: boolean;
    forceRefresh?: boolean;
  }) => {
    const interactive = options?.interactive ?? false;
    const forceRefresh = options?.forceRefresh ?? false;

    errorMessage = null;
    isLoading = true;
    render();

    const cachedPlaylists = forceRefresh
      ? null
      : await readYouTubePlaylistCache().then((cache) => cache?.playlists ?? null);

    if (destroyed) {
      return;
    }

    if (cachedPlaylists?.length) {
      await applyPlaylistSelection(cachedPlaylists);

      if (destroyed) {
        return;
      }

      isLoading = false;
      render();
      focusInput();
    }

    try {
      const nextCache = forceRefresh
        ? await refreshYouTubePlaylistCache({ interactive })
        : await ensureYouTubePlaylistCache({ interactive });

      if (destroyed) {
        return;
      }

      await applyPlaylistSelection(nextCache.playlists);
    } catch (error) {
      if (!cachedPlaylists?.length) {
        errorMessage = getErrorMessage(error);
      }
    } finally {
      if (!destroyed) {
        isLoading = false;
        render();
        focusInput();
      }
    }
  };

  const sendStatusBadge = async (status: "saved" | "removed" | "warning") => {
    if (video.tabId === undefined) {
      return;
    }

    await chrome.runtime.sendMessage({
      type: SET_ACTION_STATUS_MESSAGE,
      status,
      tabId: video.tabId,
    });
  };

  const handleTogglePlaylist = async (playlist: YouTubePlaylist) => {
    isSubmitting = true;
    errorMessage = null;
    render();

    try {
      const result = await toggleVideoInPlaylist(playlist, video, {
        interactive: true,
      });
      await writeLastUsedYouTubePlaylistId(playlist.id);
      lastUsedPlaylistId = playlist.id;

      const itemCountDelta = result.action === "removed" ? -1 : 1;
      await adjustCachedYouTubePlaylistItemCount(playlist.id, itemCountDelta);
      await sendStatusBadge(result.action === "removed" ? "removed" : "saved");
      window.close();
    } catch (error) {
      errorMessage = getErrorMessage(error);
      await sendStatusBadge("warning");
    } finally {
      if (!destroyed) {
        isSubmitting = false;
        render();
        focusInput();
      }
    }
  };

  const handleSearch = (term: string) => {
    searchTerm = term;
    activeIndex = 0;
    syncFiltered();
    render();
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      if (filtered.length > 0 && activeIndex < filtered.length) {
        void handleTogglePlaylist(filtered[activeIndex]);
      }
      return;
    }

    if (
      (event.ctrlKey && event.key.toLowerCase() === "n") ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();

      if (filtered.length > 0) {
        const maxDisplayedIndex = Math.min(filtered.length - 1, 19);
        activeIndex = Math.min(activeIndex + 1, maxDisplayedIndex);
        render();
      }
      return;
    }

    if (
      (event.ctrlKey && event.key.toLowerCase() === "p") ||
      event.key === "ArrowUp"
    ) {
      event.preventDefault();

      if (filtered.length > 0) {
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
      }
    }
  };

  const handleConnect = async () => {
    await loadPlaylists({ interactive: true, forceRefresh: true });
  };

  input.addEventListener("input", () => {
    handleSearch(input.value);
  });
  input.addEventListener("keydown", handleInputKeyDown);

  render();
  void loadPlaylists();

  return {
    destroy() {
      destroyed = true;
      input.removeEventListener("keydown", handleInputKeyDown);
      root.remove();
    },
  };
}