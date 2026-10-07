import { readBookmarkData, subscribeToBookmarks, type BookmarkFolder } from "../bookmarks";
import { rankFolders, readFolderUsage, recordFolderUse } from "../folderUsage";
import { createFuzzyFilter } from "../search";
import { createPicker, type ViewController } from "./Picker";

export function mountFolderSearch(container: HTMLElement): ViewController {
  const picker = createPicker<BookmarkFolder>(container, {
    placeholder: "Search folders...",
    emptyLabel: "No folders found.",
    itemLabel: "folders", selectLabel: "Save",
    filter: createFuzzyFilter({ keys: ["title", "path"] }),
    describe: folder => ({
      title: folder.title,
      subtitle: folder.path.slice(0, -(folder.title.length + 1)).replace(/\//g, " / ") || "Top-level folder",
      icon: "folder",
    }),
    async onSelect(folder) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) throw new Error("This tab has no URL to bookmark.");
      await chrome.bookmarks.create({ parentId: folder.id, title: tab.title ?? "Untitled", url: tab.url });
      // The bookmark is saved even if local ranking history cannot be updated.
      await recordFolderUse(folder.id).catch(error => console.warn("Folder history could not be saved", error));
      window.close();
    },
    secondaryAction: {
      label: "Open manager to folder", icon: "folder-open",
      async run(folder) {
        await chrome.tabs.create({ url: `chrome://bookmarks/?id=${folder.id}` });
        window.close();
      },
    },
  });
  let request = 0;
  const refresh = async () => {
    const currentRequest = ++request;
    try {
      const [data, usage] = await Promise.all([readBookmarkData(), readFolderUsage()]);
      if (!picker.destroyed && currentRequest === request) {
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
