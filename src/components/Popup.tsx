import { mountBookmarkOpen } from "./BookmarkOpen";
import { mountFolderSearch } from "./FolderSearch";
import "../popup/popup.css";
import { readQuickMode, writeQuickMode, type QuickMode } from "../quickMode";
import { createIcon } from "../popup/icons";

interface ViewController {
  destroy(): void;
}

function getModeMeta(mode: QuickMode | null) {
  if (mode === "open") {
    return {
      title: "Quick Open",
      subtitle: "Search and open bookmarks",
      shortcut: "Alt+F",
      icon: "search" as const,
    };
  }

  return {
    title: "Quick Bookmark",
    subtitle: mode === null ? "Loading…" : "Save to folder",
    shortcut: "Ctrl+D",
    icon: "bookmark-add" as const,
  };
}

export function mountPopup(root: HTMLElement): ViewController {
  let quickMode: QuickMode | null = null;
  let currentView: ViewController | null = null;

  const shell = document.createElement("div");
  shell.className = "popup-shell";

  const header = document.createElement("header");
  header.className = "popup-header";

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "header-icon";

  const headerText = document.createElement("div");
  headerText.className = "header-copy";

  const title = document.createElement("h1");
  title.className = "header-title";

  const subtitle = document.createElement("p");
  subtitle.className = "header-subtitle";

  const shortcut = document.createElement("span");
  shortcut.className = "shortcut-badge";

  headerText.append(title, subtitle);
  header.append(iconWrapper, headerText, shortcut);

  const content = document.createElement("main");
  content.className = "popup-content";

  shell.append(header, content);
  root.replaceChildren(shell);

  const originalOverflow = document.body.style.overflow;
  const originalMargin = document.body.style.margin;
  document.body.style.overflow = "hidden";
  document.body.style.margin = "0";

  const render = () => {
    const meta = getModeMeta(quickMode);
    iconWrapper.replaceChildren(createIcon(meta.icon, 20));
    title.textContent = meta.title;
    subtitle.textContent = meta.subtitle;
    shortcut.textContent = meta.shortcut;

    currentView?.destroy();
    currentView = null;
    content.replaceChildren();

    if (quickMode === null) {
      const loading = document.createElement("div");
      loading.className = "popup-loading";
      loading.textContent = "Loading…";
      content.append(loading);
      return;
    }

    currentView =
      quickMode === "open"
        ? mountBookmarkOpen(content)
        : mountFolderSearch(content);
  };

  const setMode = (mode: QuickMode) => {
    quickMode = mode;
    render();
  };

  const handleKey = (event: KeyboardEvent) => {
    if (
      event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "d"
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (quickMode !== "add") {
        void writeQuickMode("add");
        setMode("add");
      }

      return;
    }

    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (quickMode !== "open") {
        void writeQuickMode("open");
        setMode("open");
      }
    }
  };

  window.addEventListener("keydown", handleKey, true);

  render();

  void readQuickMode().then((mode) => {
    setMode(mode);
  });

  return {
    destroy() {
      window.removeEventListener("keydown", handleKey, true);
      currentView?.destroy();
      document.body.style.overflow = originalOverflow;
      document.body.style.margin = originalMargin;
      root.replaceChildren();
    },
  };
}
