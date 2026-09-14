import React from 'react';
import ReactDOM from 'react-dom/client';
import CentroFinanciero from './pages/CentroFinanciero';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CentroFinanciero previewMode />
  </React.StrictMode>
);
