import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Radio, Trophy, BookOpen, DollarSign, FileText, Briefcase,
  ArrowRight, ExternalLink, Flame, MapPin, Clock, TrendingUp, TrendingDown,
  Sparkles,
} from 'lucide-react'

// ─── Small helpers ────────────────────────────────────────────────────────────
const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? '') ?? fb } catch { return fb } }
const timeAgo  = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
const greet = (h) => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}
const WMO_LABEL = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunder + hail', 99: 'Thunder + hail',
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, accent = '#a78bfa', to, action, children }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.1rem 1.2rem', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: `${accent}22`, color: accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} strokeWidth={2} />
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700,
            color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{title}</span>
        </div>
        {to && (
          <Link to={to} style={{
            fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
          }}>
            {action ?? 'Open'} <ArrowRight size={10} />
          </Link>
        )}
      </div>
      <div style={{ minHeight: 0, flex: 1 }}>{children}</div>
    </div>
  )
}

function Skeleton({ h = 14, w = '100%', r = 4 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: 'var(--input-bg-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
}

// ─── Weather card ─────────────────────────────────────────────────────────────
function useWeather() {
  const [data, setData] = useState(null)
  const [err, setErr]   = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const geoRes = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(6000) })
        if (!geoRes.ok) throw new Error('geo')
        const { loc, city, country } = await geoRes.json()
        if (!loc) throw new Error('loc')
        const [lat, lon] = loc.split(',').map(Number)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        const wxRes = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!wxRes.ok) throw new Error('wx')
        const j = await wxRes.json()
        if (cancelled) return
        setData({
          city, country,
          temp: Math.round(j.current.temperature_2m),
          feels: Math.round(j.current.apparent_temperature),
          humidity: j.current.relative_humidity_2m,
          wind: Math.round(j.current.wind_speed_10m),
          code: j.current.weathercode,
          hi: Math.round(j.daily.temperature_2m_max?.[0] ?? 0),
          lo: Math.round(j.daily.temperature_2m_min?.[0] ?? 0),
        })
      } catch (e) { if (!cancelled) setErr(e?.message ?? 'error') }
    })()
    return () => { cancelled = true }
  }, [])
  return { data, err }
}

