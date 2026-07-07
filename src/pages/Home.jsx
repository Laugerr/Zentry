import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Radio, Trophy, BookOpen,
  ArrowRight, Flame, MapPin,
  Sparkles, Wind, Droplets, Play, Pause, Star,
} from 'lucide-react'
import { Card, Skeleton } from '../components/ui'
import { Illustration } from '../components/Illustration'
import { useRadio } from '../radio/radio-context'
import { RadioArt } from '../radio/NowPlaying'
import { stationSubtitle } from '../radio/stations'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { useWeather, WMO_ICON } from '../hooks/useWeather'
import { useSettings } from '../settings/store'
import { formatTemp, formatWind, formatTime } from '../settings/format'
import { fetchScoreboard, pickFeatured, fetchFavTeams, fixtureFor, describeFixture, byUrgency, MAX_HOME_TEAMS } from '../home/football'
import { useFavTeamIds } from '../settings/favTeams'
import { resolveLayout, WIDGET_BY_ID } from '../home/widgets'

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
  const [settings] = useSettings()
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
            {formatTemp(data.temp, settings)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {WMO_LABEL[data.code] ?? '—'}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {data.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> {data.city}</span>}
          <span>H {formatTemp(data.hi, settings)} · L {formatTemp(data.lo, settings)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Wind size={11} /> {formatWind(data.wind, settings)}</span>
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
// Today's scoreboard and the starred teams' fixtures. Cached + deduped, so the
// match tile, "Your teams" and the greeting share two requests.
function useHomeFootball() {
  const allFavs = useFavTeamIds()
  const favIds  = useMemo(() => allFavs.slice(0, MAX_HOME_TEAMS), [allFavs])
  const board  = useCachedFetch('home:scoreboard', fetchScoreboard, { ttl: 2 * 60_000 })
  const teams  = useCachedFetch(`home:teams:${favIds.join(',')}`, ({ signal }) => fetchFavTeams(favIds, signal), {
    ttl: 10 * 60_000, enabled: favIds.length > 0,
  })
  return { favIds, board, teams }
}

function kickoffLabel(iso, settings) {
  if (!iso) return ''
  const d = new Date(iso)
  const time = formatTime(d, { settings })
  return d.toDateString() === new Date().toDateString()
    ? `Today · ${time}`
    : `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`
}

function MatchStatus({ ev, settings }) {
  if (ev.state === 'in') return <span className="badge badge-red"><span className="live-dot" />{ev.detail || 'LIVE'}</span>
  if (ev.state === 'post') return <span className="badge badge-neutral">FT</span>
  return <span className="home-kickoff">{kickoffLabel(ev.date, settings)}</span>
}

function TeamSide({ team, align = 'left', bold }) {
  return (
    <div className={`home-side home-side-${align}`}>
      {team.logo && <img src={team.logo} alt="" loading="lazy" />}
      <span style={{ fontWeight: bold ? 700 : 600 }}>{team.name}</span>
    </div>
  )
}

function Scoreline({ ev, size = '1.25rem' }) {
  return (
    <div className="home-score" style={{ fontSize: size }}>
      {ev.state === 'pre' ? 'vs' : `${ev.home.score ?? 0} – ${ev.away.score ?? 0}`}
    </div>
  )
}

function FootballPanel() {
  const { board } = useHomeFootball()
  const [settings] = useSettings()
  const m = pickFeatured(board.data ?? [])
  return (
    <Card as="section" padding="none" tone="football" className="home-panel">
      <SectionHead icon={Trophy} accent="var(--tool-football)" label="Match of the day" to="/football" action="All matches" />
      {board.loading && !board.data && <div style={{ display: 'grid', gap: 10 }}><Skeleton h={12} w="40%" /><Skeleton h={36} /></div>}
      {!board.loading && !m && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{board.error ? 'Couldn’t load matches.' : 'No matches today.'}</div>}
      {m && (
        <div>
          <div className="home-match-meta">
            <span className="home-league">{m.league}</span>
            <MatchStatus ev={m} settings={settings} />
          </div>
          <div className="home-match">
            <TeamSide team={m.home} />
            <Scoreline ev={m} />
            <TeamSide team={m.away} align="right" />
          </div>
        </div>
      )}
    </Card>
  )
}

function YourTeamsPanel() {
  const { favIds, board, teams } = useHomeFootball()
  const [settings] = useSettings()
  return (
    <Card as="section" padding="none" tone="football" className="home-panel">
      <SectionHead icon={Star} accent="var(--tool-football)" label="Your teams" to="/football" action="Football" />
      {favIds.length === 0 && (
        <div className="home-teams-empty">
          <span>Star clubs on the Football page and their live scores and next matches show up here.</span>
          <Link to="/football" className="home-more-link" style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>
            Pick your teams <ArrowRight size={12} />
          </Link>
        </div>
      )}
      {favIds.length > 0 && teams.loading && !teams.data && <div style={{ display: 'grid', gap: 10 }}><Skeleton h={34} /><Skeleton h={34} /></div>}
      {favIds.length > 0 && !teams.loading && !teams.data?.length && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Couldn’t load your teams.</div>}
      {teams.data?.length > 0 && (
        <ul className="home-teams">
          {byUrgency(teams.data, board.data ?? []).map((team) => {
            const ev = fixtureFor(team, board.data ?? [])
            return (
              <li key={team.id} className="home-team-row">
                {ev ? (
                  <>
                    <div className="home-match-meta">
                      <span className="home-league">{ev.league}</span>
                      <MatchStatus ev={ev} settings={settings} />
                    </div>
                    <div className="home-match home-match-sm">
                      <TeamSide team={ev.home} bold={ev.home.id === team.id} />
                      <Scoreline ev={ev} size="1.05rem" />
                      <TeamSide team={ev.away} align="right" bold={ev.away.id === team.id} />
                    </div>
                  </>
                ) : (
                  <div className="home-match-meta" style={{ margin: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {team.logo && <img src={team.logo} alt="" width={22} height={22} />}{team.name}
                    </span>
                    <span className="home-kickoff">No match scheduled</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
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
    { to: '/news',     icon: Newspaper, label: 'News',     accent: 'var(--tool-news)' },
    { to: '/football', icon: Trophy,    label: 'Football', accent: 'var(--tool-football)' },
    { to: '/radio',    icon: Radio,     label: 'Radio',    accent: 'var(--tool-radio)' },
    { to: '/language', icon: BookOpen,  label: 'Language', accent: 'var(--tool-language)' },
  ]

  return (
    <Card as="section" padding="none" className="home-panel">
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

const getPeriod = (h) =>
  h < 5  ? 'night'     :
  h < 12 ? 'morning'   :
  h < 18 ? 'afternoon' :
           'evening'

// ─── Greeting line ───────────────────────────────────────────────────────────
// "Liverpool are drawing 0–0 (HT) · 12° and overcast in Vilnius · 14-day Spanish
// streak" — built from whatever data is already loaded.
function useDaySummary(settings) {
  const { data: wx } = useWeather()
  const { board, teams } = useHomeFootball()
  const streak = useMemo(() => readLanguageStreaks()[0], [])
  const parts = []
  for (const team of byUrgency(teams.data ?? [], board.data ?? [])) {
    const line = describeFixture(team, fixtureFor(team, board.data ?? []), (d) => formatTime(d, { settings }))
    if (line) { parts.push(line); break }
  }
  if (wx) {
    const sky = (WMO_LABEL[wx.code] ?? '').toLowerCase()
    parts.push(`${formatTemp(wx.temp, settings)}${sky ? ` and ${sky}` : ''}${wx.city ? ` in ${wx.city}` : ''}`)
  }
  if (streak?.current > 0) parts.push(`${streak.current}-day ${streak.lang} streak`)
  return parts.length ? parts.join(' · ') : 'Here’s your day.'
}

// ─── Page ────────────────────────────────────────────────────────────────────
const PANELS = {
  teams: YourTeamsPanel,
  headlines: HeadlinesPanel,
  match: FootballPanel,
  language: LanguagePanel,
  radio: RadioPanel,
  quick: QuickActionsPanel,
}

export default function Home() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(id)
  }, [])

  const [settings] = useSettings()
  const h         = now.getHours()
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeLabel = formatTime(now, { settings })
  const summary   = useDaySummary(settings)
  const widgets   = resolveLayout(settings.homeWidgets).filter((w) => w.on)

  return (
    <div className="home-shell">
      {/* Hero — greeting, a one-line summary of the day, weather */}
      <Card padding="none" className={`home-panel home-hero hero-tod hero-${getPeriod(h)}`}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div className="home-hero-date"><Sparkles size={11} /> {dateLabel} · {timeLabel}</div>
          <h1 className="home-hello">{greet(h)}</h1>
          <p className="home-summary">{summary}</p>
        </div>
        <HeroWeather />
      </Card>

      {/* Widgets — order and visibility come from Settings → Home */}
      <div className="home-bento">
        {widgets.map(({ id }) => {
          const Panel = PANELS[id]
          return (
            <div key={id} className={`bento-item bento-${WIDGET_BY_ID[id].size} bento-w-${id}`}>
              <Panel />
            </div>
          )
        })}
      </div>
    </div>
  )
}
