import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Briefcase, BookOpen, Newspaper, FileText, Menu, X, Radio, Trophy, DollarSign, Search, Command, Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'

const NAV_ITEMS = [
  { path: '/home',     icon: HomeIcon,   label: 'Home',             description: 'Your daily snapshot' },
  { path: '/news',     icon: Newspaper,  label: 'News Tracker',     description: 'Live global & local RSS feeds' },
  { path: '/jobs',     icon: Briefcase,  label: 'Job Hunter',       description: 'Search German job listings' },
  { path: '/language', icon: BookOpen,   label: 'Language Planner', description: 'Weekly language learning tracker' },
  { path: '/cv',       icon: FileText,   label: 'CV Builder',       description: 'Build and export your Lebenslauf' },
  { path: '/radio',    icon: Radio,      label: 'Live Radio',       description: 'World map of live radio stations' },
  { path: '/football', icon: Trophy,     label: 'Football Today',   description: "Today's scores & fixtures" },
  { path: '/finance',  icon: DollarSign, label: 'Finance Watch',    description: 'FX rates & crypto prices' },
]

const THEME_KEY = 'zentry:theme'
// Read initial theme synchronously to avoid a flash-of-wrong-theme on mount.
function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return 'dark'
}

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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [theme, setTheme]           = useState(readTheme)

  // Apply theme to <html> and persist any time it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  // ⌘K / Ctrl+K opens the command palette globally
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        // Get coordinates from IP (ipinfo returns "lat,lon" in loc field)
        const geo = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) })
        if (!geo.ok) return
        const { loc, city } = await geo.json()
        if (!loc) return
        const [latitude, longitude] = loc.split(',').map(Number)
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
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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
              <img src="/favicon.svg" alt="Zentry" style={{ width: 28, height: 28, flexShrink: 0 }} />
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
          background: 'var(--header-bg)',
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
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              aria-label="Toggle theme"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28,
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {/* ⌘K trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              title="Command palette (⌘K)"
              aria-label="Open command palette"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 6, padding: isMobile ? '0.3rem 0.45rem' : '0.25rem 0.55rem',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem',
                fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Search size={12} />
              {!isMobile && <>
                <span>Search</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 5px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', fontWeight: 600 }}>
                  <Command size={9} />K
                </span>
              </>}
            </button>

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

        {/* Footer — outside scroll area, always pinned at bottom */}
        <footer style={{
          flexShrink: 0,
          padding: '0.5rem 1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
          background: 'var(--header-bg)',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Lauger · Zentry
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.5 }}>
            All rights reserved
          </span>
        </footer>
      </div>
    </div>
  )
}
