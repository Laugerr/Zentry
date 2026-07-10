import { useMemo, useState } from 'react'
import { MapPin, Navigation, Plus, X, Wind, Droplets, Sun, Sunrise, Gauge, Eye, Umbrella, RefreshCw } from 'lucide-react'
import { Button, Card, IconButton, Sheet, Skeleton, useToast } from '../components/ui'
import { InlineError } from '../components/states'
import { CityPicker } from '../components/CityPicker'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useSettings } from '../settings/store'
import { formatTemp, formatTime, formatWind, usesFahrenheit } from '../settings/format'
import { fetchForecast, rainAlert, uvLabel, compass, wmo } from '../weather/forecast'
import './weather.css'

const MAX_CITIES = 5

// The user's own place: Settings city, else IP-based (cached for an hour)
async function fetchIpPlace({ signal }) {
  const r = await fetch('https://ipinfo.io/json', { signal })
  if (!r.ok) throw new Error('geo')
  const { loc, city, country } = await r.json()
  const [lat, lon] = (loc ?? '').split(',').map(Number)
  if (!Number.isFinite(lat)) throw new Error('loc')
  return { name: city || 'Your location', country: country ?? '', lat, lon }
}

// Open-Meteo local time string ("2026-10-12T15:00") → formatted clock time
const localTime = (iso, settings) => formatTime(new Date(`${iso}:00Z`), { timeZone: 'UTC', settings })
const dayName = (iso, i) => (i === 0 ? 'Today' : new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }))

// ─── Pieces ───────────────────────────────────────────────────────────────────

