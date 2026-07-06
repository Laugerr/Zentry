import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X, Download, Upload, Trash2, Navigation, Check } from 'lucide-react'
import { Button, Card, IconButton, Sheet, Tabs, useToast } from '../components/ui'
import { Logo } from '../components/Logo'
import { useTheme } from '../hooks/useTheme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useSettings } from '../settings/store'
import { formatTemp, formatTime, formatWind, tempUnit, uses12h } from '../settings/format'
import { exportBackup, parseBackup, restoreBackup, resetAll, summarizeData } from '../settings/backup'
import { version } from '../../package.json'

function Row({ title, hint, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-title">{title}</div>
        {hint && <div className="settings-row-hint">{hint}</div>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <Card as="section" padding="none" className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      {children}
    </Card>
  )
}

// ─── City picker (Open-Meteo geocoding — free, no key) ──────────────────────
function CityPicker({ city, onChange }) {
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
          <div className="settings-row-title">{city ? city.name : 'Automatic'}</div>
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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [settings, set] = useSettings()
  const { pref, setPref } = useTheme()
  const { isMobile } = useBreakpoint()
  const toast = useToast()
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // { kind: 'import', parsed } | { kind: 'reset' }
  const [summary, setSummary] = useState(() => summarizeData())

  const onExport = () => {
    const n = exportBackup()
    toast(`Backup saved — ${n} items`, { tone: 'success' })
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending({ kind: 'import', parsed: parseBackup(await file.text()) })
    } catch (err) {
      toast(err.message, { tone: 'danger' })
    }
  }

  const confirm = async () => {
    if (pending.kind === 'import') restoreBackup(pending.parsed.data)
    else await resetAll()
    // Every tool reads its data on load — a reload is the honest way to apply it
    window.location.assign('/home')
  }

  const autoUnits = settings.units === 'auto'
  const autoClock = settings.clock === 'auto'
  const sampleUnits = `${formatTemp(21, settings)} · ${formatWind(12, settings)}`
  const sampleTime  = formatTime(new Date(2026, 0, 1, 18, 45), { settings })

  return (
    <div className="settings-page">
      {!isMobile && <h1 className="settings-title">Settings</h1>}

      <Section title="Appearance">
        <Row title="Theme" hint="Auto follows your device’s light / dark setting.">
          <Tabs label="Theme" value={pref} onChange={setPref} options={[
            { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' },
          ]} />
        </Row>
      </Section>

      <Section title="Units & time">
        <Row title="Temperature" hint={`${autoUnits ? `Auto — ${tempUnit(settings)} for your region. ` : ''}Now: ${sampleUnits}`}>
          <Tabs label="Temperature unit" value={settings.units} onChange={(v) => set({ units: v })} options={[
            { value: 'c', label: '°C' }, { value: 'f', label: '°F' }, { value: 'auto', label: 'Auto' },
          ]} />
        </Row>
        <Row title="Clock" hint={`${autoClock ? `Auto — ${uses12h(settings) ? '12' : '24'}-hour for your region. ` : ''}Now: ${sampleTime}`}>
          <Tabs label="Clock format" value={settings.clock} onChange={(v) => set({ clock: v })} options={[
            { value: '24', label: '24h' }, { value: '12', label: '12h' }, { value: 'auto', label: 'Auto' },
          ]} />
        </Row>
      </Section>

      <Section title="Your city">
        <div className="settings-row-hint" style={{ margin: '-0.25rem 0 0.9rem' }}>Used for the weather on Home.</div>
        <CityPicker city={settings.city} onChange={(city) => {
          set({ city })
          toast(city ? `Weather set to ${city.name}` : 'Weather location: automatic', { tone: 'success' })
        }} />
      </Section>

      <Section title="Your data">
        <div className="settings-row-hint" style={{ margin: '-0.25rem 0 0.4rem' }}>
          Everything stays on this device ({summary.items} items, ~{summary.kb} KB). Back it up to move it to another browser.
        </div>
        <Row title="Export backup" hint="Bookmarks, read history, radio favourites, teams, language decks & streaks, settings.">
          <Button variant="secondary" icon={Download} onClick={() => { onExport(); setSummary(summarizeData()) }}>Export</Button>
        </Row>
        <Row title="Import backup" hint="Replaces what’s on this device. Deck images & audio aren’t included in backups.">
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Import…</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </Row>
        <Row title="Reset everything" hint="Deletes all saved data on this device, including deck media.">
          <Button variant="danger" icon={Trash2} onClick={() => setPending({ kind: 'reset' })}>Reset…</Button>
        </Row>
      </Section>

      <Section title="About">
        <div className="settings-about">
          <Logo size={40} />
          <div>
            <div className="settings-row-title">Zentry <span className="settings-row-hint">v{version}</span></div>
            <div className="settings-row-hint">News, live football, world radio and language practice — one calm dashboard. Made by Lauger.</div>
          </div>
        </div>
      </Section>

      <Sheet open={!!pending} onClose={() => setPending(null)} width={440}
        title={pending?.kind === 'import' ? 'Import backup?' : 'Reset everything?'}
        footer={<>
          <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
          <Button variant={pending?.kind === 'reset' ? 'danger' : 'primary'} icon={pending?.kind === 'reset' ? Trash2 : Check} onClick={confirm}>
            {pending?.kind === 'reset' ? 'Delete everything' : 'Replace & reload'}
          </Button>
        </>}>
        <p className="settings-confirm">
          {pending?.kind === 'import'
            ? <>This backup has <b>{pending.parsed.count} items</b>{pending.parsed.exportedAt ? <> from <b>{new Date(pending.parsed.exportedAt).toLocaleDateString()}</b></> : null}. It will replace the data on this device, then the app reloads.</>
            : <>Bookmarks, favourites, decks, streaks and settings on this device will be permanently deleted. Export a backup first if you might want them back.</>}
        </p>
      </Sheet>
    </div>
  )
}
