import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, AlertCircle, MapPin, Clock, ExternalLink, Newspaper } from 'lucide-react'

// ─── League catalogue ─────────────────────────────────────────────────────────

const LEAGUES = [
  { id: 'uefa.champions', name: 'Champions League', short: 'UCL',  flag: '⭐' },
  { id: 'uefa.europa',    name: 'Europa League',    short: 'UEL',  flag: '🔶' },
  { id: 'uefa.europaconf',name: 'Conference Lge',   short: 'UECL', flag: '🔷' },
  { id: 'eng.1',          name: 'Premier League',   short: 'PL',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'esp.1',          name: 'La Liga',          short: 'LL',   flag: '🇪🇸' },
  { id: 'ger.1',          name: 'Bundesliga',       short: 'BL',   flag: '🇩🇪' },
  { id: 'ita.1',          name: 'Serie A',          short: 'SA',   flag: '🇮🇹' },
  { id: 'fra.1',          name: 'Ligue 1',          short: 'L1',   flag: '🇫🇷' },
  { id: 'ned.1',          name: 'Eredivisie',       short: 'ERE',  flag: '🇳🇱' },
  { id: 'por.1',          name: 'Primeira Liga',    short: 'PRL',  flag: '🇵🇹' },
  { id: 'tur.1',          name: 'Süper Lig',        short: 'SL',   flag: '🇹🇷' },
  { id: 'usa.1',          name: 'MLS',              short: 'MLS',  flag: '🇺🇸' },
  { id: 'bra.1',          name: 'Brasileirão',      short: 'BRA',  flag: '🇧🇷' },
  { id: 'arg.1',          name: 'Liga Argentina',   short: 'ARG',  flag: '🇦🇷' },
]

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

// ─── ESPN match fetching ──────────────────────────────────────────────────────

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

async function fetchLeague(leagueId) {
  const res = await fetch(`${ESPN_BASE}/${leagueId}/scoreboard`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.events ?? []).map(parseEvent).filter(Boolean)
}

function parseEvent(event) {
  const comp = event.competitions?.[0]
  if (!comp) return null
  const home = comp.competitors?.find((c) => c.homeAway === 'home')
  const away = comp.competitors?.find((c) => c.homeAway === 'away')
  if (!home || !away) return null
  const st = event.status?.type ?? {}
  return {
    id: event.id, date: event.date,
    state: st.state ?? 'pre',
    detail: st.detail ?? '', shortDetail: st.shortDetail ?? '',
    completed: st.completed ?? false,
    home: { name: home.team?.displayName ?? '', short: home.team?.shortDisplayName ?? home.team?.abbreviation ?? '', logo: home.team?.logo ?? '', score: home.score ?? null, winner: home.winner ?? false },
    away: { name: away.team?.displayName ?? '', short: away.team?.shortDisplayName ?? away.team?.abbreviation ?? '', logo: away.team?.logo ?? '', score: away.score ?? null, winner: away.winner ?? false },
    venue: comp.venue?.fullName ?? '',
  }
}

// ─── RSS fetching ─────────────────────────────────────────────────────────────

function sortByDate(arr) {
  return arr.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
}

function parseRSS(xml) {
  const doc    = new DOMParser().parseFromString(xml, 'text/xml')
  const isAtom = !!doc.querySelector('feed')
  const items  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item'))
  const MEDIA  = 'http://search.yahoo.com/mrss/'
  return sortByDate(items.slice(0, 10).map((item) => {
    const get    = (s) => item.querySelector(s)?.textContent?.trim() ?? ''
    const itemXml = new XMLSerializer().serializeToString(item)
    const title   = get('title').replace(/<!\[CDATA\[|\]\]>/g, '')
    const rawDesc = get('description') || get('summary') || get('content')
    const linkEl  = item.querySelector('link')
    const link    = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || get('guid')

    // Image: try namespace-aware getElementsByTagNameNS first (most reliable),
    // then raw XML regex as fallback for feeds that declare media: differently
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
  const urls    = LEAGUE_FEEDS[leagueId] ?? LEAGUE_FEEDS['all']
  const results = await Promise.allSettled(urls.map((u) => fetchRSS(u)))
  const seen    = new Set()
  const merged  = results.flatMap((r, i) => {
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

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ event, compact = false }) {
  const isLive     = event.state === 'in'
  const isFinished = event.state === 'post'
  const isPre      = event.state === 'pre'
  const time       = matchTime(event)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isLive ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
      borderRadius: '12px', padding: compact ? '0.75rem 0.9rem' : '1rem 1.1rem',
      display: 'flex', flexDirection: 'column', gap: '0.6rem',
      boxShadow: isLive ? '0 0 20px rgba(52,211,153,0.07)' : 'none',
      transition: 'border-color 0.2s',
    }}>
      {/* Teams + Score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Home */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, justifyContent: 'flex-end' }}>
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
        </div>
      </div>

      {/* Venue */}
      {event.venue && !compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.63rem', color: 'var(--text-muted)' }}>
          <MapPin size={9} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue}</span>
        </div>
      )}
    </div>
  )
}

// ─── NewsArticle (compact sidebar card) ───────────────────────────────────────

