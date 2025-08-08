import React, { useEffect, useState, Suspense } from 'react';
import { ThemeProvider, createTheme, Typography, Box, Chip } from '@mui/material';
import { BookmarkAdd, Search } from '@mui/icons-material';
const BookmarkOpen = React.lazy(() => import('./BookmarkOpen'));
const FolderSearch = React.lazy(() => import('./FolderSearch'));
import '../popup/popup.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#1D4ED8',
    },
    secondary: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#0F172A',
      paper: '#1E293B',
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
    divider: '#334155',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#1E293B',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#293548',
            },
            '&.Mui-focused': {
              backgroundColor: '#293548',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#3B82F6',
                borderWidth: 2,
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#475569',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94A3B8',
            '&.Mui-focused': {
              color: '#3B82F6',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 0',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#293548',
            // Removed transform to prevent scrollbar issues
          },
          '&.Mui-selected': {
            backgroundColor: '#3B82F6',
            '&:hover': {
              backgroundColor: '#2563EB',
            },
          },
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: '8px 0',
        },
      },
    },
  },
});

const Popup = () => {
  const [quickMode, setQuickMode] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['quickMode'], (result) => {
      if (result.quickMode) {
        setQuickMode(result.quickMode);
      } 
    });
  }, []);

  // Allow switching modes while popup is already open using the same shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl + D => add mode
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
        if (quickMode !== 'add') {
          e.preventDefault();
          e.stopPropagation();
          chrome.storage.local.set({ quickMode: 'add' });
          setQuickMode('add');
        } else {
          // prevent browser default bookmarking even if already in mode
          e.preventDefault();
          e.stopPropagation();
        }
      }
      // Alt + F => open mode
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        if (quickMode !== 'open') {
          e.preventDefault();
          e.stopPropagation();
          chrome.storage.local.set({ quickMode: 'open' });
          setQuickMode('open');
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true } as any);
  }, [quickMode]);

  // lock outer body scrolling and size
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalMargin = document.body.style.margin;
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.margin = originalMargin;
    };
  }, []);

  const isOpenMode = quickMode === 'open';

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          width: 520,
          height: 560, // within Chrome popup max to prevent outer scroll
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          color: 'text.primary',
          p: 2.5,
        }}
      >
        {/* Header simplified (no gradients) */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: '#1E293B',
            color: 'text.primary'
          }}>
            {isOpenMode ? <Search /> : <BookmarkAdd />}
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {isOpenMode ? 'Quick Open' : 'Quick Bookmark'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              {isOpenMode ? 'Search and open bookmarks' : 'Save to folder'}
            </Typography>
          </Box>

          <Chip 
            label={isOpenMode ? 'Alt+F' : 'Ctrl+D'} 
            size="small"
            sx={{ 
              backgroundColor: 'background.paper',
              color: 'text.secondary',
              fontSize: '0.75rem',
              height: 24
            }}
          />
        </Box>

        {/* Content area */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          width: '100%',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#475569',
            borderRadius: '3px',
            '&:hover': { backgroundColor: '#64748B' }
          }
        }}>
          <Suspense fallback={<Box sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>Loading…</Box>}>
            {isOpenMode ? <BookmarkOpen /> : <FolderSearch />}
          </Suspense>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Popup;
