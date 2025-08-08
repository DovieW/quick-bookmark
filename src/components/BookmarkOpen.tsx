import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  alpha,
  IconButton,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import { BookmarkOutlined, FolderOpen, ContentCopy, Language, MoreVert } from '@mui/icons-material';
import Fuse from 'fuse.js';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  parentId?: string;
}

export default function BookmarkOpen() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filtered, setFiltered] = useState<BookmarkItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuBookmark, setMenuBookmark] = useState<BookmarkItem | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState<{ top: number; height: number; left: number; width: number } | null>(null);
  const activeButtonRef = useRef<HTMLDivElement>(null); // NEW ref for precise measurement

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

  useEffect(() => {
    // Ensure activeIndex is always within bounds when filtered array changes
    const maxDisplayedIndex = Math.min(filtered.length - 1, 19);
    if (filtered.length > 0 && activeIndex > maxDisplayedIndex) {
      setActiveIndex(maxDisplayedIndex);
    } else if (filtered.length === 0) {
      setActiveIndex(0);
    }
  }, [filtered, activeIndex]);

  useEffect(() => {
    // Recompute highlight box using offset values for better alignment
    if (filtered.length === 0) {
      setHighlight(null);
      return;
    }
    if (activeItemRef.current && activeButtonRef.current) {
      const item = activeItemRef.current; // The ListItem
      const btn = activeButtonRef.current as HTMLDivElement;
      const GUTTER = 3; // horizontal inset to avoid left clipping
      // Use offset* to avoid subpixel transform issues
      const top = item.offsetTop; // Correctly measure from the ListItem
      const height = btn.offsetHeight;
      const width = btn.offsetWidth - GUTTER * 2;
      setHighlight({ top, height, left: GUTTER, width });
    }
  }, [activeIndex, filtered]);

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
        url: node.url,
        parentId: node.parentId
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

  const handleOpenBookmarkAtEnd = async (bookmark: BookmarkItem) => {
    // Create a new tab at the end of all tabs
    await chrome.tabs.create({ url: bookmark.url });
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0 && activeIndex < filtered.length) {
        if (e.ctrlKey && e.shiftKey) {
          handleOpenBookmarkAtEnd(filtered[activeIndex]);
        } else {
          // Open in new tab if Ctrl is held, otherwise open in current tab
          const forceNewTab = e.ctrlKey;
          handleOpenBookmark(filtered[activeIndex], forceNewTab);
        }
      }
      return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === 'n') || e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        const maxDisplayedIndex = Math.min(filtered.length - 1, 19); // Only go to the last displayed item
        setActiveIndex((prev) => Math.min(prev + 1, maxDisplayedIndex));
      }
      return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === 'p') || e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
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

  const extractHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (_) {
        console.warn('Clipboard copy failed');
      }
    }
  };

  const handleOpenBookmarkManagerToFolder = async (bookmark: BookmarkItem) => {
    if (!bookmark.parentId) return;
    const managerUrl = `chrome://bookmarks/?id=${bookmark.parentId}`;
    await chrome.tabs.create({ url: managerUrl });
    window.close();
  };

  const handleOpenActionsMenu = (
    event: React.MouseEvent<HTMLElement>,
    bookmark: BookmarkItem
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuBookmark(bookmark);
  };

  const handleCloseActionsMenu = () => {
    setMenuAnchorEl(null);
    setMenuBookmark(null);
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
        <List sx={{ py: 0.5, width: '100%', pr: 1, position: 'relative' }} ref={listRef}>
          {highlight && (
            <Box
              sx={{
                position: 'absolute',
                top: highlight.top,
                left: highlight.left,
                width: highlight.width,
                height: highlight.height,
                // background: 'linear-gradient(90deg, rgba(59,130,246,0.30), rgba(59,130,246,0.18) 55%, rgba(59,130,246,0.05))',
                background: 'rgba(59,130,246,0.30)',
                borderRadius: 2,
                boxShadow: '0 1px 2px rgba(0,0,0,0.35), 0 0 0 1px rgba(59,130,246,0.45)',
                backdropFilter: 'blur(1.5px)',
                WebkitBackdropFilter: 'blur(1.5px)',
                pointerEvents: 'none',
                transition: 'top 140ms cubic-bezier(.4,0,.2,1), height 140ms, width 140ms',
                zIndex: 0,
                willChange: 'top,height,width'
              }}
            />
          )}
          {filtered.slice(0, 20).map((bm, index) => {
            const isSelected = index === activeIndex && activeIndex < filtered.length;
            return (
              <ListItem
                key={bm.id}
                disablePadding
                ref={isSelected ? activeItemRef : null}
                sx={{ mb: 0.5, position: 'relative', zIndex: 1 }}
              >
                <ListItemButton
                  // @ts-ignore capture root element
                  ref={isSelected ? activeButtonRef : null}
                  selected={isSelected}
                  onClick={(e) => handleOpenBookmark(bm, e.ctrlKey)}
                  sx={{
                    my: 0, // kill default vertical margin (was causing extra top/bottom space)
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                    border: '1px solid transparent',
                    backgroundColor: 'transparent !important',
                    '&:hover': {
                      backgroundColor: isSelected ? 'transparent' : 'rgba(100,116,139,0.12)',
                      transform: 'none'
                    },
                    '&.Mui-selected': { borderColor: 'transparent' },
                    minHeight: 'auto',
                    overflow: 'hidden'
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
                      backgroundColor: isSelected ? 'primary.main' : 'rgba(148,163,184,0.20)',
                      color: isSelected ? 'white' : 'text.secondary',
                      flexShrink: 0,
                      transition: 'background-color 140ms, color 140ms'
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
                          whiteSpace: 'nowrap',
                          transition: 'color 140ms'
                        }}
                      >
                        {bm.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          transition: 'color 140ms'
                        }}
                      >
                        {getDomainFromUrl(bm.url)}
                      </Typography>
                    </Box>
                    {/* Action button wrapper always mounted so we can animate smoothly */}
                    <Box
                      sx={{
                        width: 32, // reserve horizontal space (icon + some gap)
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flexShrink: 0,
                        position: 'relative'
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'opacity 160ms ease, transform 180ms cubic-bezier(.4,0,.2,1)',
                          opacity: isSelected ? 1 : 0,
                          transform: isSelected ? 'translateX(0)' : 'translateX(4px)',
                          pointerEvents: isSelected ? 'auto' : 'none'
                        }}
                      >
                        <Tooltip title="More actions" disableInteractive>
                          <IconButton
                            size="small"
                            sx={{
                              width: 28,
                              height: 28,
                              color: 'white',
                              backgroundColor: 'rgba(255,255,255,0.22)',
                              '&:hover': { backgroundColor: 'rgba(255,255,255,0.32)' },
                              transition: 'background-color 140ms'
                            }}
                            onClick={(e) => handleOpenActionsMenu(e, bm)}
                          >
                            <MoreVert sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleCloseActionsMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                if (menuBookmark) {
                  handleOpenBookmarkManagerToFolder(menuBookmark);
                }
                handleCloseActionsMenu();
              }}
            >
              <FolderOpen fontSize="small" style={{ marginRight: 8 }} />
              Open manager to folder
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (menuBookmark) copyToClipboard(menuBookmark.url);
                handleCloseActionsMenu();
              }}
            >
              <ContentCopy fontSize="small" style={{ marginRight: 8 }} />
              Copy URL
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (menuBookmark) copyToClipboard(extractHostname(menuBookmark.url));
                handleCloseActionsMenu();
              }}
            >
              <Language fontSize="small" style={{ marginRight: 8 }} />
              Copy domain
            </MenuItem>
          </Menu>
        </List>
      </Box>
    </Box>
  );
}
