import { createBookmarkFilter, readBookmarkData, subscribeToBookmarks, type BookmarkItem } from "../bookmarks";
import { readSettings, subscribeToSettings } from "../settings";
import { createIcon } from "../popup/icons";
import { createPicker, type ViewController } from "./Picker";

async function copyToClipboard(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    try {
      if (!document.execCommand("copy")) throw new Error("Could not copy to the clipboard.");
    } finally { textArea.remove(); }
  }
}

export function mountBookmarkOpen(container: HTMLElement): ViewController {
  const menu = document.createElement("div");
  menu.className = "popup-menu";
  menu.hidden = true;
  let menuAnchor: HTMLElement | null = null;
  const closeMenu = () => { menu.hidden = true; menuAnchor = null; };
  const positionMenu = () => {
    if (!menuAnchor?.isConnected) { closeMenu(); return; }
    const rect = menuAnchor.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    menu.style.top = `${rect.bottom + height + 6 > window.innerHeight - 8
      ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`;
  };
  const picker = createPicker<BookmarkItem>(container, {
    placeholder: "Search bookmarks...", emptyLabel: "No bookmarks found.",
    itemLabel: "bookmarks", selectLabel: "Open", newTabHint: true,
    filter: createBookmarkFilter(false),
    describe: bookmark => ({ title: bookmark.title, subtitle: bookmark.domain, icon: "bookmark" }),
    async onSelect(bookmark, event) {
      if (event.ctrlKey && event.shiftKey) {
        await chrome.tabs.create({ url: bookmark.url });
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id === undefined) throw new Error("No active tab is available.");
        if (event.ctrlKey) {
          const created = await chrome.tabs.create({ url: bookmark.url, index: tab.index + 1 });
          if (tab.groupId !== undefined && tab.groupId !== -1 && created.id !== undefined) {
            await chrome.tabs.group({ tabIds: [created.id], groupId: tab.groupId })
              .catch(error => console.warn("Could not add tab to group", error));
          }
        } else {
          await chrome.tabs.update(tab.id, { url: bookmark.url });
        }
      }
      window.close();
    },
    onEscape() {
      if (menu.hidden) return false;
      closeMenu();
      return true;
    },
    secondaryAction: {
      label: "More actions", icon: "more-vertical",
      run(bookmark, anchor) {
        menu.replaceChildren();
        const actions = [
          { label: "Open manager to folder", icon: "folder-open" as const, run: async () => {
            if (!bookmark.parentId) throw new Error("This bookmark has no parent folder.");
            await chrome.tabs.create({ url: `chrome://bookmarks/?id=${bookmark.parentId}` });
            window.close();
          } },
          { label: "Copy URL", icon: "copy" as const, run: () => copyToClipboard(bookmark.url) },
          { label: "Copy domain", icon: "language" as const, run: () => {
            let domain = bookmark.url;
            try { domain = new URL(bookmark.url).hostname; } catch { /* Keep the original URL. */ }
            return copyToClipboard(domain);
          } },
        ];
        actions.forEach(action => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "menu-item";
          button.append(createIcon(action.icon, 16), document.createTextNode(action.label));
          button.addEventListener("click", () => { closeMenu(); void picker.run(action.run); });
          menu.append(button);
        });
        menuAnchor = anchor;
        menu.hidden = false;
        positionMenu();
      },
    },
  });
  picker.root.append(menu);
  let request = 0;
  const refresh = async (loadPreferences = false) => {
    const currentRequest = ++request;
    try {
      const [data, settings] = await Promise.all([
        readBookmarkData(), loadPreferences ? readSettings() : Promise.resolve(null),
      ]);
      if (!picker.destroyed && settings && settingsRevision === 0) applySettings(settings.searchUrlsAndDomains);
      if (!picker.destroyed && currentRequest === request) {
        closeMenu();
        picker.setItems(data.bookmarks);
        picker.setLoading(false);
      }
    } catch (error) {
      if (!picker.destroyed && currentRequest === request) {
        picker.setLoading(false);
        picker.setError(error);
      }
    }
  };
  let settingsRevision = 0;
  const applySettings = (include: boolean) => {
    closeMenu();
    picker.setFilter(createBookmarkFilter(include));
    picker.input.placeholder = include ? "Search titles, URLs, or domains..." : "Search bookmarks...";
  };
  const unsubscribeSettings = subscribeToSettings(settings => {
    settingsRevision++;
    applySettings(settings.searchUrlsAndDomains);
  });
  const unsubscribeBookmarks = subscribeToBookmarks(() => { void refresh(); });
  const handlePointer = (event: PointerEvent) => {
    if (event.target instanceof Node && !menu.contains(event.target) && !menuAnchor?.contains(event.target)) closeMenu();
  };
  document.addEventListener("pointerdown", handlePointer, true);
  window.addEventListener("resize", positionMenu);
  picker.scroller.addEventListener("scroll", closeMenu);
  picker.input.addEventListener("input", closeMenu);
  picker.input.addEventListener("keydown", closeMenuOnNavigation);
  function closeMenuOnNavigation(event: KeyboardEvent) {
    if (event.key.startsWith("Arrow") || event.key === "Enter" ||
        (event.ctrlKey && ["n", "p"].includes(event.key.toLowerCase()))) closeMenu();
  }
  void refresh(true);
  return {
    destroy() {
      unsubscribeSettings(); unsubscribeBookmarks();
      document.removeEventListener("pointerdown", handlePointer, true);
      window.removeEventListener("resize", positionMenu);
      picker.destroy();
    },
  };
}
