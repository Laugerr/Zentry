import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Search, ChevronDown, Star, Clock, List, MapIcon, X, Globe } from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { InlineError } from '../components/states'
import { useRadio } from '../radio/radio-context'
import { RADIO_LS as LS, readJSON, writeJSON, genreColor } from '../radio/stations'

// World map topojson (hosted by observable/world-atlas, MIT license)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Radio Browser API servers, tried in random order. nl1/at1/fi1 were retired
// (no DNS) — `all.` is the project's round-robin name, so it keeps working
// as servers come and go.
const RB_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://all.api.radio-browser.info',
]

const GENRES = [
  { id: 'all',        label: 'All',         emoji: '📻' },
  { id: 'news',       label: 'News',        emoji: '📰' },
  { id: 'talk',       label: 'Talk',        emoji: '🎙️' },
  { id: 'jazz',       label: 'Jazz',        emoji: '🎷' },
  { id: 'classical',  label: 'Classical',   emoji: '🎻' },
  { id: 'pop',        label: 'Pop',         emoji: '🎵' },
  { id: 'rock',       label: 'Rock',        emoji: '🎸' },
  { id: 'metal',      label: 'Metal',       emoji: '🤘' },
  { id: 'indie',      label: 'Indie',       emoji: '🪕' },
  { id: 'electronic', label: 'Electronic',  emoji: '🎛️' },
  { id: 'dance',      label: 'Dance',       emoji: '💃' },
  { id: 'hiphop',     label: 'Hip-Hop',     emoji: '🎤' },
  { id: 'rnb',        label: 'R&B / Soul',  emoji: '🎙' },
  { id: 'reggae',     label: 'Reggae',      emoji: '🌴' },
  { id: 'latin',      label: 'Latin',       emoji: '💃' },
  { id: 'country',    label: 'Country',     emoji: '🤠' },
  { id: 'blues',      label: 'Blues',       emoji: '🎺' },
  { id: 'folk',       label: 'Folk',        emoji: '🪕' },
  { id: 'ambient',    label: 'Ambient',     emoji: '🌊' },
  { id: 'world',      label: 'World',       emoji: '🌍' },
  { id: 'kids',       label: 'Kids',        emoji: '🧸' },
]

// ─── Radio Browser fetching ───────────────────────────────────────────────────