function NewsArticle({ article }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>

      {/* Thumbnail */}
      {article.image && !imgErr && (
        <img src={article.image} alt="" onError={() => setImgErr(true)}
          style={{ width: 62, height: 46, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
      )}

      {/* Text */}
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
      if (feedCache[leagueId]) { setArticles(feedCache[leagueId]); setLoading(false); return }
      setLoading(true); setError(null)
      try {
        const data = await fetchLeagueFeeds(leagueId)
        if (!cancelled) {
          setArticles(data)
          setFeedCache((prev) => ({ ...prev, [leagueId]: data }))
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FootballToday() {
  const [tab,       setTab]       = useState('all')
  const [matchData, setMatchData] = useState({})
  const [feedCache, setFeedCache] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [errors,    setErrors]    = useState({})
  const [lastFetch, setLastFetch] = useState(null)
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 900)
  const tabBarRef = useRef(null)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const loadMatches = useCallback(async () => {
    setLoading(true)
    const results = await Promise.allSettled(LEAGUES.map((l) => fetchLeague(l.id).then((ev) => ({ id: l.id, ev }))))
    const newData = {}, newErr = {}
    results.forEach((r, i) => {
      const id = LEAGUES[i].id
      if (r.status === 'fulfilled') newData[id] = r.value.ev
      else newErr[id] = r.reason?.message ?? 'Failed'
    })
    setMatchData(newData); setErrors(newErr); setLastFetch(new Date()); setLoading(false)
  }, [])

  useEffect(() => { loadMatches() }, [loadMatches])
  useEffect(() => { const id = setInterval(loadMatches, 60 * 1000); return () => clearInterval(id) }, [loadMatches])

  useEffect(() => {
    const el = tabBarRef.current?.querySelector(`[data-tab="${tab}"]`)
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [tab])

  const leaguesWithMatches = LEAGUES.filter((l) => matchData[l.id]?.length > 0)
  const totalMatches = leaguesWithMatches.reduce((n, l) => n + (matchData[l.id]?.length ?? 0), 0)
  const liveCount    = leaguesWithMatches.reduce((n, l) => n + (matchData[l.id]?.filter((e) => e.state === 'in').length ?? 0), 0)
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const activeEvents = tab === 'all' ? [] : (matchData[tab] ?? [])
  const activeMeta   = LEAGUES.find((l) => l.id === tab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>⚽ Football Today</h2>
          <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{today}</span>
            {!loading && totalMatches > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{totalMatches} matches · {leaguesWithMatches.length} competitions</span>
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
          {lastFetch && !loading && (
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={10} />{lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={loadMatches} disabled={loading} className="btn-ghost"
            style={{ padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div ref={tabBarRef} style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
        {/* All tab */}
        {[{ id: 'all', flag: '⚽', name: 'All Today', short: 'All' }, ...LEAGUES].map((league) => {
          const isAll    = league.id === 'all'
          const count    = isAll ? totalMatches : (matchData[league.id]?.length ?? 0)
          const hasLive  = isAll ? liveCount > 0 : (matchData[league.id]?.some((e) => e.state === 'in') ?? false)
          const isActive = tab === league.id
          return (
            <button key={league.id} data-tab={league.id} onClick={() => setTab(league.id)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.38rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--border)',
                background: isActive ? 'rgba(167,139,250,0.12)' : count > 0 ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                color: isActive ? '#a78bfa' : count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!isAll && count === 0 && !loading) ? 0.45 : 1,
              }}>
              <span>{league.flag}</span>
              <span>{isMobile ? league.short : league.name}</span>
              {(count > 0 || isAll) && (
                <span style={{ fontSize: '0.62rem', background: isActive ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {hasLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
                  {loading && isAll ? '…' : count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Main layout: matches + news ── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* ── Left: Matches ── */}
        <div style={{ flex: isMobile ? 'none' : '3', width: isMobile ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} style={{ height: 88, borderRadius: '12px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)
          ) : tab === 'all' ? (
            leaguesWithMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚽</div>
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No matches scheduled today</div>
                <div style={{ fontSize: '0.78rem' }}>Check back on a match day</div>
              </div>
            ) : (
              leaguesWithMatches.map((league) => (
                <div key={league.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* League header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                    <span style={{ fontSize: '0.9rem' }}>{league.flag}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{league.name}</span>
                    <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.05rem 0.4rem' }}>
                      {matchData[league.id]?.length} {matchData[league.id]?.length === 1 ? 'match' : 'matches'}
                    </span>
                    {matchData[league.id]?.some((e) => e.state === 'in') && (
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
                  {/* Matches */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
                    {matchData[league.id]?.map((ev) => <MatchCard key={ev.id} event={ev} compact />)}
                  </div>
                </div>
              ))
            )
          ) : (
            <>
              {/* League header */}
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
                  {activeEvents.length} {activeEvents.length === 1 ? 'match' : 'matches'} today
                </span>
              </div>

              {errors[tab] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.9rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.75rem' }}>
                  <AlertCircle size={13} /> Failed: {errors[tab]}
                </div>
              )}

              {activeEvents.length === 0 && !errors[tab] ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>{activeMeta?.flag}</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No {activeMeta?.name} matches today</div>
                  <div style={{ fontSize: '0.75rem' }}>Come back on a match day</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.65rem' }}>
                  {activeEvents.map((ev) => <MatchCard key={ev.id} event={ev} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: News feed ── */}
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
