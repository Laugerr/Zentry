import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Radio, Trophy, BookOpen,
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
  const feedUrl  = 'https://feeds.bbci.co.uk/news/world/rss.xml'
  const MEDIA_NS = 'http://search.yahoo.com/mrss/'

  const extractImage = (item) => {
    const thumb = item.getElementsByTagNameNS(MEDIA_NS, 'thumbnail')[0]
    if (thumb) return thumb.getAttribute('url')
    const content = item.getElementsByTagNameNS(MEDIA_NS, 'content')[0]
    if (content?.getAttribute('type')?.startsWith('image')) return content.getAttribute('url')
    const enc = item.querySelector('enclosure')
    if (enc?.getAttribute('type')?.startsWith('image')) return enc.getAttribute('url')
    return null
  }

  try {
    const res = await fetch(
      `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(feedUrl)}`,
      { signal, cache: 'no-store' }
    )
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<item>')) {
        const doc    = new DOMParser().parseFromString(text, 'text/xml')
        const parsed = Array.from(doc.querySelectorAll('item')).slice(0, 10).map((it) => ({
          title:   it.querySelector('title')?.textContent?.trim() ?? '',
          link:    it.querySelector('link')?.textContent?.trim() ?? '',
          pubDate: it.querySelector('pubDate')?.textContent?.trim() ?? '',
          image:   extractImage(it),
        })).filter((a) => a.title && a.link)
        if (parsed.length) return parsed
      }
    }
  } catch { /* fall through */ }

  const r = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`,
    { signal }
  )
  const j = await r.json()
  if (j.status !== 'ok') throw new Error('rss')
  return j.items.slice(0, 10).map((it) => ({
    title: it.title, link: it.link, pubDate: it.pubDate,
    image: it.thumbnail || it.enclosure?.link || null,
  }))
}

// Per-article accent palette — used for card background + colour identity
const CARD_ACCENTS = [
  { bg: 'linear-gradient(145deg, #110d2e 0%, #1a1240 100%)', color: '#a78bfa' },
  { bg: 'linear-gradient(145deg, #0c1929 0%, #0f2238 100%)', color: '#60a5fa' },
  { bg: 'linear-gradient(145deg, #1f0a1a 0%, #2d1028 100%)', color: '#f472b6' },
  { bg: 'linear-gradient(145deg, #091a14 0%, #0e2a1e 100%)', color: '#34d399' },
  { bg: 'linear-gradient(145deg, #1c1206 0%, #281c0a 100%)', color: '#fbbf24' },
  { bg: 'linear-gradient(145deg, #1a0c0c 0%, #280f0f 100%)', color: '#f87171' },
  { bg: 'linear-gradient(145deg, #0f1a1a 0%, #142626 100%)', color: '#2dd4bf' },
  { bg: 'linear-gradient(145deg, #1a1208 0%, #231a0d 100%)', color: '#fb923c' },
  { bg: 'linear-gradient(145deg, #121230 0%, #1a1a40 100%)', color: '#818cf8' },
  { bg: 'linear-gradient(145deg, #0f1f10 0%, #152a16 100%)', color: '#4ade80' },
]

function HeadlinesPanel() {
  const { data: items, error, loading } = useCachedFetch('home:headlines', fetchHeadlines, { ttl: 10 * 60_000 })
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress]   = useState(0)
  const trackRef   = useRef(null)
  const animRef    = useRef(false)  // prevent overlapping slides

  const ANIM_MS = 440

  // Slide the image strip, then snap items + reset position invisibly
  const slide = (dir) => {
    if (animRef.current || !trackRef.current || !items?.length) return
    animRef.current = true
    const target = dir > 0 ? '-66.6667%' : '0%'
    trackRef.current.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`
    trackRef.current.style.transform  = `translateX(${target})`
    setTimeout(() => {
      setActiveIdx((i) => (i + dir + items.length) % items.length)
      // Snap back to centre without animation
      if (trackRef.current) {
        trackRef.current.style.transition = 'none'
        trackRef.current.style.transform  = 'translateX(-33.3333%)'
      }
      animRef.current = false
    }, ANIM_MS + 10)
  }

  // Auto-advance timer — resets whenever activeIdx changes
  useEffect(() => {
    if (!items?.length) return
    setProgress(0)
    const start    = Date.now()
    const DURATION = 5000
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / DURATION, 1))
      if (elapsed >= DURATION) { clearInterval(id); slide(1) }
    }, 50)
    return () => clearInterval(id)
  }, [items, activeIdx])

  if (loading && !items) return <section style={{ ...panelStyle, padding: 0, height: 440, animation: 'home-pulse 1.4s ease-in-out infinite' }} />
  if ((error && !items) || !items?.length) return null

  const len     = items.length
  const active  = items[activeIdx]
  const prevIdx = (activeIdx - 1 + len) % len
  const nextIdx = (activeIdx + 1) % len
  const accent  = CARD_ACCENTS[activeIdx % CARD_ACCENTS.length]

  // The track always shows [prev, current, next] — centred at -33.33%
  const trackItems = [items[prevIdx], items[activeIdx], items[nextIdx]]

  return (
    <section style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Newspaper size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Top Headlines</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>{activeIdx + 1} / {len}</span>
        </div>
        <Link to="/news" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
          More news <ArrowRight size={10} />
        </Link>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent.color}, var(--accent-pink))`, transition: 'width 0.05s linear' }} />
      </div>

      {/* Image area */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 280 }}>

        {/* Film strip — 3 images wide, slides as one unit */}
        <div
          ref={trackRef}
          style={{
            display: 'flex', width: '300%', height: '100%',
            transform: 'translateX(-33.3333%)',
            willChange: 'transform',
          }}
        >
          {trackItems.map((it, i) => (
            <div
              key={i}
              style={{
                width: '33.3333%', height: '100%', flexShrink: 0,
                background: it.image
                  ? `url(${it.image}) center/cover no-repeat`
                  : CARD_ACCENTS[(prevIdx + i) % CARD_ACCENTS.length].bg,
              }}
            />
          ))}
        </div>

        {/* ── Fixed overlay — never moves ── */}
        {/* Scrim */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)'
        }} />
        {/* Text — fades in on change, click opens article */}
        <a
          key={activeIdx}
          href={active.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hl-text-fade"
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '1rem 1.1rem', textDecoration: 'none',
          }}
        >
          {active.pubDate && (
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 5, letterSpacing: '0.06em' }}>
              {timeAgo(active.pubDate)}
            </div>
          )}
          <div style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)', fontWeight: 700, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {active.title}
          </div>
        </a>
      </div>

      {/* 5 square thumbnails — static, only highlight changes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', padding: '0.5rem 0.6rem' }}>
        {[
          (activeIdx - 2 + len) % len,
          prevIdx,
          activeIdx,
          nextIdx,
          (activeIdx + 2) % len,
        ].map((idx, i) => {
          const it     = items[idx]
          const isCurr = i === 2
          const ac     = CARD_ACCENTS[idx % CARD_ACCENTS.length]
          const offset = i - 2  // -2, -1, 0, +1, +2
          return (
            <button
              key={idx}
              onClick={() => {
                if (offset !== 0) slide(offset)
                else window.open(it.link, '_blank', 'noopener')
              }}
              title={it.title}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 6, overflow: 'hidden', position: 'relative',
                padding: 0, cursor: 'pointer', outline: 'none',
                background: it.image ? `url(${it.image}) center/cover no-repeat` : ac.bg,
                border: isCurr ? `2px solid ${accent.color}` : '2px solid rgba(255,255,255,0.08)',
                opacity: isCurr ? 1 : Math.abs(offset) === 1 ? 0.55 : 0.3,
                transition: 'opacity 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.25rem 0.3rem', fontSize: '0.52rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {it.title}
              </div>
            </button>
          )
        })}
      </div>
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
  const r = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false',
    { signal }
  )
  if (!r.ok) throw new Error('coingecko')
  return r.json() // array of { id, symbol, name, current_price, price_change_percentage_24h }
}

function MarketsStrip() {
  const { data, error, loading } = useCachedFetch('home:markets', fetchFinance, { ttl: 2 * 60_000 })

  // Loading state — pulse bar at same height as the real ticker
  if (loading && !data) {
    return (
      <div style={{ ...panelStyle, padding: 0, height: 44, animation: 'home-pulse 1.4s ease-in-out infinite', borderRadius: 12 }} />
    )
  }
  if ((error && !data) || !data?.length) return null

  // Duplicate the list so the second copy seamlessly replaces the first
  const items = [...data, ...data]

  return (
    <section style={{ ...panelStyle, padding: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative', height: 44 }}>

      {/* Fixed "MARKETS" pill on the left */}
      <div style={{
        flexShrink: 0, zIndex: 2, height: '100%',
        display: 'flex', alignItems: 'center',
        padding: '0 1rem',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          MARKETS
        </span>
      </div>

      {/* Scrolling track */}
      <div className="markets-ticker-track">
        {items.map((coin, idx) => {
          const ch = coin.price_change_percentage_24h ?? 0
          const up = ch >= 0
          const price = coin.current_price
          return (
            <span
              key={coin.id + idx}
              style={{
                display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem',
                padding: '0 1.25rem',
                borderRight: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                {coin.symbol.toUpperCase()}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ${price.toLocaleString(undefined, { maximumFractionDigits: price >= 100 ? 0 : price >= 1 ? 2 : 4 })}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: up ? '#4ade80' : '#f87171' }}>
                {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                {up ? '+' : ''}{ch.toFixed(2)}%
              </span>
            </span>
          )
        })}
      </div>

      {/* Right-edge fade */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'linear-gradient(to left, var(--bg-card), transparent)', pointerEvents: 'none', zIndex: 2 }} />
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

// ─── Typewriter ───────────────────────────────────────────────────────────────
const PHRASES_NIGHT = [
  "get some rest",
  "still up?",
  "burning the midnight oil",
  "the world can wait",
  "quiet hours",
]
const PHRASES_MORNING = [
  "here's your day",
  "let's get to work",
  "what's on the agenda",
  "here's your briefing",
  "make it count",
  "fresh start",
]
const PHRASES_AFTERNOON = [
  "how's it going?",
  "afternoon check-in",
  "keep the momentum",
  "here's the rundown",
  "staying on track?",
  "halfway through",
]
const PHRASES_EVENING = [
  "winding down?",
  "here's the recap",
  "end of day summary",
  "how'd it go?",
  "time to recharge",
  "almost done",
]

const getPhrases = (h) =>
  h < 5  ? PHRASES_NIGHT     :
  h < 12 ? PHRASES_MORNING   :
  h < 18 ? PHRASES_AFTERNOON :
           PHRASES_EVENING

const getPeriod = (h) =>
  h < 5  ? 'night'     :
  h < 12 ? 'morning'   :
  h < 18 ? 'afternoon' :
           'evening'

function useTypewriter(phrases, typeSpeed = 75, deleteSpeed = 35, pauseMs = 1800) {
  const [text, setText]         = useState(phrases[0])
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [paused, setPaused]     = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]

    if (paused) {
      const t = setTimeout(() => { setPaused(false); setDeleting(true) }, pauseMs)
      return () => clearTimeout(t)
    }
    if (deleting) {
      if (text.length === 0) {
        setDeleting(false)
        setPhraseIdx((i) => (i + 1) % phrases.length)
        return
      }
      const t = setTimeout(() => setText((s) => s.slice(0, -1)), deleteSpeed)
      return () => clearTimeout(t)
    }
    if (text === current) { setPaused(true); return }
    const t = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed)
    return () => clearTimeout(t)
  }, [text, deleting, paused, phraseIdx, phrases, typeSpeed, deleteSpeed, pauseMs])

  return text
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(id)
  }, [])

  const h         = now.getHours()
  const hello     = greet(h)
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const typed     = useTypewriter(getPhrases(h))
  const period    = getPeriod(h)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hero — greeting + weather inline */}
      <div
        className={`hero-tod hero-${period}`}
        style={{
          ...panelStyle,
          position: 'relative', overflow: 'hidden',
          padding: '1.4rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1.5rem', flexWrap: 'wrap',
          background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card-hover))',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            <Sparkles size={11} /> {dateLabel} · {timeLabel}
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', margin: 0 }}>
            {hello}, <span className="gradient-text">{typed}</span>
          </h1>
        </div>
        <HeroWeather />
      </div>

      {/* Markets ticker — full width */}
      <MarketsStrip />

      {/* Main area — Headlines 50% | Football+Radio 25% | Language 25% */}
      <div className="home-main-grid">
        <HeadlinesPanel />
        <div className="home-right-col">
          <FootballPanel />
          <RadioPanel />
        </div>
        <div className="home-right-col">
          <LanguagePanel />
        </div>
      </div>

      <style>{`
        @keyframes home-pulse { 0%,100% { opacity: 0.45 } 50% { opacity: 0.85 } }

        /* Overlay text fades in on article change */
        @keyframes hl-text-fade { from { opacity: 0; } to { opacity: 1; } }
        .hl-text-fade { animation: hl-text-fade 0.35s ease; }

        /* Layout */
        .home-main-grid {
          display: grid; gap: 1rem;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
        }
        .home-right-col { display: flex; flex-direction: column; gap: 1rem; }
        @media (max-width: 1024px) {
          .home-main-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
        }
        @media (max-width: 640px) {
          .home-main-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
