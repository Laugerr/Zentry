import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { RefreshCw, MapPin, Newspaper, Search, Star, ChevronDown, ChevronRight, Trophy, X } from 'lucide-react'
import { InlineError, EmptyState as EmptyNotice } from '../components/states'
import { Button, Card, IconButton, Skeleton, Tabs, useToast } from '../components/ui'
import { formatTime } from '../settings/format'
import { writeFavTeamIds } from '../settings/favTeams'
import { useSettings } from '../settings/store'
import './football.css'

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

// Standings live under /apis/v2 (the /site/v2 path returns an empty object)
async function fetchStandings(leagueId) {
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`
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
  try { return formatTime(ev.date) } catch { return ev.shortDetail }
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
// Through the shared store so Home's "Your teams" updates right away
function saveFavs(set) {
  writeFavTeamIds([...set])
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

  if (loading) return <div className="fx-details"><Skeleton h={14} w="60%" /><Skeleton h={14} w="80%" /></div>
  if (error)   return <div className="fx-details fx-muted">Couldn’t load match details.</div>
  if (!data)   return null

  // Soccer summaries list goals & cards in `keyEvents` (older payloads: `plays`)
  const plays = (data.keyEvents ?? data.plays ?? []).filter((p) => p.scoringPlay || /yellow|red card/i.test(p.type?.text ?? ''))
  const stats = data.boxscore?.teams ?? []
  const homeStats = stats[0]?.statistics ?? []
  const awayStats = stats[1]?.statistics ?? []
  const statNames = [...new Set([...homeStats.map((s) => s.name), ...awayStats.map((s) => s.name)])]

  return (
    <div className="fx-details">
      {plays.length > 0 && (
        <div>
          <div className="fx-details-title">Key events</div>
          <ul className="fx-events">
            {plays.slice(0, 12).map((p, i) => {
              const kind = p.scoringPlay ? 'goal' : /red/i.test(p.type?.text ?? '') ? 'red' : 'yellow'
              return (
                <li key={i}>
                  <span className="fx-event-clock">{p.clock?.displayValue ?? ''}</span>
                  <span className={`fx-event-icon fx-event-${kind}`} aria-label={kind === 'goal' ? 'Goal' : kind === 'red' ? 'Red card' : 'Yellow card'} />
                  <span className="fx-event-text">{p.shortText || p.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {statNames.length > 0 && (
        <div>
          <div className="fx-details-title">Stats</div>
          <div className="fx-stats">
            {statNames.slice(0, 8).map((n) => {
              const h = homeStats.find((s) => s.name === n)
              const a = awayStats.find((s) => s.name === n)
              if (!h && !a) return null
              const hv = parseFloat(h?.displayValue) || 0
              const av = parseFloat(a?.displayValue) || 0
              const share = hv + av > 0 ? (hv / (hv + av)) * 100 : 50
              return (
                <div key={n} className="fx-stat">
                  <div className="fx-stat-row">
                    <span>{h?.displayValue ?? '–'}</span>
                    <span className="fx-stat-label">{h?.label ?? a?.label ?? n}</span>
                    <span>{a?.displayValue ?? '–'}</span>
                  </div>
                  <div className="fx-stat-bar" aria-hidden="true">
                    <i style={{ width: `${share}%` }} />
                    <i style={{ width: `${100 - share}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {plays.length === 0 && statNames.length === 0 && <div className="fx-muted">No details available yet.</div>}
    </div>
  )
}

// ─── Fixture row ──────────────────────────────────────────────────────────────
// Status | both teams stacked (crest, name, score) | a ★ per team. The main
// area is one button that expands key events + stats.

function FixtureTeam({ team, showScore, dim }) {
  return (
    <div className={`fx-team${team.winner ? ' is-winner' : ''}${dim ? ' is-dim' : ''}`}>
      {team.logo ? <img src={team.logo} alt="" loading="lazy" /> : <span className="fx-crest-blank" />}
      <span className="fx-team-name">{team.short || team.name}</span>
      {showScore && <span className="fx-score">{team.score ?? 0}</span>}
    </div>
  )
}

