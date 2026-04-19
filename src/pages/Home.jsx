import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Radio, Trophy, BookOpen, DollarSign,
  ArrowRight, ExternalLink, Flame, MapPin, TrendingUp, TrendingDown,
  Sparkles, Wind, Droplets,
} from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'

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

// ─── Tiny primitives ──────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, accent = '#a78bfa', label, to, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${accent}22`, color: accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} strokeWidth={2} />
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700,
          color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{label}</span>
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
  )
}

function Skeleton({ h = 14, w = '100%', r = 4 }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: 'var(--input-bg-hover)', animation: 'home-pulse 1.4s ease-in-out infinite' }} />
}

const panelStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem 1.2rem' }

// ─── Weather (lives inside hero) ──────────────────────────────────────────────
const fetchWeather = async ({ signal }) => {
  const geoRes = await fetch('https://ipinfo.io/json', { signal })
  if (!geoRes.ok) throw new Error('geo')
  const { loc, city, country } = await geoRes.json()
  if (!loc) throw new Error('loc')
  const [lat, lon] = loc.split(',').map(Number)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  const wxRes = await fetch(url, { signal })
  if (!wxRes.ok) throw new Error('wx')
  const j = await wxRes.json()
  return {
    city, country,
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    humidity: j.current.relative_humidity_2m,
    wind: Math.round(j.current.wind_speed_10m),
    code: j.current.weathercode,
    hi: Math.round(j.daily.temperature_2m_max?.[0] ?? 0),
    lo: Math.round(j.daily.temperature_2m_min?.[0] ?? 0),
  }
}

