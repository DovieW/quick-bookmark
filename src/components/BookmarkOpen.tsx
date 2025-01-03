import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip
} from '@mui/material';
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
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Build the Fuse index once whenever bookmarks changes
  const fuse = useMemo(() => {
    if (bookmarks.length > 0) {
      return new Fuse(bookmarks, {
        keys: ['title'],
        threshold: 0.3
      });
    }
    return null;
  }, [bookmarks]);

  // Focus the search input once on mount and fetch bookmarks
  useEffect(() => { 
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchBookmarks();
  }, []);

  // After bookmarks are loaded, set them as the default "filtered" set
  useEffect(() => {
    if (bookmarks.length > 0) {
      setFiltered(bookmarks);
      setActiveIndex(0);
    }
  }, [bookmarks]);

  // Scroll the active item into view
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

  // Handle search input
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

  // Open the selected bookmark
  const handleOpenBookmark = async (bookmark: BookmarkItem) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    chrome.tabs.create({
      url: bookmark.url,
      index: currentTab.index + 1
    });
    window.close();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleOpenBookmark(filtered[activeIndex]);
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
    <>
      <TextField
        inputRef={searchInputRef}
        label="Search Bookmarks"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        style={{ marginBottom: '1rem' }}
        sx={{ mt: 0.7 }}
      />
      <List style={{ overflowY: 'auto', maxHeight: 'calc(82%)' }}>
        {filtered.slice(0, 20).map((bm, index) => {
          const isSelected = index === activeIndex;
          return (
            <ListItem
              key={bm.id}
              disablePadding
              ref={isSelected ? activeItemRef : null}
            >
              {/* <Tooltip title={bm.url} arrow> */}
          <ListItemButton
            selected={isSelected}
            onClick={() => handleOpenBookmark(bm)}
          >
            <ListItemText
              primary={
                <>
                  {bm.title}
                  <span style={{ color: '#6b6b6b', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                    {bm.url}
                  </span>
                </>
              }
              style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            />
          </ListItemButton>
              {/* </Tooltip> */}
            </ListItem>
          );
        })}
      </List>
    </>
  );
}
