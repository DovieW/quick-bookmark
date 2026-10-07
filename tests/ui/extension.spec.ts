import { test, expect, chromium } from "@playwright/test";
import { resolve } from "node:path";

test("packaged extension exposes settings and updates search across actual extension pages", async () => {
  const extensionPath = resolve("dist");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium", headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ quickMode: "open" });
      await chrome.bookmarks.create({ parentId: "1", title: "A useful reference", url: "https://unique.example.com/reference" });
      for (const [title, url] of [
        ["Project notes", "https://docs.example.org/project-notes"],
        ["Design references", "https://studio.example.org/references"],
        ["Weekend recipes", "https://kitchen.example.org/recipes"],
        ["Reading list", "https://reading.example.org/saved"],
        ["Travel ideas", "https://travel.example.org/ideas"],
        ["Useful tools", "https://tools.example.org/collection"],
      ]) await chrome.bookmarks.create({ parentId: "1", title, url });
    });
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    const input = popup.getByRole("textbox");
    await expect(input).toBeEnabled();
    await input.fill("unique.example");
    await expect(popup.getByText("No bookmarks found.")).toBeVisible();
    const settings = await context.newPage();
    await settings.goto(`chrome-extension://${id}/options.html`);
    const checkbox = settings.getByLabel("Include URLs and domains");
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(settings.getByRole("status")).toHaveText("Settings saved.");
    await expect(popup.getByRole("button", { name: "A useful reference", exact: true })).toBeVisible();
    await settings.screenshot({ path: test.info().outputPath("settings.png") });
    await input.fill("");
    await popup.locator(".popup-shell").screenshot({ path: test.info().outputPath("popup.png") });
    await popup.getByRole("button", { name: "Save", exact: true }).click();
    await expect(popup.getByRole("textbox")).toBeEnabled();
    await popup.locator(".popup-shell").screenshot({ path: test.info().outputPath("folders.png") });
    await popup.getByRole("button", { name: "Open", exact: true }).click();
    await expect(input).toBeEnabled();
    await input.fill("unique.example");
    await settings.reload();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(popup.getByText("No bookmarks found.")).toBeVisible();
    expect(await worker.evaluate(() => chrome.runtime.getManifest().options_ui)).toEqual({ page: "options.html", open_in_tab: true });
  } finally { await context.close(); }
});
