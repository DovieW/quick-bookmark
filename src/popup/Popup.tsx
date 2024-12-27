import React from 'react';
import { ThemeProvider, createTheme, Typography } from '@mui/material';
import FolderSearch from '../components/FolderSearch';

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
      {/* Increase height here. For example: minHeight: 400 */}
      <div style={{ minWidth: 300, minHeight: 400, padding: '1rem' }}>
        <Typography variant="h6" gutterBottom>
          Quick Bookmark
        </Typography>
        <FolderSearch />
      </div>
    </ThemeProvider>
  );
}
