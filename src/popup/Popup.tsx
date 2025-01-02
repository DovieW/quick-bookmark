import React from 'react';
import { ThemeProvider, createTheme, Typography, Box } from '@mui/material';
import BookmarkOpen from '../components/BookmarkOpen'; // or FolderSearch
import './popup.css'; // your dark style

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0D1117'
    },
    text: {
      primary: '#C9D1D9'
    }
  }
});

export default function Popup() {
  return (
    <ThemeProvider theme={darkTheme}>
      {/*
        We fix the width and height, so the popup won't autosize larger 
        when bookmarks load. We'll let the list scroll inside.
      */}
      <Box
        sx={{
          width: 300,
          height: 400,       // pick a size that feels right
          overflow: 'hidden', 
          display: 'flex',
          flexDirection: 'column',
          p: 2               // MUI spacing
        }}
      >
        <Typography variant="h6" gutterBottom>
          Quick Open
        </Typography>

        {/*
          Our bookmark UI goes inside a scrollable container. 
          We let it expand to fill all remaining space (flex: 1),
          and set overflow to auto so it scrolls instead of resizing the popup.
        */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <BookmarkOpen />
          {/* or <FolderSearch /> depending on your mode */}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
