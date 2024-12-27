import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './popup/Popup';
import './popup/popup.css'; // dark theme styling

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
