import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Tambahkan Bootstrap Icons
const link = document.createElement('link');
link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css';
link.rel = 'stylesheet';
document.head.appendChild(link);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);