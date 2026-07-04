import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, BookOpen, Newspaper, Radio, Trophy, Search, Command, Sun, Moon, WifiOff, LayoutGrid, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'
import { Button, IconButton, Sheet, Tabs } from './ui'
import { useOnline } from '../hooks/useOnline'
import { useWeather, WMO_ICON } from '../hooks/useWeather'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useTheme } from '../hooks/useTheme'

// `short` is the bottom-tab label on phones. To add a tool: add it here (and a
// <Route> in App.jsx). It shows in the sidebar automatically and, on phones,
// in the "More" sheet unless its path is listed in TAB_PATHS.
const NAV_ITEMS = [
  { path: '/home',     icon: HomeIcon,   label: 'Home',             short: 'Home',     description: 'Your daily snapshot' },
  { path: '/news',     icon: Newspaper,  label: 'News Tracker',     short: 'News',     description: 'Live global & local RSS feeds' },
  { path: '/language', icon: BookOpen,   label: 'Language Planner', short: 'Language', description: 'Weekly language learning tracker' },
  { path: '/radio',    icon: Radio,      label: 'Live Radio',       short: 'Radio',    description: 'World map of live radio stations' },
  { path: '/football', icon: Trophy,     label: 'Football Today',   short: 'Football', description: "Today's scores & fixtures" },
]

// Phone bottom bar: always these 4 tools + "More", so the bar never changes
// shape as tools are added — new ones land in the More sheet.
const TAB_PATHS  = ['/home', '/news', '/football', '/radio']
const TAB_ITEMS  = TAB_PATHS.map((p) => NAV_ITEMS.find((item) => item.path === p))
const MORE_ITEMS = NAV_ITEMS.filter((item) => !TAB_PATHS.includes(item.path))

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// The clock ticks every second — keep that state in its own tiny component so
// the tick re-renders only these two spans, not the whole layout.
function Clock({ showDate }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {showDate && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>{formatDate(now)}</span>}
      <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{formatTime(now)}</span>
    </div>
  )
}

