import React, { useEffect, useRef, useState } from 'react';
import { TextField, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import Fuse from 'fuse.js';

interface BookmarkFolder {
  id: string;
  title: string;
  path: string; // full path from root to this folder
  children?: BookmarkFolder[];
}

export default function FolderSearch() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filtered, setFiltered] = useState<BookmarkFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fuse.js instance
  const [fuse, setFuse] = useState<Fuse<BookmarkFolder>>();

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchFolders();
  }, []);

  // Create the Fuse instance whenever folders update
  useEffect(() => {
    if (folders.length > 0) {
      console.log('Folders fetched:', folders);
      const fuseInstance = new Fuse(folders, {
        keys: ['title', 'path'], // Fuzzy match against folder name & full path
        includeScore: false,
        threshold: 0.2           // Adjust for how “fuzzy” you want matching
      });
      setFuse(fuseInstance);
      setFiltered(folders);
    }
  }, [folders]);

  const fetchFolders = () => {
    console.log('fetchFolders: calling chrome.bookmarks.getTree...');
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      console.log('bookmarkTreeNodes:', bookmarkTreeNodes);
      const allFolders: BookmarkFolder[] = [];
      // We start from root; each rootNode can have children for "Bookmarks Bar," "Other bookmarks," etc.
      bookmarkTreeNodes.forEach((rootNode) => {
        traverseBookmarks(rootNode, '', allFolders);
      });
      setFolders(allFolders);
    });
  };

  /**
   * Recursively traverse the bookmark tree. If we encounter a folder,
   * we build its full path and push it to `folderList`.
   * 
   * Note: Chrome's top-level node often has an empty string for `node.title`,
   * so we provide a fallback if needed.
   */
  const traverseBookmarks = (
    node: chrome.bookmarks.BookmarkTreeNode,
    currentPath: string,
    folderList: BookmarkFolder[]
  ) => {
    if (!node) return;

    // If the node has children, it’s a folder or a hierarchy
    if (node.children) {
      // Fallback title if node.title is an empty string
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

  /**
   * Handle fuzzy search using fuse.js
   */
  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (!fuse || !term) {
      // If no search term, show all
      setFiltered(folders);
      return;
    }

    const results = fuse.search(term).map((r) => r.item);
    setFiltered(results);
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
      window.close(); // Close popup
    }
  };

  /**
   * Pressing Enter in the search box will create a bookmark in
   * the topmost folder from filtered results.
   */
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
          <ListItem key={folder.id} disablePadding>
            <ListItemButton onClick={() => handleSelectFolder(folder.id)}>
              {/* We only display the folder's immediate title, 
                  but the fuzzy search includes the full path in 'folder.path' */}
              <ListItemText primary={folder.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
