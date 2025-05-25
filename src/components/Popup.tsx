import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, Typography, Box, Chip } from '@mui/material';
import { BookmarkAdd, Search } from '@mui/icons-material';
import BookmarkOpen from './BookmarkOpen';
import FolderSearch from './FolderSearch';
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

  const isOpenMode = quickMode === 'open';

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          width: 380,
          height: 520,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          color: 'text.primary',
          p: 3,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        }}
      >
        {/* Header with improved styling */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 3,
          pb: 2,
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
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            color: 'white'
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

        {/* Content area with improved scrolling */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          minWidth: 0, // Prevent flex item from growing beyond container
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#475569',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: '#64748B',
            },
          },
        }}>
          {isOpenMode ? <BookmarkOpen /> : <FolderSearch />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Popup;
