// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Temporarily disable StrictMode to avoid double-mounting during development
// This prevents duplicate API calls when React StrictMode intentionally mounts components twice
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
