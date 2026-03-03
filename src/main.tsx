import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for packaged debugging
window.onerror = (msg, url, line, col, error) => {
  alert(`ERROR: ${msg}\nAt: ${line}:${col}\nFile: ${url}\nObj: ${JSON.stringify(error)}`);
  return false;
};

window.onunhandledrejection = (event) => {
  alert(`REJECTION: ${event.reason}`);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
