import {
  clearActionStatusBadge,
  isClearActionStatusMessage,
  isSetActionStatusMessage,
  setActionStatusBadge,
} from "./actionStatus";
import {
  createQuickPopupContext,
  primeQuickMode,
  primeQuickPopupContext,
  type QuickMode,
} from "./quickMode";
import { parseYouTubeVideoContext } from "./youtube/videoContext";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Quick Bookmark Extension installed!");
});

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function primeCommandMode(commandMode: QuickMode): Promise<void> {
  const activeTab = await getActiveTab();
  const youtubeVideo = parseYouTubeVideoContext(activeTab?.url, {
    title: activeTab?.title,
    tabId: activeTab?.id,
  });

  if (activeTab?.id !== undefined) {
    await clearActionStatusBadge(activeTab.id);
  }

  if (youtubeVideo) {
    const popupMode = commandMode === "add" ? "youtube" : commandMode;
    await primeQuickPopupContext(
      createQuickPopupContext(popupMode, youtubeVideo),
    );
    return;
  }

  await primeQuickMode(commandMode);
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open") {
    await primeCommandMode("open");
    await chrome.action.openPopup();
  } else if (command === "add") {
    await primeCommandMode("add");
    await chrome.action.openPopup();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isSetActionStatusMessage(message)) {
    void setActionStatusBadge(message.status, message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  }

  if (isClearActionStatusMessage(message)) {
    void clearActionStatusBadge(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  }

  return false;
});
