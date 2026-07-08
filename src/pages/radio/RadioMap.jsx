import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Plus, Minus, LocateFixed, X, Play } from 'lucide-react'
import { IconButton } from '../../components/ui'
import { StationArt } from './StationParts'
import { flag, stationMeta } from '../../radio/stations'

// World map topojson (hosted by observable/world-atlas, MIT license)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// World view framing — must match the projection centre or the map drifts
const HOME = [0, 20]

// Radii tuned so the world view isn't a pixel flood — ZoomableGroup scales
// markers with its transform, so zooming in already grows them.
const R_DEFAULT = 2.2
const R_FAV     = 2.8
const R_ACTIVE  = 4

// Only re-renders when its own state changes — hovering one dot must not
// re-render 1,500 others.
const StationMarker = memo(function StationMarker({ station, isActive, isFav, onEnter, onLeave, onSelect }) {
  return (
    <Marker
      coordinates={[station._lon, station._lat]}
      onMouseEnter={(e) => onEnter(e, station)}
      onMouseLeave={onLeave}
      onClick={() => onSelect(station)}
      style={{ default: { cursor: 'pointer' }, hover: { cursor: 'pointer' }, pressed: { cursor: 'pointer' } }}
    >
      {isActive && <circle r={8} className="map-pulse" />}
      <circle
        r={isActive ? R_ACTIVE : isFav ? R_FAV : R_DEFAULT}
        fill={isActive ? 'var(--tool-radio)' : station._color}
        fillOpacity={isActive ? 1 : isFav ? 0.95 : 0.75}
        stroke={isActive ? '#fff' : isFav ? 'var(--warning)' : 'none'}
        strokeWidth={isActive ? 1 : 0.7}
      />
    </Marker>
  )
})

// Interactive station map. Desktop: hover for details, click to play.
// Touch: tap a dot to preview it in a card with a Play button (no
// accidental playback while panning).
export function RadioMap({ stations, activeId, favouriteSet, onPlay, touch, focus }) {
  const ref = useRef(null)
  const [zoom, setZoom]         = useState(1)
  const [center, setCenter]     = useState(HOME)
  const [tooltip, setTooltip]   = useState(null)
  const [selected, setSelected] = useState(null)

  // Fly to a country when the country filter changes; back out when cleared
  useEffect(() => {
    if (focus) { setCenter(focus); setZoom(4) } else { setCenter(HOME); setZoom(1) }
  }, [focus])

  // Zoom-adaptive thinning: at world view keep the most popular station per
  // coarse lat/lon cell. Active + favourites always stay visible.
  const markers = useMemo(() => {
    const capped = stations.slice(0, 1500)
    if (zoom >= 3) return capped
    const cell = zoom < 1.3 ? 4 : zoom < 2 ? 2 : 1
    const grid = new Map()
    const pinned = []
    for (const s of capped) {
      if (s.stationuuid === activeId || favouriteSet.has(s.stationuuid)) { pinned.push(s); continue }
      const k = `${Math.round(s._lat / cell)}|${Math.round(s._lon / cell)}`
      const cur = grid.get(k)
      if (!cur || (s.clickcount || 0) > (cur.clickcount || 0)) grid.set(k, s)
    }
    return [...grid.values(), ...pinned]
  }, [stations, zoom, activeId, favouriteSet])

  const onEnter = useCallback((e, station) => {
    if (touch) return
    const rect = ref.current?.getBoundingClientRect()
    setTooltip({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), station })
  }, [touch])
  const onLeave  = useCallback(() => setTooltip(null), [])
  const onSelect = useCallback((station) => {
    if (touch) setSelected(station)
    else { setTooltip(null); onPlay(station) }
  }, [touch, onPlay])

  return (
    <div ref={ref} className="radio-map">
      {/* Square canvas: the Mercator world (±85°) is about as tall as it is wide */}
      <ComposableMap projection="geoMercator" width={800} height={800} projectionConfig={{ scale: 126 }} style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup zoom={zoom} center={center} minZoom={1} maxZoom={14}
          onMoveEnd={({ zoom: z, coordinates }) => { setZoom(z); setCenter(coordinates) }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) => geographies.map((geo) => (
              <Geography key={geo.rsmKey} geography={geo} style={{
                default: { fill: 'var(--map-land)', stroke: 'var(--map-stroke)', strokeWidth: 0.4, outline: 'none' },
                hover:   { fill: 'var(--map-land-hover)', stroke: 'var(--map-stroke)', strokeWidth: 0.4, outline: 'none' },
                pressed: { fill: 'var(--map-land-hover)', outline: 'none' },
              }} />
            ))}
          </Geographies>
          {markers.map((s) => (
            <StationMarker key={s.stationuuid} station={s}
              isActive={s.stationuuid === activeId} isFav={favouriteSet.has(s.stationuuid)}
              onEnter={onEnter} onLeave={onLeave} onSelect={onSelect} />
          ))}
        </ZoomableGroup>
      </ComposableMap>

      <div className="radio-map-zoom">
        <IconButton icon={Plus} label="Zoom in" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.min(14, z * 1.6))} />
        <IconButton icon={Minus} label="Zoom out" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.max(1, z / 1.6))} />
        <IconButton icon={LocateFixed} label="Reset map" variant="secondary" size="sm" onClick={() => { setZoom(1); setCenter(HOME) }} />
      </div>

      {tooltip && (
        <div className="radio-map-tip" style={{
          left: Math.min(tooltip.x + 14, (ref.current?.offsetWidth ?? 400) - 240),
          top: Math.max(tooltip.y - 70, 8),
        }}>
          <div className="station-name">{tooltip.station.name}</div>
          <div className="station-meta">{flag(tooltip.station.countrycode)} {stationMeta(tooltip.station)}</div>
          <div className="radio-map-tip-hint">Click to play</div>
        </div>
      )}

      {selected && (
        <div className="radio-map-card" role="dialog" aria-label={selected.name}>
          <StationArt station={selected} size={48} status={selected.stationuuid === activeId ? 'playing' : undefined} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="station-name">{selected.name}</div>
            <div className="station-meta">{flag(selected.countrycode)} {stationMeta(selected)}</div>
          </div>
          <button type="button" className="np-play" style={{ width: 44, height: 44, boxShadow: 'none' }}
            onClick={() => { onPlay(selected); setSelected(null) }} aria-label={`Play ${selected.name}`}>
            <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />
          </button>
          <IconButton icon={X} label="Close" size="sm" onClick={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
