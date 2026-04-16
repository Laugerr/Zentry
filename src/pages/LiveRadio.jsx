import { useState, useEffect, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Play, Pause, Square, Volume2, VolumeX, Radio, Loader, AlertCircle, Search, ChevronDown } from 'lucide-react'

// World map topojson (hosted by observable/world-atlas, MIT license)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Radio Browser API mirror list
const RB_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
]

const GENRES = [
  { id: 'all',       label: 'All Genres',  emoji: '📻' },
  { id: 'news',      label: 'News',        emoji: '📰' },
  { id: 'jazz',      label: 'Jazz',        emoji: '🎷' },
  { id: 'classical', label: 'Classical',   emoji: '🎻' },
  { id: 'pop',       label: 'Pop',         emoji: '🎵' },
  { id: 'rock',      label: 'Rock',        emoji: '🎸' },
  { id: 'electronic',label: 'Electronic',  emoji: '🎛️' },
  { id: 'ambient',   label: 'Ambient',     emoji: '🌊' },
  { id: 'talk',      label: 'Talk',        emoji: '🎙️' },
  { id: 'world',     label: 'World',       emoji: '🌍' },
]

// Dot color by genre keyword
function genreColor(tags = '') {
  const t = tags.toLowerCase()
  if (t.includes('news') || t.includes('talk') || t.includes('speech'))  return '#f87171' // red
  if (t.includes('jazz'))                                                   return '#fbbf24' // amber
  if (t.includes('classical') || t.includes('classic'))                    return '#a78bfa' // purple
  if (t.includes('pop') || t.includes('top') || t.includes('hits'))        return '#f472b6' // pink
  if (t.includes('rock') || t.includes('metal') || t.includes('punk'))     return '#fb923c' // orange
  if (t.includes('electronic') || t.includes('techno') || t.includes('house') || t.includes('edm')) return '#22d3ee' // cyan
  if (t.includes('ambient') || t.includes('chillout') || t.includes('lounge')) return '#34d399' // green
  if (t.includes('world') || t.includes('folk') || t.includes('ethnic'))   return '#60a5fa' // blue
  return '#94a3b8' // slate default
}

