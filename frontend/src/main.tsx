import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initSentry } from './sentry'
import * as Sentry from '@sentry/react'

initSentry()

// Si algo revienta en el render de React, esto evita una pantalla en blanco
// sin explicación — y si Sentry está configurado (ver sentry.ts), el error
// ya quedó reportado antes de que el cliente tenga que escribirte a ti.
function ErrorFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e14', color: '#f8f6ef', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo salió mal</h1>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>Ya quedó registrado. Intenta recargar la página.</p>
        <button onClick={() => window.location.reload()} style={{ background: '#14b8a6', color: '#062323', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
          Recargar
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
