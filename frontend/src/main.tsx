import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './lib/i18n';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><LanguageProvider><App /></LanguageProvider></AppErrorBoundary>
  </React.StrictMode>
);
