import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import PageErrorBoundary from './components/PageErrorBoundary'
import { ToastProvider } from './components/ui'
import { RadioProvider } from './radio/RadioProvider'

// Lazy-load each tool so the initial bundle only ships what's visible on first paint.
// react-simple-maps + the topojson atlas are heavy — splitting keeps that out of the
// critical path unless the user actually opens Live Radio.
const Home           = lazy(() => import('./pages/Home'))
const NewsTracker    = lazy(() => import('./pages/NewsTracker'))
const LanguagePlanner= lazy(() => import('./pages/LanguagePlanner'))
const LiveRadio      = lazy(() => import('./pages/LiveRadio'))
const FootballToday  = lazy(() => import('./pages/FootballToday'))
const Settings       = lazy(() => import('./pages/Settings'))
const Weather        = lazy(() => import('./pages/Weather'))

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

// Clean URLs (/news, not /#/news). Vercel rewrites every path to index.html
// (vercel.json) and the service worker falls back to it offline. A data router
// (rather than <BrowserRouter>) is what enables `viewTransition` on NavLinks.
// To add a new tool: add a route here + a nav entry in Layout.jsx.
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,      element: <Navigate to="/home" replace /> },
      { path: 'home',     element: <Page><Home /></Page> },
      { path: 'news',     element: <Page><NewsTracker /></Page> },
      { path: 'language', element: <Page><LanguagePlanner /></Page> },
      { path: 'radio',    element: <Page><LiveRadio /></Page> },
      { path: 'football', element: <Page><FootballToday /></Page> },
      { path: 'weather',  element: <Page><Weather /></Page> },
      { path: 'settings', element: <Page><Settings /></Page> },
      { path: '*',        element: <Navigate to="/home" replace /> },
    ],
  },
])

export default function App() {
  return (
    <ToastProvider>
      {/* Above the router so the stream survives page changes */}
      <RadioProvider>
        <RouterProvider router={router} />
      </RadioProvider>
    </ToastProvider>
  )
}
