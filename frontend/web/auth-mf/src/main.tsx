import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Standalone dev mode
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App onLogin={(user) => console.log('Logged in:', user)} />
  </React.StrictMode>,
);
