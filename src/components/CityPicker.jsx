import { useEffect, useState } from 'react'
import { MapPin, Search, X, Navigation } from 'lucide-react'
import { Button, IconButton } from './ui'

// ─── City picker (Open-Meteo geocoding — free, no key) ──────────────────────
// Shared by Settings and first-run setup. `detected` (optional) is the
// IP-based city, shown while no city has been chosen.
export function CityPicker({ city, onChange, detected }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [state, setState]     = useState('idle') // idle | loading | error

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setState('idle'); return }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setState('loading')
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`, { signal: ctrl.signal })
        const json = await res.json()
        setResults(json.results ?? [])
        setState('idle')
      } catch (e) { if (e.name !== 'AbortError') setState('error') }
    }, 300)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [query])

  const pick = (r) => {
    onChange({ name: r.name, admin: r.admin1 ?? '', country: r.country ?? '', lat: r.latitude, lon: r.longitude })
    setQuery(''); setResults([])
  }

  return (
    <div className="city-picker">
      <div className="city-current">
        <span className="nav-chip nav-chip-neutral" style={{ width: 36, height: 36 }} aria-hidden="true">
          {city ? <MapPin size={17} /> : <Navigation size={17} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="settings-row-title">{city ? city.name : detected ? `Automatic · ${detected}` : 'Automatic'}</div>
          <div className="settings-row-hint">{city ? [city.admin, city.country].filter(Boolean).join(', ') : 'Detected from your connection — can be off on VPN or mobile data'}</div>
        </div>
        {city && <Button size="sm" variant="secondary" onClick={() => onChange(null)}>Use automatic</Button>}
      </div>

      <div className="news-search city-search">
        <Search size={14} className="news-search-icon" aria-hidden="true" />
        <input className="input" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city…" aria-label="Search a city" autoComplete="off" />
        {query && <IconButton icon={X} label="Clear" size="sm" className="news-search-clear" onClick={() => setQuery('')} />}
      </div>

      {(results.length > 0 || state !== 'idle' || query.trim().length >= 2) && (
        <div className="city-results" role="listbox" aria-label="Cities">
          {state === 'loading' && results.length === 0 && <div className="settings-row-hint" style={{ padding: '0.6rem 0.75rem' }}>Searching…</div>}
          {state === 'error' && <div className="settings-row-hint" style={{ padding: '0.6rem 0.75rem' }}>Couldn’t search right now — try again.</div>}
          {state === 'idle' && results.length === 0 && query.trim().length >= 2 && <div className="settings-row-hint" style={{ padding: '0.6rem 0.75rem' }}>No cities found.</div>}
          {results.map((r) => (
            <button key={r.id} type="button" role="option" aria-selected="false" className="nav-item" onClick={() => pick(r)}>
              <MapPin size={15} aria-hidden="true" />
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.name}</span>
                <span className="settings-row-hint"> · {[r.admin1, r.country].filter(Boolean).join(', ')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
