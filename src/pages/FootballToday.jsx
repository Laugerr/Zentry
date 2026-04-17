import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  RefreshCw, AlertCircle, MapPin, Clock, ExternalLink, Newspaper,
  Search, Star, ChevronDown, ChevronLeft, ChevronRight, Trophy,
  Zap, Calendar, Filter, X,
} from 'lucide-react'

// ─── League catalogue ─────────────────────────────────────────────────────────

const LEAGUES = [
  { id: 'uefa.champions', name: 'Champions League', short: 'UCL',  flag: '⭐', tier: 'european' },
  { id: 'uefa.europa',    name: 'Europa League',    short: 'UEL',  flag: '🔶', tier: 'european' },
  { id: 'uefa.europaconf',name: 'Conference Lge',   short: 'UECL', flag: '🔷', tier: 'european' },
  { id: 'eng.1',          name: 'Premier League',   short: 'PL',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 'top5' },
  { id: 'esp.1',          name: 'La Liga',          short: 'LL',   flag: '🇪🇸', tier: 'top5' },
  { id: 'ger.1',          name: 'Bundesliga',       short: 'BL',   flag: '🇩🇪', tier: 'top5' },
  { id: 'ita.1',          name: 'Serie A',          short: 'SA',   flag: '🇮🇹', tier: 'top5' },
  { id: 'fra.1',          name: 'Ligue 1',          short: 'L1',   flag: '🇫🇷', tier: 'top5' },
  { id: 'ned.1',          name: 'Eredivisie',       short: 'ERE',  flag: '🇳🇱', tier: 'other' },
  { id: 'por.1',          name: 'Primeira Liga',    short: 'PRL',  flag: '🇵🇹', tier: 'other' },
  { id: 'tur.1',          name: 'Süper Lig',        short: 'SL',   flag: '🇹🇷', tier: 'other' },
  { id: 'usa.1',          name: 'MLS',              short: 'MLS',  flag: '🇺🇸', tier: 'other' },
  { id: 'bra.1',          name: 'Brasileirão',      short: 'BRA',  flag: '🇧🇷', tier: 'other' },
  { id: 'arg.1',          name: 'Liga Argentina',   short: 'ARG',  flag: '🇦🇷', tier: 'other' },
]

const LEAGUE_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l]))

// ─── RSS feed config per league ───────────────────────────────────────────────

const LEAGUE_FEEDS = {
  all:             ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
  'uefa.champions':['https://feeds.bbci.co.uk/sport/football/european/rss.xml', 'https://www.theguardian.com/football/championsleague/rss'],
  'uefa.europa':   ['https://feeds.bbci.co.uk/sport/football/european/rss.xml', 'https://www.theguardian.com/football/uefa-europa-league/rss'],
  'uefa.europaconf':['https://feeds.bbci.co.uk/sport/football/european/rss.xml', 'https://www.theguardian.com/football/rss'],
  'eng.1':         ['https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', 'https://www.theguardian.com/football/premierleague/rss'],
  'esp.1':         ['https://feeds.bbci.co.uk/sport/football/spanish-la-liga/rss.xml', 'https://feeds.bbci.co.uk/sport/football/rss.xml'],
  'ger.1':         ['https://feeds.bbci.co.uk/sport/football/german-bundesliga/rss.xml', 'https://www.theguardian.com/football/bundesligafootball/rss'],
  'ita.1':         ['https://feeds.bbci.co.uk/sport/football/italian-serie-a/rss.xml', 'https://www.theguardian.com/football/serieafootball/rss'],
  'fra.1':         ['https://feeds.bbci.co.uk/sport/football/french-ligue-1/rss.xml', 'https://www.theguardian.com/football/ligue1football/rss'],
  'ned.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
  'por.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
  'tur.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
  'usa.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/mls/rss'],
  'bra.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
  'arg.1':         ['https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.theguardian.com/football/rss'],
}

// ─── ESPN API ─────────────────────────────────────────────────────────────────

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

