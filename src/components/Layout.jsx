import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home as HomeIcon, BookOpen, Newspaper, Radio, Trophy, Search, Command, Sun, Moon, WifiOff, LayoutGrid, ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import CommandPalette from './CommandPalette'
import { Logo } from './Logo'
import { IconButton, Sheet, Tabs } from './ui'
import { useOnline } from '../hooks/useOnline'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../settings/store'
import { formatTime } from '../settings/format'
import { MiniPlayer } from '../radio/NowPlaying'
import { useRadio } from '../radio/radio-context'
import { Onboarding } from '../onboarding/Onboarding'
import { InstallBanner } from '../pwa/InstallUI'

// `tone` picks the tool colour for the nav chip ('ink' = neutral). `short` is
// the label in the sidebar and phone tab bar; `label` is the full name. To add
// a tool: add it here (and a route in App.jsx). It shows in the sidebar
// automatically and, on phones, in the "More" sheet unless listed in TAB_PATHS.
const NAV_ITEMS = [
  { path: '/home',     icon: HomeIcon,  tone: 'ink',      label: 'Home',             short: 'Home',     description: 'Your daily snapshot' },
  { path: '/news',     icon: Newspaper, tone: 'news',     label: 'News Tracker',     short: 'News',     description: 'Live global & local RSS feeds' },
  { path: '/football', icon: Trophy,    tone: 'football', label: 'Football Today',   short: 'Football', description: "Today's scores & fixtures" },
  { path: '/radio',    icon: Radio,     tone: 'radio',    label: 'Live Radio',       short: 'Radio',    description: 'World map of live radio stations' },
  { path: '/language', icon: BookOpen,  tone: 'language', label: 'Language Planner', short: 'Language', description: 'Weekly language learning tracker' },
]

// Phone bottom bar: always these 4 tools + "More", so the bar never changes
// shape as tools are added — new ones land in the More sheet.
const TAB_PATHS  = ['/home', '/news', '/football', '/radio']
const TAB_ITEMS  = TAB_PATHS.map((p) => NAV_ITEMS.find((item) => item.path === p))
const MORE_ITEMS = NAV_ITEMS.filter((item) => !TAB_PATHS.includes(item.path))

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark',  label: 'Dark' },
  { value: 'auto',  label: 'Auto' },
]

// Native page transitions where supported (Chrome/Edge/Safari 18+); everyone
// else gets the CSS .page-enter fade. NavLinks opt in with `viewTransition`.
const VIEW_TRANSITIONS = typeof document !== 'undefined' && 'startViewTransition' in document