async function rbRequest(host, path, signal) {
  const res = await fetch(`${host}${path}`, {
    headers: { 'User-Agent': 'ZentryDashboard/1.0' },
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Shuffle hosts so each call tries a different preferred mirror first,
// but falls back sequentially on failure — this prevents "Failed to fetch"
// when one mirror is unreachable or rate-limiting.
function shuffledHosts() {
  const arr = [...RB_HOSTS]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function fetchStations(genre, country) {
  const base = {
    has_geo_info: 'true',
    order: 'clickcount',
    reverse: 'true',
    hidebroken: 'true',
    limit: '1500',
    ...(genre && genre !== 'all' ? { tag: genre } : {}),
    ...(country ? { countrycode: country } : {}),
  }
  const qs = new URLSearchParams(base).toString()

  let lastErr
  for (const host of shuffledHosts()) {
    try {
      const signal = AbortSignal.timeout(12000)
      const data = await rbRequest(host, `/json/stations/search?${qs}`, signal)
      const seen = new Set()
      return data
        .filter((s) => {
          if (!s.geo_lat || !s.geo_long) return false
          if (Math.abs(s.geo_lat) > 90 || Math.abs(s.geo_long) > 180) return false
          if (!s.url_resolved && !s.url) return false
          if (seen.has(s.stationuuid)) return false
          seen.add(s.stationuuid)
          return true
        })
        .map((s) => ({
          // Precompute coordinates so markers don't parseFloat on every render
          ...s,
          _lon: parseFloat(s.geo_long),
          _lat: parseFloat(s.geo_lat),
          _color: genreColor(s.tags),
        }))
    } catch (e) {
      lastErr = e
      // try next host
    }
  }
  throw lastErr ?? new Error('All mirrors failed')
}

// Fire-and-forget click ping (also resilient to a dead mirror)
function pingClick(uuid) {
  if (!uuid) return
  const host = shuffledHosts()[0]
  fetch(`${host}/json/url/${uuid}`, { mode: 'no-cors' }).catch(() => { /* ignore */ })
}

// ─── Memoized map marker ──────────────────────────────────────────────────────
// Markers only re-render when their own state (isActive/isFav) or station changes.
// Without this, hovering a single dot would re-render every other dot.

// Radii tuned so that at zoom=1 the world view doesn't look like a pixel flood.
// react-simple-maps scales markers with ZoomableGroup's SVG transform, so
// zooming in already grows them — we just need the base radius to be small.
const R_DEFAULT = 1.3
const R_FAV     = 1.8
const R_ACTIVE  = 3.2

const StationMarker = memo(function StationMarker({ station, isActive, isFav, onEnter, onLeave, onClick }) {
  const color = station._color
  const r = isActive ? R_ACTIVE : isFav ? R_FAV : R_DEFAULT
  return (
    <Marker
      coordinates={[station._lon, station._lat]}
      onMouseEnter={(e) => onEnter(e, station)}
      onMouseLeave={onLeave}
      onClick={() => onClick(station)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        r={r}
        fill={color}
        fillOpacity={isActive ? 1 : isFav ? 0.9 : 0.65}
        stroke={isActive ? '#fff' : isFav ? '#facc15' : color}
        strokeWidth={isActive ? 1.2 : isFav ? 0.8 : 0.3}
      />
      {isActive && (
        <circle r={7} fill="none" stroke={color} strokeWidth={0.8} strokeOpacity={0.5}
          style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
      )}
    </Marker>
  )
})

// ─── Station list item ────────────────────────────────────────────────────────

function StationRow({ station, active, favourite, onPlay, onToggleFav }) {
  const color = genreColor(station.tags)
  return (
    <div
      onClick={() => onPlay(station)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        padding: '0.5rem 0.6rem', borderRadius: 8, cursor: 'pointer',
        background: active ? `${color}18` : 'transparent',
        border: `1px solid ${active ? `${color}55` : 'transparent'}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {station.name}
        </div>
        <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[station.country, station.tags?.split(',')[0], station.bitrate > 0 ? `${station.bitrate}kbps` : null]
            .filter(Boolean).join(' · ')}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleFav(station) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: favourite ? '#facc15' : 'var(--text-muted)', opacity: favourite ? 1 : 0.4,
          padding: 2, display: 'flex' }}>
        <Star size={13} fill={favourite ? '#facc15' : 'none'} />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveRadio() {
  const [genre,      setGenre]      = useState('all')
  const [country,    setCountry]    = useState('')           // ISO country code filter
  const [search,     setSearch]     = useState('')
  const [sort,       setSort]       = useState('popularity') // popularity | name | bitrate
  const [tooltip,    setTooltip]    = useState(null)
  const [zoom,       setZoom]       = useState(1)
  const [center,     setCenter]     = useState([0, 20])
  const { isMobile } = useBreakpoint()
  const [showGenre,  setShowGenre]  = useState(false)
  const [showCountry,setShowCountry]= useState(false)
  const [showList,   setShowList]   = useState(true)
  const [nowPlaying, setNowPlaying] = useState(null) // { station, ts } — brief pill on mobile
  const [listTab,    setListTab]    = useState('all')        // all | favs | recents
  const [favourites, setFavourites] = useState(() => readJSON(LS.favs, []))
  const mapRef = useRef(null)
  // Playback lives in the app-wide RadioProvider so it survives leaving this
  // page; here we only drive it. Recents / last station are kept there too.
  const radio = useRadio()
  const active  = radio.station
  const recents = radio.recents

  useEffect(() => { writeJSON(LS.favs, favourites) }, [favourites])

  // Observe theme so the map palette follows dark/light mode without a reload.
  const [theme, setTheme] = useState(() => typeof document !== 'undefined'
    ? document.documentElement.dataset.theme || 'dark' : 'dark')
  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.documentElement
    const obs = new MutationObserver(() => setTheme(el.dataset.theme || 'dark'))
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  const mapPalette = theme === 'light'
    ? { bg: '#f1f3f8', land: '#e5e7eb', stroke: '#cbd1da', hover: '#dadee8', hoverStroke: '#9ca3af' }
    : { bg: 'rgba(10,12,20,0.9)', land: '#1e2235', stroke: '#2d3250', hover: '#252840', hoverStroke: '#3d4270' }

  // Load stations whenever filters change. SWR via the shared cache means
  // re-selecting a genre/country you viewed recently is instant, and the
  // request is deduped + retryable.
  const { data: stationsData, loading, error, refresh } = useCachedFetch(
    `lr:stations:${genre}:${country || 'ww'}`,
    () => fetchStations(genre, country),
    { ttl: 15 * 60_000 },
  )
  const stations = useMemo(() => stationsData ?? [], [stationsData])

  // Auto-dismiss the "now playing" pill after a moment.
  useEffect(() => {
    if (!nowPlaying) return
    const id = setTimeout(() => setNowPlaying(null), 2400)
    return () => clearTimeout(id)
  }, [nowPlaying])

  // When a country filter is selected, pan/zoom the map to it for instant context.
  // When cleared, snap back to the world view.
  useEffect(() => {
    if (!country) { setZoom(1); setCenter([0, 20]); return }
    // Station list may not have reloaded yet — guard on stations content.
    const one = stations.find((s) => s.countrycode === country)
    if (one && Number.isFinite(one._lon) && Number.isFinite(one._lat)) {
      setCenter([one._lon, one._lat])
      setZoom(4)
    }
  }, [country, stations])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showGenre && !showCountry) return
    const close = () => { setShowGenre(false); setShowCountry(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showGenre, showCountry])

  // Top countries derived from loaded stations (for quick-filter dropdown)
  const countryOptions = useMemo(() => {
    const m = new Map()
    for (const s of stations) {
      const code = s.countrycode || ''
      const name = s.country || code
      if (!code) continue
      const cur = m.get(code) || { code, name, count: 0 }
      cur.count++
      m.set(code, cur)
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 40)
  }, [stations])

  // Base filtering (search)
  const baseFiltered = useMemo(() => {
    if (!search.trim()) return stations
    const q = search.toLowerCase()
    return stations.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      (s.tags || '').toLowerCase().includes(q)
    )
  }, [stations, search])

  // Cap markers for performance: rendering 3000 SVG dots chokes the main thread.
  // Stations are already sorted by popularity, so we keep the top 1500.
  const mapMarkers = useMemo(
    () => baseFiltered.length > 1500 ? baseFiltered.slice(0, 1500) : baseFiltered,
    [baseFiltered]
  )

  // Zoom-adaptive density thinning — at world view, drop markers that collide
  // into the same coarse lat/lon bucket so the map doesn't look like noise.
  // Active + favourites are always shown (they shouldn't disappear when zoomed out).
  const favouriteSet = useMemo(() => new Set(favourites.map((f) => f.stationuuid)), [favourites])
  const displayedMarkers = useMemo(() => {
    if (zoom >= 3) return mapMarkers
    const cell = zoom < 1.3 ? 4 : zoom < 2 ? 2 : 1   // degrees; shrinks as we zoom in
    const grid = new Map()
    const pinned = []
    for (const s of mapMarkers) {
      const isPinned = active?.stationuuid === s.stationuuid || favouriteSet.has(s.stationuuid)
      if (isPinned) { pinned.push(s); continue }
      const k = `${Math.round(s._lat / cell)}|${Math.round(s._lon / cell)}`
      const cur = grid.get(k)
      if (!cur || (s.clickcount || 0) > (cur.clickcount || 0)) grid.set(k, s)
    }
    return [...pinned, ...grid.values()]
  }, [mapMarkers, zoom, active, favouriteSet])

  // List subset based on tab
  const listData = useMemo(() => {
    let data = baseFiltered
    if (listTab === 'favs') {
      const favSet = new Set(favourites.map((f) => f.stationuuid))
      data = favourites.filter((s) => !search.trim()
        || s.name.toLowerCase().includes(search.toLowerCase())
        || (s.country || '').toLowerCase().includes(search.toLowerCase()))
      // Keep fresh data if we have it in stations
      data = data.map((f) => stations.find((s) => s.stationuuid === f.stationuuid) || f)
      // When genre/country filters are active, narrow too
      if (genre !== 'all' || country) data = data.filter((s) => favSet.has(s.stationuuid))
    } else if (listTab === 'recents') {
      data = recents.map((r) => stations.find((s) => s.stationuuid === r.stationuuid) || r)
      if (search.trim()) {
        const q = search.toLowerCase()
        data = data.filter((s) => s.name.toLowerCase().includes(q) || (s.country || '').toLowerCase().includes(q))
      }
    }
    const sorted = [...data]
    if (sort === 'name')     sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'bitrate') sorted.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
    else                     sorted.sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0))
    return sorted
  }, [baseFiltered, listTab, favourites, recents, stations, sort, search, genre, country])

  const playStation = useCallback((station) => {
    // The visible list becomes the queue for next / previous / shuffle
    radio.play(station, listData)
    setTooltip(null)
    pingClick(station.stationuuid)
    // Brief "now playing" pill (mostly for mobile where the player is below the fold).
    setNowPlaying({ station, ts: Date.now() })
    // Subtle haptic tick on devices that support it.
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8)
  }, [radio, listData])

  // Stable marker callbacks so memoized StationMarker doesn't re-render on every state change.
  // On mobile we skip hover-tooltips entirely (they collide with the tap-to-play gesture
  // and linger after touchstart); the "now playing" pill takes their place.
  const onMarkerEnter = useCallback((e, station) => {
    if (isMobile) return
    const rect = mapRef.current?.getBoundingClientRect()
    setTooltip({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), station })
  }, [isMobile])
  const onMarkerLeave = useCallback(() => setTooltip(null), [])

  const toggleFav = useCallback((station) => {
    setFavourites((prev) => {
      const exists = prev.some((s) => s.stationuuid === station.stationuuid)
      if (exists) return prev.filter((s) => s.stationuuid !== station.stationuuid)
      return [{
        stationuuid: station.stationuuid, name: station.name, country: station.country,
        tags: station.tags, url: station.url, url_resolved: station.url_resolved,
        bitrate: station.bitrate, codec: station.codec, geo_lat: station.geo_lat, geo_long: station.geo_long,
        clickcount: station.clickcount,
      }, ...prev]
    })
  }, [])

  // Keyboard shortcuts while a station is loaded (this page only — Space etc.
  // would be surprising elsewhere). Media keys work everywhere via MediaSession.
  useEffect(() => {
    if (!radio.station) return
    const onKey = (e) => {
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      switch (e.key) {
        case ' ':           e.preventDefault(); radio.toggle(); break
        case 'm': case 'M': radio.toggleMute(); break
        case 'n': case 'N': radio.next(); break
        case 'p': case 'P': radio.prev(); break
        case 's': case 'S': radio.shuffle(); break
        case 'ArrowUp':     e.preventDefault(); radio.setVolume((v) => Math.min(1, +(v + 0.05).toFixed(2))); break
        case 'ArrowDown':   e.preventDefault(); radio.setVolume((v) => Math.max(0, +(v - 0.05).toFixed(2))); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [radio])

  const activeGenre   = GENRES.find((g) => g.id === genre)
  const activeCountry = countryOptions.find((c) => c.code === country)

  // Station list panel — rendered in one of two slots depending on breakpoint.
  // Extracted as a variable (not a component) so the same JSX is shared
  // between the mobile-first-above-map and desktop-right-of-map positions
  // without duplicating markup or causing key/remount churn.
  const listPanel = (
    <div style={{
      // On mobile we anchor the list to a concrete viewport-relative height so
      // it doesn't collapse when the PlayerBar appears or when the root's
      // `height: 100%` doesn't resolve cleanly through the nested flex chain.
      ...(isMobile
        ? { flex: 'none', width: '100%', height: 'min(55vh, 480px)' }
        : { flex: '2', minHeight: 0 }),
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
    }}>
      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { id: 'all',     label: 'All',     count: baseFiltered.length },
          { id: 'favs',    label: '★ Favs',  count: favourites.length },
          { id: 'recents', label: 'Recent',  count: recents.length },
        ].map((t) => {
          const isA = listTab === t.id
          return (
            <button key={t.id} onClick={() => setListTab(t.id)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: isA ? 700 : 500,
                border: isA ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
                background: isA ? 'rgba(167,139,250,0.12)' : 'transparent',
                color: isA ? '#a78bfa' : 'var(--text-secondary)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {t.label}<span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{t.count}</span>
            </button>
          )
        })}

        <select value={sort} onChange={(e) => setSort(e.target.value)}
          style={{ marginLeft: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '0.25rem 0.4rem', borderRadius: 6, cursor: 'pointer' }}>
          <option value="popularity">Popular</option>
          <option value="name">Name</option>
          <option value="bitrate">Bitrate</option>
        </select>
        {isMobile && (
          <button onClick={() => setShowList(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* List body — flex:1 + minHeight:0 on parent is what lets overflow-y:auto actually scroll */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {loading && [...Array(8)].map((_, i) => (
          <div key={i} style={{ height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
        ))}
        {!loading && listData.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {listTab === 'favs'
              ? 'No favourites yet. Star stations to save them here.'
              : listTab === 'recents'
                ? 'Nothing played yet.'
                : 'No stations match the current filters.'}
          </div>
        )}
        {!loading && listData.slice(0, 500).map((s) => (
          <StationRow key={s.stationuuid} station={s}
            active={active?.stationuuid === s.stationuuid}
            favourite={favouriteSet.has(s.stationuuid)}
            onPlay={playStation}
            onToggleFav={toggleFav} />
        ))}
        {!loading && listData.length > 500 && (
          <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
            Showing first 500 of {listData.length.toLocaleString()}. Narrow your filters for more.
          </div>
        )}
      </div>

      {listTab === 'recents' && recents.length > 0 && (
        <button onClick={radio.clearRecents}
          style={{ borderTop: '1px solid var(--border)', padding: '0.5rem', background: 'transparent',
            border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}>
          <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
          Clear history
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', position: 'relative' }}>

      {/* "Now playing" pill — appears briefly when a station is selected.
          Useful on mobile where the player bar may be below the fold,
          and as a quick confirmation of the tap on desktop too. */}
      {nowPlaying && (
        <div style={{
          position: 'fixed', top: isMobile ? 64 : 76, left: '50%', transform: 'translateX(-50%)',
          zIndex: 60, pointerEvents: 'none',
          background: 'rgba(10,12,20,0.92)', color: 'var(--text-primary)',
          border: `1px solid ${nowPlaying.station._color ?? genreColor(nowPlaying.station.tags)}55`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35), 0 0 20px rgba(139,92,246,0.15)',
          borderRadius: 999, padding: '0.45rem 0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.78rem', maxWidth: 'min(420px, 92vw)',
          animation: 'np-in 0.22s ease-out',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 999,
            background: nowPlaying.station._color ?? genreColor(nowPlaying.station.tags),
            animation: 'pulse 1.3s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
            {nowPlaying.station.name}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
            · {nowPlaying.station.country || nowPlaying.station.countrycode || '—'}
          </span>
        </div>
      )}

      {/* Header — two explicit rows (no more wrap-lottery).
          Row 1: title + subtitle + secondary controls (list toggle, zoom).
          Row 2: search (fills available width) + genre + country chips. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>📻 Live Radio</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {loading
                ? 'Loading stations…'
                : isMobile
                  ? `${baseFiltered.length.toLocaleString()} stations · tap any dot to play`
                  : `${baseFiltered.length.toLocaleString()} stations · ${displayedMarkers.length.toLocaleString()} on map · Space / N / P / S / M / ↑↓`
              }
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            {/* List toggle — available on every breakpoint so users who closed the
                list on mobile (via its X button) can get it back. */}
            <button onClick={() => setShowList((v) => !v)}
              title={showList ? 'Hide list' : 'Show list'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.65rem', background: showList ? 'rgba(167,139,250,0.12)' : 'var(--bg-card)',
                border: `1px solid ${showList ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`, borderRadius: 8,
                color: showList ? '#a78bfa' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              {showList ? <List size={13} /> : <MapIcon size={13} />}
              {!isMobile && (showList ? 'Hide list' : 'Show list')}
            </button>

            {/* Zoom — desktop only; mobile uses native pinch-zoom from ZoomableGroup */}
            {!isMobile && (
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[['−', () => setZoom((z) => Math.max(1, z / 1.5))],
                  ['+', () => setZoom((z) => Math.min(12, z * 1.5))],
                  ['↺', () => { setZoom(1); setCenter([0, 20]) }]].map(([label, fn]) => (
                  <button key={label} onClick={fn}
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)',
                      color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search — flex: 1 so it fills whatever's left */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={13} style={{ position: 'absolute', left: '0.6rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isMobile ? 'Search stations…' : 'Search name / country / tag…'}
              style={{
                flex: 1, width: '100%',
                paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
              }}
            />
          </div>

          {/* Genre */}
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowGenre((v) => !v); setShowCountry(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              <span>{activeGenre?.emoji}</span>
              <span>{activeGenre?.label}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: showGenre ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showGenre && (
              <div style={isMobile
                ? { position: 'fixed', top: 'auto', bottom: 12, left: 12, right: 12, zIndex: 200,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 4, maxHeight: '60vh', overflowY: 'auto',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }
                : { position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 4, minWidth: 180, maxHeight: 320, overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {GENRES.map((g) => (
                  <button key={g.id}
                    onClick={() => { setGenre(g.id); setShowGenre(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                      padding: '0.4rem 0.6rem', background: genre === g.id ? 'rgba(167,139,250,0.12)' : 'transparent',
                      border: 'none', borderRadius: 7, color: genre === g.id ? '#a78bfa' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '0.78rem', textAlign: 'left' }}>
                    <span>{g.emoji}</span><span>{g.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Country */}
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowCountry((v) => !v); setShowGenre(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              <Globe size={12} />
              <span>{country ? (activeCountry?.name || country) : 'Worldwide'}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: showCountry ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showCountry && (
              <div style={isMobile
                ? { position: 'fixed', top: 'auto', bottom: 12, left: 12, right: 12, zIndex: 200,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 4, maxHeight: '60vh', overflowY: 'auto',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }
                : { position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 4, minWidth: 200, maxHeight: 320, overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <button onClick={() => { setCountry(''); setShowCountry(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.4rem 0.6rem', background: !country ? 'rgba(167,139,250,0.12)' : 'transparent',
                    border: 'none', borderRadius: 7, color: !country ? '#a78bfa' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.78rem', textAlign: 'left' }}>
                  🌐 Worldwide
                </button>
                {countryOptions.map((c) => (
                  <button key={c.code}
                    onClick={() => { setCountry(c.code); setShowCountry(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                      padding: '0.4rem 0.6rem', background: country === c.code ? 'rgba(167,139,250,0.12)' : 'transparent',
                      border: 'none', borderRadius: 7, color: country === c.code ? '#a78bfa' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '0.78rem', textAlign: 'left' }}>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map + List layout.
          Mobile: list first (primary touch surface), then a short fixed-height map.
          Desktop: map left, list right. We render the two sections in explicit
          order per breakpoint rather than using `column-reverse` — the latter was
          fighting the list's internal scroll and producing the visual mess where
          the header appeared to float inside the list. */}
      <div style={{
        flex: 1, display: 'flex', gap: '1rem', minHeight: 0,
        flexDirection: isMobile ? 'column' : 'row',
      }}>

        {/* --- MOBILE: list first --- */}
        {isMobile && showList && listPanel}

        {/* Map */}
        <div ref={mapRef} style={{
          flex: isMobile ? 'none' : (showList ? '3' : '1'),
          height: isMobile ? 240 : undefined,
          minHeight: isMobile ? 240 : 420, position: 'relative',
          background: mapPalette.bg, border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 10 }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading stations from Radio Browser…</span>
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <InlineError message={error.message || 'Failed to load stations'} onRetry={refresh} />
            </div>
          )}

          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140, center: [0, 20] }} style={{ width: '100%', height: '100%' }}>
            <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates }) => { setZoom(z); setCenter(coordinates) }}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: { fill: mapPalette.land,  stroke: mapPalette.stroke,      strokeWidth: 0.4, outline: 'none' },
                        hover:   { fill: mapPalette.hover, stroke: mapPalette.hoverStroke, strokeWidth: 0.4, outline: 'none' },
                        pressed: { fill: mapPalette.hover, outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {!loading && displayedMarkers.map((station) => (
                <StationMarker
                  key={station.stationuuid}
                  station={station}
                  isActive={active?.stationuuid === station.stationuuid}
                  isFav={favouriteSet.has(station.stationuuid)}
                  onEnter={onMarkerEnter}
                  onLeave={onMarkerLeave}
                  onClick={playStation}
                />
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'absolute',
              left: Math.min(tooltip.x + 12, (mapRef.current?.offsetWidth ?? 400) - 220),
              top:  Math.max(tooltip.y - 60, 8),
              pointerEvents: 'none', zIndex: 100,
              background: 'rgba(10,12,20,0.95)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.5rem 0.75rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)', maxWidth: 220,
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                {tooltip.station.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {tooltip.station.country}
                {tooltip.station.tags && <> · {tooltip.station.tags.split(',')[0]}</>}
                {tooltip.station.bitrate > 0 && <> · {tooltip.station.bitrate}kbps</>}
                {tooltip.station.codec && <> {tooltip.station.codec}</>}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a78bfa', marginTop: '0.25rem' }}>Click to play</div>
            </div>
          )}
        </div>

        {/* --- DESKTOP: list on the right --- */}
        {!isMobile && showList && listPanel}
      </div>


      <style>{`
        @keyframes pulse-ring {
          0%   { r: 5;  stroke-opacity: 0.6; }
          100% { r: 12; stroke-opacity: 0;   }
        }
        @keyframes np-in {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to   { opacity: 1; transform: translate(-50%, 0);    }
        }
      `}</style>
    </div>
  )
}
