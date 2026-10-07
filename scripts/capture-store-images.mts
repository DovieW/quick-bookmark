import { chromium, expect, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Render the built UI with fictional data in a disposable profile.
// Run after `npm run build`: node --import tsx scripts/capture-store-images.mts
const { version } = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const output = resolve("release-files", version);
mkdirSync(resolve(output, "screenshots"), { recursive: true });
const extensionPath = resolve("dist");
const context = await chromium.launchPersistentContext("", {
  channel: "chromium", headless: true,
  ignoreDefaultArgs: ["--hide-scrollbars"],
  viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1.25,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
const errors: string[] = [];
context.on("page", page => page.on("pageerror", error => errors.push(error.message)));

async function framePopup(page: Page, title: string, description: string, shortcut: string) {
  await page.evaluate(({ version, title, description, shortcut }) => {
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: 100%; }
      body { background: radial-gradient(ellipse at 12% 10%, #294036 0%, #18221d 40%, #111715 90%); }
      #root { position: fixed; right: 32px; top: 48px; width: 500px; box-sizing: content-box; border: 1px solid #414b45;
        border-radius: 12px; overflow: hidden; box-shadow: 0 18px 60px #0005; }
      .popup-shell { background: var(--color-bg); }
      .store-caption { position: absolute; left: 48px; top: 170px; width: 360px; }
      .store-caption .store-label { margin: 0 0 24px; font: 600 13px/20px system-ui; letter-spacing: 2px; color: #acd9bc; }
      .store-caption h2 { margin: 0 0 24px; font: 600 40px/1.12 system-ui; letter-spacing: -1px; color: #f5f6f5; }
      .store-caption .store-description { margin: 0; font: 19px/1.6 system-ui; color: #c4cfc7; }
      .store-caption .store-shortcut { display: inline-block; margin: 32px 0 0; padding: 10px 16px;
        font: 500 17px/24px system-ui; color: #e4ece6; background: #ffffff0a; border: 1px solid #58695e; border-radius: 8px; }
    `;
    document.head.append(style);
    const aside = document.createElement("aside");
    aside.className = "store-caption";
    for (const [tag, className, text] of [
      ["p", "store-label", `QUICK BOOKMARK · ${version}`], ["h2", "", title],
      ["p", "store-description", description], ["p", "store-shortcut", shortcut],
    ]) {
      const element = document.createElement(tag);
      element.className = className;
      element.textContent = text;
      aside.append(element);
    }
    document.body.append(aside);
  }, { version, title, description, shortcut });
}

try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const manifestVersion = await worker.evaluate(() => chrome.runtime.getManifest().version);
  if (manifestVersion !== version) throw new Error("Build the current version before capturing images.");
  const id = new URL(worker.url()).host;
  await worker.evaluate(async () => {
    const design = await chrome.bookmarks.create({ parentId: "1", title: "Design resources" });
    await chrome.bookmarks.create({ parentId: design.id, title: "Typography" });
    await chrome.bookmarks.create({ parentId: design.id, title: "Inspiration" });
    const personal = await chrome.bookmarks.create({ parentId: "1", title: "Personal" });
    await chrome.bookmarks.create({ parentId: personal.id, title: "Recipes" });
    await chrome.bookmarks.create({ parentId: personal.id, title: "Travel ideas" });
    await chrome.bookmarks.create({ parentId: "1", title: "Reading list" });
    await chrome.bookmarks.create({ parentId: "1", title: "Useful tools" });
    for (const [title, url] of [
      ["Accessibility checklist", "https://www.w3.org/WAI/"],
      ["MDN Web Docs", "https://developer.mozilla.org/"],
      ["Project notes", "https://docs.example.org/project-notes"],
      ["Design references", "https://studio.example.org/references"],
      ["Weekend recipes", "https://kitchen.example.org/recipes"],
      ["Reading list", "https://reading.example.org/saved"],
      ["Useful tools", "https://tools.example.org/collection"],
    ]) await chrome.bookmarks.create({ parentId: "1", title, url });
    await chrome.storage.local.set({ quickMode: "add", settings: { searchUrlsAndDomains: false },
      folderUsage: { [design.id]: { count: 8, lastUsed: Date.now() } } });
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await expect(popup.getByRole("textbox")).toBeEnabled();
  await popup.locator(".popup-shell").screenshot({ path: resolve(output, "popup-preview.png"), caret: "hide" });
  await framePopup(popup, "Save to the right folder.", "Search your folders and save the current page. Your frequently used folders appear first.", "Ctrl + D");
  await popup.screenshot({ path: resolve(output, "screenshots/01-save-folders.png"), caret: "hide" });

  await popup.getByRole("button", { name: "Open", exact: true }).click();
  await expect(popup.getByRole("textbox")).toBeEnabled();
  await popup.locator(".store-caption").evaluate(element => element.remove());
  await framePopup(popup, "Find your bookmarks.", "Search by title and open a result with Enter. Choose an adjacent tab with Ctrl + Enter.", "Alt + F");
  await popup.screenshot({ path: resolve(output, "screenshots/02-open-bookmarks.png"), caret: "hide" });

  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${id}/options.html`);
  await expect(settings.getByLabel("Include URLs and domains")).not.toBeChecked();
  await settings.screenshot({ path: resolve(output, "screenshots/03-search-settings.png"), caret: "hide" });

  const youtube = await context.newPage();
  const playlists = [
    { id: "p1", title: "Saved videos", itemCount: 24 },
    { id: "p2", title: "Learn something", itemCount: 18 },
    { id: "p3", title: "Music picks", itemCount: 32 },
    { id: "p4", title: "Weekend cooking", itemCount: 9 },
  ];
  await youtube.route("https://www.googleapis.com/youtube/v3/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") throw new Error("Store captures must never modify playlists.");
    const playlistId = url.searchParams.get("playlistId");
    await route.fulfill({ json: { items: playlistId === "p2" ? [{ id: "demo-membership",
      snippet: { resourceId: { videoId: "abcdefghijk" } } }] : [] } });
  });
  // Extension documents don't run Playwright's page init scripts. Load a
  // non-playlist document, install read-only fixtures, then mount the built popup.
  await youtube.goto(`chrome-extension://${id}/options.html`);
  const popupEntry = readFileSync(resolve(extensionPath, "popup.html"), "utf8").match(/src="([^\"]+\.js)"/)?.[1];
  if (!popupEntry) throw new Error("The built popup entry was not found.");
  await youtube.evaluate(async ({ playlists, entry }) => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) throw new Error("No active screenshot tab.");
    chrome.tabs.query = (async () => [{ ...activeTab, title: "Example video",
      url: "https://www.youtube.com/watch?v=abcdefghijk" }]) as typeof chrome.tabs.query;
    chrome.identity.getAuthToken = (async () => ({ token: "mock-screenshot-token" })) as typeof chrome.identity.getAuthToken;
    await chrome.storage.session.set({ quickMode: "add" });
    await chrome.storage.session.remove("quickPopupContext");
    await chrome.storage.local.set({ quickMode: "add",
      youtubePlaylistCache: { version: 1, updatedAt: Date.now(), playlists } });
    const root = document.createElement("div");
    root.id = "root";
    document.body.replaceChildren(root);
    await import(entry);
  }, { playlists, entry: new URL(popupEntry, `chrome-extension://${id}/popup.html`).href });
  await expect(youtube.getByRole("button", { name: "Remove: Learn something", exact: true })).toBeEnabled();
  await expect(youtube.getByRole("button", { name: "Add: Saved videos", exact: true })).toBeEnabled();
  await framePopup(youtube, "Save to a playlist.", "See current membership, then choose Add or Remove. Connecting YouTube is optional.", "YouTube playlist actions");
  await youtube.screenshot({ path: resolve(output, "screenshots/04-youtube-playlists.png"), caret: "hide" });

  const promo = await context.newPage();
  await promo.setViewportSize({ width: 440, height: 280 });
  const icon = readFileSync(resolve("public/icon128.png")).toString("base64");
  await promo.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; } html { width: 440px; height: 280px; overflow: hidden; }
    body { margin: 0; width: 440px; height: 280px; display: flow-root; overflow: hidden; color: #f5f6f5;
      background: radial-gradient(ellipse at top left, #33533f, #18231c 80%); font-family: system-ui; }
    .brand { display: flex; align-items: center; gap: 16px; margin: 32px 32px 24px; }
    .brand img { width: 56px; height: 56px; } h1 { font-size: 25px; font-weight: 600; margin: 0; }
    .search { display: flex; align-items: center; gap: 14px; margin: 0 32px; padding: 14px 18px;
      border: 1px solid #7b9d85; border-radius: 10px; background: #202a23; color: #d3dfd6; font-size: 18px; }
    svg { width: 22px; height: 22px; fill: none; stroke: #c5decf; stroke-width: 1.8; }
    .row { display: flex; align-items: center; gap: 14px; margin: 12px 32px 0; padding: 16px 18px;
      background: #344638; border-radius: 10px; }
    .lines { flex: 1; } .lines span { display: block; height: 7px; border-radius: 5px; background: #c5decf; width: 74%; }
    .lines span + span { margin-top: 10px; height: 5px; width: 45%; opacity: .5; }
  </style></head><body><div class="brand"><img src="data:image/png;base64,${icon}" alt=""><h1>Quick Bookmark</h1></div>
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg>Save and find pages</div>
    <div class="row"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg><div class="lines"><span></span><span></span></div></div>
  </body></html>`);
  // CSS-pixel scaling is disabled for the required 440×280 promo output.
  await promo.screenshot({ path: resolve(output, "promo-small.png"), scale: "css" });
  copyFileSync(resolve("public/icon128.png"), resolve(output, "icon128.png"));
  if (errors.length) throw new Error(`Capture errors: ${errors.join("; ")}`);
  console.log(`Created ${version} store screenshots, popup preview, promo tile, and icon.`);
} finally { await context.close(); }
