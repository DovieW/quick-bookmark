import Fuse from "fuse.js";
import {
  getFreshBookmarkCache,
  subscribeToBookmarkCache,
  type BookmarkFolder,
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

export function mountFolderSearch(container: HTMLElement): ViewController {
  let destroyed = false;
  let folders: BookmarkFolder[] = [];
  let filtered: BookmarkFolder[] = [];
  let searchTerm = "";
  let activeIndex = 0;
  let fuse: Fuse<BookmarkFolder> | null = null;
  let selectedItem: HTMLLIElement | null = null;
  let selectedButton: HTMLButtonElement | null = null;

  const root = document.createElement("section");
  root.className = "popup-view";

  const input = document.createElement("input");
  input.className = "search-input";
  input.type = "text";
  input.placeholder = "Search folders...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Search folders");

  const scroller = document.createElement("div");
  scroller.className = "results-scroller";

  const list = document.createElement("ul");
  list.className = "result-list";

  const highlight = document.createElement("div");
  highlight.className = "selection-highlight";
  highlight.hidden = true;

  list.append(highlight);
  scroller.append(list);
  root.append(input, scroller);
  container.replaceChildren(root);

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

  const render = () => {
    input.value = searchTerm;
    selectedItem = null;
    selectedButton = null;
    list.replaceChildren(highlight);

    const displayed = filtered.slice(0, 20);

    if (displayed.length === 0) {
      list.append(createEmptyState("No folders found."));
      updateHighlight();
      return;
    }

    displayed.forEach((folder, index) => {
      const isSelected = index === activeIndex;

      const listItem = document.createElement("li");
      listItem.className = "result-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = `result-button${isSelected ? " is-selected" : ""}`;

      const icon = document.createElement("span");
      icon.className = "row-icon";
      icon.append(createIcon("folder", 16));

      const copy = document.createElement("span");
      copy.className = "row-text";

      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = folder.title;

      const subtitle = document.createElement("span");
      subtitle.className = "row-subtitle";
      subtitle.textContent = folder.path.replace(/^ROOT\//, "");

      copy.append(title, subtitle);

      const actionSlot = document.createElement("span");
      actionSlot.className = "row-action-slot";

      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = "row-action";
      actionButton.title = "Open manager to folder";
      actionButton.setAttribute("aria-label", "Open manager to folder");
      actionButton.append(createIcon("folder-open", 16));
      actionButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleOpenBookmarkManagerToFolder(folder.id);
      });

      actionSlot.append(actionButton);
      button.append(icon, copy, actionSlot);
      button.addEventListener("click", () => {
        void handleSelectFolder(folder.id);
      });

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
      filtered = folders;
    } else {
      if (!fuse) {
        fuse = new Fuse(folders, {
          keys: ["title", "path"],
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

  const applyFolders = (nextFolders: BookmarkFolder[]) => {
    folders = nextFolders;
    fuse = null;
    refreshFiltered(false);
  };

  const handleSearch = (term: string) => {
    searchTerm = term;
    refreshFiltered(true);
  };

  const handleSelectFolder = async (folderId: string) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab) {
      return;
    }

    await chrome.bookmarks.create({
      parentId: folderId,
      title: currentTab.title ?? "Untitled",
      url: currentTab.url,
    });
    window.close();
  };

  const handleOpenBookmarkManagerToFolder = async (folderId: string) => {
    await chrome.tabs.create({ url: `chrome://bookmarks/?id=${folderId}` });
    window.close();
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      if (filtered[activeIndex]) {
        event.preventDefault();
        void handleSelectFolder(filtered[activeIndex].id);
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

  input.addEventListener("input", () => {
    handleSearch(input.value);
  });
  input.addEventListener("keydown", handleInputKeyDown);
  input.focus();

  const unsubscribe = subscribeToBookmarkCache((cache) => {
    if (!destroyed) {
      applyFolders(cache.folders);
    }
  });

  void getFreshBookmarkCache().then((cache) => {
    if (!destroyed) {
      applyFolders(cache.folders);
    }
  });

  return {
    destroy() {
      destroyed = true;
      unsubscribe();
      input.removeEventListener("keydown", handleInputKeyDown);
      root.remove();
    },
  };
}