function ymd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function fetchLeague(leagueId, date) {
  const q = date ? `?dates=${ymd(date)}` : ''
  const res = await fetch(`${ESPN_BASE}/${leagueId}/scoreboard${q}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.events ?? []).map((ev) => parseEvent(ev, leagueId)).filter(Boolean)
}

async function fetchSummary(leagueId, eventId) {
  const url = `${ESPN_BASE}/${leagueId}/summary?event=${eventId}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchStandings(leagueId) {
  const url = `${ESPN_BASE}/${leagueId}/standings`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function parseEvent(event, leagueId) {
  const comp = event.competitions?.[0]
  if (!comp) return null
  const home = comp.competitors?.find((c) => c.homeAway === 'home')
  const away = comp.competitors?.find((c) => c.homeAway === 'away')
  if (!home || !away) return null
  const st = event.status?.type ?? {}
  return {
    id: event.id,
    leagueId,
    date: event.date,
    state: st.state ?? 'pre',
    detail: st.detail ?? '',
    shortDetail: st.shortDetail ?? '',
    completed: st.completed ?? false,
    home: mkTeam(home),
    away: mkTeam(away),
    venue: comp.venue?.fullName ?? '',
  }
}

function mkTeam(c) {
  return {
    id: c.team?.id ?? '',
    name: c.team?.displayName ?? '',
    short: c.team?.shortDisplayName ?? c.team?.abbreviation ?? '',
    logo: c.team?.logo ?? '',
    score: c.score ?? null,
    winner: c.winner ?? false,
  }
}

// ─── RSS fetching (unchanged logic, lightly deduped) ──────────────────────────

function sortByDate(arr) {
  return arr.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
}

function parseRSS(xml) {
  const doc    = new DOMParser().parseFromString(xml, 'text/xml')
  const isAtom = !!doc.querySelector('feed')
  const items  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item'))
  const MEDIA  = 'http://search.yahoo.com/mrss/'
  return sortByDate(items.slice(0, 10).map((item) => {
    const get = (s) => item.querySelector(s)?.textContent?.trim() ?? ''
    const itemXml = new XMLSerializer().serializeToString(item)
    const title   = get('title').replace(/<!\[CDATA\[|\]\]>/g, '')
    const rawDesc = get('description') || get('summary') || get('content')
    const linkEl  = item.querySelector('link')
    const link    = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || get('guid')

    const mediaThumbnail = item.getElementsByTagNameNS(MEDIA, 'thumbnail')[0]?.getAttribute('url')
    const mediaContent   = item.getElementsByTagNameNS(MEDIA, 'content')[0]?.getAttribute('url')
    const enclosureEl    = item.querySelector('enclosure')
    const enclosureImg   = enclosureEl?.getAttribute('type')?.startsWith('image') ? enclosureEl.getAttribute('url') : null
    const xmlRegex       = (() => { const m = itemXml.match(/(?:media:thumbnail|media:content)[^>]+url="(https?:\/\/[^"]+)"/i); return m?.[1] ?? null })()
    const descImg        = (() => { const m = rawDesc.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i); return m?.[1] ?? null })()

    const rawImg = mediaThumbnail || mediaContent || enclosureImg || xmlRegex || descImg || null
    const image  = rawImg?.startsWith('http') ? rawImg : null
    const pubDate = get('pubDate') || get('published') || get('updated') || null
    return { title, link, image, pubDate, source: '' }
  }).filter((a) => a.title && a.link))
}

async function fetchRSS(url) {
  const bust = `&_t=${Math.floor(Date.now() / 60000)}`
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000), cache: 'no-store' })
    if (res.ok) { const t = await res.text(); if (t.includes('<item>') || t.includes('<entry>')) return parseRSS(t) }
  } catch { /* fall through */ }
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}${bust}`, { signal: AbortSignal.timeout(12000) })
    if (res.ok) {
      const json = await res.json()
      if (json.status === 'ok' && json.items?.length) {
        return sortByDate(json.items.slice(0, 10).map((item) => {
          const extractImg = (str) => { const m = (str || '').match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i); return m?.[1] ?? null }
          const img =
            (item.thumbnail?.startsWith('http') ? item.thumbnail : null) ||
            (item.enclosure?.link?.startsWith('http') ? item.enclosure.link : null) ||
            extractImg(item.content) ||
            extractImg(item.description) ||
            null
          return { title: item.title ?? '', link: item.link ?? '', image: img, pubDate: item.pubDate ?? null, source: json.feed?.title ?? '' }
        }).filter((a) => a.title && a.link))
      }
    }
  } catch { /* fall through */ }
  return []
}

async function fetchLeagueFeeds(leagueId) {
  const urls = LEAGUE_FEEDS[leagueId] ?? LEAGUE_FEEDS['all']
  const results = await Promise.allSettled(urls.map((u) => fetchRSS(u)))
  const seen = new Set()
  const merged = results.flatMap((r, i) => {
    if (r.status !== 'fulfilled') return []
    const src = ['BBC Sport', 'The Guardian', 'AS English', 'Sky Sports'][i] ?? ''
    return r.value.map((a) => ({ ...a, source: src }))
  }).filter((a) => { if (seen.has(a.title)) return false; seen.add(a.title); return true })
  return sortByDate(merged).slice(0, 20)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function matchTime(ev) {
  if (ev.state === 'in')   return ev.detail || ev.shortDetail
  if (ev.state === 'post') return ev.detail || 'FT'
  try { return new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) } catch { return ev.shortDetail }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addDays(d, n) {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + n)
  return nd
}

function dateLabel(d) {
  const today = new Date()
  const yesterday = addDays(today, -1)
  const tomorrow  = addDays(today, 1)
  if (sameDay(d, today))     return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  if (sameDay(d, tomorrow))  return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Order: live → upcoming (soonest first) → finished (most recent first)
function orderEvents(events) {
  const live = events.filter((e) => e.state === 'in')
  const pre  = events.filter((e) => e.state === 'pre').sort((a, b) => new Date(a.date) - new Date(b.date))
  const post = events.filter((e) => e.state === 'post').sort((a, b) => new Date(b.date) - new Date(a.date))
  return [...live, ...pre, ...post]
}

// ─── Favorites (localStorage) ─────────────────────────────────────────────────

const FAV_KEY = 'ft:favorites:v1'
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')) } catch { return new Set() }
}
function saveFavs(set) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...set])) } catch { /* ignore */ }
}

// ─── Match details (lazy-loaded) ──────────────────────────────────────────────

function MatchDetails({ leagueId, eventId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await fetchSummary(leagueId, eventId)
        if (!cancelled) setData(s)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [leagueId, eventId])

  if (loading) return <div style={{ padding: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loading match details…</div>
  if (error)   return <div style={{ padding: '0.75rem', fontSize: '0.72rem', color: '#f87171' }}>{error}</div>
  if (!data)   return null

  const plays = (data.plays ?? []).filter((p) => p.scoringPlay || /yellow|red/i.test(p.type?.text ?? ''))
  const stats = data.boxscore?.teams ?? []
  const homeStats = stats[0]?.statistics ?? []
  const awayStats = stats[1]?.statistics ?? []
  const statNames = [...new Set([...homeStats.map((s) => s.name), ...awayStats.map((s) => s.name)])]

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Events */}
      {plays.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key events</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {plays.slice(0, 10).map((p, i) => {
              const isGoal = p.scoringPlay
              const clock  = p.clock?.displayValue ?? ''
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', width: 38, flexShrink: 0 }}>{clock}</span>
                  <span style={{ fontSize: '0.85rem' }}>{isGoal ? '⚽' : /red/i.test(p.type?.text ?? '') ? '🟥' : '🟨'}</span>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      {statNames.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {statNames.slice(0, 8).map((n) => {
              const h = homeStats.find((s) => s.name === n)
              const a = awayStats.find((s) => s.name === n)
              if (!h && !a) return null
              const label = h?.label ?? a?.label ?? n
              return (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.7rem' }}>
                  <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{h?.displayValue ?? '-'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', minWidth: 80, textAlign: 'center' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{a?.displayValue ?? '-'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {plays.length === 0 && statNames.length === 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No details available yet.</div>
      )}
    </div>
  )
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ event, compact = false, favs, toggleFav }) {
  const [expanded, setExpanded] = useState(false)
  const isLive     = event.state === 'in'
  const isFinished = event.state === 'post'
  const isPre      = event.state === 'pre'
  const time       = matchTime(event)
  const homeFav = favs.has(event.home.id)
  const awayFav = favs.has(event.away.id)
  const anyFav  = homeFav || awayFav

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isLive ? 'rgba(52,211,153,0.3)' : anyFav ? 'rgba(250,204,21,0.25)' : 'var(--border)'}`,
      borderRadius: '12px',
      display: 'flex', flexDirection: 'column',
      boxShadow: isLive ? '0 0 20px rgba(52,211,153,0.07)' : 'none',
      transition: 'border-color 0.2s',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: compact ? '0.75rem 0.9rem' : '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Home */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, justifyContent: 'flex-end' }}>
            {homeFav && <Star size={10} fill="#facc15" color="#facc15" style={{ flexShrink: 0 }} />}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFav(event.home.id) }}
              title={homeFav ? 'Unfavourite' : 'Favourite team'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: homeFav ? '#facc15' : 'var(--text-muted)', display: compact ? 'none' : 'inline-flex', opacity: homeFav ? 1 : 0.4 }}
            >
              <Star size={10} fill={homeFav ? '#facc15' : 'none'} />
            </button>
            <span style={{ fontSize: compact ? '0.78rem' : '0.85rem', fontWeight: event.home.winner ? 700 : 500, color: isFinished && !event.home.winner ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.home.short || event.home.name}
            </span>
            {event.home.logo
              ? <img src={event.home.logo} alt="" style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none' }} />
              : <div style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
          </div>

          {/* Score / Time */}
          <div style={{ flexShrink: 0, width: 84, textAlign: 'center' }}>
            {isPre ? (
              <>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{time}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Kick-off</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? '1.1rem' : '1.3rem', fontWeight: 800, letterSpacing: '0.04em', color: isLive ? '#34d399' : 'var(--text-primary)' }}>
                  {event.home.score ?? 0} – {event.away.score ?? 0}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                  {isLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />}
                  <span style={{ fontSize: '0.62rem', fontWeight: isLive ? 700 : 400, color: isLive ? '#34d399' : isFinished ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{time}</span>
                </div>
              </>
            )}
          </div>

          {/* Away */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            {event.away.logo
              ? <img src={event.away.logo} alt="" style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none' }} />
              : <div style={{ width: compact ? 24 : 28, height: compact ? 24 : 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
            <span style={{ fontSize: compact ? '0.78rem' : '0.85rem', fontWeight: event.away.winner ? 700 : 500, color: isFinished && !event.away.winner ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.away.short || event.away.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFav(event.away.id) }}
              title={awayFav ? 'Unfavourite' : 'Favourite team'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: awayFav ? '#facc15' : 'var(--text-muted)', display: compact ? 'none' : 'inline-flex', opacity: awayFav ? 1 : 0.4 }}
            >
              <Star size={10} fill={awayFav ? '#facc15' : 'none'} />
            </button>
            {awayFav && <Star size={10} fill="#facc15" color="#facc15" style={{ flexShrink: 0 }} />}
          </div>
        </div>

        {/* Venue + expand chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.63rem', color: 'var(--text-muted)' }}>
          {event.venue && !compact && (
            <>
              <MapPin size={9} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue}</span>
            </>
          )}
          <ChevronDown
            size={12}
            style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', opacity: 0.6 }}
          />
        </div>
      </div>

      {expanded && !isPre && <MatchDetails leagueId={event.leagueId} eventId={event.id} />}
      {expanded && isPre && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0.9rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Match hasn't started yet. Details will appear after kick-off.
        </div>
      )}
    </div>
  )
}

// ─── NewsArticle ──────────────────────────────────────────────────────────────

function NewsArticle({ article }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>
      {article.image && !imgErr && (
        <img src={article.image} alt="" onError={() => setImgErr(true)}
          style={{ width: 62, height: 46, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.63rem', color: 'var(--text-muted)' }}>
          {article.source && <span style={{ color: '#a78bfa', fontWeight: 600 }}>{article.source}</span>}
          {article.source && article.pubDate && <span>·</span>}
          {article.pubDate && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={9} />{timeAgo(article.pubDate)}</span>}
          <ExternalLink size={9} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </div>
      </div>
    </a>
  )
}

// ─── NewsFeed panel ───────────────────────────────────────────────────────────

function NewsFeed({ leagueId, feedCache, setFeedCache }) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cacheKey = leagueId === 'favs' ? 'all' : leagueId
      if (feedCache[cacheKey]) { setArticles(feedCache[cacheKey]); setLoading(false); return }
      setLoading(true); setError(null)
      try {
        const data = await fetchLeagueFeeds(cacheKey)
        if (!cancelled) {
          setArticles(data)
          setFeedCache((prev) => ({ ...prev, [cacheKey]: data }))
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [leagueId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)' }}>
        <Newspaper size={13} color="#a78bfa" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Latest News</span>
        {!loading && <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{articles.length} articles</span>}
      </div>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 64, borderRadius: '10px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      )}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', fontSize: '0.73rem' }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
      {!loading && !error && articles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No articles found</div>
      )}
      {!loading && articles.map((a, i) => <NewsArticle key={i} article={a} />)}
    </div>
  )
}

// ─── Standings view ───────────────────────────────────────────────────────────

function StandingsView({ leagueId }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setRows([])
    ;(async () => {
      try {
        const data   = await fetchStandings(leagueId)
        const groups = data.children ?? [data]
        const all = []
        for (const g of groups) {
          const entries = g.standings?.entries ?? []
          for (const e of entries) {
            const stats  = Object.fromEntries((e.stats ?? []).map((s) => [s.name || s.shortDisplayName, s.displayValue ?? s.value]))
            all.push({
              groupName: g.name ?? '',
              team: e.team?.displayName ?? '',
              short: e.team?.shortDisplayName ?? e.team?.abbreviation ?? '',
              logo: e.team?.logos?.[0]?.href ?? e.team?.logo ?? '',
              rank: Number(stats.rank ?? stats.Rank ?? 0),
              gp: stats.gamesPlayed ?? stats.GP ?? '-',
              w:  stats.wins ?? '-',
              d:  stats.ties ?? stats.draws ?? '-',
              l:  stats.losses ?? '-',
              gf: stats.pointsFor ?? stats.goalsFor ?? '-',
              ga: stats.pointsAgainst ?? stats.goalsAgainst ?? '-',
              gd: stats.pointDifferential ?? stats.goalDifference ?? '-',
              pts: stats.points ?? '-',
            })
          }
        }
        if (!cancelled) setRows(all)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [leagueId])

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading standings…</div>
  if (error)   return <div style={{ padding: '1rem', color: '#f87171', fontSize: '0.75rem' }}><AlertCircle size={13} style={{ display: 'inline', marginRight: 4 }} />{error}</div>
  if (!rows.length) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No standings available for this competition.</div>

  const groupedByGroup = rows.reduce((acc, r) => {
    (acc[r.groupName] = acc[r.groupName] || []).push(r)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Object.entries(groupedByGroup).map(([g, items]) => (
        <div key={g} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {g && <div style={{ padding: '0.55rem 0.9rem', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>{g}</div>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                  <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', width: 32 }}>#</th>
                  <th style={{ padding: '0.5rem 0.5rem', textAlign: 'left' }}>Team</th>
                  <th style={{ padding: '0.5rem' }}>GP</th>
                  <th style={{ padding: '0.5rem' }}>W</th>
                  <th style={{ padding: '0.5rem' }}>D</th>
                  <th style={{ padding: '0.5rem' }}>L</th>
                  <th style={{ padding: '0.5rem' }}>GF</th>
                  <th style={{ padding: '0.5rem' }}>GA</th>
                  <th style={{ padding: '0.5rem' }}>GD</th>
                  <th style={{ padding: '0.5rem 0.9rem', color: 'var(--text-primary)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{r.rank || i + 1}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {r.logo ? <img src={r.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} /> : <div style={{ width: 18, height: 18 }} />}
                        <span style={{ fontWeight: 600 }}>{r.team}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.gp}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.w}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.d}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.l}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.gf}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.ga}</td>
                    <td style={{ padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>{r.gd}</td>
                    <td style={{ padding: '0.5rem 0.9rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: 'var(--text-primary)' }}>{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const REFRESH_MS = 60 * 1000

export default function FootballToday() {
  const [tab,        setTab]        = useState('all')          // 'all' | 'favs' | league id
  const [view,       setView]       = useState('matches')      // 'matches' | 'standings'
  const [status,     setStatus]     = useState('all')          // 'all' | 'live' | 'pre' | 'post'
  const [query,      setQuery]      = useState('')
  const [date,       setDate]       = useState(() => new Date())
  const [matchData,  setMatchData]  = useState({})
  const [feedCache,  setFeedCache]  = useState({})
  const [loading,    setLoading]    = useState(true)
  const [errors,     setErrors]     = useState({})
  const [lastFetch,  setLastFetch]  = useState(null)
  const [now,        setNow]        = useState(() => Date.now())
  const [favs,       setFavs]       = useState(() => loadFavs())
  const [isMobile,   setIsMobile]   = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false)
  const tabBarRef = useRef(null)

  // Resize
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Tick for refresh countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Favorites persistence
  useEffect(() => { saveFavs(favs) }, [favs])
  const toggleFav = useCallback((teamId) => {
    if (!teamId) return
    setFavs((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId)
      return next
    })
  }, [])

  // Load matches
  const loadMatches = useCallback(async () => {
    setLoading(true)
    const results = await Promise.allSettled(LEAGUES.map((l) => fetchLeague(l.id, date).then((ev) => ({ id: l.id, ev }))))
    const newData = {}, newErr = {}
    results.forEach((r, i) => {
      const id = LEAGUES[i].id
      if (r.status === 'fulfilled') newData[id] = r.value.ev
      else newErr[id] = r.reason?.message ?? 'Failed'
    })
    setMatchData(newData); setErrors(newErr); setLastFetch(new Date()); setLoading(false)
  }, [date])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadMatches() }, [loadMatches])
  useEffect(() => {
    if (!sameDay(date, new Date())) return // only auto-refresh for today
    const id = setInterval(loadMatches, REFRESH_MS)
    return () => clearInterval(id)
  }, [loadMatches, date])

  // Keep active tab visible
  useEffect(() => {
    const el = tabBarRef.current?.querySelector(`[data-tab="${tab}"]`)
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [tab])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); loadMatches() }
      else if (e.key === 'ArrowLeft')  { setDate((d) => addDays(d, -1)) }
      else if (e.key === 'ArrowRight') { setDate((d) => addDays(d, 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadMatches])

  // View is forced to 'matches' for aggregate tabs (derived, not stored)
  const effectiveView = (tab === 'all' || tab === 'favs') ? 'matches' : view

  // Derived
  const allEvents = useMemo(() => LEAGUES.flatMap((l) => matchData[l.id] ?? []), [matchData])
  const totalMatches = allEvents.length
  const liveCount    = allEvents.filter((e) => e.state === 'in').length
  const preCount     = allEvents.filter((e) => e.state === 'pre').length
  const postCount    = allEvents.filter((e) => e.state === 'post').length

  const favMatches = useMemo(
    () => allEvents.filter((e) => favs.has(e.home.id) || favs.has(e.away.id)),
    [allEvents, favs]
  )

  // Apply filters
  function filterEvents(events) {
    let out = events
    if (status !== 'all') out = out.filter((e) => e.state === status)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      out = out.filter((e) =>
        (e.home.name + ' ' + e.home.short + ' ' + e.away.name + ' ' + e.away.short).toLowerCase().includes(q)
      )
    }
    return out
  }

  const leaguesWithMatches = LEAGUES
    .map((l) => ({ meta: l, events: filterEvents(matchData[l.id] ?? []) }))
    .filter((x) => x.events.length > 0)

  const activeMeta   = LEAGUE_BY_ID[tab]
  const activeEvents = tab === 'all' ? [] : orderEvents(filterEvents(tab === 'favs' ? favMatches : (matchData[tab] ?? [])))

  const secondsUntilRefresh = Math.max(0, Math.ceil((REFRESH_MS - (now - (lastFetch?.getTime() ?? now))) / 1000))
  const isToday = sameDay(date, new Date())

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>⚽ Football Today</h2>
          <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {!loading && totalMatches > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{totalMatches} matches</span>
                {liveCount > 0 && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.73rem', color: '#34d399', fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      {liveCount} live
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastFetch && !loading && isToday && (
            <span title="Next auto-refresh" style={{ fontSize: '0.63rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={10} />{lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>· {secondsUntilRefresh}s</span>
            </span>
          )}
          <button onClick={loadMatches} disabled={loading} className="btn-ghost"
            title="Refresh (R)"
            style={{ padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Toolbar: date nav + search + status filters + view toggle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        {/* Date nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.15rem' }}>
          <button onClick={() => setDate((d) => addDays(d, -1))} title="Previous day (←)"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem 0.45rem', display: 'inline-flex', alignItems: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setDate(new Date())}
            style={{ background: 'none', border: 'none', color: isToday ? '#a78bfa' : 'var(--text-primary)', cursor: 'pointer', padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={11} />{dateLabel(date)}
          </button>
          <button onClick={() => setDate((d) => addDays(d, 1))} title="Next day (→)"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem 0.45rem', display: 'inline-flex', alignItems: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180, maxWidth: 320 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team…"
            style={{
              width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.9rem',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <Filter size={11} color="var(--text-muted)" />
          {[
            { id: 'all',  label: 'All',      count: totalMatches },
            { id: 'in',   label: 'Live',     count: liveCount, live: true },
            { id: 'pre',  label: 'Upcoming', count: preCount },
            { id: 'post', label: 'Finished', count: postCount },
          ].map((f) => {
            const active = status === f.id
            return (
              <button key={f.id} onClick={() => setStatus(f.id)}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: active ? 700 : 500,
                  border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--border)',
                  background: active ? 'rgba(167,139,250,0.12)' : 'var(--bg-card)',
                  color: active ? '#a78bfa' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                }}>
                {f.live && f.count > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s ease-in-out infinite' }} />}
                {f.label}
                <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{f.count}</span>
              </button>
            )
          })}
        </div>

        {/* View toggle (only meaningful when a single league is selected) */}
        {tab !== 'all' && tab !== 'favs' && (
          <div style={{ display: 'flex', marginLeft: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { id: 'matches',   label: 'Matches',   icon: <Zap size={11} /> },
              { id: 'standings', label: 'Standings', icon: <Trophy size={11} /> },
            ].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                style={{
                  padding: '0.35rem 0.7rem', fontSize: '0.7rem', fontWeight: view === v.id ? 700 : 500,
                  background: view === v.id ? 'rgba(167,139,250,0.12)' : 'transparent',
                  color: view === v.id ? '#a78bfa' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                }}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div ref={tabBarRef} style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
        {[
          { id: 'all',  flag: '⚽', name: 'All Today', short: 'All' },
          { id: 'favs', flag: '★',  name: 'Favourites', short: '★' },
          ...LEAGUES,
        ].map((league) => {
          const isAll    = league.id === 'all'
          const isFavs   = league.id === 'favs'
          const count    = isAll ? totalMatches : isFavs ? favMatches.length : (matchData[league.id]?.length ?? 0)
          const hasLive  = isAll
            ? liveCount > 0
            : isFavs
              ? favMatches.some((e) => e.state === 'in')
              : (matchData[league.id]?.some((e) => e.state === 'in') ?? false)
          const isActive = tab === league.id
          const dim      = !isAll && !isFavs && count === 0 && !loading
          return (
            <button key={league.id} data-tab={league.id} onClick={() => setTab(league.id)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.38rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--border)',
                background: isActive ? 'rgba(167,139,250,0.12)' : count > 0 ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                color: isActive ? '#a78bfa' : count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: 'pointer', whiteSpace: 'nowrap', opacity: dim ? 0.45 : 1,
              }}>
              <span style={{ color: isFavs ? '#facc15' : undefined }}>{league.flag}</span>
              <span>{isMobile ? league.short : league.name}</span>
              {(count > 0 || isAll || isFavs) && (
                <span style={{ fontSize: '0.62rem', background: isActive ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {hasLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
                  {loading && isAll ? '…' : count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Left: Matches or Standings */}
        <div style={{ flex: isMobile ? 'none' : '3', width: isMobile ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

          {effectiveView === 'standings' && tab !== 'all' && tab !== 'favs' ? (
            <StandingsView leagueId={tab} />
          ) : loading ? (
            [...Array(5)].map((_, i) => <div key={i} style={{ height: 88, borderRadius: '12px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)
          ) : tab === 'all' ? (
            leaguesWithMatches.length === 0 ? (
              <EmptyState query={query} status={status} />
            ) : (
              leaguesWithMatches.map(({ meta: league, events }) => (
                <div key={league.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem',
                    position: 'sticky', top: 0, zIndex: 2,
                    background: 'var(--bg-primary)', backdropFilter: 'blur(4px)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{league.flag}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{league.name}</span>
                    <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.05rem 0.4rem' }}>
                      {events.length} {events.length === 1 ? 'match' : 'matches'}
                    </span>
                    {events.some((e) => e.state === 'in') && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.62rem', color: '#34d399', fontWeight: 700 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        LIVE
                      </span>
                    )}
                    <button onClick={() => setTab(league.id)}
                      style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.3rem', opacity: 0.8 }}>
                      See all →
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
                    {orderEvents(events).map((ev) => <MatchCard key={ev.id} event={ev} compact favs={favs} toggleFav={toggleFav} />)}
                  </div>
                </div>
              ))
            )
          ) : tab === 'favs' ? (
            favs.size === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                <Star size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No favourite teams yet</div>
                <div style={{ fontSize: '0.78rem' }}>Click the ★ on any team to add them here</div>
              </div>
            ) : activeEvents.length === 0 ? (
              <EmptyState query={query} status={status} message="No matches for your favourite teams on this day" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.65rem' }}>
                {activeEvents.map((ev) => <MatchCard key={ev.id} event={ev} favs={favs} toggleFav={toggleFav} />)}
              </div>
            )
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.1rem' }}>{activeMeta?.flag}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activeMeta?.name}</span>
                {activeEvents.some((e) => e.state === 'in') && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    LIVE NOW
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {activeEvents.length} {activeEvents.length === 1 ? 'match' : 'matches'}
                </span>
              </div>

              {errors[tab] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.9rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.75rem' }}>
                  <AlertCircle size={13} /> Failed: {errors[tab]}
                </div>
              )}

              {activeEvents.length === 0 && !errors[tab] ? (
                <EmptyState query={query} status={status} message={`No ${activeMeta?.name} matches on ${dateLabel(date).toLowerCase()}`} icon={activeMeta?.flag} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.65rem' }}>
                  {activeEvents.map((ev) => <MatchCard key={ev.id} event={ev} favs={favs} toggleFav={toggleFav} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: News feed */}
        <div style={{
          flex: isMobile ? 'none' : '2', width: isMobile ? '100%' : undefined,
          position: isMobile ? 'static' : 'sticky', top: 0,
          maxHeight: isMobile ? 'none' : 'calc(100vh - 120px)', overflowY: isMobile ? 'visible' : 'auto',
          scrollbarWidth: 'thin',
        }}>
          <NewsFeed leagueId={tab} feedCache={feedCache} setFeedCache={setFeedCache} />
        </div>

      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query, status, message, icon }) {
  const hasFilters = !!query || status !== 'all'
  return (
    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>{icon || '⚽'}</div>
      <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
        {hasFilters ? 'No matches match your filters' : (message || 'No matches scheduled')}
      </div>
      <div style={{ fontSize: '0.75rem' }}>
        {hasFilters ? 'Try clearing the search or status filter' : 'Try another day or check back later'}
      </div>
    </div>
  )
}