function MatchCard({ event, favs, toggleFav }) {
  const [expanded, setExpanded] = useState(false)
  const isLive = event.state === 'in'
  const isPost = event.state === 'post'
  const isPre  = event.state === 'pre'
  const anyFav = favs.has(event.home.id) || favs.has(event.away.id)

  return (
    <div className={`fx${isLive ? ' is-live' : ''}${anyFav ? ' is-fav' : ''}`}>
      <div className="fx-row">
        <button type="button" className="fx-main" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}
          aria-label={`${event.home.name} vs ${event.away.name}, ${isPre ? `kick-off ${matchTime(event)}` : `${event.home.score ?? 0}–${event.away.score ?? 0}, ${matchTime(event)}`}. Show details`}>
          <span className="fx-status">
            {isLive && <span className="fx-live"><span className="live-dot" />{event.shortDetail || event.detail || 'LIVE'}</span>}
            {isPost && <span className="fx-ft">FT</span>}
            {isPre && <span className="fx-time">{matchTime(event)}</span>}
          </span>
          <span className="fx-teams">
            <FixtureTeam team={event.home} showScore={!isPre} dim={isPost && !event.home.winner && event.away.winner} />
            <FixtureTeam team={event.away} showScore={!isPre} dim={isPost && !event.away.winner && event.home.winner} />
          </span>
          <ChevronDown size={16} className="fx-chevron" aria-hidden="true" />
        </button>
        <span className="fx-favs">
          {[event.home, event.away].map((t) => (
            <button key={t.id} type="button" className={`fx-fav${favs.has(t.id) ? ' on' : ''}`} onClick={() => toggleFav(t.id, t.name)}
              aria-pressed={favs.has(t.id)} aria-label={favs.has(t.id) ? `Unfollow ${t.name}` : `Follow ${t.name}`}>
              <Star size={14} aria-hidden="true" />
            </button>
          ))}
        </span>
      </div>
      {expanded && (isPre
        ? <div className="fx-details fx-muted">{event.venue ? <><MapPin size={12} aria-hidden="true" /> {event.venue} · </> : null}Details appear after kick-off.</div>
        : <MatchDetails leagueId={event.leagueId} eventId={event.id} />)}
    </div>
  )
}

// ─── News ─────────────────────────────────────────────────────────────────────

function NewsArticle({ article }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="fb-news-item">
      {article.image && !imgErr && <img src={article.image} alt="" loading="lazy" onError={() => setImgErr(true)} />}
      <span className="fb-news-text">
        <span className="fb-news-title">{article.title}</span>
        <span className="fb-news-meta">
          {article.source && <b>{article.source}</b>}
          {article.pubDate && <span>{timeAgo(article.pubDate)}</span>}
        </span>
      </span>
    </a>
  )
}

function NewsFeed({ leagueId, feedCache, setFeedCache }) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

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
  }, [leagueId, reloadTick]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card as="section" padding="none" tone="football" className="fb-news">
      <div className="fb-section-head">
        <h2><Newspaper size={16} aria-hidden="true" /> Latest news</h2>
        {!loading && <span className="fb-count">{articles.length}</span>}
      </div>
      {loading && <div className="fb-news-list">{[...Array(5)].map((_, i) => <Skeleton key={i} h={58} r={12} />)}</div>}
      {error && <InlineError message={error} onRetry={() => setReloadTick((t) => t + 1)} />}
      {!loading && !error && articles.length === 0 && <div className="fx-muted" style={{ padding: '1rem 0' }}>No articles right now.</div>}
      {!loading && articles.length > 0 && <div className="fb-news-list">{articles.map((a, i) => <NewsArticle key={i} article={a} />)}</div>}
    </Card>
  )
}

// ─── Standings ────────────────────────────────────────────────────────────────

