import React, { useState, useEffect, useRef } from 'react';
import { TextField, List, ListItem, ListItemText, Typography, ThemeProvider, createTheme } from '@mui/material';
import FolderSearch from '../components/FolderSearch';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0D1117' // GitHub dark background
    },
    text: {
      primary: '#C9D1D9'
    }
  },
  typography: {
    fontFamily: 'sans-serif'
  }
});

export default function Popup() {
  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ minWidth: 300, minHeight: 200, padding: '1rem' }}>
        <Typography variant="h6" gutterBottom>
          Quick Bookmark
        </Typography>
        <FolderSearch />
      </div>
    </ThemeProvider>
  );
}
