import {
  isBookmarkCacheMessage,
  readBookmarkCache,
  rebuildBookmarkCache,
  type BookmarkCache,
} from "./bookmarkCache";
import { primeQuickMode } from "./quickMode";

let isBookmarkImportInProgress = false;
let shouldRefreshBookmarksAfterImport = false;
let isBookmarkCacheDirty = true;
let bookmarkCacheRefreshPromise: Promise<BookmarkCache> | null = null;

function markBookmarkCacheDirty() {
  isBookmarkCacheDirty = true;
}

async function refreshBookmarkCache(): Promise<BookmarkCache> {
  if (bookmarkCacheRefreshPromise) {
    return bookmarkCacheRefreshPromise;
  }

  bookmarkCacheRefreshPromise = rebuildBookmarkCache()
    .then((cache) => {
      isBookmarkCacheDirty = false;
      shouldRefreshBookmarksAfterImport = false;
      return cache;
    })
    .catch((error) => {
      console.warn("Failed to refresh bookmark cache.", error);
      throw error;
    })
    .finally(() => {
      bookmarkCacheRefreshPromise = null;
    });

  return bookmarkCacheRefreshPromise;
}

async function getLatestBookmarkCache(): Promise<BookmarkCache> {
  if (bookmarkCacheRefreshPromise) {
    return bookmarkCacheRefreshPromise;
  }

  const existingCache = await readBookmarkCache();

  if (isBookmarkImportInProgress) {
    if (existingCache) {
      return existingCache;
    }

    return refreshBookmarkCache();
  }

  if (isBookmarkCacheDirty || !existingCache) {
    return refreshBookmarkCache();
  }

  return existingCache;
}

function queueBookmarkCacheRefresh() {
  markBookmarkCacheDirty();

  if (isBookmarkImportInProgress) {
    shouldRefreshBookmarksAfterImport = true;
    return;
  }

  void refreshBookmarkCache();
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Quick Bookmark Extension installed!");
  void refreshBookmarkCache();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshBookmarkCache();
});

chrome.bookmarks.onCreated.addListener(() => {
  queueBookmarkCacheRefresh();
});

chrome.bookmarks.onRemoved.addListener(() => {
  queueBookmarkCacheRefresh();
});

chrome.bookmarks.onChanged.addListener(() => {
  queueBookmarkCacheRefresh();
});

chrome.bookmarks.onMoved.addListener(() => {
  queueBookmarkCacheRefresh();
});

chrome.bookmarks.onChildrenReordered.addListener(() => {
  queueBookmarkCacheRefresh();
});

chrome.bookmarks.onImportBegan.addListener(() => {
  isBookmarkImportInProgress = true;
});

chrome.bookmarks.onImportEnded.addListener(() => {
  isBookmarkImportInProgress = false;

  if (shouldRefreshBookmarksAfterImport) {
    shouldRefreshBookmarksAfterImport = false;
  }

  queueBookmarkCacheRefresh();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isBookmarkCacheMessage(message)) {
    return undefined;
  }

  void getLatestBookmarkCache()
    .then((cache) => {
      sendResponse(cache);
    })
    .catch((error) => {
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown cache error",
      });
    });

  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open") {
    await primeQuickMode("open");
    chrome.action.openPopup();
  } else if (command === "add") {
    await primeQuickMode("add");
    chrome.action.openPopup();
  }
});
