import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Briefcase, BookOpen, LayoutDashboard } from 'lucide-react'
import { useEffect, useState } from 'react'

// Navigation items — add new tools here and create matching routes in App.jsx
const NAV_ITEMS = [
  {
    path: '/jobs',
    icon: Briefcase,
    label: 'Job Hunter',
    description: 'Search German job listings',
  },
  {
    path: '/language',
    icon: BookOpen,
    label: 'Language Planner',
    description: 'Weekly language learning tracker',
  },
]

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function Layout() {
  const location = useLocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Find active nav label for the header
  const activeNav = NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.path)
  )

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: '1.25rem 0.875rem',
          gap: '0.25rem',
          overflowY: 'auto',
        }}
      >
        {/* Logo / brand */}
        <div style={{ marginBottom: '1.75rem', paddingLeft: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background:
                  'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LayoutDashboard size={15} color="white" />
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              zentry
            </span>
          </div>
          <div
            style={{
              marginTop: '0.35rem',
              paddingLeft: '2.4rem',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            personal dashboard
          </div>
        </div>

        {/* Section label */}
        <div className="label" style={{ paddingLeft: '0.25rem', marginBottom: '0.5rem' }}>
          Tools
        </div>

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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top header */}
        <header
          style={{
            height: '52px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {activeNav?.label ?? 'Dashboard'}
            </span>
            {activeNav && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  /
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {activeNav.description}
                </span>
              </>
            )}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {formatDate(now)}
            <span style={{ opacity: 0.55, marginLeft: '0.5rem' }}>{formatTime(now)}</span>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem',
          }}
        >
          {/* Page transition key forces re-mount animation on route change */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
