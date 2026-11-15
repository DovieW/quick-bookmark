import test from "node:test";
import assert from "node:assert/strict";
import { createFuzzyFilter, findMatchRanges } from "../src/search";
import { createBookmarkFilter } from "../src/bookmarks";
import { rankFolders } from "../src/folderUsage";

const folders = [
  { id: "favorites", title: "Favorites", path: "Bookmarks bar/Reading List/Done Reading/Favorites" },
  { id: "tailscale", title: "Apps — Tailscale", path: "Bookmarks bar/🖥️ Home Lab/Apps — Tailscale" },
  { id: "reading", title: "Reading List", path: "Bookmarks bar/Reading List" },
];
const folderSearch = () => createFuzzyFilter<(typeof folders)[number]>({ keys: ["title", "path"] });

test("all words are required, in any order and across title and ancestor path", () => {
  const search = folderSearch();
  for (const query of ["home tailscale", "tailscale home", "  HOME   tailscale  "]) {
    assert.deepEqual(search(folders, query).map(f => f.id), ["tailscale"]);
  }
  for (const query of ["reading favorites", "favorites reading"]) {
    assert.deepEqual(search(folders, query).map(f => f.id), ["favorites"]);
  }
  assert.deepEqual(search(folders, "home tailscale nonexistent"), []);
  assert.equal(search(folders, "").length, folders.length);
  assert.equal(search(folders, "  "), folders);
});

test("long-title words are found and incomplete matches cannot beat a complete query", () => {
  const bookmarks = [
    { id: "guide", title: "A complete practical guide to networking and configuring your home server with Tailscale", url: "https://example.com", domain: "example.com" },
    { id: "docs", title: "Tailscale documentation", url: "https://example.org", domain: "example.org" },
  ];
  const search = createBookmarkFilter(false);
  assert.deepEqual(new Set(search(bookmarks, "tailscale").map(b => b.id)), new Set(["guide", "docs"]));
  for (const query of ["tailscale guide", "guide tailscale"]) {
    assert.deepEqual(search(bookmarks, query).map(b => b.id), ["guide"]);
  }
});

test("ranking prefers exact names, title words/prefixes, substrings, ancestors, then typos", () => {
  const items = [
    { id: "ancestor", title: "Notes", path: "Work/Reading/Notes" },
    { id: "typo", title: "Reeding", path: "Work/Reeding" },
    { id: "substring", title: "Prereading", path: "Work/Prereading" },
    { id: "prefix", title: "Readings", path: "Work/Readings" },
    { id: "word", title: "Weekend Reading", path: "Work/Weekend Reading" },
    { id: "exact", title: "Reading", path: "Work/Reading" },
  ];
  assert.deepEqual(folderSearch()(items, "reading").map(f => f.id),
    ["exact", "word", "prefix", "substring", "ancestor", "typo"]);
});

test("folder usage breaks relevance ties but cannot displace a better text match", () => {
  const items = [
    { id: "low", title: "Reading", path: "Personal/Reading" },
    { id: "high", title: "Reading", path: "Work/Reading" },
    { id: "other", title: "Other Reading", path: "Work/Other Reading" },
  ];
  const ranked = rankFolders(items, { high: { count: 2, lastUsed: 1 }, other: { count: 100, lastUsed: 5 } });
  const search = folderSearch();
  assert.equal(search(ranked, ""), ranked);
  assert.deepEqual(search(ranked, "reading").map(f => f.id), ["high", "low", "other"]);
  assert.deepEqual(items.map(f => f.id), ["low", "high", "other"]);
});

test("modest typo tolerance supports omissions and transpositions without fuzzy short or numeric queries", () => {
  const search = folderSearch();
  for (const query of ["tailscle", "tiaslcale", "home tailscle"]) {
    assert.deepEqual(search(folders, query).map(f => f.id), ["tailscale"]);
  }
  assert.deepEqual(search(folders, "fva"), []);
  assert.deepEqual(search(folders, "txzzscale"), []);
  const items = [{ id: "year", title: "Notes 2025", path: "Work/Notes 2025" }];
  assert.deepEqual(search(items, "2026"), []);
});

test("URL and domain terms remain opt-in and can combine with title terms", () => {
  const items = [{ id: "one", title: "Router guide", url: "https://tailscale.com/" + "deep/".repeat(20) + "needle", domain: "tailscale.com" }];
  assert.deepEqual(createBookmarkFilter(false)(items, "router tailscale"), []);
  assert.deepEqual(createBookmarkFilter(true)(items, "router tailscale needle"), items);
  assert.deepEqual(createBookmarkFilter(true)(items, "router tailscale missing"), []);
});

test("highlights follow unordered literal and fuzzy token matches with safe original offsets", () => {
  const snippets = (text: string, query: string) => findMatchRanges(text, query).map(([a, b]) => text.slice(a, b + 1));
  assert.deepEqual(snippets("Apps — Tailscale", "home tailscle"), ["Tailscale"]);
  assert.deepEqual(snippets("🖥️ Home Lab", "tailscale home"), ["Home"]);
  assert.deepEqual(snippets("<Weekend> reading", "weekend"), ["Weekend"]);
  assert.deepEqual(snippets("📚 Café cafe\u0301", "cafe"), ["Café", "cafe\u0301"]);
  assert.deepEqual(snippets("Reading", "read reading read"), ["Reading"]);
  assert.deepEqual(snippets("🖥️ Home Lab", "🖥️"), ["🖥️"]);
  assert.deepEqual(snippets("Reading", ""), []);
});

test("accent, case and punctuation normalization is shared by filtering and highlighting", () => {
  const items = [{ id: "cafe", title: "📚 Café — Notes", path: "Work/📚 Café — Notes" }];
  const search = folderSearch();
  assert.deepEqual(search(items, "notes CAFE"), items);
  assert.deepEqual(search(items, "café-notes"), items);
  assert.deepEqual(search(items, "📚"), items);
  assert.deepEqual(search([{ id: "new", title: "Travel", path: "Work/Travel" }], "cafe"), []);
});
