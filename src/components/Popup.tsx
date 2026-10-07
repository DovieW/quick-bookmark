import { mountBookmarkOpen } from "./BookmarkOpen";
import { mountFolderSearch } from "./FolderSearch";
import { mountYouTubePlaylistPicker } from "./YouTubePlaylistPicker";
import "../popup/popup.css";
import {
  createQuickPopupContext,
  readQuickPopupContext,
  writeQuickPopupContext,
  type QuickPopupContext,
  type QuickPopupMode,
} from "../quickMode";
import { createIcon, type IconName } from "../popup/icons";

interface ViewController {
  destroy(): void;
}

interface ModeMeta {
  title: string;
  subtitle: string;
  icon: IconName;
  isYouTube: boolean;
}

function getModeMeta(popupContext: QuickPopupContext | null): ModeMeta {
  if (popupContext?.mode === "open") {
    return {
      title: "Quick Open",
      subtitle: "Search and open bookmarks",
      icon: "search",
      isYouTube: false,
    };
  }

  if (popupContext?.mode === "youtube" && popupContext.youtubeVideo) {
    return {
      title: "Quick Playlist",
      subtitle: "Add or remove this video from a YouTube playlist",
      icon: "playlist-add",
      isYouTube: true,
    };
  }

  return {
    title: "Quick Bookmark",
    subtitle: popupContext === null ? "Loading…" : "Save to folder",
    icon: "bookmark-add",
    isYouTube: false,
  };
}

export function mountPopup(root: HTMLElement): ViewController {
  let destroyed = false;
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

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className = "settings-button";
  settingsButton.title = "Settings";
  settingsButton.setAttribute("aria-label", "Settings");
  settingsButton.append(createIcon("settings", 20));
  settingsButton.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage().then(() => window.close()).catch(() => {
      subtitle.textContent = "Could not open settings. Please try again.";
      subtitle.classList.add("is-error");
    });
  });

  const modeSwitcher = document.createElement("nav");
  modeSwitcher.className = "mode-switcher";
  modeSwitcher.setAttribute("aria-label", "Picker mode");
  const modeButtons = ([
    ["add", "Save", "Save bookmark (Ctrl+D)"],
    ["open", "Open", "Open bookmark (Alt+F)"],
    ["youtube", "Playlists", "Add or remove this video from a playlist"],
  ] as const).map(([mode, label, tooltip]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-button${mode === "youtube" ? " mode-button--youtube" : ""}`;
    button.textContent = label;
    button.title = tooltip;
    button.disabled = true;
    button.hidden = mode === "youtube";
    button.addEventListener("click", () => switchMode(mode));
    modeSwitcher.append(button);
    return { mode, button };
  });

  headerText.append(title, subtitle);
  header.append(iconWrapper, headerText, modeSwitcher, settingsButton);

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
    subtitle.classList.remove("is-error");
    shell.classList.toggle("popup-shell--youtube", meta.isYouTube);
    modeButtons.forEach(({ mode, button }) => {
      button.disabled = !popupContext;
      button.hidden = mode === "youtube" && !popupContext?.canToggleYoutubeAdd;
      button.setAttribute("aria-pressed", String(mode === popupContext?.mode));
    });

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
    if (destroyed) return;
    if (popupContext?.mode === nextPopupContext.mode &&
        popupContext.youtubeVideo?.videoId === nextPopupContext.youtubeVideo?.videoId) return;
    popupContext = nextPopupContext;
    render();
  };

  const switchMode = (mode: QuickPopupMode) => {
    if (!popupContext) return;
    if (mode === popupContext.mode) {
      content.querySelector<HTMLInputElement>(".search-input")?.focus();
      return;
    }
    const next = createQuickPopupContext(mode, popupContext.youtubeVideo);
    void writeQuickPopupContext(next).catch(error => console.warn("Could not remember popup mode", error));
    setPopupContext(next);
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

      void writeQuickPopupContext(nextPopupContext).catch(error => console.warn("Could not remember popup mode", error));
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
      void writeQuickPopupContext(nextPopupContext).catch(error => console.warn("Could not remember popup mode", error));
      setPopupContext(nextPopupContext);
    }
  };

  window.addEventListener("keydown", handleKey, true);

  void readQuickPopupContext().then((nextPopupContext) => {
    setPopupContext(nextPopupContext);
  }).catch(() => {
    if (!destroyed) {
      subtitle.textContent = "Could not load the popup. Please reopen it to try again.";
      subtitle.classList.add("is-error");
      content.replaceChildren();
    }
  });

  render();

  return {
    destroy() {
      destroyed = true;
      window.removeEventListener("keydown", handleKey, true);
      currentView?.destroy();
      document.body.style.overflow = originalOverflow;
      document.body.style.margin = originalMargin;
      root.replaceChildren();
    },
  };
}
