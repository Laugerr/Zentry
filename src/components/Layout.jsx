import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Briefcase, BookOpen, Newspaper, LayoutDashboard, FileText, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { path: '/news',     icon: Newspaper,  label: 'News Tracker',     description: 'Live global & local RSS feeds' },
  { path: '/jobs',     icon: Briefcase,  label: 'Job Hunter',       description: 'Search German job listings' },
  { path: '/language', icon: BookOpen,   label: 'Language Planner', description: 'Weekly language learning tracker' },
  { path: '/cv',       icon: FileText,   label: 'CV Builder',       description: 'Build and export your Lebenslauf' },
]

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export default function Layout() {
  const location  = useLocation()
  const [now, setNow]               = useState(new Date())
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [weather, setWeather]       = useState(null)   // { temp, icon, city }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close sidebar when route changes (mobile nav tap)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && sidebarOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, sidebarOpen])

  // Fetch weather for current location on mount
  useEffect(() => {
    async function fetchWeather() {
      try {
        // Get coordinates from IP
        const geo = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
        if (!geo.ok) return
        const { latitude, longitude, city } = await geo.json()
        if (!latitude || !longitude) return

        // Get current weather from Open-Meteo (no API key needed)
        const wx = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!wx.ok) return
        const { current_weather } = await wx.json()
        const icon = WMO_ICON[current_weather.weathercode] ?? '🌡️'
        setWeather({ temp: Math.round(current_weather.temperature), icon, city: city ?? '' })
      } catch { /* silently ignore */ }
    }
    fetchWeather()
  }, [])

  const activeNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))

  const sidebarStyle = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 100, top: 0, left: 0,
        width: '260px', height: '100%',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '1.25rem 0.875rem',
        gap: '0.25rem',
        overflowY: 'auto',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    : {
        width: '220px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '1.25rem 0.875rem',
        gap: '0.25rem',
        overflowY: 'auto',
      }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ── Backdrop (mobile only) ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        {/* Logo row */}
        <div style={{ marginBottom: '1.75rem', paddingLeft: '0.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LayoutDashboard size={15} color="white" />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                zentry
              </span>
            </div>
            <div style={{ marginTop: '0.35rem', paddingLeft: '2.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              personal dashboard
            </div>
          </div>

          {/* Close button inside drawer on mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', marginTop: '-0.1rem' }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Section label */}
        <div className="label" style={{ paddingLeft: '0.25rem', marginBottom: '0.5rem' }}>Tools</div>

        {/* Nav links */}
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top header */}
        <header style={{
          height: '52px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1rem 0 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(8px)',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {activeNav?.label ?? 'Dashboard'}
              </span>
              {activeNav && !isMobile && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeNav.description}
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {/* Weather pill */}
            {weather && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}>
                <span>{weather.icon}</span>
                <span style={{ color: '#7dd3fc', fontWeight: 600 }}>{weather.temp}°C</span>
                {!isMobile && weather.city && <span style={{ opacity: 0.6 }}>{weather.city}</span>}
              </div>
            )}

            {/* Clock */}
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {!isMobile && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{formatDate(now)}</span>}
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatTime(now)}</span>
            </div>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: isMobile ? '1rem' : '1.75rem' }}>
          <div key={location.pathname} className="page-enter" style={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