function StandingsView({ leagueId, favs }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setRows([])
    ;(async () => {
      try {
        const data   = await fetchStandings(leagueId)
        const groups = data.children ?? [data]
        const all = []
        for (const g of groups) {
          for (const e of g.standings?.entries ?? []) {
            const stats = Object.fromEntries((e.stats ?? []).map((s) => [s.name || s.shortDisplayName, s.displayValue ?? s.value]))
            all.push({
              groupName: g.name ?? '',
              id: String(e.team?.id ?? ''),
              team: e.team?.displayName ?? '',
              short: e.team?.shortDisplayName ?? e.team?.abbreviation ?? '',
              logo: e.team?.logos?.[0]?.href ?? e.team?.logo ?? '',
              rank: Number(stats.rank ?? stats.Rank ?? 0),
              gp: stats.gamesPlayed ?? stats.GP ?? '-',
              w:  stats.wins ?? '-',
              d:  stats.ties ?? stats.draws ?? '-',
              l:  stats.losses ?? '-',
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
  }, [leagueId, reloadTick])

  if (loading) return <div className="fb-news-list">{[...Array(8)].map((_, i) => <Skeleton key={i} h={36} r={10} />)}</div>
  if (error)   return <InlineError message={error} onRetry={() => setReloadTick((t) => t + 1)} />
  if (!rows.length) return <EmptyNotice icon={Trophy} title="No table for this competition" hint="Cup competitions and knockouts don’t have a league table." />

  const groups = rows.reduce((acc, r) => { (acc[r.groupName] ??= []).push(r); return acc }, {})
  return (
    <div className="fb-tables">
      {Object.entries(groups).map(([g, items]) => (
        <Card key={g} padding="none" className="fb-table-card">
          {g && Object.keys(groups).length > 1 && <div className="fb-table-group">{g}</div>}
          <div className="fb-table-scroll">
            <table className="fb-table">
              <thead>
                <tr><th className="pos">#</th><th className="team">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th className="pts">Pts</th></tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={r.id || i} className={favs.has(r.id) ? 'is-fav' : ''}>
                    <td className="pos">{r.rank || i + 1}</td>
                    <td className="team"><span>{r.logo && <img src={r.logo} alt="" loading="lazy" />}{r.short || r.team}</span></td>
                    <td>{r.gp}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gd}</td>
                    <td className="pts">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const REFRESH_MS = 60 * 1000
const DAY_RANGE  = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] // the date strip, relative to today

function LeagueSection({ league, events, favs, toggleFav, onOpen }) {
  const live = events.some((e) => e.state === 'in')
  return (
    <section className="fb-league">
      <div className="fb-league-head">
        <span className="fb-league-flag" aria-hidden="true">{league.flag}</span>
        <h3>{league.name}</h3>
        <span className="fb-count">{events.length}</span>
        {live && <span className="badge badge-red"><span className="live-dot" />Live</span>}
        {onOpen && <button type="button" className="home-more-link fb-league-open" onClick={onOpen}>Table & all <ChevronRight size={13} /></button>}
      </div>
      <div className="fx-grid">
        {orderEvents(events).map((ev) => <MatchCard key={ev.id} event={ev} favs={favs} toggleFav={toggleFav} />)}
      </div>
    </section>
  )
}

export default function FootballToday() {
  useSettings() // subscribe: kickoff times re-render when the 12/24h setting changes
  const [tab,        setTab]        = useState('all')          // 'all' | 'favs' | league id
  const [view,       setView]       = useState('matches')      // 'matches' | 'standings'
  const [status,     setStatus]     = useState('all')          // 'all' | 'in' | 'pre' | 'post'
  const [query,      setQuery]      = useState('')
  const [date,       setDate]       = useState(() => new Date())
  const [matchData,  setMatchData]  = useState({})
  const [feedCache,  setFeedCache]  = useState({})
  const [loading,    setLoading]    = useState(true)
  const [errors,     setErrors]     = useState({})
  const [lastFetch,  setLastFetch]  = useState(null)
  const [favs,       setFavs]       = useState(() => loadFavs())
  const { isMobile, isDesktop } = useBreakpoint()
  const toast = useToast()
  const leagueBarRef = useRef(null)
  const dayBarRef    = useRef(null)

  // Favourites persistence
  useEffect(() => { saveFavs(favs) }, [favs])
  const toggleFav = useCallback((teamId, name) => {
    if (!teamId) return
    const had = favs.has(teamId)
    setFavs((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId)
      return next
    })
    toast(had ? `Unfollowed ${name}` : `Following ${name} — they’ll show on Home`, { tone: had ? 'neutral' : 'success' })
  }, [favs, toast])

  // Load matches for the selected day
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

  useEffect(() => { loadMatches() }, [loadMatches])
  useEffect(() => {
    if (!sameDay(date, new Date())) return // only auto-refresh today
    const id = setInterval(loadMatches, REFRESH_MS)
    return () => clearInterval(id)
  }, [loadMatches, date])

  // Keep the active day / league chip in view
  useEffect(() => {
    leagueBarRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [tab])
  useEffect(() => {
    dayBarRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [date])

  // Keyboard: R refresh, ←/→ change day
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); loadMatches() }
      else if (e.key === 'ArrowLeft')  setDate((d) => addDays(d, -1))
      else if (e.key === 'ArrowRight') setDate((d) => addDays(d, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadMatches])

  const isLeague      = tab !== 'all' && tab !== 'favs'
  const effectiveView = isLeague ? view : 'matches'

  const allEvents  = useMemo(() => LEAGUES.flatMap((l) => matchData[l.id] ?? []), [matchData])
  const favMatches = useMemo(() => allEvents.filter((e) => favs.has(e.home.id) || favs.has(e.away.id)), [allEvents, favs])
  const scope      = tab === 'all' ? allEvents : tab === 'favs' ? favMatches : (matchData[tab] ?? [])
  const counts = {
    all: scope.length,
    in: scope.filter((e) => e.state === 'in').length,
    pre: scope.filter((e) => e.state === 'pre').length,
    post: scope.filter((e) => e.state === 'post').length,
  }
  const liveTotal = allEvents.filter((e) => e.state === 'in').length

  function filterEvents(events) {
    let out = events
    if (status !== 'all') out = out.filter((e) => e.state === status)
    const q = query.trim().toLowerCase()
    if (q) out = out.filter((e) => `${e.home.name} ${e.home.short} ${e.away.name} ${e.away.short}`.toLowerCase().includes(q))
    return out
  }

  const leaguesWithMatches = LEAGUES
    .map((l) => ({ meta: l, events: filterEvents(matchData[l.id] ?? []) }))
    .filter((x) => x.events.length > 0)
  const activeMeta   = LEAGUE_BY_ID[tab]
  const activeEvents = tab === 'all' ? [] : filterEvents(scope)
  const isToday = sameDay(date, new Date())
  const today   = new Date()

  return (
    <div className="fb-page">
      {/* Header */}
      <div className="fb-head">
        <div>
          {!isMobile && <h1 className="fb-title">Football</h1>}
          <p className="fb-subtitle">
            {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            {!loading && <> · {allEvents.length} matches</>}
            {liveTotal > 0 && <span className="fb-live-count"><span className="live-dot" />{liveTotal} live</span>}
          </p>
        </div>
        <div className="fb-head-actions">
          {lastFetch && isToday && !isMobile && <span className="fb-updated">Updated {formatTime(lastFetch)}</span>}
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={loading} onClick={loadMatches} title="Refresh (R)">
            {isMobile ? null : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Date strip */}
      <div className="fb-days" ref={dayBarRef} role="group" aria-label="Day">
        {DAY_RANGE.map((n) => {
          const d = addDays(today, n)
          const on = sameDay(d, date)
          const label = n === 0 ? 'Today' : n === -1 ? 'Yesterday' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' })
          return (
            <button key={n} type="button" aria-pressed={on} className={`fb-day${on ? ' on' : ''}`} onClick={() => setDate(d)}>
              <span className="fb-day-label">{label}</span>
              <span className="fb-day-num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Leagues */}
      <div className="chip-row" ref={leagueBarRef} role="group" aria-label="Competition">
        {[{ id: 'all', flag: '', name: 'All', short: 'All' }, { id: 'favs', flag: '★', name: 'My teams', short: 'My teams' }, ...LEAGUES].map((league) => {
          const evs   = league.id === 'all' ? allEvents : league.id === 'favs' ? favMatches : (matchData[league.id] ?? [])
          const live  = evs.some((e) => e.state === 'in')
          const empty = !loading && league.id !== 'all' && league.id !== 'favs' && evs.length === 0
          return (
            <button key={league.id} type="button" aria-pressed={tab === league.id} onClick={() => setTab(league.id)}
              className={`chip fb-league-chip${tab === league.id ? ' active' : ''}${empty ? ' is-empty' : ''}`}>
              {league.flag && <span aria-hidden="true">{league.flag}</span>}
              {isDesktop ? league.name : league.short}
              {(evs.length > 0 || league.id === 'all') && <span className="chip-count">{live && <span className="live-dot fb-chip-live" />}{loading && league.id === 'all' ? '…' : evs.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="fb-filters">
        {isLeague && (
          <Tabs label="View" value={view} onChange={setView} options={[
            { value: 'matches', label: 'Matches' },
            { value: 'standings', label: 'Table' },
          ]} />
        )}
        {effectiveView === 'matches' && (
          <>
            <Tabs label="Status" size={isMobile ? 'sm' : 'md'} value={status} onChange={setStatus} options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'in', label: 'Live', count: counts.in },
              { value: 'pre', label: 'Upcoming', count: counts.pre },
              { value: 'post', label: 'Finished', count: counts.post },
            ]} />
            <div className="news-search fb-search">
              <Search size={14} className="news-search-icon" aria-hidden="true" />
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a team…" aria-label="Search a team" />
              {query && <IconButton icon={X} label="Clear search" size="sm" className="news-search-clear" onClick={() => setQuery('')} />}
            </div>
          </>
        )}
      </div>

      <div className={isDesktop ? 'fb-split' : 'fb-stack'}>
        <div className="fb-main">
          {effectiveView === 'standings' ? (
            <StandingsView leagueId={tab} favs={favs} />
          ) : loading ? (
            <div className="fx-grid">{[...Array(6)].map((_, i) => <Skeleton key={i} h={92} r={18} />)}</div>
          ) : tab === 'all' ? (
            leaguesWithMatches.length === 0
              ? <EmptyState query={query} status={status} />
              : leaguesWithMatches.map(({ meta, events }) => (
                <LeagueSection key={meta.id} league={meta} events={events} favs={favs} toggleFav={toggleFav}
                  onOpen={() => { setTab(meta.id); setStatus('all') }} />
              ))
          ) : tab === 'favs' && favs.size === 0 ? (
            <EmptyNotice icon={Star} title="Follow your teams" hint="Tap the ★ next to any team — their matches gather here and on Home." />
          ) : activeEvents.length === 0 ? (
            errors[tab]
              ? <InlineError message={errors[tab]} onRetry={loadMatches} />
              : <EmptyState query={query} status={status} message={tab === 'favs' ? 'No matches for your teams this day' : `No ${activeMeta?.name} matches ${dateLabel(date).toLowerCase() === 'today' ? 'today' : `on ${dateLabel(date)}`}`} />
          ) : (
            <LeagueSection league={tab === 'favs' ? { flag: '★', name: 'My teams' } : activeMeta} events={activeEvents} favs={favs} toggleFav={toggleFav} />
          )}
        </div>

        <aside className="fb-side">
          <NewsFeed leagueId={tab} feedCache={feedCache} setFeedCache={setFeedCache} />
        </aside>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query, status, message }) {
  const hasFilters = !!query || status !== 'all'
  if (hasFilters) return <EmptyNotice icon={Search} title="No matches match your filters" hint="Try clearing the search or the status filter." />
  return <EmptyNotice art="matches" title={message || 'No matches today'} hint="Rest day — pick another date above." />
}
