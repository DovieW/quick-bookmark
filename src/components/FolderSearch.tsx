import React, { useEffect, useRef, useState } from 'react';
import {
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip
} from '@mui/material';
import Fuse from 'fuse.js';

interface BookmarkFolder {
  id: string;
  title: string;
  path: string; // full path, excluding any "ROOT"
}

export default function FolderSearch() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filtered, setFiltered] = useState<BookmarkFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // We'll store a ref to the currently selected item so we can scroll it into view
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Fuse.js instance
  const [fuse, setFuse] = useState<Fuse<BookmarkFolder>>();

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchFolders();
  }, []);

  useEffect(() => {
    if (folders.length > 0) {
      const fuseInstance = new Fuse(folders, {
        keys: ['title', 'path'],
        threshold: 0.3
      });
      setFuse(fuseInstance);
      setFiltered(folders);
      setActiveIndex(0);
    }
  }, [folders]);

  // Scroll selected item into view whenever activeIndex changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  const fetchFolders = () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allFolders: BookmarkFolder[] = [];
      bookmarkTreeNodes.forEach((rootNode) => {
        traverseBookmarks(rootNode, '', allFolders);
      });
      setFolders(allFolders);
    });
  };

  /**
   * Recursively traverse the bookmark tree. If `node.title` is empty,
   * that usually indicates the Chrome root node. We skip pushing it
   * (so the user never sees "ROOT") but we continue traversing its children.
   */
  const traverseBookmarks = (
    node: chrome.bookmarks.BookmarkTreeNode,
    currentPath: string,
    folderList: BookmarkFolder[]
  ) => {
    if (!node) return;

    if (node.children) {
      // If node.title is empty => skip adding "ROOT"
      if (node.title && node.title.trim() !== '') {
        // Build the new path
        const newPath = currentPath
          ? `${currentPath}/${node.title}`
          : node.title;

        folderList.push({
          id: node.id,
          title: node.title,
          path: newPath
        });

        // Recurse children with the new path
        node.children.forEach((child) => {
          traverseBookmarks(child, newPath, folderList);
        });
      } else {
        // This is a root-level node with empty title.
        // Skip adding it to the folderList, but still traverse children
        node.children.forEach((child) => {
          traverseBookmarks(child, currentPath, folderList);
        });
      }
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (!fuse || !term) {
      setFiltered(folders);
      setActiveIndex(0);
      return;
    }

    const results = fuse.search(term).map((r) => r.item);
    setFiltered(results);
    setActiveIndex(0);
  };

  const handleSelectFolder = async (folderId: string) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab) {
      chrome.bookmarks.create({
        parentId: folderId,
        title: currentTab.title ?? 'Untitled',
        url: currentTab.url
      });
      window.close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Press Enter => create bookmark in active folder
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelectFolder(filtered[activeIndex].id);
      }
      return;
    }

    // ArrowDown or Ctrl+N => move down
    if ((e.ctrlKey && e.key.toLowerCase() === 'n') || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }

    // ArrowUp or Ctrl+P => move up
    if ((e.ctrlKey && e.key.toLowerCase() === 'p') || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
  };

  return (
    <>
      <TextField
        inputRef={searchInputRef}
        label="Search Folders"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        style={{ marginBottom: '1rem' }}
      />
      {/* Increase the list's maxHeight if you want more visible space */}
      <List style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((folder, index) => {
          const isSelected = index === activeIndex;

          return (
            <ListItem
              key={folder.id}
              disablePadding
              // If this is the selected item, attach our ref for scrolling
              ref={isSelected ? activeItemRef : null}
            >
              <Tooltip
                // Remove "ROOT" if it ever appears at start of path:
                title={folder.path.replace(/^ROOT\//, '')}
                arrow
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleSelectFolder(folder.id)}
                >
                  <ListItemText primary={folder.title} />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </>
  );
}
