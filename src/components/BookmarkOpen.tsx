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

interface BookmarkItem {
  id: string;
  title: string;
  url: string;    // many bookmarks have url, folders do not
  path?: string;  // optional if you want to store folder path
}

export default function BookmarkOpen() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filtered, setFiltered] = useState<BookmarkItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const [fuse, setFuse] = useState<Fuse<BookmarkItem>>();

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchBookmarks();
  }, []);

  // Build fuse index after we load the bookmarks
  useEffect(() => {
    if (bookmarks.length > 0) {
      const fuseInstance = new Fuse(bookmarks, {
        keys: ['title', 'url'],
        threshold: 0.3
      });
      setFuse(fuseInstance);
      setFiltered(bookmarks);
      setActiveIndex(0);
    }
  }, [bookmarks]);

  // Scroll into view when activeIndex changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  // Recursively traverse all bookmarks, collect items that have url
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
    if (!node) return;

    // If this node has a url, it's a "leaf" bookmark
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title || '(Untitled)',
        url: node.url
      });
    }

    // If node has children, keep traversing
    if (node.children) {
      node.children.forEach((child) => collectBookmarks(child, result));
    }
  };

  // Fuzzy search by title/url
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

  // Open the selected bookmark in a new tab
  const handleOpenBookmark = (bookmark: BookmarkItem) => {
    chrome.tabs.create({ url: bookmark.url });
    window.close(); // close the popup
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleOpenBookmark(filtered[activeIndex]);
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
        label="Search Bookmarks"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        style={{ marginBottom: '1rem' }}
      />
      <List style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((bm, index) => {
          const isSelected = index === activeIndex;
          return (
            <ListItem
              key={bm.id}
              disablePadding
              ref={isSelected ? activeItemRef : null}
            >
              {/* Tooltip shows URL or any extra info you like */}
              <Tooltip title={bm.url} arrow>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleOpenBookmark(bm)}
                >
                  <ListItemText primary={bm.title} />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </>
  );
}
