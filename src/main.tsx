import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Prevent unhandled cross-origin iframe and script errors ("Script error.") from causing runtime failures
window.onerror = function (message, source) {
  const msg = typeof message === 'string' ? message : (message as any)?.message || '';
  if (
    msg === 'Script error.' ||
    msg === 'Script error' ||
    msg.includes('Script error') ||
    !source ||
    source === ''
  ) {
    return true;
  }
  return false;
};

window.addEventListener(
  'error',
  (event) => {
    const msg = event.message || '';
    if (
      msg === 'Script error.' ||
      msg === 'Script error' ||
      msg.includes('Script error') ||
      !event.filename ||
      event.filename === ''
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  },
  true
);

window.addEventListener('unhandledrejection', (event) => {
  const reasonMsg =
    event.reason?.message || (typeof event.reason === 'string' ? event.reason : '');
  if (
    !event.reason ||
    reasonMsg === 'Script error.' ||
    reasonMsg === 'Script error' ||
    reasonMsg.includes('Script error')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

// Register Service Worker for PWA functionality (works offline & fallback during host downtime)
if ('serviceWorker' in navigator) {
  try {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    });
  } catch (e) {
    console.error('Service Worker setup error:', e);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


