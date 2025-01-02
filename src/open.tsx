import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, ThemeProvider, Typography } from '@mui/material';
import BookmarkOpen from './components/BookmarkOpen';
import './popup/popup.css'; // Reuse the same dark theme CSS if you want

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

function OpenPopup() {
  return (
    <ThemeProvider theme={darkTheme}>
      <div style={{ minWidth: 300, minHeight: 400, padding: '1rem' }}>
        <Typography variant="h6" gutterBottom>
          Quick Open
        </Typography>
        <BookmarkOpen />
      </div>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <OpenPopup />
  </React.StrictMode>
);
