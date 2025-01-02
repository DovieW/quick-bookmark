import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, Typography, Box } from '@mui/material';
import BookmarkOpen from './BookmarkOpen';
import FolderSearch from './FolderSearch';
import '../popup/popup.css'; // We'll put our custom scrollbar CSS here

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0D1117' },
    text: { primary: '#C9D1D9' }
  }
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

  return (
    <ThemeProvider theme={darkTheme}>
      {/* The outer Box has a fixed width/height, so the popup won’t auto-resize */}
      <Box
        sx={{
          width: 320,
          height: 500,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          color: 'text.primary',
          p: 2
        }}
      >
        <Typography variant="h6" gutterBottom>
          Quick Bookmark
        </Typography>

        {/* 
          This inner Box expands to fill remaining space (flex: 1),
          and makes the content scroll vertically if needed 
        */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {quickMode === 'open' ? <BookmarkOpen /> : <FolderSearch />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Popup;
