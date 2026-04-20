import {
  parseYouTubeVideoContext,
  type YouTubeVideoContext,
} from "./youtube/videoContext";

export type QuickMode = "add" | "open";
export type QuickPopupMode = QuickMode | "youtube";

export interface QuickPopupContext {
  mode: QuickPopupMode;
  quickMode: QuickMode;
  canToggleYoutubeAdd: boolean;
  youtubeVideo: YouTubeVideoContext | null;
}

const QUICK_MODE_KEY = "quickMode";
const QUICK_POPUP_CONTEXT_KEY = "quickPopupContext";

function isQuickMode(value: unknown): value is QuickMode {
  return value === "add" || value === "open";
}

function isQuickPopupMode(value: unknown): value is QuickPopupMode {
  return value === "add" || value === "open" || value === "youtube";
}

function isYouTubeVideoContext(value: unknown): value is YouTubeVideoContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<YouTubeVideoContext>;
  return (
    (candidate.pageKind === "watch" || candidate.pageKind === "shorts") &&
    typeof candidate.videoId === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.canonicalUrl === "string"
  );
}

function isQuickPopupContext(value: unknown): value is QuickPopupContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<QuickPopupContext>;
  return (
    isQuickPopupMode(candidate.mode) &&
    isQuickMode(candidate.quickMode) &&
    typeof candidate.canToggleYoutubeAdd === "boolean" &&
    (candidate.youtubeVideo === null ||
      candidate.youtubeVideo === undefined ||
      isYouTubeVideoContext(candidate.youtubeVideo))
  );
}

export function createQuickPopupContext(
  mode: QuickPopupMode,
  youtubeVideo?: YouTubeVideoContext | null,
): QuickPopupContext {
  return {
    mode,
    quickMode: mode === "open" ? "open" : "add",
    canToggleYoutubeAdd: !!youtubeVideo,
    youtubeVideo: youtubeVideo ?? null,
  };
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function matchesYouTubeVideo(
  left: YouTubeVideoContext | null,
  right: YouTubeVideoContext | null,
): boolean {
  return !!left && !!right && left.videoId === right.videoId;
}

function createQuickPopupContextForActiveTab(
  quickMode: QuickMode,
  activeTab?: chrome.tabs.Tab,
): QuickPopupContext {
  const activeYouTubeVideo = parseYouTubeVideoContext(activeTab?.url, {
    title: activeTab?.title,
    tabId: activeTab?.id,
  });

  if (!activeYouTubeVideo) {
    return createQuickPopupContext(quickMode);
  }

  return createQuickPopupContext(
    quickMode === "open" ? "open" : "youtube",
    activeYouTubeVideo,
  );
}

async function readQuickModeFrom(area?: chrome.storage.StorageArea): Promise<QuickMode | null> {
  if (!area) {
    return null;
  }

  const result = await area.get([QUICK_MODE_KEY]);
  const mode = result[QUICK_MODE_KEY];

  return isQuickMode(mode) ? mode : null;
}

async function readQuickPopupContextFrom(
  area?: chrome.storage.StorageArea,
): Promise<QuickPopupContext | null> {
  if (!area) {
    return null;
  }

  const result = await area.get([QUICK_POPUP_CONTEXT_KEY]);
  const popupContext = result[QUICK_POPUP_CONTEXT_KEY];

  return isQuickPopupContext(popupContext)
    ? {
      ...popupContext,
      youtubeVideo: popupContext.youtubeVideo ?? null,
    }
    : null;
}

function writeQuickModeTo(area: chrome.storage.StorageArea | undefined, mode: QuickMode): Promise<void> {
  if (!area) {
    return Promise.resolve();
  }

  return area.set({ [QUICK_MODE_KEY]: mode });
}

function writeQuickPopupContextTo(
  area: chrome.storage.StorageArea | undefined,
  context: QuickPopupContext,
): Promise<void> {
  if (!area) {
    return Promise.resolve();
  }

  return area.set({ [QUICK_POPUP_CONTEXT_KEY]: context });
}

export async function readQuickMode(): Promise<QuickMode> {
  const sessionMode = await readQuickModeFrom(chrome.storage.session);
  if (sessionMode) {
    return sessionMode;
  }

  const localMode = await readQuickModeFrom(chrome.storage.local);
  if (localMode) {
    void writeQuickModeTo(chrome.storage.session, localMode);
    return localMode;
  }

  return "add";
}

export async function readQuickPopupContext(): Promise<QuickPopupContext> {
  const activeTab = await getActiveTab();
  const sessionPopupContext = await readQuickPopupContextFrom(
    chrome.storage.session,
  );

  if (sessionPopupContext?.youtubeVideo) {
    const activeYouTubeVideo = parseYouTubeVideoContext(activeTab?.url, {
      title: activeTab?.title,
      tabId: activeTab?.id,
    });

    if (matchesYouTubeVideo(sessionPopupContext.youtubeVideo, activeYouTubeVideo)) {
      return createQuickPopupContext(
        sessionPopupContext.mode,
        activeYouTubeVideo,
      );
    }
  }

  return createQuickPopupContextForActiveTab(await readQuickMode(), activeTab);
}

export async function writeQuickMode(mode: QuickMode): Promise<void> {
  await Promise.all([
    writeQuickModeTo(chrome.storage.session, mode),
    writeQuickModeTo(chrome.storage.local, mode),
    writeQuickPopupContextTo(
      chrome.storage.session,
      createQuickPopupContext(mode),
    ),
  ]);
}

export async function writeQuickPopupContext(
  context: QuickPopupContext,
): Promise<void> {
  const nextQuickMode = context.mode === "open" ? "open" : "add";

  await Promise.all([
    writeQuickPopupContextTo(chrome.storage.session, context),
    writeQuickModeTo(chrome.storage.session, nextQuickMode),
    writeQuickModeTo(chrome.storage.local, nextQuickMode),
  ]);
}

export async function primeQuickMode(mode: QuickMode): Promise<void> {
  await Promise.all([
    writeQuickModeTo(chrome.storage.session, mode),
    writeQuickPopupContextTo(
      chrome.storage.session,
      createQuickPopupContext(mode),
    ),
  ]);
  void writeQuickModeTo(chrome.storage.local, mode);
}

export async function primeQuickPopupContext(
  context: QuickPopupContext,
): Promise<void> {
  const nextQuickMode = context.mode === "open" ? "open" : "add";

  await Promise.all([
    writeQuickPopupContextTo(chrome.storage.session, context),
    writeQuickModeTo(chrome.storage.session, nextQuickMode),
  ]);
  void writeQuickModeTo(chrome.storage.local, nextQuickMode);
}