async function fetchStations(genre) {
  const host = RB_HOSTS[Math.floor(Math.random() * RB_HOSTS.length)]
  const params = new URLSearchParams({
    limit: '600',
    has_geo_info: 'true',
    is_playing: 'true',
    order: 'clickcount',
    reverse: 'true',
    hidebroken: 'true',
    ...(genre !== 'all' ? { tag: genre } : {}),
  })
  const res = await fetch(`${host}/json/stations/search?${params}`, {
    headers: { 'User-Agent': 'ZentryDashboard/1.0' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  // Filter out bad coords and deduplicate by stationuuid
  const seen = new Set()
  return data.filter((s) => {
    if (!s.geo_lat || !s.geo_long) return false
    if (Math.abs(s.geo_lat) > 90 || Math.abs(s.geo_long) > 180) return false
    if (!s.url_resolved && !s.url) return false
    if (seen.has(s.stationuuid)) return false
    seen.add(s.stationuuid)
    return true
  })
}

// ─── Mini player bar ──────────────────────────────────────────────────────────

function PlayerBar({ station, onStop }) {
  const audioRef  = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(false)
  const [muted,   setMuted]     = useState(false)
  const [volume,  setVolume]    = useState(0.8)

  // Reset and load new station whenever it changes
  useEffect(() => {
    setError(false); setLoading(true); setPlaying(false)
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = station.url_resolved || station.url
    audio.volume = volume
    audio.muted  = muted
    const onCanPlay = () => { setLoading(false); audio.play().then(() => setPlaying(true)).catch(() => setError(true)) }
    const onError   = () => { setLoading(false); setError(true) }
    audio.addEventListener('canplay', onCanPlay, { once: true })
    audio.addEventListener('error',   onError,   { once: true })
    audio.load()
    return () => {
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error',   onError)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.stationuuid])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else         { audio.play().then(() => setPlaying(true)).catch(() => setError(true)) }
  }

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    if (v > 0) setMuted(false)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (audioRef.current) audioRef.current.muted = next
  }

  const color = genreColor(station.tags)

  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${color}44`,
      padding: '0.75rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      zIndex: 50,
    }}>
      <audio ref={audioRef} preload="none" />

      {/* Station info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
          background: `${color}22`, border: `1px solid ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading ? <Loader size={16} color={color} style={{ animation: 'spin 0.8s linear infinite' }} />
                   : error   ? <AlertCircle size={16} color="#f87171" />
                              : <Radio size={16} color={color} style={{ animation: playing ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {station.name}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[station.country, station.tags?.split(',')[0]].filter(Boolean).join(' · ')}
          </div>
        </div>
        {error && (
          <span style={{ fontSize: '0.68rem', color: '#f87171', flexShrink: 0 }}>Stream unavailable</span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <button onClick={togglePlay} disabled={loading || error}
          style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${color}66`,
            background: `${color}22`, color, cursor: loading || error ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button onClick={onStop}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Square size={13} />
        </button>

        <button onClick={toggleMute}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume}
          onChange={handleVolume}
          style={{ width: 80, accentColor: color, cursor: 'pointer' }} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveRadio() {
  const [stations,  setStations]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [genre,     setGenre]     = useState('all')
  const [search,    setSearch]    = useState('')
  const [tooltip,   setTooltip]   = useState(null)   // { x, y, station }
  const [active,    setActive]    = useState(null)    // playing station
  const [zoom,      setZoom]      = useState(1)
  const [center,    setCenter]    = useState([0, 20])
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768)
  const [showGenre, setShowGenre] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const load = useCallback(async (g) => {
    setLoading(true); setError(null)
    try {
      const data = await fetchStations(g)
      setStations(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(genre) }, [load, genre])

  // Close genre dropdown on outside click
  useEffect(() => {
    if (!showGenre) return
    const close = () => setShowGenre(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showGenre])

  const filtered = search.trim()
    ? stations.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.country.toLowerCase().includes(search.toLowerCase())
      )
    : stations

  const activeMeta = GENRES.find((g) => g.id === genre)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            📻 Live Radio
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {loading ? 'Loading stations…' : `${filtered.length.toLocaleString()} stations on the map · click any dot to tune in`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.6rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search station or country…"
              style={{
                paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
                color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', width: isMobile ? '100%' : 220,
              }}
            />
          </div>

          {/* Genre dropdown */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowGenre((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '8px',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap',
              }}>
              <span>{activeMeta?.emoji}</span>
              <span>{activeMeta?.label}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: showGenre ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showGenre && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '0.35rem', minWidth: 170,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {GENRES.map((g) => (
                  <button key={g.id}
                    onClick={() => { setGenre(g.id); setShowGenre(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                      padding: '0.45rem 0.65rem', background: genre === g.id ? 'rgba(167,139,250,0.12)' : 'transparent',
                      border: 'none', borderRadius: '7px', color: genre === g.id ? '#a78bfa' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                    }}>
                    <span>{g.emoji}</span><span>{g.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[['−', () => setZoom((z) => Math.max(1, z / 1.5))], ['+', () => setZoom((z) => Math.min(12, z * 1.5))], ['↺', () => { setZoom(1); setCenter([0, 20]) }]].map(([label, fn]) => (
              <button key={label} onClick={fn}
                style={{ width: 30, height: 30, borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {[
          { color: '#f87171', label: 'News/Talk' },
          { color: '#fbbf24', label: 'Jazz' },
          { color: '#a78bfa', label: 'Classical' },
          { color: '#f472b6', label: 'Pop/Hits' },
          { color: '#fb923c', label: 'Rock' },
          { color: '#22d3ee', label: 'Electronic' },
          { color: '#34d399', label: 'Ambient' },
          { color: '#60a5fa', label: 'World' },
          { color: '#94a3b8', label: 'Other' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Map ── */}
      <div ref={mapRef} style={{
        flex: 1, minHeight: isMobile ? 320 : 420, position: 'relative',
        background: 'rgba(10,12,20,0.9)', border: '1px solid var(--border)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 10 }}>
            <div className="spinner" style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading stations from Radio Browser…</span>
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', zIndex: 10 }}>
            <AlertCircle size={24} color="#f87171" />
            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>Failed to load stations: {error}</span>
            <button onClick={() => load(genre)} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}>Retry</button>
          </div>
        )}

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [0, 20] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates }) => { setZoom(z); setCenter(coordinates) }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: '#1e2235', stroke: '#2d3250', strokeWidth: 0.4, outline: 'none' },
                      hover:   { fill: '#252840', stroke: '#3d4270', strokeWidth: 0.4, outline: 'none' },
                      pressed: { fill: '#252840', outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {!loading && filtered.map((station) => {
              const isActive = active?.stationuuid === station.stationuuid
              const color = genreColor(station.tags)
              return (
                <Marker
                  key={station.stationuuid}
                  coordinates={[parseFloat(station.geo_long), parseFloat(station.geo_lat)]}
                  onMouseEnter={(e) => {
                    const rect = mapRef.current?.getBoundingClientRect()
                    setTooltip({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), station })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => { setActive(station); setTooltip(null) }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isActive ? 5 : 3}
                    fill={color}
                    fillOpacity={isActive ? 1 : 0.75}
                    stroke={isActive ? '#fff' : color}
                    strokeWidth={isActive ? 1.5 : 0.5}
                    style={{ transition: 'r 0.2s' }}
                  />
                  {isActive && (
                    <circle r={9} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5}
                      style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
                  )}
                </Marker>
              )
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, (mapRef.current?.offsetWidth ?? 400) - 200),
            top:  Math.max(tooltip.y - 60, 8),
            pointerEvents: 'none', zIndex: 100,
            background: 'rgba(10,12,20,0.95)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.5rem 0.75rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            maxWidth: 200,
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
              {tooltip.station.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {tooltip.station.country}
              {tooltip.station.tags && <> · {tooltip.station.tags.split(',')[0]}</>}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#a78bfa', marginTop: '0.25rem' }}>Click to play</div>
          </div>
        )}
      </div>

      {/* ── Player bar ── */}
      {active && (
        <PlayerBar station={active} onStop={() => setActive(null)} />
      )}

      {/* Pulse ring keyframe (injected once) */}
      <style>{`
        @keyframes pulse-ring {
          0%   { r: 6;  stroke-opacity: 0.6; }
          100% { r: 14; stroke-opacity: 0;   }
        }
      `}</style>
    </div>
  )
}