export default function Layout() {
  const location  = useLocation()
  const { isMobile, isTablet, isDesktop } = useBreakpoint()
  const [moreOpen, setMoreOpen]       = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pref, theme, setPref }      = useTheme()
  const online                        = useOnline()

  // Header toggle picks the opposite of what's showing (leaving 'auto')
  const toggleTheme = () => setPref(theme === 'light' ? 'dark' : 'light')

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

  // Close the More sheet on navigation and when growing past phone width
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname, isMobile])

  // Weather for the header pill — shares one cached geo + weather request with
  // the Home hero via useWeather (dedupes to a single network round-trip).
  const { data: wx } = useWeather()
  const weather = wx ? { temp: wx.temp, icon: WMO_ICON[wx.code] ?? '🌡️', city: wx.city ?? '' } : null

  const activeNav  = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))
  const moreActive = MORE_ITEMS.some((item) => item === activeNav)

  const openSearch = () => { setMoreOpen(false); setPaletteOpen(true) }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Sidebar: full on desktop, icon rail on tablets, none on phones ── */}
      {!isMobile && (
        <aside style={{
          width: isDesktop ? 220 : 68, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: isDesktop ? '1.25rem 0.875rem' : '1rem 0.6rem',
          gap: '0.25rem',
          overflowY: 'auto',
        }}>
          {/* Logo row */}
          {isDesktop ? (
            <div style={{ marginBottom: '1.75rem', paddingLeft: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img src="/favicon.svg" alt="Zentry" style={{ width: 28, height: 28, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 750, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
                  zentry
                </span>
              </div>
              <div style={{ marginTop: '0.35rem', paddingLeft: '2.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                personal dashboard
              </div>
            </div>
          ) : (
            <img src="/favicon.svg" alt="Zentry" style={{ width: 28, height: 28, margin: '0.25rem auto 1.5rem' }} />
          )}

          {/* Section label */}
          {isDesktop && <div className="label" style={{ paddingLeft: '0.25rem', marginBottom: '0.5rem' }}>Tools</div>}

          {/* Nav links */}
          <nav aria-label="Tools" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                aria-label={isTablet ? label : undefined}
                title={isTablet ? label : undefined}
                className={({ isActive }) => `nav-item${isTablet ? ' nav-item-icon' : ''}${isActive ? ' active' : ''}`}
              >
                <Icon size={isTablet ? 18 : 16} strokeWidth={1.8} />
                {isDesktop && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top header — on phones it's just the page title; search and theme
            live in the More sheet so the header doesn't crowd. */}
        <header style={{
          height: 'calc(52px + env(safe-area-inset-top))', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'env(safe-area-inset-top) calc(1rem + env(safe-area-inset-right)) 0 calc(1rem + env(safe-area-inset-left))',
          borderBottom: '1px solid var(--border)',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(8px)',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, overflow: 'hidden' }}>
            {isMobile && <img src="/favicon.svg" alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? '0.9rem' : '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {activeNav?.label ?? 'Dashboard'}
            </span>
            {activeNav && isDesktop && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeNav.description}
                </span>
              </>
            )}
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
              <IconButton
                icon={theme === 'light' ? Moon : Sun}
                label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
              />

              {/* ⌘K trigger */}
              <Button variant="secondary" size="sm" icon={Search} onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">
                Search
                <span className="kbd-hint"><Command size={9} />K</span>
              </Button>

              {/* Weather pill */}
              {weather && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}>
                  <span>{weather.icon}</span>
                  <span style={{ color: 'var(--info)', fontWeight: 600 }}>{weather.temp}°C</span>
                  {isDesktop && weather.city && <span style={{ opacity: 0.6 }}>{weather.city}</span>}
                </div>
              )}

              <Clock showDate={isDesktop} />
            </div>
          )}
        </header>

        {/* Offline banner — the app serves cached data as a PWA, so tell the
            user their data may be stale rather than leaving them guessing. */}
        {!online && (
          <div
            role="status"
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '0.4rem 1rem',
              background: 'var(--orange-soft)', borderBottom: '1px solid color-mix(in srgb, var(--orange) 30%, transparent)',
              color: 'var(--orange)', fontSize: '0.72rem', fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <WifiOff size={13} />
            <span>You’re offline — showing cached data</span>
          </div>
        )}

        {/* Page content — scrollable */}
        <main style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          padding: isMobile ? '1rem calc(1rem + env(safe-area-inset-right)) 1rem calc(1rem + env(safe-area-inset-left))'
                 : isTablet ? '1.25rem' : '1.75rem',
        }}>
          <div key={location.pathname} className="page-enter" style={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </div>
        </main>

        {/* ── Bottom tab bar (phones) — part of the flex column, not fixed,
            so it can never cover page content. ── */}
        {isMobile && (
          <nav aria-label="Tools" className="bottom-nav">
            {TAB_ITEMS.map(({ path, icon: Icon, short }) => (
              <NavLink key={path} to={path} className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{short}</span>
              </NavLink>
            ))}
            <button
              type="button"
              className={`bottom-nav-item${moreActive || moreOpen ? ' active' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
            >
              <LayoutGrid size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>More</span>
            </button>
          </nav>
        )}
      </div>

      {/* ── More sheet (phones): remaining tools + search & theme ── */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="label">Tools</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.25rem' }}>
          {MORE_ITEMS.map(({ path, icon: Icon, label, description }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-item more-item${isActive ? ' active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block' }}>{label}</span>
                <span className="more-item-hint">{description}</span>
              </span>
              <ChevronRight size={16} style={{ opacity: 0.5 }} />
            </NavLink>
          ))}
        </div>

        <div className="label">App</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button type="button" className="nav-item more-item" onClick={openSearch}>
            <Search size={18} strokeWidth={1.8} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          </button>
          <div className="nav-item more-item" style={{ cursor: 'default' }}>
            {theme === 'light' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            <span style={{ flex: 1, textAlign: 'left' }}>Theme</span>
            <Tabs label="Theme" size="sm" value={pref} onChange={setPref} options={[
              { value: 'light', label: 'Light' },
              { value: 'dark',  label: 'Dark' },
              { value: 'auto',  label: 'Auto' },
            ]} />
          </div>
        </div>
      </Sheet>
    </div>
  )
}
