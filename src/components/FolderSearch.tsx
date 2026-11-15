import { readBookmarkData, subscribeToBookmarks, type BookmarkFolder } from "../bookmarks";
import { rankFolders, readFolderUsage, recordFolderUse } from "../folderUsage";
import { createFuzzyFilter } from "../search";
import { createPicker, type ViewController } from "./Picker";

export function mountFolderSearch(container: HTMLElement): ViewController {
  let bookmarksBarTitle = "Bookmarks bar";
  const picker = createPicker<BookmarkFolder>(container, {
    placeholder: "Search folders...",
    emptyLabel: "No folders found.",
    itemLabel: "folders", selectLabel: "Save",
    filter: createFuzzyFilter({ keys: ["title", "path"] }),
    describe: folder => {
      const parent = folder.path.slice(0, -(folder.title.length + 1));
      return {
        title: folder.title,
        subtitle: parent === bookmarksBarTitle ? "" : parent.replace(/\//g, " / "),
        tooltip: folder.path.replace(/\//g, " / "),
        icon: "folder",
      };
    },
    async onSelect(folder) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) throw new Error("This tab has no URL to bookmark.");
      await chrome.bookmarks.create({ parentId: folder.id, title: tab.title ?? "Untitled", url: tab.url });
      // The bookmark is saved even if local ranking history cannot be updated.
      await recordFolderUse(folder.id).catch(error => console.warn("Folder history could not be saved", error));
      window.close();
    },
    secondaryAction: {
      label: "Open folder", icon: "external-link",
      async run(folder) {
        await chrome.tabs.create({ url: `chrome://bookmarks/?id=${folder.id}` });
        window.close();
      },
    },
  });
  const context = document.createElement("div");
  context.className = "page-context";
  const label = document.createElement("span");
  label.textContent = "Saving";
  const pageTitle = document.createElement("span");
  pageTitle.className = "page-context-title";
  pageTitle.textContent = "Current page";
  context.append(label, pageTitle);
  picker.root.insertBefore(context, picker.input.parentElement);
  void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (picker.destroyed) return;
    pageTitle.textContent = tab?.title || tab?.url || "Current page";
    context.title = [tab?.title, tab?.url].filter(Boolean).join("\n");
  }).catch(() => { /* Saving reports an actionable error if the tab cannot be read. */ });
  let request = 0;
  const refresh = async () => {
    const currentRequest = ++request;
    try {
      const [data, usage] = await Promise.all([readBookmarkData(), readFolderUsage()]);
      if (!picker.destroyed && currentRequest === request) {
        bookmarksBarTitle = data.folders.find(folder => folder.id === "1")?.title ?? "Bookmarks bar";
        picker.setItems(rankFolders(data.folders, usage));
        picker.setLoading(false);
      }
    } catch (error) {
      if (!picker.destroyed && currentRequest === request) {
        picker.setLoading(false);
        picker.setError(error);
      }
    }
  };
  const unsubscribe = subscribeToBookmarks(() => { void refresh(); });
  void refresh();
  return { destroy() { unsubscribe(); picker.destroy(); } };
}
