import React, { useEffect, useRef, useState } from 'react';
import { TextField, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
// For real fuzzy search, consider using fuse.js
// import Fuse from 'fuse.js';

interface BookmarkFolder {
  id: string;
  title: string;
  children?: BookmarkFolder[];
}

export default function FolderSearch() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filtered, setFiltered] = useState<BookmarkFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search field when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchFolders();
  }, []);

  // Retrieve all bookmark folders from Chrome
  const fetchFolders = () => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      const allFolders: BookmarkFolder[] = [];
      traverseBookmarks(bookmarkTreeNodes, allFolders);
      setFolders(allFolders);
      setFiltered(allFolders);
    });
  };

  const traverseBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[], folderList: BookmarkFolder[]) => {
    nodes.forEach((node) => {
      if (node.children) {
        // It's a folder
        folderList.push({ id: node.id, title: node.title, children: node.children as any });
        traverseBookmarks(node.children, folderList);
      }
    });
  };

  // Simple fuzzy search (case-insensitive contains)
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFiltered(folders);
    } else {
      const lower = term.toLowerCase();
      const newFiltered = folders.filter((folder) => folder.title.toLowerCase().includes(lower));
      setFiltered(newFiltered);
    }
  };

  // Add current tab as a bookmark to the selected folder
  const handleSelectFolder = async (folderId: string) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab) {
      chrome.bookmarks.create({
        parentId: folderId,
        title: currentTab.title ?? 'Untitled',
        url: currentTab.url
      });
      window.close(); // close the popup after bookmarking
    }
  };

  // If user presses Enter in the search field, bookmark into the top result
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelectFolder(filtered[0].id);
      }
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
      <List style={{ maxHeight: 200, overflowY: 'auto' }}>
        {filtered.map((folder) => (
          <ListItem
            key={folder.id}
            disablePadding
          >
            <ListItemButton onClick={() => handleSelectFolder(folder.id)}>
              <ListItemText primary={folder.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
