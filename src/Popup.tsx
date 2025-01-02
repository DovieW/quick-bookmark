import React, { useEffect, useState } from 'react';
import { createTheme, ThemeProvider, Typography } from '@mui/material';
import FolderSearch from './components/FolderSearch';
import BookmarkOpen from './components/BookmarkOpen';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0D1117' },
    text: { primary: '#C9D1D9' }
  }
});

export default function Popup() {
  const [mode, setMode] = useState<'bookmark' | 'open'>('bookmark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check storage to see if we have 'quickMode'
    chrome.storage.session.get('quickMode').then((res) => {
      if (res.quickMode === 'open') {
        setMode('open');
      } else {
        setMode('bookmark');
      }
      setLoaded(true);

      // Reset quickMode so next invocation returns to default
      chrome.storage.session.remove('quickMode');
    });
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ minWidth: 300, minHeight: 400, padding: '1rem' }}>
        {!loaded ? (
          <Typography variant="body1">Loading...</Typography>
        ) : mode === 'open' ? (
          <>
            <Typography variant="h6" gutterBottom>
              Quick Open
            </Typography>
            <BookmarkOpen />
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Quick Bookmark
            </Typography>
            <FolderSearch />
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
