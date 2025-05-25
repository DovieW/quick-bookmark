import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { BookmarkOutlined, OpenInNew } from '@mui/icons-material';
import Fuse from 'fuse.js';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export default function BookmarkOpen() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filtered, setFiltered] = useState<BookmarkItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  const fuse = useMemo(() => {
    if (bookmarks.length > 0) {
      return new Fuse(bookmarks, {
        keys: ['title'],
        threshold: 0.3
      });
    }
    return null;
  }, [bookmarks]);

  useEffect(() => { 
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchBookmarks();
  }, []);

  useEffect(() => {
    if (bookmarks.length > 0) {
      setFiltered(bookmarks);
      setActiveIndex(0);
    }
  }, [bookmarks]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  const fetchBookmarks = () => {
    chrome.bookmarks.getTree((nodes) => {
      const all: BookmarkItem[] = [];
      nodes.forEach((rootNode) => {
        collectBookmarks(rootNode, all);
      });
      setBookmarks(all);
    });
  };

  const collectBookmarks = (
    node: chrome.bookmarks.BookmarkTreeNode,
    result: BookmarkItem[]
  ) => {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title || '(Untitled)',
        url: node.url
      });
    }
    if (node.children) {
      node.children.forEach((child) => collectBookmarks(child, result));
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (!fuse || !term) {
      setFiltered(bookmarks);
      setActiveIndex(0);
      return;
    }

    const results = fuse.search(term).map((r) => r.item);
    setFiltered(results);
    setActiveIndex(0);
  };

  const handleOpenBookmark = async (bookmark: BookmarkItem, forceNewTab: boolean = false) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (forceNewTab) {
      // Create new tab next to current tab
      const newTab = await chrome.tabs.create({
        url: bookmark.url,
        index: currentTab.index + 1
      });

      // Check if the current tab is in a group and add the new tab to the same group
      if (currentTab.groupId && currentTab.groupId !== -1 && newTab.id) {
        try {
          await chrome.tabs.group({
            tabIds: [newTab.id],
            groupId: currentTab.groupId
          });
        } catch (error) {
          console.warn('Failed to add tab to group:', error);
        }
      }
    } else {
      // Navigate current tab to the bookmark URL
      chrome.tabs.update(currentTab.id!, { url: bookmark.url });
    }
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        // Open in new tab if Ctrl is held, otherwise open in current tab
        const forceNewTab = e.ctrlKey;
        handleOpenBookmark(filtered[activeIndex], forceNewTab);
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

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TextField
        inputRef={searchInputRef}
        placeholder="Search bookmarks..."
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
          {filtered.slice(0, 20).map((bm, index) => {
            const isSelected = index === activeIndex;
            return (
              <ListItem
                key={bm.id}
                disablePadding
                ref={isSelected ? activeItemRef : null}
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={(e) => handleOpenBookmark(bm, e.ctrlKey)}
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
                      <BookmarkOutlined fontSize="small" />
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
                        {bm.title}
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
                        {getDomainFromUrl(bm.url)}
                      </Typography>
                    </Box>

                    {isSelected && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        backgroundColor: alpha('#ffffff', 0.2),
                        color: 'white',
                        flexShrink: 0
                      }}>
                        <OpenInNew fontSize="small" sx={{ fontSize: 14 }} />
                      </Box>
                    )}
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