function TempCurve({ hours }) {
  if (hours.length < 2) return null
  const temps = hours.map((h) => h.temp)
  const lo = Math.min(...temps), hi = Math.max(...temps), span = hi - lo || 1
  const W = 100 * hours.length, H = 44
  const pts = temps.map((t, i) => [i * 100 + 50, 6 + (1 - (t - lo) / span) * (H - 12)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="wx-curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${pts.at(-1)[0]},${H} L${pts[0][0]},${H} Z`} className="wx-curve-fill" />
      <path d={d} className="wx-curve-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function DayRow({ day, i, weekLo, weekHi, settings }) {
  const span = weekHi - weekLo || 1
  const left = ((day.min - weekLo) / span) * 100
  const width = Math.max(6, ((day.max - day.min) / span) * 100)
  const w = wmo(day.code)
  return (
    <li className="wx-day">
      <span className="wx-day-name">{dayName(day.date, i)}</span>
      <span className="wx-day-icon" title={w.label} aria-label={w.label}>{w.icon}</span>
      <span className={`wx-day-rain${day.rain >= 30 ? '' : ' is-low'}`}>{day.rain >= 10 ? `${day.rain}%` : ''}</span>
      <span className="wx-day-min">{formatTemp(day.min, settings)}</span>
      <span className="wx-range" aria-hidden="true"><i style={{ left: `${left}%`, width: `${width}%` }} /></span>
      <span className="wx-day-max">{formatTemp(day.max, settings)}</span>
    </li>
  )
}

function Tile({ icon: Icon, label, value, sub, children }) {
  return (
    <Card padding="none" className="wx-tile">
      <div className="wx-tile-label"><Icon size={14} aria-hidden="true" /> {label}</div>
      <div className="wx-tile-value">{value}</div>
      {children}
      {sub && <div className="wx-tile-sub">{sub}</div>}
    </Card>
  )
}

// Sun position along the day (sunrise → sunset) as a dot on an arc
function SunArc({ sunrise, sunset, now }) {
  const t = (s) => new Date(`${s}:00Z`).getTime()
  const p = Math.min(1, Math.max(0, (t(now) - t(sunrise)) / (t(sunset) - t(sunrise))))
  const x = 10 + p * 80, y = 42 - Math.sin(p * Math.PI) * 32
  return (
    <svg viewBox="0 0 100 48" className="wx-sun-arc" aria-hidden="true">
      <path d="M10 42 Q50 -22 90 42" className="wx-sun-path" />
      <line x1="4" y1="42" x2="96" y2="42" className="wx-sun-horizon" />
      {p > 0 && p < 1 && <circle cx={x} cy={y} r="5" className="wx-sun-dot" />}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Weather() {
  const [settings, set] = useSettings()
  const { isMobile } = useBreakpoint()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState('home') // 'home' | saved index
  const saved = settings.weatherCities ?? []

  const ip = useCachedFetch('weather:ip-place', fetchIpPlace, { ttl: 60 * 60_000, enabled: !settings.city })
  const home = settings.city ?? ip.data
  const place = selected === 'home' ? home : saved[selected] ?? home

  const key = place ? `weather:forecast:${place.lat.toFixed(2)},${place.lon.toFixed(2)}` : null
  const fc = useCachedFetch(key, ({ signal }) => fetchForecast(place.lat, place.lon, { signal }), { ttl: 10 * 60_000, enabled: !!place })
  const data = fc.data

  const addCity = (city) => {
    if (!city) return
    if (saved.some((c) => c.lat === city.lat && c.lon === city.lon)) { setAdding(false); return }
    const next = [...saved, city].slice(-MAX_CITIES)
    set({ weatherCities: next })
    setSelected(next.length - 1)
    setAdding(false)
    toast(`Added ${city.name}`, { tone: 'success' })
  }
  const removeCity = (i) => {
    set({ weatherCities: saved.filter((_, j) => j !== i) })
    setSelected('home')
  }

  const alert = useMemo(() => (data ? rainAlert(data.hours) : null), [data])
  const today = data?.days[0]
  const weekLo = data ? Math.min(...data.days.map((d) => d.min)) : 0
  const weekHi = data ? Math.max(...data.days.map((d) => d.max)) : 0
  const now = data ? wmo(data.current.code, data.current.isDay) : null
  const visibility = data && (usesFahrenheit(settings)
    ? `${(data.current.visibility / 1609).toFixed(1)} mi`
    : `${(data.current.visibility / 1000).toFixed(1)} km`)

  return (
    <div className="wx-page">
      {!isMobile && <h1 className="wx-title">Weather</h1>}

      {/* Places */}
      <div className="chip-row" role="group" aria-label="Place">
        <button type="button" aria-pressed={selected === 'home'} className={`chip${selected === 'home' ? ' active' : ''}`} onClick={() => setSelected('home')}>
          <Navigation size={13} aria-hidden="true" /> {home?.name ?? 'Your location'}
        </button>
        {saved.map((c, i) => (
          <span key={`${c.lat},${c.lon}`} className={`chip wx-place${selected === i ? ' active' : ''}`}>
            <button type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}><MapPin size={13} aria-hidden="true" /> {c.name}</button>
            <button type="button" className="wx-place-x" aria-label={`Remove ${c.name}`} onClick={() => removeCity(i)}><X size={12} /></button>
          </span>
        ))}
        {saved.length < MAX_CITIES && (
          <button type="button" className="chip" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" /> Add city</button>
        )}
      </div>

      {(fc.error || ip.error) && !data && (
        <Card padding="none"><InlineError message="Couldn’t load the forecast." onRetry={fc.refresh} /></Card>
      )}

      {!data && !fc.error && !ip.error && (
        <div className="wx-loading"><Skeleton h={220} r={24} /><Skeleton h={150} r={24} /><Skeleton h={320} r={24} /></div>
      )}

      {data && (
        <>
          {/* Hero */}
          <section className={`wx-hero sky-${now.sky}${data.current.isDay ? '' : ' is-night'}`}>
            <div className="wx-hero-main">
              <div className="wx-hero-place"><MapPin size={14} aria-hidden="true" /> {place.name}{place.country ? `, ${place.country}` : ''}</div>
              <div className="wx-hero-temp">{formatTemp(data.current.temp, settings)}</div>
              <div className="wx-hero-cond">{now.label}</div>
              <div className="wx-hero-meta">
                H {formatTemp(today.max, settings)} · L {formatTemp(today.min, settings)} · Feels like {formatTemp(data.current.feels, settings)}
              </div>
            </div>
            <div className="wx-hero-icon" aria-hidden="true">{now.icon}</div>
            <IconButton icon={RefreshCw} label="Refresh forecast" size="sm" className="wx-hero-refresh" onClick={fc.refresh} />
          </section>

          {alert && (
            <div className="wx-alert" role="status">
              <Umbrella size={18} aria-hidden="true" />
              <span>{alert.now ? <>Rain likely <b>right now</b> ({alert.hour.rain}%).</> : <>Rain likely around <b>{localTime(alert.hour.time, settings)}</b> ({alert.hour.rain}% chance).</>} Take an umbrella.</span>
            </div>
          )}

          {/* Next 24 hours */}
          <Card padding="none" className="wx-card">
            <h2 className="wx-card-title">Next 24 hours</h2>
            <div className="wx-hours-scroll">
              <div className="wx-hours" style={{ '--n': data.hours.length }}>
                <TempCurve hours={data.hours} />
                {data.hours.map((h, i) => {
                  const w = wmo(h.code, h.isDay)
                  return (
                    <div key={h.time} className="wx-hour">
                      <span className="wx-hour-time">{i === 0 ? 'Now' : localTime(h.time, settings)}</span>
                      <span className="wx-hour-icon" title={w.label} aria-label={w.label}>{w.icon}</span>
                      <span className="wx-hour-temp">{formatTemp(h.temp, settings)}</span>
                      <span className={`wx-hour-rain${h.rain >= 30 ? '' : ' is-low'}`}><Droplets size={10} aria-hidden="true" />{h.rain}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          <div className="wx-split">
            {/* 7 days */}
            <Card padding="none" className="wx-card">
              <h2 className="wx-card-title">7-day forecast</h2>
              <ul className="wx-days">
                {data.days.map((d, i) => <DayRow key={d.date} day={d} i={i} weekLo={weekLo} weekHi={weekHi} settings={settings} />)}
              </ul>
            </Card>

            {/* Details */}
            <div className="wx-tiles">
              <Tile icon={Wind} label="Wind" value={formatWind(data.current.wind, settings)} sub={`From the ${compass(data.current.windDir)}`}>
                <span className="wx-wind-arrow" style={{ transform: `rotate(${data.current.windDir + 180}deg)` }} aria-hidden="true">↑</span>
              </Tile>
              <Tile icon={Droplets} label="Humidity" value={`${data.current.humidity}%`} sub={data.current.humidity > 80 ? 'Very humid' : data.current.humidity < 30 ? 'Dry' : 'Comfortable'} />
              <Tile icon={Sun} label="UV index" value={today.uv != null ? Math.round(today.uv) : '—'} sub={`${uvLabel(today.uv)} today`}>
                <span className="wx-uv-bar" aria-hidden="true"><i style={{ left: `${Math.min(100, ((today.uv ?? 0) / 11) * 100)}%` }} /></span>
              </Tile>
              <Tile icon={Sunrise} label="Sun" value={localTime(today.sunrise, settings)} sub={`Sunset ${localTime(today.sunset, settings)}`}>
                <SunArc sunrise={today.sunrise} sunset={today.sunset} now={data.localNow} />
              </Tile>
              <Tile icon={Gauge} label="Pressure" value={`${Math.round(data.current.pressure)} hPa`} sub={data.current.pressure < 1005 ? 'Low — unsettled' : data.current.pressure > 1020 ? 'High — settled' : 'Normal'} />
              <Tile icon={Eye} label="Visibility" value={visibility} sub={data.current.visibility < 2000 ? 'Poor' : data.current.visibility < 8000 ? 'Moderate' : 'Clear'} />
            </div>
          </div>
          <p className="wx-source">Forecast by Open-Meteo · times in {data.timezone.replace('_', ' ')}</p>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a city" width={460}>
        <CityPicker city={null} onChange={addCity} searchOnly />
      </Sheet>
    </div>
  )
}
