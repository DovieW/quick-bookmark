import type { BookmarkFolder } from "./bookmarks";

interface FolderUsage { count: number; lastUsed: number; }
export type FolderUsageMap = Record<string, FolderUsage>;
export const FOLDER_USAGE_KEY = "folderUsage";

export async function readFolderUsage(): Promise<FolderUsageMap> {
  const result = await chrome.storage.local.get(FOLDER_USAGE_KEY);
  const value: unknown = result[FOLDER_USAGE_KEY];
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([, usage]) =>
    usage && typeof usage === "object" && Number.isSafeInteger(usage.count) &&
    usage.count > 0 && Number.isFinite(usage.lastUsed) && usage.lastUsed >= 0));
}

export function rankFolders(folders: BookmarkFolder[], usage: FolderUsageMap): BookmarkFolder[] {
  return [...folders].sort((a, b) =>
    (usage[b.id]?.count ?? 0) - (usage[a.id]?.count ?? 0) ||
    (usage[b.id]?.lastUsed ?? 0) - (usage[a.id]?.lastUsed ?? 0));
}

export async function recordFolderUse(folderId: string): Promise<void> {
  const usage = await readFolderUsage();
  const updated = { ...usage, [folderId]: {
    count: (usage[folderId]?.count ?? 0) + 1, lastUsed: Date.now(),
  } };
  // Bound local history even when folders are frequently created and deleted.
  const entries = Object.entries(updated).sort((a, b) => b[1].lastUsed - a[1].lastUsed).slice(0, 1000);
  await chrome.storage.local.set({ [FOLDER_USAGE_KEY]: Object.fromEntries(entries) });
}
