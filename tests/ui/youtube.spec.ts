import { test, expect, installChromeMock } from "./helpers";

test("playlist picker shows membership and an explicit Remove action", async ({ page }) => {
  await installChromeMock(page, { youtube: true, mode: "add" });
  const mutations: string[] = [];
  await page.route("https://www.googleapis.com/youtube/v3/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "DELETE") {
      mutations.push("DELETE");
      await route.fulfill({ status: 204 });
    } else if (url.pathname.endsWith("/playlists")) {
      await route.fulfill({ json: { items: [{ id: "PLsaved", snippet: { title: "Saved videos" }, contentDetails: { itemCount: 12 } }] } });
    } else {
      expect(url.searchParams.get("videoId")).toBe("abcdefghijk");
      await route.fulfill({ json: { items: [{ id: "item-1", snippet: { resourceId: { videoId: "abcdefghijk" } } }] } });
    }
  });
  await page.goto("/popup.html");
  await expect(page.getByText("12 videos · Already added")).toBeVisible();
  const remove = page.getByRole("button", { name: "Remove: Saved videos", exact: true });
  await expect(remove).toBeEnabled();
  await page.locator(".popup-shell").screenshot({ path: test.info().outputPath("playlist.png") });
  await remove.click();
  await expect.poll(() => page.evaluate(() => window.__qbTest.closed)).toBe(1);
  expect(mutations).toEqual(["DELETE"]);
});

test("slow membership checks block submission; repeated Enter sends only one Add", async ({ page }) => {
  await installChromeMock(page, { youtube: true, mode: "add" });
  let reads = 0;
  let adds = 0;
  let releaseCheck!: () => void;
  const checkGate = new Promise<void>(resolve => { releaseCheck = resolve; });
  let releaseAdd!: () => void;
  const addGate = new Promise<void>(resolve => { releaseAdd = resolve; });
  await page.route("https://www.googleapis.com/youtube/v3/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      adds++;
      await addGate;
      await route.fulfill({ json: { id: "new-item" } });
    } else if (url.pathname.endsWith("/playlists")) {
      await route.fulfill({ json: { items: [{ id: "PLsaved", snippet: { title: "Saved videos" }, contentDetails: { itemCount: 0 } }] } });
    } else {
      reads++;
      if (reads === 1) await checkGate;
      await route.fulfill({ json: { items: [] } });
    }
  });
  await page.goto("/popup.html");
  const input = page.getByRole("textbox");
  await expect(page.getByRole("button", { name: "Checking…: Saved videos" })).toBeDisabled();
  await input.press("Enter");
  expect(adds).toBe(0);
  releaseCheck();
  await expect(page.getByRole("button", { name: "Add: Saved videos", exact: true })).toBeEnabled();
  await input.press("Enter");
  await expect.poll(() => adds).toBe(1);
  await page.keyboard.press("Enter");
  expect(adds).toBe(1);
  releaseAdd();
  await expect.poll(() => page.evaluate(() => window.__qbTest.closed)).toBe(1);
});

test("failed membership lookup offers a read-only Retry and permits mode switching", async ({ page }) => {
  await installChromeMock(page, { youtube: true, mode: "add" });
  let fail = true;
  const mutations: string[] = [];
  await page.route("https://www.googleapis.com/youtube/v3/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") mutations.push(route.request().method());
    if (url.pathname.endsWith("/playlists")) {
      await route.fulfill({ json: { items: [{ id: "PLsaved", snippet: { title: "Saved videos" }, contentDetails: { itemCount: 0 } }] } });
    } else if (fail) {
      await route.fulfill({ status: 403, json: { error: { message: "Quota exceeded" } } });
    } else await route.fulfill({ json: { items: [] } });
  });
  await page.goto("/popup.html");
  await expect(page.getByRole("button", { name: "Retry: Saved videos" })).toBeEnabled();
  fail = false;
  await page.getByRole("button", { name: "Retry: Saved videos" }).click();
  await expect(page.getByRole("button", { name: "Add: Saved videos", exact: true })).toBeEnabled();
  expect(mutations).toEqual([]);
  await page.getByRole("textbox").press("Control+d");
  await expect(page.getByRole("heading", { name: "Quick Bookmark" })).toBeVisible();
  await expect(page.getByRole("textbox")).toBeEnabled();
});
