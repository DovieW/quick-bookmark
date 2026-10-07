import { test, expect, installChromeMock } from "./helpers";

test("settings start off, persist both choices, and recover from a failed save", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/options.html");
  const checkbox = page.getByLabel("Include URLs and domains");
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");
  await page.reload();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.reload();
  await expect(checkbox).not.toBeChecked();
  await page.evaluate(() => { window.__qbTest.failSettingsSave = true; });
  await checkbox.click();
  await expect(page.getByRole("status")).toHaveText("Could not save. Please try again.");
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeEnabled();
});

test("bookmark search remains title-only until the saved setting is enabled", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/popup.html");
  const input = page.getByRole("textbox");
  await expect(input).toBeEnabled();
  await input.fill("unique.example");
  await expect(page.getByText("No bookmarks found.")).toBeVisible();
  await page.evaluate(() => chrome.storage.local.set({ settings: { searchUrlsAndDomains: true } }));
  await expect(page.locator(".result-button")).toHaveCount(3);
  await page.evaluate(() => chrome.storage.local.set({ settings: { searchUrlsAndDomains: false } }));
  await expect(page.getByText("No bookmarks found.")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  expect(await page.evaluate(() => window.__qbTest.optionsOpened)).toBe(1);
});

test("keyboard selection is bounded, resets on search, and preserves adjacent-tab grouping", async ({ page }) => {
  await installChromeMock(page, { count: 30 });
  await page.goto("/popup.html");
  const input = page.getByRole("textbox");
  await expect(input).toBeEnabled();
  await expect(page.locator(".result-button")).toHaveCount(20);
  const firstRow = await page.locator(".result-button").first().elementHandle();
  for (let index = 0; index < 25; index++) await input.press("ArrowDown");
  await expect(page.locator(".result-button.is-selected")).toHaveText(/Reference 19/);
  expect(await firstRow!.evaluate(element => element.isConnected)).toBe(true);
  const visible = await page.locator(".result-button.is-selected").evaluate(element => {
    const row = element.getBoundingClientRect();
    const scroller = element.closest(".results-scroller")!.getBoundingClientRect();
    return row.top >= scroller.top && row.bottom <= scroller.bottom;
  });
  expect(visible, "keyboard-selected row stays in the scroll viewport").toBe(true);
  expect((await page.locator(".popup-shell").boundingBox())!.height).toBeLessThanOrEqual(560);
  await input.fill("Reference 2");
  await expect(page.locator(".result-button.is-selected")).toHaveText(/Reference 2/);
  await input.press("Control+Enter");
  await expect.poll(() => page.evaluate(() => window.__qbTest.closed)).toBe(1);
  expect(await page.evaluate(() => window.__qbTest.createdTabs[0])).toEqual({ url: "https://unique.example.com/2", index: 3 });
  expect(await page.evaluate(() => window.__qbTest.groupedTabs)).toEqual([{ tabIds: [8], groupId: 0 }]);
  expect(await page.locator("button button").count()).toBe(0);
});

test("folder picker promotes frequent folders, records successful saves, and leaves failures retryable", async ({ page }) => {
  await installChromeMock(page, { mode: "add", usage: { "2": { count: 3, lastUsed: 20 } } });
  await page.goto("/popup.html");
  const input = page.getByRole("textbox");
  await expect(input).toBeEnabled();
  await expect(page.locator(".result-button").first()).toHaveText(/Personal/);
  await page.evaluate(() => { window.__qbTest.failBookmarkSave = true; });
  await input.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Could not save bookmark.");
  await expect(input).toBeEnabled();
  expect(await page.evaluate(() => window.__qbTest.closed)).toBe(0);
  await page.evaluate(() => { window.__qbTest.failBookmarkSave = false; });
  await input.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__qbTest.closed)).toBe(1);
  const history = await page.evaluate(async () => (await chrome.storage.local.get("folderUsage")).folderUsage as Record<string, { count: number }>);
  expect(history["2"].count).toBe(4);
  expect(await page.evaluate(() => window.__qbTest.savedBookmarks[0].parentId)).toBe("2");
});

test("mode switching cleans up old views and bookmark menus stay usable", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/popup.html");
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.getByRole("button", { name: "More actions: Reference 0", exact: true }).click();
  await expect(page.getByText("Copy URL", { exact: true })).toBeVisible();
  await page.getByRole("textbox").press("Escape");
  await expect(page.locator(".popup-menu")).toBeHidden();
  await page.getByRole("textbox").press("Control+d");
  await expect(page.getByRole("heading", { name: "Quick Bookmark" })).toBeVisible();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.getByRole("textbox").press("Alt+f");
  await expect(page.getByRole("heading", { name: "Quick Open" })).toBeVisible();
  await expect(page.locator(".popup-view")).toHaveCount(1);
});

test("visible mode controls switch views and selecting the current mode keeps search intact", async ({ page }) => {
  await installChromeMock(page);
  await page.goto("/popup.html");
  const input = page.getByRole("textbox");
  await expect(input).toBeEnabled();
  await input.fill("Reference 1");
  const row = await page.locator(".result-button").first().elementHandle();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  expect(await row!.evaluate(element => element.isConnected)).toBe(true);
  await expect(input).toHaveValue("Reference 1");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quick Bookmark" })).toBeVisible();
  await expect(input).toHaveAttribute("placeholder", "Search folders...");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quick Open" })).toBeVisible();
  await expect(input).toBeFocused();
  await expect(page.getByRole("button", { name: "Playlists", exact: true })).toBeHidden();
});
