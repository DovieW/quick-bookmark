import { mountBookmarkOpen } from "./BookmarkOpen";
import { mountFolderSearch } from "./FolderSearch";
import { mountYouTubePlaylistPicker } from "./YouTubePlaylistPicker";
import "../popup/popup.css";
import {
  createQuickPopupContext,
  readQuickPopupContext,
  writeQuickPopupContext,
  type QuickPopupContext,
} from "../quickMode";
import { createIcon, type IconName } from "../popup/icons";

interface ViewController {
  destroy(): void;
}

interface ModeMeta {
  title: string;
  subtitle: string;
  shortcut: string;
  icon: IconName;
  isYouTube: boolean;
}

function getModeMeta(popupContext: QuickPopupContext | null): ModeMeta {
  if (popupContext?.mode === "open") {
    return {
      title: "Quick Open",
      subtitle: "Search and open bookmarks",
      shortcut: "Alt+F",
      icon: "search",
      isYouTube: false,
    };
  }

  if (popupContext?.mode === "youtube" && popupContext.youtubeVideo) {
    return {
      title: "Quick Playlist",
      subtitle: "Add or remove this video from a YouTube playlist",
      shortcut: "Ctrl+D",
      icon: "playlist-add",
      isYouTube: true,
    };
  }

  return {
    title: "Quick Bookmark",
    subtitle: popupContext === null ? "Loading…" : "Save to folder",
    shortcut: "Ctrl+D",
    icon: "bookmark-add",
    isYouTube: false,
  };
}

export function mountPopup(root: HTMLElement): ViewController {
  let popupContext: QuickPopupContext | null = null;
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
    const meta = getModeMeta(popupContext);

    iconWrapper.replaceChildren(createIcon(meta.icon, 20));
    title.textContent = meta.title;
    subtitle.textContent = meta.subtitle;
    shortcut.textContent = meta.shortcut;
    shell.classList.toggle("popup-shell--youtube", meta.isYouTube);

    currentView?.destroy();
    currentView = null;
    content.replaceChildren();

    if (popupContext === null) {
      const loading = document.createElement("div");
      loading.className = "popup-loading";
      loading.textContent = "Loading…";
      content.append(loading);
      return;
    }

    if (popupContext.mode === "open") {
      currentView = mountBookmarkOpen(content);
      return;
    }

    if (popupContext.mode === "youtube" && popupContext.youtubeVideo) {
      currentView = mountYouTubePlaylistPicker(content, popupContext.youtubeVideo);
      return;
    }

    currentView = mountFolderSearch(content);
  };

  const setPopupContext = (nextPopupContext: QuickPopupContext) => {
    popupContext = nextPopupContext;
    render();
  };

  const handleKey = (event: KeyboardEvent) => {
    if (!popupContext) {
      return;
    }

    if (
      event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "d"
    ) {
      event.preventDefault();
      event.stopPropagation();

      const nextPopupContext = popupContext.canToggleYoutubeAdd
        ? createQuickPopupContext(
            popupContext.mode === "youtube" ? "add" : "youtube",
            popupContext.youtubeVideo,
          )
        : createQuickPopupContext("add");

      void writeQuickPopupContext(nextPopupContext);
      setPopupContext(nextPopupContext);
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

      const nextPopupContext = createQuickPopupContext(
        "open",
        popupContext.canToggleYoutubeAdd ? popupContext.youtubeVideo : null,
      );
      void writeQuickPopupContext(nextPopupContext);
      setPopupContext(nextPopupContext);
    }
  };

  window.addEventListener("keydown", handleKey, true);

  void readQuickPopupContext().then((nextPopupContext) => {
    setPopupContext(nextPopupContext);
  });

  render();

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
