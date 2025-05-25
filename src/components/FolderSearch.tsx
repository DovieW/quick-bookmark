import React, { useEffect, useRef, useState } from 'react';
import {
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  alpha
} from '@mui/material';
import { FolderOutlined } from '@mui/icons-material';
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
  const activeItemRef = useRef<HTMLLIElement>(null);
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

  const traverseBookmarks = (
    node: chrome.bookmarks.BookmarkTreeNode,
    currentPath: string,
    folderList: BookmarkFolder[]
  ) => {
    if (!node) return;

    if (node.children) {
      if (node.title && node.title.trim() !== '') {
        const newPath = currentPath
          ? `${currentPath}/${node.title}`
          : node.title;

        folderList.push({
          id: node.id,
          title: node.title,
          path: newPath
        });

        node.children.forEach((child) => {
          traverseBookmarks(child, newPath, folderList);
        });
      } else {
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
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelectFolder(filtered[activeIndex].id);
      }
      return;
    }

    if ((e.ctrlKey && e.key.toLowerCase() === 'n') || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }

    if ((e.ctrlKey && e.key.toLowerCase() === 'p') || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TextField
        inputRef={searchInputRef}
        placeholder="Search folders..."
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        sx={{ 
          mb: 2,
          '& .MuiOutlinedInput-input': {
            fontSize: '0.95rem',
          }
        }}
      />
      
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        <List sx={{ py: 0.5, width: '100%', pr: 1 }}>
          {filtered.slice(0, 20).map((folder, index) => {
            const isSelected = index === activeIndex;

            return (
              <ListItem
                key={folder.id}
                disablePadding
                ref={isSelected ? activeItemRef : null}
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleSelectFolder(folder.id)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                    border: '1px solid transparent',
                    backgroundColor: isSelected 
                      ? alpha('#3B82F6', 0.15)
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: isSelected 
                        ? alpha('#3B82F6', 0.25)
                        : alpha('#64748B', 0.1),
                      transform: 'none', // Remove transform to prevent scrollbar
                    },
                    '&.Mui-selected': {
                      borderColor: 'primary.main',
                    },
                    // Prevent layout shifts
                    minHeight: 'auto',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    width: '100%',
                    gap: 1.5
                  }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      backgroundColor: isSelected 
                        ? 'primary.main' 
                        : alpha('#94A3B8', 0.2),
                      color: isSelected ? 'white' : 'text.secondary',
                      flexShrink: 0
                    }}>
                      <FolderOutlined fontSize="small" />
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          color: isSelected ? 'white' : 'text.primary',
                          mb: 0.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {folder.title}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: isSelected ? alpha('#ffffff', 0.8) : 'text.secondary',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                      >
                        {folder.path.replace(/^ROOT\//, '')}
                      </Typography>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}
