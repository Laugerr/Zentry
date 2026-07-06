import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Radio, Trophy, BookOpen,
  ArrowRight, Flame, MapPin,
  Sparkles, Wind, Droplets, Play, Pause,
} from 'lucide-react'
import { Card, Skeleton } from '../components/ui'
import { Illustration } from '../components/Illustration'
import { useRadio } from '../radio/radio-context'
import { RadioArt } from '../radio/NowPlaying'
import { stationSubtitle } from '../radio/stations'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { useWeather, WMO_ICON } from '../hooks/useWeather'

// ─── Small helpers ────────────────────────────────────────────────────────────
const timeAgo  = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
const greet = (h) => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

const WMO_LABEL = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunder + hail', 99: 'Thunder + hail',
}

// ─── Tiny primitives ──────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, accent = 'var(--accent-text)', label, to, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} strokeWidth={2} />
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
          color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      {to && (
        <Link to={to} className="home-more-link">
          {action ?? 'Open'} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

// Every Home panel is a <Card padding="none" className="home-panel"> (padding
// and radius live in index.css so phones can tighten them).

// ─── Weather (lives inside hero) ──────────────────────────────────────────────
function HeroWeather() {
  const { data, error, loading } = useWeather()
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
        background: 'linear-gradient(135deg, var(--info-soft), var(--accent-soft))',
        border: '1px solid color-mix(in srgb, var(--info) 25%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.9rem', flexShrink: 0,
      }}>{WMO_ICON[data.code] ?? '🌡️'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.85rem', fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {data.temp}°
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {WMO_LABEL[data.code] ?? '—'}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {data.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> {data.city}</span>}
          <span>H {data.hi}° · L {data.lo}°</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Wind size={11} /> {data.wind}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Droplets size={11} /> {data.humidity}%</span>
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

// Per-article accent — `bg` stands in for a missing photo (always dark, under
// white text like an image); `color` tints the progress bar + active thumbnail.
const CARD_ACCENTS = [
  { bg: 'linear-gradient(145deg, #110d2e 0%, #1a1240 100%)', color: 'var(--accent-text)' },
  { bg: 'linear-gradient(145deg, #0c1929 0%, #0f2238 100%)', color: 'var(--info)' },
  { bg: 'linear-gradient(145deg, #1f0a1a 0%, #2d1028 100%)', color: 'var(--pink)' },
  { bg: 'linear-gradient(145deg, #091a14 0%, #0e2a1e 100%)', color: 'var(--success)' },
  { bg: 'linear-gradient(145deg, #1c1206 0%, #281c0a 100%)', color: 'var(--warning)' },
  { bg: 'linear-gradient(145deg, #1a0c0c 0%, #280f0f 100%)', color: 'var(--danger)' },
  { bg: 'linear-gradient(145deg, #0f1a1a 0%, #142626 100%)', color: 'var(--info)' },
  { bg: 'linear-gradient(145deg, #1a1208 0%, #231a0d 100%)', color: 'var(--orange)' },
  { bg: 'linear-gradient(145deg, #121230 0%, #1a1a40 100%)', color: 'var(--accent-text)' },
  { bg: 'linear-gradient(145deg, #0f1f10 0%, #152a16 100%)', color: 'var(--success)' },
]

function HeadlinesPanel() {
  const { data: items, error, loading } = useCachedFetch('home:headlines', fetchHeadlines, { ttl: 10 * 60_000 })
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress]   = useState(0)
  const trackRef   = useRef(null)
  const animRef    = useRef(false)  // prevent overlapping slides
  const thumbsRef  = useRef(null)

  const ANIM_MS = 440

  // Slide the image strip, then snap items + reset position invisibly
  const slide = useCallback((dir) => {
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
  }, [items])

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
  }, [items, activeIdx, slide])

  // Phones: the thumbnails are a swipeable strip — centre it on the active
  // one. The active thumb always sits in the middle slot, so once centred it
  // stays centred as the carousel advances. No-op when the strip doesn't scroll.
  useEffect(() => {
    const strip = thumbsRef.current
    const tile  = strip?.children[2]
    if (!tile || strip.scrollWidth <= strip.clientWidth) return
    strip.scrollLeft = tile.offsetLeft - (strip.clientWidth - tile.clientWidth) / 2
  }, [items])

  if (loading && !items) return <Skeleton h={440} r={14} />
  if ((error && !items) || !items?.length) return null

  const len     = items.length
  const active  = items[activeIdx]
  const prevIdx = (activeIdx - 1 + len) % len
  const nextIdx = (activeIdx + 1) % len
  const accent  = CARD_ACCENTS[activeIdx % CARD_ACCENTS.length]

  // The track always shows [prev, current, next] — centred at -33.33%
  const trackItems = [items[prevIdx], items[activeIdx], items[nextIdx]]

  return (
    <Card as="section" padding="none" tone="news" className="home-panel home-panel-flush">

      {/* Header */}
      <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Newspaper size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Top Headlines</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeIdx + 1} / {len}</span>
        </div>
        <Link to="/news" className="home-more-link">
          More news <ArrowRight size={12} />
        </Link>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent.color}, var(--accent-pink))`, transition: 'width 0.05s linear' }} />
      </div>

      {/* Image area */}
      <div className="hl-image">

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
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', marginBottom: 5, letterSpacing: '0.04em' }}>
              {timeAgo(active.pubDate)}
            </div>
          )}
          <div style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)', fontWeight: 700, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {active.title}
          </div>
        </a>
      </div>

      {/* 5 thumbnails — a row on desktop, a swipeable strip on phones */}
      <div ref={thumbsRef} className="hl-thumbs">
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
              aria-label={isCurr ? `Open: ${it.title}` : `Show: ${it.title}`}
              className="hl-thumb"
              style={{
                background: it.image ? `url(${it.image}) center/cover no-repeat` : ac.bg,
                border: isCurr ? `2px solid ${accent.color}` : '2px solid var(--border)',
                opacity: isCurr ? 1 : Math.abs(offset) === 1 ? 0.7 : 0.5,
                transition: 'opacity 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)' }} />
              {/* Clamp on the inner span — clamping the padded box lets a
                  third line peek through the padding */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.3rem 0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#fff', lineHeight: 1.25, textAlign: 'left' }}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</span>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
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
    <Card as="section" padding="none" tone="football" className="home-panel">
      <SectionHead icon={Trophy} accent="var(--tool-football)" label="Football" to="/football" action="All matches" />
      {loading && !m && <div style={{ display: 'grid', gap: 10 }}><Skeleton h={12} w="40%" /><Skeleton h={36} /></div>}
      {!loading && !m && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{error ? "Couldn't load matches." : 'No matches today.'}</div>}
      {m && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.7rem' }}>
            <span style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{m.league}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: m.status === 'in' ? 'var(--danger)' : m.status === 'post' ? 'var(--text-muted)' : 'var(--accent-text)',
            }}>
              {m.status === 'in' && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--danger)', animation: 'home-pulse 1.4s ease-in-out infinite' }} />}
              {m.status === 'in' ? `LIVE · ${m.statusDetail}` : m.status === 'post' ? 'FT' : kickoffLabel(m.date)}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
              {m.homeLogo && <img src={m.homeLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {m.status === 'pre' ? 'vs' : `${m.homeScore ?? 0} – ${m.awayScore ?? 0}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', justifyContent: 'flex-end', minWidth: 0 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away}</span>
              {m.awayLogo && <img src={m.awayLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Radio ────────────────────────────────────────────────────────────────────
function RadioPanel() {
  const radio = useRadio()
  const current = radio.station ?? radio.lastStation
  const playing = radio.station && (radio.status === 'playing' || radio.status === 'loading')
  // Recently played, minus whatever is showing as the main station
  const others = radio.recents.filter((r) => r.stationuuid !== current?.stationuuid).slice(0, 2)

  return (
    <Card as="section" padding="none" tone="radio" className="home-panel">
      <SectionHead icon={Radio} accent="var(--tool-radio)" label={radio.station ? 'Now playing' : 'Live Radio'} to="/radio" action="Browse" />
      {!current && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <Illustration name="radio" width={88} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            No station yet — pick one in <Link to="/radio" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Live Radio</Link>.
          </div>
        </div>
      )}
      {current && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <RadioArt station={current} status={radio.station ? radio.status : 'paused'} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!radio.station && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Last played</div>}
              <div style={{ fontSize: '1rem', fontWeight: 650, letterSpacing: '-0.02em', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.name ?? 'Unknown station'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stationSubtitle(current) || 'Live radio'}
              </div>
            </div>
            <button type="button" className="np-play" style={{ width: 48, height: 48, boxShadow: 'none' }}
              onClick={radio.toggle} aria-label={playing ? 'Pause' : radio.station ? 'Play' : `Resume ${current.name}`}>
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
          </div>
          {others.length > 0 && (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 2, marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
              {others.map((r) => (
                <li key={r.stationuuid}>
                  <button type="button" className="home-recent-station" onClick={() => radio.play(r, radio.recents)}>
                    <Play size={12} fill="currentColor" aria-hidden="true" />
                    <span>{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
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
    <Card as="section" padding="none" tone="language" className="home-panel">
      <SectionHead icon={BookOpen} accent="var(--tool-language)" label="Language" to="/language" action="Open planner" />
      {!top && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No plans yet — create one in <Link to="/language" style={{ color: 'var(--accent-text)' }}>Language Planner</Link>.
        </div>
      )}
      {top && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--tool-language)', lineHeight: 1 }}>
              {top.current}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              day{top.current === 1 ? '' : 's'} · <Flame size={11} style={{ display: 'inline', verticalAlign: -1, color: 'var(--orange)' }} /> {top.lang}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Level <span className="badge badge-purple" style={{ padding: '0.1rem 0.45rem' }}>{top.cefr}</span>
            &nbsp;· longest {top.longest}d
            {top.lastStudied && <> · last {timeAgo(top.lastStudied + 'T12:00:00')}</>}
          </div>
          {streaks.length > 1 && (
            <div style={{ marginTop: '0.7rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              {streaks.slice(1, 4).map((s) => (
                <span key={s.lang} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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

// ─── Quick start ───────────────────────────────────────────────────────────────
function QuickActionsPanel() {
  const tools = [
    { to: '/news',     icon: Newspaper, label: 'News',     accent: 'var(--accent-text)' },
    { to: '/radio',    icon: Radio,     label: 'Radio',    accent: 'var(--info)' },
    { to: '/football', icon: Trophy,    label: 'Football', accent: 'var(--success)' },
    { to: '/language', icon: BookOpen,  label: 'Language', accent: 'var(--pink)' },
  ]

  return (
    // Hidden on phones — the bottom tab bar already does this job there
    <Card as="section" padding="none" className="home-panel home-quick">
      <SectionHead icon={Sparkles} label="Quick Start" />
      <div className="home-action-grid">
        {tools.map(({ to, icon: Icon, label, accent }) => (
          <Link
            key={to}
            to={to}
            className="home-action-tile"
            style={{ '--tile-accent': accent, textDecoration: 'none' }}
          >
            <span className="home-action-icon"><Icon size={15} strokeWidth={1.8} /></span>
            <span>{label}</span>
            <ArrowRight size={12} className="home-action-arrow" />
          </Link>
        ))}
      </div>
    </Card>
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
    <div className="home-shell">
      {/* Hero — greeting + weather inline */}
      <Card padding="none" className={`home-panel home-hero hero-tod hero-${period}`}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            <Sparkles size={11} /> {dateLabel} · {timeLabel}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)', lineHeight: 1.02, fontFamily: 'var(--font-sans)', fontWeight: 750, letterSpacing: '-0.045em', margin: 0 }}>
            {hello}
          </h1>
          <div style={{ minHeight: '1.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-sans)', fontSize: 'clamp(0.95rem, 1.4vw, 1.12rem)', fontWeight: 700 }}>
            <span className="gradient-text">{typed}</span>
            <span style={{ width: 8, height: '1.05em', borderRadius: 2, background: 'var(--accent-purple)', animation: 'home-pulse 1.1s ease-in-out infinite' }} />
          </div>
        </div>
        <HeroWeather />
      </Card>

      {/* Today — Football | Language (stacked on phones) */}
      <div className="home-today-stack">
        <FootballPanel />
        <LanguagePanel />
      </div>

      {/* Main area — Headlines | Quick Start + Radio (side by side on tablets) */}
      <div className="home-main-grid">
        <HeadlinesPanel />
        <div className="home-right-col">
          <QuickActionsPanel />
          <RadioPanel />
        </div>
      </div>
    </div>
  )
}
