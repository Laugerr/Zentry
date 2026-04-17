import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'

// Lazy-load each tool so the initial bundle only ships what's visible on first paint.
// react-simple-maps + the topojson atlas are heavy — splitting keeps that out of the
// critical path unless the user actually opens Live Radio.
const NewsTracker    = lazy(() => import('./pages/NewsTracker'))
const JobHunter      = lazy(() => import('./pages/JobHunter'))
const LanguagePlanner= lazy(() => import('./pages/LanguagePlanner'))
const CVBuilder      = lazy(() => import('./pages/CVBuilder'))
const LiveRadio      = lazy(() => import('./pages/LiveRadio'))
const FootballToday  = lazy(() => import('./pages/FootballToday'))
const FinanceWatch   = lazy(() => import('./pages/FinanceWatch'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '0.75rem' }}>
      <div className="spinner" style={{ width: 18, height: 18 }} />
      <span>Loading…</span>
    </div>
  )
}

// App uses HashRouter so GitHub Pages works without server-side routing.
// To add a new tool: import it here and add a <Route> + a nav entry in Layout.jsx.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/news" replace />} />
          <Route path="news"     element={<Suspense fallback={<PageFallback />}><NewsTracker /></Suspense>} />
          <Route path="jobs"     element={<Suspense fallback={<PageFallback />}><JobHunter /></Suspense>} />
          <Route path="language" element={<Suspense fallback={<PageFallback />}><LanguagePlanner /></Suspense>} />
          <Route path="cv"       element={<Suspense fallback={<PageFallback />}><CVBuilder /></Suspense>} />
          <Route path="radio"    element={<Suspense fallback={<PageFallback />}><LiveRadio /></Suspense>} />
          <Route path="football" element={<Suspense fallback={<PageFallback />}><FootballToday /></Suspense>} />
          <Route path="finance"  element={<Suspense fallback={<PageFallback />}><FinanceWatch /></Suspense>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
