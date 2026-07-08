import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Self-hosted variable fonts (Geist + Geist Mono) — no Google Fonts round-trip, works offline
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
// Must load before React: browsers fire `beforeinstallprompt` once, early
import './pwa/install'
import App from './App.jsx'

// Register the service worker. `autoUpdate` mode in vite.config means a new SW
// activates as soon as it's installed — we just need to refresh once it's ready.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
