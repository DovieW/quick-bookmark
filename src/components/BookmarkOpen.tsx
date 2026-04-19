import Fuse from "fuse.js";
import {
  getFreshBookmarkCache,
  subscribeToBookmarkCache,
  type BookmarkItem,
} from "../bookmarkCache";
import { createIcon } from "../popup/icons";

interface ViewController {
  destroy(): void;
}

function createEmptyState(label: string) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = label;
  return emptyState;
}

function getDomainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function extractHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch {
      console.warn("Clipboard copy failed");
    }
  }
}

export function mountBookmarkOpen(container: HTMLElement): ViewController {
  let destroyed = false;
  let bookmarks: BookmarkItem[] = [];
  let filtered: BookmarkItem[] = [];
  let searchTerm = "";
  let activeIndex = 0;
  let fuse: Fuse<BookmarkItem> | null = null;
  let selectedItem: HTMLLIElement | null = null;
  let selectedButton: HTMLButtonElement | null = null;
  let menuBookmark: BookmarkItem | null = null;
  let menuAnchor: HTMLElement | null = null;

  const root = document.createElement("section");
  root.className = "popup-view";

  const input = document.createElement("input");
  input.className = "search-input";
  input.type = "text";
  input.placeholder = "Search bookmarks...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Search bookmarks");

  const scroller = document.createElement("div");
  scroller.className = "results-scroller";

  const list = document.createElement("ul");
  list.className = "result-list";

  const highlight = document.createElement("div");
  highlight.className = "selection-highlight";
  highlight.hidden = true;

  const menu = document.createElement("div");
  menu.className = "popup-menu";
  menu.hidden = true;

  list.append(highlight);
  scroller.append(list);
  root.append(input, scroller, menu);
  container.replaceChildren(root);

  const positionMenu = () => {
    if (!menuAnchor || menu.hidden) {
      return;
    }

    const anchorRect = menuAnchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 180;
    const menuHeight = menu.offsetHeight || 0;
    const left = Math.max(
      8,
      Math.min(anchorRect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const preferredTop = anchorRect.bottom + 6;
    const top =
      preferredTop + menuHeight > window.innerHeight - 8
        ? Math.max(8, anchorRect.top - menuHeight - 6)
        : preferredTop;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const closeMenu = () => {
    menu.hidden = true;
    menuBookmark = null;
    menuAnchor = null;
  };

  const openMenu = (bookmark: BookmarkItem, anchor: HTMLElement) => {
    menuBookmark = bookmark;
    menuAnchor = anchor;
    menu.hidden = false;
    positionMenu();
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

  const handleOpenBookmark = async (
    bookmark: BookmarkItem,
    forceNewTab = false,
  ) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab?.id) {
      return;
    }

    if (forceNewTab) {
      const newTab = await chrome.tabs.create({
        url: bookmark.url,
        index: currentTab.index + 1,
      });

      if (currentTab.groupId && currentTab.groupId !== -1 && newTab.id) {
        try {
          await chrome.tabs.group({
            tabIds: [newTab.id],
            groupId: currentTab.groupId,
          });
        } catch (error) {
          console.warn("Failed to add tab to group:", error);
        }
      }
    } else {
      await chrome.tabs.update(currentTab.id, { url: bookmark.url });
    }

    window.close();
  };

  const handleOpenBookmarkAtEnd = async (bookmark: BookmarkItem) => {
    await chrome.tabs.create({ url: bookmark.url });
    window.close();
  };

  const handleOpenBookmarkManagerToFolder = async (bookmark: BookmarkItem) => {
    if (!bookmark.parentId) {
      return;
    }

    await chrome.tabs.create({
      url: `chrome://bookmarks/?id=${bookmark.parentId}`,
    });
    window.close();
  };

  const renderMenu = () => {
    menu.replaceChildren();

    if (!menuBookmark) {
      return;
    }

    const activeBookmark = menuBookmark;

    const actions = [
      {
        label: "Open manager to folder",
        icon: "folder-open" as const,
        run: () => handleOpenBookmarkManagerToFolder(activeBookmark),
      },
      {
        label: "Copy URL",
        icon: "copy" as const,
        run: () => copyToClipboard(activeBookmark.url),
      },
      {
        label: "Copy domain",
        icon: "language" as const,
        run: () => copyToClipboard(extractHostname(activeBookmark.url)),
      },
    ];

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-item";

      const icon = document.createElement("span");
      icon.className = "menu-item-icon";
      icon.append(createIcon(action.icon, 16));

      const label = document.createElement("span");
      label.textContent = action.label;

      button.append(icon, label);
      button.addEventListener("click", () => {
        void action.run();
        closeMenu();
      });
      menu.append(button);
    });
  };

  const render = () => {
    input.value = searchTerm;
    selectedItem = null;
    selectedButton = null;
    list.replaceChildren(highlight);

    const displayed = filtered.slice(0, 20);

    if (displayed.length === 0) {
      list.append(createEmptyState("No bookmarks found."));
      updateHighlight();
      return;
    }

    displayed.forEach((bookmark, index) => {
      const isSelected = index === activeIndex;

      const listItem = document.createElement("li");
      listItem.className = "result-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = `result-button${isSelected ? " is-selected" : ""}`;
      button.addEventListener("click", (event) => {
        void handleOpenBookmark(bookmark, event.ctrlKey);
      });

      const icon = document.createElement("span");
      icon.className = "row-icon";
      icon.append(createIcon("bookmark", 16));

      const copy = document.createElement("span");
      copy.className = "row-text";

      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = bookmark.title;

      const subtitle = document.createElement("span");
      subtitle.className = "row-subtitle";
      subtitle.textContent = getDomainFromUrl(bookmark.url);

      copy.append(title, subtitle);

      const actionSlot = document.createElement("span");
      actionSlot.className = "row-action-slot";

      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = "row-action";
      actionButton.title = "More actions";
      actionButton.setAttribute("aria-label", "More actions");
      actionButton.append(createIcon("more-vertical", 18));
      actionButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderMenu();
        openMenu(bookmark, actionButton);
      });

      actionSlot.append(actionButton);
      button.append(icon, copy, actionSlot);
      listItem.append(button);
      list.append(listItem);

      if (isSelected) {
        selectedItem = listItem;
        selectedButton = button;
      }
    });

    requestAnimationFrame(updateHighlight);
  };

  const refreshFiltered = (resetActiveIndex: boolean) => {
    if (!searchTerm) {
      filtered = bookmarks;
    } else {
      if (!fuse) {
        fuse = new Fuse(bookmarks, {
          keys: ["title"],
          threshold: 0.3,
        });
      }

      filtered = fuse.search(searchTerm).map((result) => result.item);
    }

    if (resetActiveIndex) {
      activeIndex = 0;
    } else if (filtered.length === 0) {
      activeIndex = 0;
    } else {
      const maxDisplayedIndex = Math.min(filtered.length - 1, 19);
      activeIndex = Math.min(activeIndex, maxDisplayedIndex);
    }

    render();
  };

  const applyBookmarks = (nextBookmarks: BookmarkItem[]) => {
    bookmarks = nextBookmarks;
    fuse = null;
    refreshFiltered(false);
  };

  const handleSearch = (term: string) => {
    searchTerm = term;
    refreshFiltered(true);
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "Enter") {
      const activeBookmark = filtered[activeIndex];

      if (activeBookmark) {
        event.preventDefault();

        if (event.ctrlKey && event.shiftKey) {
          void handleOpenBookmarkAtEnd(activeBookmark);
        } else {
          void handleOpenBookmark(activeBookmark, event.ctrlKey);
        }
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

  const handleDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (
      !menu.hidden &&
      !menu.contains(target) &&
      !menuAnchor?.contains(target)
    ) {
      closeMenu();
    }
  };

  const handleWindowResize = () => {
    positionMenu();
  };

  input.addEventListener("input", () => {
    handleSearch(input.value);
  });
  input.addEventListener("keydown", handleInputKeyDown);
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  window.addEventListener("resize", handleWindowResize);
  input.focus();

  const unsubscribe = subscribeToBookmarkCache((cache) => {
    if (!destroyed) {
      applyBookmarks(cache.bookmarks);
    }
  });

  void getFreshBookmarkCache().then((cache) => {
    if (!destroyed) {
      applyBookmarks(cache.bookmarks);
    }
  });

  return {
    destroy() {
      destroyed = true;
      unsubscribe();
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
      window.removeEventListener("resize", handleWindowResize);
      input.removeEventListener("keydown", handleInputKeyDown);
      root.remove();
    },
  };
}
