import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { useUI } from './lib/uiStore'
import './index.css'

// Keep the <html> theme class in sync with the persisted UI store (also fixes
// the first-paint class after zustand rehydrates).
document.documentElement.classList.toggle('dark', useUI.getState().theme === 'dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
