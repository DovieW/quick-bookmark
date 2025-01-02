import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from '../components/Popup';
import './popup.css'; // dark theme styling

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);