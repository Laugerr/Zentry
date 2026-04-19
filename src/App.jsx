import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import PageErrorBoundary from './components/PageErrorBoundary'

// Lazy-load each tool so the initial bundle only ships what's visible on first paint.
// react-simple-maps + the topojson atlas are heavy — splitting keeps that out of the
// critical path unless the user actually opens Live Radio.
const Home           = lazy(() => import('./pages/Home'))
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

// Wrap every page in an error boundary so a single bad fetch / render doesn't
// blank the whole app. Keying the boundary on pathname resets it on navigation.
function Page({ children }) {
  const location = useLocation()
  return (
    <PageErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </PageErrorBoundary>
  )
}

// App uses HashRouter so GitHub Pages works without server-side routing.
// To add a new tool: import it here and add a <Route> + a nav entry in Layout.jsx.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home"     element={<Page><Home /></Page>} />
          <Route path="news"     element={<Page><NewsTracker /></Page>} />
          <Route path="jobs"     element={<Page><JobHunter /></Page>} />
          <Route path="language" element={<Page><LanguagePlanner /></Page>} />
          <Route path="cv"       element={<Page><CVBuilder /></Page>} />
          <Route path="radio"    element={<Page><LiveRadio /></Page>} />
          <Route path="football" element={<Page><FootballToday /></Page>} />
          <Route path="finance"  element={<Page><FinanceWatch /></Page>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
