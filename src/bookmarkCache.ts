export interface BookmarkFolder {
  id: string;
  title: string;
  path: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  parentId?: string;
}

export interface BookmarkCache {
  version: 1;
  updatedAt: number;
  folders: BookmarkFolder[];
  bookmarks: BookmarkItem[];
}

const BOOKMARK_CACHE_KEY = "bookmarkCache";
const BOOKMARK_CACHE_VERSION = 1 as const;
export const GET_FRESH_BOOKMARK_CACHE_MESSAGE = "bookmark-cache:get-fresh";

function isBookmarkCache(value: unknown): value is BookmarkCache {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BookmarkCache>;

  return (
    candidate.version === BOOKMARK_CACHE_VERSION &&
    typeof candidate.updatedAt === "number" &&
    Array.isArray(candidate.folders) &&
    Array.isArray(candidate.bookmarks)
  );
}

export function isBookmarkCacheMessage(
  value: unknown,
): value is { type: typeof GET_FRESH_BOOKMARK_CACHE_MESSAGE } {
  return (
    !!value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === GET_FRESH_BOOKMARK_CACHE_MESSAGE
  );
}

function writeBookmarkCacheTo(
  area: chrome.storage.StorageArea | undefined,
  cache: BookmarkCache,
): Promise<void> {
  if (!area) {
    return Promise.resolve();
  }

  return area.set({ [BOOKMARK_CACHE_KEY]: cache });
}

async function readBookmarkCacheFrom(
  area?: chrome.storage.StorageArea,
): Promise<BookmarkCache | null> {
  if (!area) {
    return null;
  }

  const result = await area.get([BOOKMARK_CACHE_KEY]);
  const cache = result[BOOKMARK_CACHE_KEY];

  return isBookmarkCache(cache) ? cache : null;
}

function getBookmarkTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((nodes) => {
      resolve(nodes);
    });
  });
}

function collectBookmarkData(
  node: chrome.bookmarks.BookmarkTreeNode,
  currentPath: string,
  folders: BookmarkFolder[],
  bookmarks: BookmarkItem[],
) {
  if (node.url) {
    bookmarks.push({
      id: node.id,
      title: node.title || "(Untitled)",
      url: node.url,
      parentId: node.parentId,
    });
  }

  if (!node.children) {
    return;
  }

  const nextPath =
    node.title && node.title.trim() !== ""
      ? currentPath
        ? `${currentPath}/${node.title}`
        : node.title
      : currentPath;

  if (node.title && node.title.trim() !== "") {
    folders.push({
      id: node.id,
      title: node.title,
      path: nextPath,
    });
  }

  node.children.forEach((child) => {
    collectBookmarkData(child, nextPath, folders, bookmarks);
  });
}

function buildBookmarkCache(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): BookmarkCache {
  const folders: BookmarkFolder[] = [];
  const bookmarks: BookmarkItem[] = [];

  nodes.forEach((node) => {
    collectBookmarkData(node, "", folders, bookmarks);
  });

  return {
    version: BOOKMARK_CACHE_VERSION,
    updatedAt: Date.now(),
    folders,
    bookmarks,
  };
}

export async function readBookmarkCache(): Promise<BookmarkCache | null> {
  const sessionCache = await readBookmarkCacheFrom(chrome.storage.session);
  if (sessionCache) {
    return sessionCache;
  }

  const localCache = await readBookmarkCacheFrom(chrome.storage.local);
  if (localCache) {
    void writeBookmarkCacheTo(chrome.storage.session, localCache);
    return localCache;
  }

  return null;
}

export async function readCachedFolders(): Promise<BookmarkFolder[] | null> {
  const cache = await readBookmarkCache();
  return cache?.folders ?? null;
}

export async function readCachedBookmarks(): Promise<BookmarkItem[] | null> {
  const cache = await readBookmarkCache();
  return cache?.bookmarks ?? null;
}

export async function rebuildBookmarkCache(): Promise<BookmarkCache> {
  const bookmarkTree = await getBookmarkTree();
  const cache = buildBookmarkCache(bookmarkTree);

  await Promise.all([
    writeBookmarkCacheTo(chrome.storage.session, cache),
    writeBookmarkCacheTo(chrome.storage.local, cache),
  ]);

  return cache;
}

export async function ensureBookmarkCache(): Promise<BookmarkCache> {
  const existingCache = await readBookmarkCache();
  if (existingCache) {
    return existingCache;
  }

  return rebuildBookmarkCache();
}

export async function getFreshBookmarkCache(): Promise<BookmarkCache> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: GET_FRESH_BOOKMARK_CACHE_MESSAGE,
    });

    if (isBookmarkCache(response)) {
      return response;
    }
  } catch {
    // Fall through to local fallback below.
  }

  return ensureBookmarkCache();
}

export function subscribeToBookmarkCache(
  listener: (cache: BookmarkCache) => void,
): () => void {
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== "session") {
      return;
    }

    const nextValue = changes[BOOKMARK_CACHE_KEY]?.newValue;
    if (isBookmarkCache(nextValue)) {
      listener(nextValue);
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
}
