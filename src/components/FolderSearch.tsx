import React, { useEffect, useRef, useState } from 'react';
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
  Tooltip
} from '@mui/material';
import { FolderOutlined, FolderOpen } from '@mui/icons-material';
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
  const listRef = useRef<HTMLUListElement>(null); // highlight container
  const [highlight, setHighlight] = useState<{ top: number; height: number; left: number; width: number } | null>(null);
  const activeButtonRef = useRef<HTMLDivElement>(null);
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
      if (filtered.length > 0 && activeIndex < filtered.length) {
        handleSelectFolder(filtered[activeIndex].id);
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

  const handleOpenBookmarkManagerToFolder = async (folderId: string) => {
    const managerUrl = `chrome://bookmarks/?id=${folderId}`;
    await chrome.tabs.create({ url: managerUrl });
    window.close();
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
          {filtered.slice(0, 20).map((folder, index) => {
            const isSelected = index === activeIndex && activeIndex < filtered.length;
            return (
              <ListItem
                key={folder.id}
                disablePadding
                ref={isSelected ? activeItemRef : null}
                sx={{ mb: 0.5, position: 'relative', zIndex: 1 }}
              >
                <ListItemButton
                  // @ts-ignore
                  ref={isSelected ? activeButtonRef : null}
                  selected={isSelected}
                  onClick={() => handleSelectFolder(folder.id)}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
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
                          whiteSpace: 'nowrap',
                          transition: 'color 140ms'
                        }}
                      >
                        {folder.title}
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
                        {folder.path.replace(/^ROOT\//, '')}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 32,
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
                        <Tooltip title="Open manager to folder" disableInteractive>
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenBookmarkManagerToFolder(folder.id);
                            }}
                          >
                            <FolderOpen sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