function NavChip({ tone, icon: Icon, size = 28 }) {
  return (
    <span className={`nav-chip nav-chip-${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.55)} strokeWidth={2} />
    </span>
  )
}

// The clock ticks every second — keep that state in its own tiny component so
// the tick re-renders only this pill, not the whole layout.
function Clock({ showDate }) {
  const [now, setNow] = useState(() => new Date())
  const [settings]    = useSettings()
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="header-pill">
      {showDate && <span style={{ color: 'var(--text-muted)' }}>{now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
      <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
        {formatTime(now, { seconds: true, settings })}
      </span>
    </span>
  )
}

export default function Layout() {
  const location  = useLocation()
  const { isMobile, isTablet, isDesktop } = useBreakpoint()
  const [moreOpen, setMoreOpen]       = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pref, theme, setPref }      = useTheme()
  const online                        = useOnline()
  const mainRef                       = useRef(null)
  const { station }                   = useRadio()

  // Lets toasts float above the phone/tablet mini-player while it's showing
  useEffect(() => {
    document.documentElement.style.setProperty('--mini-h', station && !isDesktop ? '72px' : '0px')
  }, [station, isDesktop])

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

  // Each page starts at the top — <main> is the scroll container, so the
  // browser's own scroll restoration doesn't apply to it.
  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  const activeNav  = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))
  const onSettings = location.pathname.startsWith('/settings')
  const moreActive = onSettings || MORE_ITEMS.some((item) => item === activeNav)
  const isHome     = activeNav?.path === '/home'

  const openSearch = () => { setMoreOpen(false); setPaletteOpen(true) }

  return (
    <div className="app-shell">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Onboarding />
      <InstallBanner />

      {/* ── Sidebar: full on desktop, icon rail on tablets, none on phones ── */}
      {!isMobile && (
        <aside className={`sidebar${isTablet ? ' sidebar-rail' : ''}`}>
          <div className="sidebar-logo">
            {isDesktop ? <Logo size={30} wordmark /> : <Logo size={32} />}
          </div>

          <nav aria-label="Tools" className="sidebar-nav">
            {NAV_ITEMS.map(({ path, icon, tone, short }) => (
              <NavLink
                key={path}
                to={path}
                viewTransition
                aria-label={isTablet ? short : undefined}
                title={isTablet ? short : undefined}
                className={({ isActive }) => `nav-item${isTablet ? ' nav-item-icon' : ''}${isActive ? ' active' : ''}`}
              >
                <NavChip tone={tone} icon={icon} size={isTablet ? 32 : 28} />
                {isDesktop && <span>{short}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Bottom: now-playing card (desktop), settings, theme */}
          <div className="sidebar-foot">
            {isDesktop && <MiniPlayer variant="card" />}
            <NavLink
              to="/settings"
              viewTransition
              aria-label={isTablet ? 'Settings' : undefined}
              title={isTablet ? 'Settings' : undefined}
              className={({ isActive }) => `nav-item${isTablet ? ' nav-item-icon' : ''}${isActive ? ' active' : ''}`}
            >
              <NavChip tone="neutral" icon={SettingsIcon} size={isTablet ? 32 : 28} />
              {isDesktop && <span>Settings</span>}
            </NavLink>
            {isDesktop
              ? <Tabs label="Theme" size="sm" block value={pref} onChange={setPref} options={THEME_OPTIONS} />
              : <IconButton icon={theme === 'light' ? Moon : Sun} label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} variant="secondary" onClick={toggleTheme} />}
          </div>
        </aside>
      )}

      {/* ── Main column ── */}
      <div className="main-col">

        {/* Header — desktop/tablet: search pill + clock + theme. Phones: page
            title + search; hidden on Home, where the greeting leads. */}
        {!isMobile && (
          <header className="app-header">
            <button type="button" className="search-pill" onClick={() => setPaletteOpen(true)} aria-label="Search (⌘K)">
              <Search size={17} strokeWidth={2} aria-hidden="true" />
              <span className="search-pill-text">Search news, teams, stations…</span>
              <span className="kbd-hint"><Command size={10} />K</span>
            </button>
            <div className="app-header-right">
              <Clock showDate={isDesktop} />
              <IconButton
                icon={theme === 'light' ? Moon : Sun}
                label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                variant="secondary"
                onClick={toggleTheme}
              />
            </div>
          </header>
        )}
        {isMobile && !isHome && (
          <header className="app-header app-header-phone">
            <span className="phone-title">{onSettings ? 'Settings' : activeNav?.short ?? 'Zentry'}</span>
            <IconButton icon={Search} label="Search" variant="secondary" onClick={() => setPaletteOpen(true)} />
          </header>
        )}

        {/* Offline banner — the app serves cached data as a PWA, so tell the
            user their data may be stale rather than leaving them guessing. */}
        {!online && (
          <div role="status" className="offline-banner">
            <WifiOff size={14} aria-hidden="true" />
            <span>You’re offline — showing saved data</span>
          </div>
        )}

        {/* Page content — scrollable */}
        <main ref={mainRef} className={`app-main${isMobile && isHome ? ' app-main-home' : ''}`}>
          <div
            key={location.pathname}
            className={VIEW_TRANSITIONS ? 'page' : 'page page-enter'}
          >
            <Outlet />
          </div>
        </main>

        {/* Mini-player — phones (above the tab bar) and tablets */}
        {!isDesktop && <MiniPlayer variant="bar" />}

        {/* ── Bottom tab bar (phones) — part of the flex column, not fixed,
            so it can never cover page content. ── */}
        {isMobile && (
          <nav aria-label="Tools" className="bottom-nav">
            {TAB_ITEMS.map(({ path, icon: Icon, short }) => (
              <NavLink key={path} to={path} viewTransition className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
                <span className="tab-pill"><Icon size={20} strokeWidth={1.9} aria-hidden="true" /></span>
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
              <span className="tab-pill"><LayoutGrid size={20} strokeWidth={1.9} aria-hidden="true" /></span>
              <span>More</span>
            </button>
          </nav>
        )}
      </div>

      {/* ── More sheet (phones): remaining tools + search & theme ── */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {MORE_ITEMS.map(({ path, icon, tone, short, description }) => (
            <NavLink key={path} to={path} viewTransition className={({ isActive }) => `nav-item more-item${isActive ? ' active' : ''}`}>
              <NavChip tone={tone} icon={icon} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600 }}>{short}</span>
                <span className="more-item-hint">{description}</span>
              </span>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            </NavLink>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <NavLink to="/settings" viewTransition className={({ isActive }) => `nav-item more-item${isActive ? ' active' : ''}`}>
            <NavChip tone="neutral" icon={SettingsIcon} size={36} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600 }}>Settings</span>
              <span className="more-item-hint">Units, your city, backup & reset</span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          </NavLink>
          <button type="button" className="nav-item more-item" onClick={openSearch}>
            <NavChip tone="neutral" icon={Search} size={36} />
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-primary)', fontWeight: 600 }}>Search</span>
          </button>
          <div className="nav-item more-item" style={{ cursor: 'default' }}>
            <NavChip tone="neutral" icon={theme === 'light' ? Sun : Moon} size={36} />
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-primary)', fontWeight: 600 }}>Theme</span>
            <Tabs label="Theme" size="sm" value={pref} onChange={setPref} options={THEME_OPTIONS} />
          </div>
        </div>
      </Sheet>
    </div>
  )
}
