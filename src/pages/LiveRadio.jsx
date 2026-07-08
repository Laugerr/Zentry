import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Star, X, Play, Pause, SkipBack, SkipForward, Shuffle, Volume2, VolumeX, Moon,
  SlidersHorizontal, Keyboard, WifiOff, RefreshCw, List as ListIcon, Map as MapIcon,
} from 'lucide-react'
import { useBreakpoint, useMediaQuery } from '../hooks/useBreakpoint'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { useWeather } from '../hooks/useWeather'
import { useSettings } from '../settings/store'
import { Button, Card, IconButton, Sheet, Skeleton, Tabs, useToast } from '../components/ui'
import { EmptyState } from '../components/states'
import { Illustration } from '../components/Illustration'
import { useRadio } from '../radio/radio-context'
import { RadioArt, NowPlayingSheet } from '../radio/NowPlaying'
import { RADIO_LS as LS, readJSON, writeJSON, genreColor, minimalStation, flag, stationMeta } from '../radio/stations'
import { FALLBACK_STATIONS } from '../radio/fallbackStations'
import { RadioMap } from './radio/RadioMap'
import { StationRow, StationTile } from './radio/StationParts'

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

// ─── Data helpers ─────────────────────────────────────────────────────────────

// Zentry's picks, shaped like a Radio Browser result for the current filters
function fallbackStations(genre, country) {
  return FALLBACK_STATIONS
    .filter((s) => (genre === 'all' || s.tags.includes(genre)) && (!country || s.countrycode === country))
    .map((s) => ({ ...s, _lon: s.geo_long, _lat: s.geo_lat, _color: genreColor(s.tags) }))
}

const PAGE = 60 // list rows rendered per "Show more"

function stationStatus(station, radio) {
  return radio.station?.stationuuid === station.stationuuid ? radio.status : undefined
}

// ─── Now playing hero ─────────────────────────────────────────────────────────

