import { useRef, useState } from 'react'
import { Download, Upload, Trash2, Check, ArrowUp, ArrowDown, RotateCcw, Sparkles } from 'lucide-react'
import { Button, Card, IconButton, Sheet, Switch, Tabs, useToast } from '../components/ui'
import { Logo } from '../components/Logo'
import { CityPicker } from '../components/CityPicker'
import { useWeather } from '../hooks/useWeather'
import { requestOnboarding } from '../onboarding/state'
import { InstallSection } from '../pwa/InstallUI'
import { useTheme } from '../hooks/useTheme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useSettings } from '../settings/store'
import { formatTemp, formatTime, formatWind, tempUnit, uses12h } from '../settings/format'
import { exportBackup, parseBackup, restoreBackup, resetAll, summarizeData } from '../settings/backup'
import { resolveLayout, WIDGET_BY_ID } from '../home/widgets'
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

// ─── Home layout: show / hide + reorder ──────────────────────────────────────
// ↑ / ↓ buttons rather than drag-and-drop: they work the same with touch,
// mouse, keyboard and screen readers.
function HomeLayoutEditor({ value, onChange }) {
  const layout = resolveLayout(value)
  const move = (i, dir) => {
    const next = [...layout]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    onChange(next)
  }
  const toggle = (i, on) => onChange(layout.map((w, j) => (j === i ? { ...w, on } : w)))

  return (
    <ol className="widget-list">
      {layout.map((w, i) => {
        const meta = WIDGET_BY_ID[w.id]
        return (
          <li key={w.id} className={`widget-row${w.on ? '' : ' is-off'}`}>
            <div className="widget-order">
              <IconButton icon={ArrowUp} label={`Move ${meta.label} up`} size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label={`Move ${meta.label} down`} size="sm" disabled={i === layout.length - 1} onClick={() => move(i, 1)} />
            </div>
            <div className="settings-row-text" style={{ flex: 1 }}>
              <div className="settings-row-title">{meta.label}</div>
              <div className="settings-row-hint">{meta.hint}</div>
            </div>
            <Switch checked={w.on} label={`Show ${meta.label}`} onChange={(on) => toggle(i, on)} />
          </li>
        )
      })}
    </ol>
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
  const { data: wx } = useWeather()

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

      <Section title="Home">
        <div className="settings-row-hint" style={{ margin: '-0.25rem 0 0.75rem' }}>
          Choose which widgets Home shows, and in what order. The greeting always comes first.
        </div>
        <HomeLayoutEditor value={settings.homeWidgets} onChange={(homeWidgets) => set({ homeWidgets })} />
        {settings.homeWidgets && (
          <Button size="sm" variant="ghost" icon={RotateCcw} style={{ marginTop: '0.75rem' }}
            onClick={() => { set({ homeWidgets: null }); toast('Home layout reset') }}>
            Reset layout
          </Button>
        )}
      </Section>

      <Section title="Your city">
        <div className="settings-row-hint" style={{ margin: '-0.25rem 0 0.9rem' }}>Used for the weather on Home.</div>
        <CityPicker city={settings.city} detected={wx?.city} onChange={(city) => {
          set({ city })
          toast(city ? `Weather set to ${city.name}` : 'Weather location: automatic', { tone: 'success' })
        }} />
      </Section>

      <Section title="Install app">
        <InstallSection />
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
        <Row title="Setup" hint="Walk through the welcome, your city and your teams again.">
          <Button variant="secondary" icon={Sparkles} onClick={requestOnboarding}>Run setup again</Button>
        </Row>
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