function HeroWeather() {
  const { data, error, loading } = useCachedFetch('home:weather', fetchWeather, { ttl: 15 * 60_000 })
  if (loading && !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 240 }}>
        <Skeleton h={48} w={48} r={12} />
        <div style={{ display: 'grid', gap: 6, flex: 1 }}><Skeleton h={20} w="60%" /><Skeleton h={12} w="80%" /></div>
      </div>
    )
  }
  if (error || !data) {
    return <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Weather unavailable.</div>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(125,211,252,0.18), rgba(167,139,250,0.18))',
        border: '1px solid rgba(125,211,252,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.9rem', flexShrink: 0,
      }}>{WMO_ICON[data.code] ?? '🌡️'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.85rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {data.temp}°
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {WMO_LABEL[data.code] ?? '—'}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {data.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {data.city}</span>}
          <span>H {data.hi}° · L {data.lo}°</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Wind size={10} /> {data.wind}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Droplets size={10} /> {data.humidity}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Headlines ────────────────────────────────────────────────────────────────
const fetchHeadlines = async ({ signal }) => {
  const url = 'https://feeds.bbci.co.uk/news/world/rss.xml'
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, { signal, cache: 'no-store' })
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<item>')) {
        const doc = new DOMParser().parseFromString(text, 'text/xml')
        return Array.from(doc.querySelectorAll('item')).slice(0, 6).map((it) => ({
          title:   it.querySelector('title')?.textContent?.trim() ?? '',
          link:    it.querySelector('link')?.textContent?.trim() ?? '',
          pubDate: it.querySelector('pubDate')?.textContent?.trim() ?? '',
        })).filter((a) => a.title && a.link)
      }
    }
  } catch { /* fall through */ }
  const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=6`, { signal })
  const j = await r.json()
  if (j.status !== 'ok') throw new Error('rss')
  return j.items.slice(0, 6).map((it) => ({ title: it.title, link: it.link, pubDate: it.pubDate }))
}

function HeadlinesPanel() {
  const { data: items, error, loading } = useCachedFetch('home:headlines', fetchHeadlines, { ttl: 10 * 60_000 })
  return (
    <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
      <SectionHead icon={Newspaper} accent="#a78bfa" label="Top Headlines" to="/news" action="More news" />
      {loading && !items && <div style={{ display: 'grid', gap: 10 }}>{[0,1,2,3,4,5].map((i) => <Skeleton key={i} h={16} />)}</div>}
      {error && !items && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Couldn&apos;t load headlines.</div>}
      {items && (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.55rem' }}>
          {items.map((it, i) => (
            <li key={it.link + i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'baseline', paddingBottom: i === items.length - 1 ? 0 : '0.55rem', borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', width: 18, flexShrink: 0, paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <a href={it.link} target="_blank" rel="noopener noreferrer" style={{
                color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.83rem', lineHeight: 1.4,
                display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0, flex: 1,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{it.title}</span>
                <ExternalLink size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </a>
              {it.pubDate && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeAgo(it.pubDate)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Football ─────────────────────────────────────────────────────────────────
const fetchNextMatch = async ({ signal }) => {
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
      status: e.status?.type?.state ?? 'pre',
      statusDetail: e.status?.type?.shortDetail ?? '',
      home: home?.team?.shortDisplayName ?? home?.team?.displayName ?? '—',
      away: away?.team?.shortDisplayName ?? away?.team?.displayName ?? '—',
      homeScore: home?.score ?? null,
      awayScore: away?.score ?? null,
      homeLogo: home?.team?.logo,
      awayLogo: away?.team?.logo,
    }
  })
  const live = events.filter((e) => e.status === 'in')
  if (live.length) return live[0]
  const upcoming = events.filter((e) => e.status === 'pre').sort((a, b) => new Date(a.date) - new Date(b.date))
  if (upcoming.length) return upcoming[0]
  const done = events.filter((e) => e.status === 'post').sort((a, b) => new Date(b.date) - new Date(a.date))
  return done[0] ?? null
}

function FootballPanel() {
  const { data: m, error, loading } = useCachedFetch('home:football', fetchNextMatch, { ttl: 5 * 60_000 })
  const kickoffLabel = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const same = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return same ? `Today · ${time}` : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${time}`
  }
  return (
    <section style={panelStyle}>
      <SectionHead icon={Trophy} accent="#34d399" label="Football" to="/football" action="All matches" />
      {loading && !m && <div style={{ display: 'grid', gap: 10 }}><Skeleton h={12} w="40%" /><Skeleton h={36} /></div>}
      {!loading && !m && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{error ? "Couldn't load matches." : 'No matches today.'}</div>}
      {m && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.7rem' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{m.league}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: m.status === 'in' ? '#ef4444' : m.status === 'post' ? 'var(--text-muted)' : '#a78bfa',
            }}>
              {m.status === 'in' && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#ef4444', animation: 'home-pulse 1.4s ease-in-out infinite' }} />}
              {m.status === 'in' ? `LIVE · ${m.statusDetail}` : m.status === 'post' ? 'FT' : kickoffLabel(m.date)}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
              {m.homeLogo && <img src={m.homeLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {m.status === 'pre' ? 'vs' : `${m.homeScore ?? 0} – ${m.awayScore ?? 0}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', justifyContent: 'flex-end', minWidth: 0 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away}</span>
              {m.awayLogo && <img src={m.awayLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Markets ticker ───────────────────────────────────────────────────────────
const fetchFinance = async ({ signal }) => {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { signal })
  if (!r.ok) throw new Error('coingecko')
  return r.json()
}

function MarketsStrip() {
  const { data, error, loading } = useCachedFetch('home:finance', fetchFinance, { ttl: 2 * 60_000 })
  const rows = [
    { key: 'bitcoin',  label: 'BTC', color: '#f7931a' },
    { key: 'ethereum', label: 'ETH', color: '#627eea' },
    { key: 'solana',   label: 'SOL', color: '#14f195' },
  ]
  return (
    <section style={{ ...panelStyle, padding: '0.7rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
        <DollarSign size={12} style={{ color: '#fb923c' }} /> Markets
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flex: 1, flexWrap: 'wrap' }}>
        {loading && !data && rows.map((r) => <Skeleton key={r.key} h={14} w={110} />)}
        {error && !data && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Couldn&apos;t load prices.</span>}
        {data && rows.map(({ key, label, color }) => {
          const price = data[key]?.usd
          const ch = data[key]?.usd_24h_change ?? 0
          const up = ch >= 0
          if (price == null) return null
          return (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.45rem' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ${price.toLocaleString(undefined, { maximumFractionDigits: price > 100 ? 0 : 2 })}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace", color: up ? '#4ade80' : '#f87171' }}>
                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {up ? '+' : ''}{ch.toFixed(2)}%
              </span>
            </span>
          )
        })}
      </div>
      <Link to="/finance" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        Watchlist <ArrowRight size={10} />
      </Link>
    </section>
  )
}

// ─── Radio ────────────────────────────────────────────────────────────────────
function RadioPanel() {
  const last   = readJSON('lr:last:v1', null)
  const recent = readJSON('lr:recents:v1', [])
  return (
    <section style={panelStyle}>
      <SectionHead icon={Radio} accent="#f472b6" label="Live Radio" to="/radio" action="Open player" />
      {!last && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No station yet — pick one in <Link to="/radio" style={{ color: 'var(--accent-purple)' }}>Live Radio</Link>.
        </div>
      )}
      {last && (
        <div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Last played
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {last.name ?? 'Unknown station'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {[last.countrycode, last.tags?.split(',')[0], last.bitrate ? `${last.bitrate} kbps` : null].filter(Boolean).join(' · ')}
          </div>
          {recent.length > 1 && (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 3, marginTop: '0.7rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border)' }}>
              {recent.slice(1, 3).map((r, i) => (
                <li key={(r.stationuuid ?? r.name) + i} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>↳</span>{r.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Language ────────────────────────────────────────────────────────────────
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

function LanguagePanel() {
  const streaks = useMemo(() => readLanguageStreaks(), [])
  const top = streaks[0]
  return (
    <section style={panelStyle}>
      <SectionHead icon={BookOpen} accent="#fbbf24" label="Language" to="/language" action="Open planner" />
      {!top && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No plans yet — create one in <Link to="/language" style={{ color: 'var(--accent-purple)' }}>Language Planner</Link>.
        </div>
      )}
      {top && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>
              {top.current}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              day{top.current === 1 ? '' : 's'} · <Flame size={11} style={{ display: 'inline', verticalAlign: -1, color: '#f97316' }} /> {top.lang}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Level <span className="badge badge-purple" style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem' }}>{top.cefr}</span>
            &nbsp;· longest {top.longest}d
            {top.lastStudied && <> · last {timeAgo(top.lastStudied + 'T12:00:00')}</>}
          </div>
          {streaks.length > 1 && (
            <div style={{ marginTop: '0.7rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              {streaks.slice(1, 4).map((s) => (
                <span key={s.lang} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {s.lang} <span style={{ color: 'var(--text-muted)' }}>· {s.current}d</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
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
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hero — greeting + weather inline */}
      <div style={{
        ...panelStyle,
        padding: '1.4rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1.5rem', flexWrap: 'wrap',
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card-hover))',
      }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            <Sparkles size={11} /> {dateLabel} · {timeLabel}
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', margin: 0 }}>
            {hello}, <span className="gradient-text">here&apos;s your day</span>
          </h1>
        </div>
        <HeroWeather />
      </div>

      {/* Markets ticker — full width */}
      <MarketsStrip />

      {/* Featured row — Headlines + Football */}
      <div className="home-feature-grid">
        <HeadlinesPanel />
        <FootballPanel />
      </div>

      {/* Bottom row — Radio + Language */}
      <div className="home-bottom-grid">
        <RadioPanel />
        <LanguagePanel />
      </div>

      <style>{`
        @keyframes home-pulse { 0%,100% { opacity: 0.45 } 50% { opacity: 0.85 } }
        .home-feature-grid {
          display: grid; gap: 1rem;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        }
        .home-bottom-grid {
          display: grid; gap: 1rem;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 860px) {
          .home-feature-grid, .home-bottom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