function NowPlayingHero({ radio, favourite, onToggleFav, onSurprise, canSurprise, compact }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { station, status, lastStation } = radio

  if (!station) {
    return (
      <Card tone="radio" padding="none" className="radio-hero radio-hero-idle">
        <Illustration name="radio" width={compact ? 96 : 132} />
        <div className="radio-hero-text">
          <div className="radio-hero-kicker">Live radio</div>
          <h2 className="radio-hero-title">Pick a station</h2>
          <p className="radio-hero-sub">Thousands of live stations from around the world. Tap any station, a genre or a dot on the map.</p>
          <div className="radio-hero-actions">
            <Button variant="primary" icon={Shuffle} onClick={onSurprise} disabled={!canSurprise}>Surprise me</Button>
            {lastStation && <Button variant="secondary" icon={Play} onClick={() => radio.play(lastStation)}>Resume {lastStation.name}</Button>}
          </div>
        </div>
      </Card>
    )
  }

  const playing = status === 'playing' || status === 'loading'
  const canSkip = radio.queue.length > 1
  return (
    <Card tone="radio" padding="none" className="radio-hero">
      <RadioArt station={station} status={status} size={compact ? 84 : 132} />
      <div className="radio-hero-text">
        <div className="radio-hero-kicker">
          {status === 'playing' && <span className="badge badge-red"><span className="live-dot" />Live</span>}
          {status === 'loading' && 'Connecting…'}
          {status === 'paused' && 'Paused'}
          {status === 'error' && 'Stream unavailable — skipping…'}
        </div>
        <h2 className="radio-hero-title">{station.name}</h2>
        <p className="radio-hero-sub">{flag(station.countrycode)} {stationMeta(station)}</p>
        <div className="radio-hero-controls">
          <IconButton icon={SkipBack} label="Previous station" variant="secondary" onClick={radio.prev} disabled={!canSkip} />
          <button type="button" className="np-play" style={{ width: 56, height: 56 }} onClick={radio.toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
          <IconButton icon={SkipForward} label="Next station" variant="secondary" onClick={radio.next} disabled={!canSkip} />
          <IconButton icon={Shuffle} label="Shuffle" onClick={radio.shuffle} disabled={!canSkip} />
          <IconButton icon={Star} label={favourite ? 'Remove from favourites' : 'Add to favourites'} active={favourite}
            className={`radio-hero-fav${favourite ? ' on' : ''}`} onClick={() => onToggleFav(station)} />
          {!compact && (
            <div className="radio-hero-volume">
              <IconButton icon={radio.muted ? VolumeX : Volume2} label={radio.muted ? 'Unmute' : 'Mute'} size="sm" onClick={radio.toggleMute} />
              <input type="range" min="0" max="1" step="0.02" aria-label="Volume" value={radio.muted ? 0 : radio.volume}
                onChange={(e) => { radio.setVolume(parseFloat(e.target.value)); if (radio.muted) radio.toggleMute() }} />
            </div>
          )}
          <IconButton icon={radio.sleep ? Moon : SlidersHorizontal} label="Sleep timer & more" onClick={() => setSheetOpen(true)}
            className={radio.sleep ? 'radio-hero-fav on' : ''} />
        </div>
      </div>
      <NowPlayingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Card>
  )
}

// ─── Swipeable browse row ─────────────────────────────────────────────────────

function BrowseRow({ title, stations, radio, onPlay, action }) {
  if (!stations.length) return null
  return (
    <section className="radio-row">
      <div className="radio-row-head">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="radio-row-strip">
        {stations.map((s) => <StationTile key={s.stationuuid} station={s} status={stationStatus(s, radio)} onPlay={onPlay} />)}
      </div>
    </section>
  )
}

const SHORTCUTS = [
  ['Space', 'Play / pause'], ['N', 'Next station'], ['P', 'Previous station'],
  ['S', 'Shuffle'], ['M', 'Mute'], ['↑ / ↓', 'Volume'],
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveRadio() {
  const [genre,   setGenre]   = useState('all')
  const [country, setCountry] = useState('')            // ISO code filter
  const [search,  setSearch]  = useState('')
  const [sort,    setSort]    = useState('popularity')  // popularity | name | bitrate
  const [view,    setView]    = useState('browse')      // phones & tablets: browse | map
  const [shown,   setShown]   = useState(PAGE)
  const [keysOpen, setKeysOpen] = useState(false)
  const [favourites, setFavourites] = useState(() => readJSON(LS.favs, []))
  const { isMobile, isDesktop } = useBreakpoint()
  const touch = useMediaQuery('(pointer: coarse)')
  const [settings] = useSettings()
  const { data: wx } = useWeather()
  const toast = useToast()
  // Playback lives in the app-wide RadioProvider so it survives leaving this
  // page; here we only drive it. Recents / last station are kept there too.
  const radio = useRadio()

  useEffect(() => { writeJSON(LS.favs, favourites) }, [favourites])
  useEffect(() => { setShown(PAGE) }, [genre, country, search, sort])

  // Radio Browser, falling back to Zentry's picks when the directory is down
  const { data, loading, error, refresh } = useCachedFetch(
    `lr:stations:${genre}:${country || 'ww'}`,
    () => fetchStations(genre, country),
    { ttl: 15 * 60_000 },
  )
  const offline  = !!error && !data
  const stations = useMemo(() => data ?? (offline ? fallbackStations(genre, country) : []), [data, offline, genre, country])

  // "Popular in <your country>" — the Settings city wins over IP detection
  const homeCode = useMemo(() => {
    if (settings.city?.country) return stations.find((s) => s.country === settings.city.country)?.countrycode ?? ''
    return wx?.country ?? ''
  }, [settings.city, wx, stations])
  const homeName = settings.city?.country ?? stations.find((s) => s.countrycode === homeCode)?.country ?? ''
  const { data: homeData } = useCachedFetch(
    `lr:stations:${genre}:${homeCode || 'none'}`,
    () => fetchStations(genre, homeCode),
    { ttl: 15 * 60_000, enabled: !!homeCode && !offline && !country },
  )
  const popularHere = useMemo(() => {
    if (!homeCode || country) return []
    return (offline ? fallbackStations(genre, homeCode) : homeData ?? []).slice(0, 12)
  }, [homeCode, country, offline, genre, homeData])

  const favouriteSet = useMemo(() => new Set(favourites.map((f) => f.stationuuid)), [favourites])
  const toggleFav = useCallback((station) => {
    const exists = favouriteSet.has(station.stationuuid)
    setFavourites((prev) => exists
      ? prev.filter((s) => s.stationuuid !== station.stationuuid)
      : [minimalStation(station), ...prev])
    toast(exists ? 'Removed from favourites' : 'Added to favourites', { tone: exists ? 'neutral' : 'success' })
  }, [favouriteSet, toast])

  const countryOptions = useMemo(() => {
    const m = new Map()
    for (const s of stations) {
      if (!s.countrycode) continue
      const cur = m.get(s.countrycode) ?? { code: s.countrycode, name: s.country || s.countrycode, count: 0 }
      cur.count++
      m.set(s.countrycode, cur)
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 60)
  }, [stations])

  const listData = useMemo(() => {
    const q = search.trim().toLowerCase()
    const data = q
      ? stations.filter((s) => s.name.toLowerCase().includes(q) || (s.country || '').toLowerCase().includes(q) || (s.tags || '').toLowerCase().includes(q))
      : [...stations]
    if (sort === 'name')         data.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'bitrate') data.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
    return data // already by popularity
  }, [stations, search, sort])

  const play = useCallback((station, queue = listData) => {
    // The list the station came from becomes the queue for next / previous
    radio.play(station, queue)
    if (!station.stationuuid.startsWith('zentry-')) pingClick(station.stationuuid)
    if (navigator.vibrate) navigator.vibrate(8)
  }, [radio, listData])

  const surprise = () => {
    const pool = listData.slice(0, 50)
    if (pool.length) play(pool[Math.floor(Math.random() * pool.length)], pool)
  }

  // Keyboard shortcuts while a station is loaded (this page only — Space etc.
  // would be surprising elsewhere). Media keys work everywhere via MediaSession.
  useEffect(() => {
    if (!radio.station) return
    const onKey = (e) => {
      if (e.target?.closest?.('input, textarea, select, button, [contenteditable="true"]') && e.key === ' ') return
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

  const mapFocus = useMemo(() => {
    if (!country) return null
    const one = stations.find((s) => s.countrycode === country && Number.isFinite(s._lon))
    return one ? [one._lon, one._lat] : null
  }, [country, stations])

  const genreMeta  = GENRES.find((g) => g.id === genre)
  const browsing   = !search.trim()
  const topLabel   = genre === 'all' ? 'Top worldwide' : `Top ${genreMeta.label}`
  const listTitle  = search.trim() ? `Results for “${search.trim()}”` : country ? `${flag(country)} ${countryOptions.find((c) => c.code === country)?.name ?? country}` : 'All stations'
  const recents    = radio.recents.slice(0, 12)

  const map = (
    <RadioMap stations={stations} activeId={radio.station?.stationuuid} favouriteSet={favouriteSet}
      onPlay={(s) => play(s, stations)} touch={touch} focus={mapFocus} />
  )

  return (
    <div className="radio-page">
      {!isMobile && (
        <div className="radio-head">
          <div>
            <h1 className="radio-title">Radio</h1>
            <p className="radio-subtitle">
              {loading && !data ? 'Loading stations…' : `${stations.length.toLocaleString()} stations${offline ? ' · Zentry’s picks' : ' · live from Radio Browser'}`}
            </p>
          </div>
          {!touch && <IconButton icon={Keyboard} label="Keyboard shortcuts" variant="secondary" onClick={() => setKeysOpen(true)} />}
        </div>
      )}

      {offline && (
        <div className="radio-notice" role="status">
          <WifiOff size={16} aria-hidden="true" />
          <span>The station directory is offline right now — here are Zentry’s hand-picked stations.</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={refresh}>Retry</Button>
        </div>
      )}

      <NowPlayingHero radio={radio} compact={isMobile}
        favourite={!!radio.station && favouriteSet.has(radio.station.stationuuid)} onToggleFav={toggleFav}
        onSurprise={surprise} canSurprise={listData.length > 0} />

      {/* Genres */}
      <div className="chip-row radio-genres" role="group" aria-label="Genre">
        {GENRES.map((g) => (
          <button key={g.id} type="button" aria-pressed={genre === g.id} onClick={() => setGenre(g.id)}
            className={`chip${genre === g.id ? ' active' : ''}`} style={{ '--genre': genreColor(g.id) }}>
            {g.id !== 'all' && <span className="genre-dot" aria-hidden="true" />}{g.label}
          </button>
        ))}
      </div>

      {!isDesktop && (
        <Tabs label="View" block value={view} onChange={setView} options={[
          { value: 'browse', label: 'Browse', icon: ListIcon },
          { value: 'map',    label: 'Map',    icon: MapIcon },
        ]} />
      )}

      <div className={isDesktop ? 'radio-split' : 'radio-single'}>
        {(isDesktop || view === 'browse') && (
          <div className="radio-browse">
            {browsing && (
              <>
                <BrowseRow title="Your favourites" stations={favourites.slice(0, 12)} radio={radio} onPlay={(s) => play(s, favourites)} />
                <BrowseRow title="Recently played" stations={recents} radio={radio} onPlay={(s) => play(s, recents)}
                  action={<button type="button" className="home-more-link" onClick={radio.clearRecents}>Clear</button>} />
                {homeName && <BrowseRow title={`Popular in ${flag(homeCode)} ${homeName}`} stations={popularHere} radio={radio} onPlay={(s) => play(s, popularHere)} />}
                {!country && <BrowseRow title={topLabel} stations={listData.slice(0, 12)} radio={radio} onPlay={(s) => play(s, listData.slice(0, 12))} />}
              </>
            )}

            <section className="radio-all">
              <div className="radio-all-head">
                <h3>{listTitle} <span className="radio-count">{listData.length.toLocaleString()}</span></h3>
              </div>
              <div className="radio-filters">
                <div className="news-search">
                  <Search size={14} className="news-search-icon" aria-hidden="true" />
                  <input className="input" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stations, countries, genres…" aria-label="Search stations" />
                  {search && <IconButton icon={X} label="Clear search" size="sm" className="news-search-clear" onClick={() => setSearch('')} />}
                </div>
                <select className="input radio-select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
                  <option value="">🌍 Worldwide</option>
                  {countryOptions.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name} ({c.count})</option>)}
                </select>
                <select className="input radio-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
                  <option value="popularity">Most popular</option>
                  <option value="name">Name</option>
                  <option value="bitrate">Best quality</option>
                </select>
              </div>

              <div className="radio-list">
                {loading && !data && !offline && [...Array(8)].map((_, i) => <Skeleton key={i} h={58} r={14} />)}
                {!loading && listData.length === 0 && (
                  <EmptyState icon={Search} title="No stations match" hint="Try another genre, country or search." />
                )}
                {listData.slice(0, shown).map((s) => (
                  <StationRow key={s.stationuuid} station={s} status={stationStatus(s, radio)}
                    favourite={favouriteSet.has(s.stationuuid)} onPlay={(st) => play(st)} onToggleFav={toggleFav} />
                ))}
              </div>
              {listData.length > shown && (
                <Button variant="secondary" block onClick={() => setShown((n) => n + PAGE)} style={{ marginTop: '0.75rem' }}>
                  Show more · {(listData.length - shown).toLocaleString()} left
                </Button>
              )}
            </section>
          </div>
        )}

        {(isDesktop || view === 'map') && (
          <div className={isDesktop ? 'radio-map-sticky' : 'radio-map-full'}>{map}</div>
        )}
      </div>

      <Sheet open={keysOpen} onClose={() => setKeysOpen(false)} title="Keyboard shortcuts" width={380}>
        <dl className="radio-keys">
          {SHORTCUTS.map(([k, what]) => (
            <div key={k}><dt><kbd>{k}</kbd></dt><dd>{what}</dd></div>
          ))}
        </dl>
        <p className="settings-row-hint" style={{ marginTop: '0.75rem' }}>Media keys and headphone buttons work on every page.</p>
      </Sheet>
    </div>
  )
}
