import test from "node:test";
import assert from "node:assert/strict";
import { collectBookmarkData, createBookmarkFilter } from "../src/bookmarks";
import { rankFolders } from "../src/folderUsage";
import { normalizeSettings } from "../src/settings";

const tree: chrome.bookmarks.BookmarkTreeNode[] = [{ id: "0", title: "", syncing: false, children: [
  { id: "1", title: "Work", syncing: false, children: [{ id: "2", title: "Empty", syncing: false, children: [] },
    { id: "3", title: "Reference", syncing: false, url: "https://unique.example.com/" + "long-path/".repeat(10) + "needle", parentId: "1" }] },
  { id: "4", title: "Personal", syncing: false, children: [{ id: "5", title: "Empty", syncing: false }] },
] }];

test("collects nested and empty folders without including bookmarks as folders", () => {
  const data = collectBookmarkData(tree);
  assert.deepEqual(data.folders.map(f => f.path), ["Work", "Work/Empty", "Personal", "Personal/Empty"]);
  assert.equal(data.bookmarks[0].domain, "unique.example.com");
  assert.equal(data.bookmarks[0].parentId, "1");
});

test("default search matches titles only; opt-in matches domains and deep URL paths", () => {
  const { bookmarks } = collectBookmarkData(tree);
  const titleOnly = createBookmarkFilter(false);
  assert.equal(titleOnly(bookmarks, "Reference").length, 1);
  assert.equal(titleOnly(bookmarks, "unique.example").length, 0);
  assert.equal(titleOnly(bookmarks, "needle").length, 0);
  const extended = createBookmarkFilter(true);
  assert.equal(extended(bookmarks, "unique.example").length, 1);
  assert.equal(extended(bookmarks, "needle").length, 1);
  assert.equal(extended(bookmarks, " ").length, 1);
});

test("URL matching is off for missing, corrupt, and old settings", () => {
  for (const value of [undefined, null, {}, false, "true", { searchUrlsAndDomains: "true" }]) {
    assert.equal(normalizeSettings(value).searchUrlsAndDomains, false);
  }
  assert.equal(normalizeSettings({ searchUrlsAndDomains: true }).searchUrlsAndDomains, true);
});

test("frequently used folders come first with recency breaking ties and stable unused order", () => {
  const { folders } = collectBookmarkData(tree);
  const original = folders.map(f => f.id);
  const ranked = rankFolders(folders, { "1": { count: 2, lastUsed: 10 }, "5": { count: 2, lastUsed: 20 } });
  assert.deepEqual(ranked.map(f => f.id), ["5", "1", "2", "4"]);
  assert.deepEqual(folders.map(f => f.id), original);
  assert.deepEqual(rankFolders(folders, {}).map(f => f.id), original);
});