function WeatherCard() {
  const { data, err } = useWeather()
  return (
    <Card title="Weather" icon={MapPin} accent="#7dd3fc">
      {!data && !err && <div style={{ display: 'grid', gap: 8 }}><Skeleton h={36} w="50%" /><Skeleton h={12} w="70%" /></div>}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Couldn&apos;t load weather.</div>}
      {data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{WMO_ICON[data.code] ?? '🌡️'}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.7rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {data.temp}°<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>C</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {WMO_LABEL[data.code] ?? '—'} · feels {data.feels}°
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {data.city && <span>📍 {data.city}</span>}
              <span>H {data.hi}° · L {data.lo}°</span>
              <span>💨 {data.wind} km/h</span>
              <span>💧 {data.humidity}%</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Headlines card ───────────────────────────────────────────────────────────
async function fetchHeadlines(signal) {
  const url = 'https://feeds.bbci.co.uk/news/world/rss.xml'
  // Try codetabs (raw XML), fall back to rss2json JSON.
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, { signal, cache: 'no-store' })
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<item>')) {
        const doc = new DOMParser().parseFromString(text, 'text/xml')
        return Array.from(doc.querySelectorAll('item')).slice(0, 5).map((it) => ({
          title:   it.querySelector('title')?.textContent?.trim() ?? '',
          link:    it.querySelector('link')?.textContent?.trim() ?? '',
          pubDate: it.querySelector('pubDate')?.textContent?.trim() ?? '',
        })).filter((a) => a.title && a.link)
      }
    }
  } catch { /* fall through */ }
  const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=5`, { signal })
  const j = await r.json()
  if (j.status !== 'ok') throw new Error('rss')
  return j.items.slice(0, 5).map((it) => ({ title: it.title, link: it.link, pubDate: it.pubDate }))
}

function HeadlinesCard() {
  const [items, setItems] = useState(null)
  const [err, setErr]     = useState(null)
  useEffect(() => {
    const ac = new AbortController()
    fetchHeadlines(ac.signal).then(setItems).catch((e) => setErr(e?.message ?? 'error'))
    return () => ac.abort()
  }, [])
  return (
    <Card title="Top Headlines" icon={Newspaper} accent="#a78bfa" to="/news" action="More news">
      {!items && !err && <div style={{ display: 'grid', gap: 8 }}>{[0,1,2,3,4].map((i) => <Skeleton key={i} h={14} />)}</div>}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Couldn&apos;t load headlines.</div>}
      {items && (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.55rem' }}>
          {items.map((it, i) => (
            <li key={it.link + i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', width: 16, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <a href={it.link} target="_blank" rel="noopener noreferrer" style={{
                color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', lineHeight: 1.35,
                display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{it.title}</span>
                <ExternalLink size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ─── Football card ────────────────────────────────────────────────────────────
async function fetchNextMatch(signal) {
  // ESPN public scoreboard — all soccer leagues (top_score=true surfaces featured fixtures)
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard'
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('espn')
  const j = await r.json()
  const events = (j.events ?? []).map((e) => {
    const c = e.competitions?.[0] ?? {}
    const [home, away] = c.competitors ?? []
    return {
      id: e.id,
      date: e.date,
      league: e.league?.name ?? c.notes?.[0]?.headline ?? 'Match',
      status: e.status?.type?.state ?? 'pre', // pre | in | post
      statusDetail: e.status?.type?.shortDetail ?? '',
      home: home?.team?.shortDisplayName ?? home?.team?.displayName ?? '—',
      away: away?.team?.shortDisplayName ?? away?.team?.displayName ?? '—',
      homeScore: home?.score ?? null,
      awayScore: away?.score ?? null,
      homeLogo: home?.team?.logo,
      awayLogo: away?.team?.logo,
    }
  })
  // Preference: live > upcoming (soonest) > finished (most recent)
  const live = events.filter((e) => e.status === 'in')
  if (live.length) return live[0]
  const upcoming = events.filter((e) => e.status === 'pre')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (upcoming.length) return upcoming[0]
  const done = events.filter((e) => e.status === 'post')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  return done[0] ?? null
}

function FootballCard() {
  const [m, setM] = useState(null)
  const [err, setErr] = useState(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const ac = new AbortController()
    fetchNextMatch(ac.signal)
      .then((x) => { setM(x); setLoaded(true) })
      .catch((e) => { setErr(e?.message ?? 'error'); setLoaded(true) })
    return () => ac.abort()
  }, [])
  const kickoffLabel = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const same = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return same ? `Today · ${time}` : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${time}`
  }
  return (
    <Card title="Football" icon={Trophy} accent="#34d399" to="/football" action="All matches">
      {!loaded && <div style={{ display: 'grid', gap: 8 }}><Skeleton h={14} w="40%" /><Skeleton h={28} /></div>}
      {loaded && !m && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{err ? "Couldn't load matches." : 'No matches today.'}</div>}
      {m && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>{m.league}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: m.status === 'in' ? '#ef4444' : m.status === 'post' ? 'var(--text-muted)' : '#a78bfa',
            }}>
              {m.status === 'in' && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#ef4444', animation: 'pulse 1.4s ease-in-out infinite' }} />}
              {m.status === 'in' ? `LIVE · ${m.statusDetail}` : m.status === 'post' ? 'FT' : kickoffLabel(m.date)}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              {m.homeLogo && <img src={m.homeLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {m.status === 'pre' ? 'vs' : `${m.homeScore ?? 0} – ${m.awayScore ?? 0}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away}</span>
              {m.awayLogo && <img src={m.awayLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Radio card ───────────────────────────────────────────────────────────────
function RadioCard() {
  const last   = readJSON('lr:last:v1', null)
  const recent = readJSON('lr:recents:v1', [])
  return (
    <Card title="Live Radio" icon={Radio} accent="#f472b6" to="/radio" action="Open player">
      {!last && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No station yet — head to <Link to="/radio" style={{ color: 'var(--accent-purple)' }}>Live Radio</Link> to pick one.
        </div>
      )}
      {last && (
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Last played
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {last.name ?? 'Unknown station'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {[last.countrycode, last.tags?.split(',')[0], last.bitrate ? `${last.bitrate} kbps` : null].filter(Boolean).join(' · ')}
          </div>
          {recent.length > 1 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                Recent
              </div>
              <ul style={{ listStyle: 'none', display: 'grid', gap: 3 }}>
                {recent.slice(1, 4).map((r, i) => (
                  <li key={(r.stationuuid ?? r.name) + i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Language streak card ────────────────────────────────────────────────────
function readLanguageStreaks() {
  const langs = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('zentry:lang:')) continue
      const plan = JSON.parse(localStorage.getItem(k) ?? '{}')
      const lang = k.replace('zentry:lang:', '').replace(/^\w/, (c) => c.toUpperCase())
      langs.push({
        lang,
        current: plan?.streak?.currentStreak ?? 0,
        longest: plan?.streak?.longestStreak ?? 0,
        lastStudied: plan?.streak?.lastStudiedDate ?? '',
        cefr: plan?.cefrCurrent ?? 'A1',
      })
    }
  } catch { /* ignore */ }
  return langs.sort((a, b) => b.current - a.current)
}

function LanguageCard() {
  const streaks = useMemo(() => readLanguageStreaks(), [])
  const top = streaks[0]
  return (
    <Card title="Language" icon={BookOpen} accent="#fbbf24" to="/language" action="Open planner">
      {!top && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No plans yet — create one in <Link to="/language" style={{ color: 'var(--accent-purple)' }}>Language Planner</Link>.
        </div>
      )}
      {top && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.9rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>
              {top.current}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              day{top.current === 1 ? '' : 's'} · <Flame size={11} style={{ display: 'inline', verticalAlign: -1, color: '#f97316' }} /> {top.lang}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Level <span className="badge badge-purple" style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}>{top.cefr}</span>
            &nbsp;· longest {top.longest}d
            {top.lastStudied && <> · last {timeAgo(top.lastStudied + 'T12:00:00')}</>}
          </div>
          {streaks.length > 1 && (
            <div style={{ marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {streaks.slice(1, 4).map((s) => (
                <span key={s.lang} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {s.lang} <span style={{ color: 'var(--text-muted)' }}>· {s.current}d</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Finance snapshot ─────────────────────────────────────────────────────────
async function fetchFinance(signal) {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { signal })
  if (!r.ok) throw new Error('coingecko')
  return r.json()
}

function FinanceCard() {
  const [data, setData] = useState(null)
  const [err, setErr]   = useState(null)
  useEffect(() => {
    const ac = new AbortController()
    fetchFinance(ac.signal).then(setData).catch((e) => setErr(e?.message ?? 'error'))
    return () => ac.abort()
  }, [])
  const rows = [
    { key: 'bitcoin',  label: 'BTC' },
    { key: 'ethereum', label: 'ETH' },
    { key: 'solana',   label: 'SOL' },
  ]
  return (
    <Card title="Markets" icon={DollarSign} accent="#fb923c" to="/finance" action="Watchlist">
      {!data && !err && <div style={{ display: 'grid', gap: 8 }}>{[0,1,2].map((i) => <Skeleton key={i} h={18} />)}</div>}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Couldn&apos;t load prices.</div>}
      {data && (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
          {rows.map(({ key, label }) => {
            const price = data[key]?.usd
            const ch    = data[key]?.usd_24h_change ?? 0
            const up    = ch >= 0
            return (
              <li key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ${price?.toLocaleString(undefined, { maximumFractionDigits: price > 100 ? 0 : 2 })}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2,
                    fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace",
                    color: up ? '#4ade80' : '#f87171',
                  }}>
                    {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {up ? '+' : ''}{ch.toFixed(2)}%
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ─── Quick-links row ──────────────────────────────────────────────────────────
const QUICK = [
  { path: '/news',     icon: Newspaper,  label: 'News',     accent: '#a78bfa' },
  { path: '/jobs',     icon: Briefcase,  label: 'Jobs',     accent: '#60a5fa' },
  { path: '/language', icon: BookOpen,   label: 'Language', accent: '#fbbf24' },
  { path: '/cv',       icon: FileText,   label: 'CV',       accent: '#34d399' },
  { path: '/radio',    icon: Radio,      label: 'Radio',    accent: '#f472b6' },
  { path: '/football', icon: Trophy,     label: 'Football', accent: '#4ade80' },
  { path: '/finance',  icon: DollarSign, label: 'Finance',  accent: '#fb923c' },
]

function QuickLinks() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem' }}>
      {QUICK.map(({ path, icon: Icon, label, accent }) => (
        <Link key={path} to={path} style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          padding: '0.7rem 0.85rem', borderRadius: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500,
          transition: 'all 0.15s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}22`, color: accent,
          }}>
            <Icon size={13} strokeWidth={2} />
          </span>
          {label}
        </Link>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(id)
  }, [])

  const hello = greet(now.getHours())
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Hero */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
          <Sparkles size={12} /> {dateLabel}
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
          {hello}, <span className="gradient-text">here&apos;s your day</span>
        </h1>
        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Weather, headlines, football, radio, your language streak — one glance.
        </div>
      </div>

      {/* Quick links */}
      <QuickLinks />

      {/* Dashboard grid */}
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
        <WeatherCard />
        <FootballCard />
        <RadioCard />
        <LanguageCard />
        <FinanceCard />
        <HeadlinesCard />
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.45 } 50% { opacity: 0.85 } }
      `}</style>
    </div>
  )
}
