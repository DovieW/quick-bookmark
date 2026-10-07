import { createFuzzyFilter } from "./search";

export interface BookmarkFolder {
  id: string;
  title: string;
  path: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  parentId?: string;
}

export function getDomainFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

export function collectBookmarkData(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
  const folders: BookmarkFolder[] = [];
  const bookmarks: BookmarkItem[] = [];
  const visit = (node: chrome.bookmarks.BookmarkTreeNode, path: string) => {
    if (node.url) {
      bookmarks.push({ id: node.id, title: node.title || "(Untitled)", url: node.url,
        domain: getDomainFromUrl(node.url), parentId: node.parentId });
      return;
    }
    const nextPath = node.title.trim() ? (path ? `${path}/${node.title}` : node.title) : path;
    if (node.title.trim()) folders.push({ id: node.id, title: node.title, path: nextPath });
    node.children?.forEach(child => visit(child, nextPath));
  };
  nodes.forEach(node => visit(node, ""));
  return { folders, bookmarks };
}

export async function readBookmarkData() {
  return collectBookmarkData(await chrome.bookmarks.getTree());
}

export function createBookmarkFilter(includeUrlsAndDomains: boolean) {
  return createFuzzyFilter<BookmarkItem>({
    keys: includeUrlsAndDomains
      ? [{ name: "title", weight: 2 }, { name: "domain", weight: 1 }, { name: "url", weight: 1 }]
      : ["title"],
    ignoreLocation: includeUrlsAndDomains,
  });
}

export function subscribeToBookmarks(listener: () => void): () => void {
  const events = [chrome.bookmarks.onCreated, chrome.bookmarks.onRemoved,
    chrome.bookmarks.onChanged, chrome.bookmarks.onMoved,
    chrome.bookmarks.onChildrenReordered, chrome.bookmarks.onImportEnded];
  events.forEach(event => event.addListener(listener));
  return () => events.forEach(event => event.removeListener(listener));
}
