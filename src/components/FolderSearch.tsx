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
  path: string; // full path
}

export default function FolderSearch() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filtered, setFiltered] = useState<BookmarkFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0); // tracks which item is "selected"
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setActiveIndex(0); // reset activeIndex to top
    }
  }, [folders]);

  // Fetch all bookmark folders
  const fetchFolders = () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allFolders: BookmarkFolder[] = [];
      bookmarkTreeNodes.forEach((rootNode) => {
        traverseBookmarks(rootNode, '', allFolders);
      });
      setFolders(allFolders);
    });
  };

  // Recursively traverse
  const traverseBookmarks = (
    node: chrome.bookmarks.BookmarkTreeNode,
    currentPath: string,
    folderList: BookmarkFolder[]
  ) => {
    if (!node) return;
    if (node.children) {
      const folderTitle = node.title || 'ROOT';
      const newPath = currentPath
        ? `${currentPath}/${folderTitle}`
        : folderTitle;

      folderList.push({
        id: node.id,
        title: folderTitle,
        path: newPath
      });

      node.children.forEach((child) => {
        traverseBookmarks(child, newPath, folderList);
      });
    }
  };

  // Fuzzy search
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

  // Create bookmark in selected folder
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

  // Keyboard handling for Enter, Arrow Up/Down, Ctrl+N, Ctrl+P
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // ENTER => select active item
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelectFolder(filtered[activeIndex].id);
      }
      return;
    }

    // Combine checks for Ctrl+N or ArrowDown => move down
    if ((e.ctrlKey && e.key.toLowerCase() === 'n') || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= filtered.length ? filtered.length - 1 : next;
      });
      return;
    }

    // Combine checks for Ctrl+P or ArrowUp => move up
    if ((e.ctrlKey && e.key.toLowerCase() === 'p') || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? 0 : next;
      });
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
      <List style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((folder, index) => {
          const isSelected = index === activeIndex;
          return (
            <ListItem key={folder.id} disablePadding>
              <Tooltip title={folder.path} arrow>
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
