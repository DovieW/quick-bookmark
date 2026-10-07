import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(page);
    expect(errors, "no uncaught browser errors").toEqual([]);
  },
});
export { expect };

declare global {
  interface Window {
    __qbTest: {
      closed: number;
      optionsOpened: number;
      createdTabs: Record<string, unknown>[];
      updatedTabs: unknown[];
      groupedTabs: unknown[];
      savedBookmarks: Record<string, unknown>[];
      failBookmarkSave: boolean;
      failSettingsSave: boolean;
    };
  }
}

export async function installChromeMock(page: Page, options: {
  mode?: "open" | "add";
  youtube?: boolean;
  count?: number;
  initialSettings?: boolean;
  usage?: Record<string, { count: number; lastUsed: number }>;
} = {}) {
  await page.addInitScript(options => {
    const callbacks = new Map<string, Set<(...args: unknown[]) => void>>();
    const event = (name: string) => ({
      addListener(fn: (...args: unknown[]) => void) {
        if (!callbacks.has(name)) callbacks.set(name, new Set());
        callbacks.get(name)!.add(fn);
      },
      removeListener(fn: (...args: unknown[]) => void) { callbacks.get(name)?.delete(fn); },
    });
    const emit = (name: string, ...args: unknown[]) => callbacks.get(name)?.forEach(fn => fn(...args));
    window.__qbTest = { closed: 0, optionsOpened: 0, createdTabs: [], updatedTabs: [], groupedTabs: [],
      savedBookmarks: [], failBookmarkSave: false, failSettingsSave: false };
    window.close = () => { window.__qbTest.closed++; };
    const key = "quickBookmarkTestStorage";
    const initial: Record<string, unknown> = { quickMode: options.mode ?? "open", folderUsage: options.usage ?? {} };
    if (options.initialSettings !== undefined) initial.settings = { searchUrlsAndDomains: options.initialSettings };
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial));
    const session: Record<string, unknown> = { quickMode: options.mode ?? "open" };
    const area = (name: "local" | "session") => {
      const read = (): Record<string, unknown> => name === "local" ? JSON.parse(localStorage.getItem(key) ?? "{}") : session;
      return {
        async get(keys: string | string[]) {
          const data = read();
          return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]]));
        },
        async set(next: Record<string, unknown>) {
          if (next.settings && window.__qbTest.failSettingsSave) throw new Error("Storage unavailable");
          const data = read();
          const changes = Object.fromEntries(Object.keys(next).map(key => [key, { oldValue: data[key], newValue: next[key] }]));
          Object.assign(data, next);
          if (name === "local") localStorage.setItem(key, JSON.stringify(data));
          emit("storage", changes, name);
        },
        async remove(keys: string[]) {
          const data = read();
          const changes = Object.fromEntries(keys.map(key => [key, { oldValue: data[key] }]));
          keys.forEach(key => delete data[key]);
          if (name === "local") localStorage.setItem(key, JSON.stringify(data));
          emit("storage", changes, name);
        },
      };
    };
    window.addEventListener("storage", e => {
      if (e.key !== key) return;
      const before = JSON.parse(e.oldValue ?? "{}");
      const after = JSON.parse(e.newValue ?? "{}");
      const changes = Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map(key => [key, { oldValue: before[key], newValue: after[key] }]));
      emit("storage", changes, "local");
    });
    const bookmarks = Array.from({ length: options.count ?? 3 }, (_, index) => ({
      id: `b${index}`, parentId: "1", title: `Reference ${index}`,
      url: `https://unique.example.com/${index}`,
    }));
    const tree = [{ id: "0", title: "", children: [
      { id: "1", title: "Work", children: bookmarks },
      { id: "2", title: "Personal", children: [] },
      { id: "3", title: "Research", children: [] },
    ] }];
    const mock = {
      runtime: {
        getManifest: () => ({ oauth2: { client_id: "test-client" } }),
        async openOptionsPage() { window.__qbTest.optionsOpened++; },
        async sendMessage() { return { ok: true }; },
      },
      storage: { local: area("local"), session: area("session"), onChanged: event("storage") },
      identity: { async getAuthToken() { return { token: "test-token" }; }, async removeCachedAuthToken() {} },
      tabs: {
        async query() { return [{ id: 7, index: 2, groupId: 0, title: "Example page",
          url: options.youtube ? "https://www.youtube.com/watch?v=abcdefghijk" : "https://example.org/" }]; },
        async create(details: Record<string, unknown>) { window.__qbTest.createdTabs.push(details); return { id: 8 }; },
        async update(...args: unknown[]) { window.__qbTest.updatedTabs.push(args); },
        async group(details: unknown) { window.__qbTest.groupedTabs.push(details); },
      },
      bookmarks: {
        async getTree() { return structuredClone(tree); },
        async create(details: Record<string, unknown>) {
          if (window.__qbTest.failBookmarkSave) throw new Error("Could not save bookmark.");
          window.__qbTest.savedBookmarks.push(details);
          emit("created");
          return { id: "new" };
        },
        onCreated: event("created"), onRemoved: event("removed"), onChanged: event("changed"),
        onMoved: event("moved"), onChildrenReordered: event("reordered"), onImportEnded: event("imported"),
      },
    };
    Object.defineProperty(window, "chrome", { configurable: true, value: mock });
  }, options);
}
