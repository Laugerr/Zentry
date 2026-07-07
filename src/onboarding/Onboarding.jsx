import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MapPin, Search, X, Newspaper, Trophy, Radio, BookOpen } from 'lucide-react'
import { Button, IconButton, Sheet, Tabs, useToast } from '../components/ui'
import { Logo } from '../components/Logo'
import { CityPicker } from '../components/CityPicker'
import { useTheme } from '../hooks/useTheme'
import { useWeather } from '../hooks/useWeather'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { useSettings } from '../settings/store'
import { readFavTeamIds, writeFavTeamIds } from '../settings/favTeams'
import { needsOnboarding, markOnboarded, ONBOARDING_EVENT } from './state'
import { POPULAR_TEAMS, fetchAllTeams, searchTeams } from './teams'

const STEPS = ['welcome', 'city', 'teams']

const TOOLS = [
  { tone: 'news',     icon: Newspaper, title: 'News',     text: 'Live headlines from 30+ countries' },
  { tone: 'football', icon: Trophy,    title: 'Football', text: 'Scores, fixtures & your teams' },
  { tone: 'radio',    icon: Radio,     title: 'Radio',    text: 'Thousands of stations, worldwide' },
  { tone: 'language', icon: BookOpen,  title: 'Language', text: 'Flashcards & a daily streak' },
]

function Dots({ step }) {
  return (
    <div className="ob-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'done' : ''} />)}
    </div>
  )
}

function WelcomeStep() {
  const { pref, setPref } = useTheme()
  return (
    <div className="ob-step">
      <Logo size={56} />
      <h2 className="ob-title">Your day, in one place.</h2>
      <p className="ob-text">Zentry brings your news, football, radio and language practice into one calm dashboard. Two quick questions and it’s yours.</p>
      <div className="ob-tools">
        {TOOLS.map(({ tone, icon: Icon, title, text }) => (
          <div key={tone} className={`ob-tool card-tone-${tone}`}>
            <span className={`nav-chip nav-chip-${tone}`} style={{ width: 32, height: 32 }} aria-hidden="true"><Icon size={17} /></span>
            <div><div className="ob-tool-title">{title}</div><div className="ob-tool-text">{text}</div></div>
          </div>
        ))}
      </div>
      <div className="ob-theme">
        <span>Theme</span>
        <Tabs label="Theme" size="sm" value={pref} onChange={setPref} options={[
          { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' },
        ]} />
      </div>
    </div>
  )
}

function CityStep({ onNext }) {
  const [settings, set] = useSettings()
  const { data: wx, loading } = useWeather()
  const [changing, setChanging] = useState(false)
  const detected = wx?.city

  return (
    <div className="ob-step">
      <span className="nav-chip nav-chip-news" style={{ width: 52, height: 52 }} aria-hidden="true"><MapPin size={26} /></span>
      <h2 className="ob-title">Where are you?</h2>
      <p className="ob-text">For the weather on Home. You can change it any time in Settings.</p>
      {!changing && !settings.city ? (
        <div className="ob-detected">
          {loading && !wx ? <span className="ob-text">Finding your city…</span> : detected ? (
            <>
              <div className="ob-detected-city">Looks like you’re in <b>{detected}</b></div>
              <div className="ob-row">
                <Button variant="primary" icon={Check} onClick={onNext}>Looks right</Button>
                <Button variant="secondary" onClick={() => setChanging(true)}>Change</Button>
              </div>
            </>
          ) : (
            <Button variant="secondary" icon={Search} onClick={() => setChanging(true)}>Search your city</Button>
          )}
        </div>
      ) : (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <CityPicker city={settings.city} detected={detected} onChange={(city) => set({ city })} />
        </div>
      )}
    </div>
  )
}

function TeamsStep({ selected, setSelected }) {
  const [query, setQuery] = useState('')
  const { data: catalog, loading } = useCachedFetch('onboarding:teams', fetchAllTeams, { ttl: 24 * 3600_000 })
  const byId = useMemo(() => {
    const m = new Map(POPULAR_TEAMS.map((t) => [t.id, t]))
    for (const t of catalog ?? []) m.set(t.id, t)
    return m
  }, [catalog])
  const results = searchTeams(catalog ?? [], query)
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <div className="ob-step">
      <span className="nav-chip nav-chip-football" style={{ width: 52, height: 52 }} aria-hidden="true"><Trophy size={26} /></span>
      <h2 className="ob-title">Who do you support?</h2>
      <p className="ob-text">Their live scores and next matches go on Home. Pick a few, or skip.</p>

      <div className="ob-popular" role="group" aria-label="Popular clubs">
        {POPULAR_TEAMS.map((t) => {
          const on = selected.includes(t.id)
          return (
            <button key={t.id} type="button" aria-pressed={on} className={`ob-club${on ? ' on' : ''}`} onClick={() => toggle(t.id)}>
              <img src={t.logo} alt="" loading="lazy" />
              <span>{t.name}</span>
              {on && <span className="ob-club-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
            </button>
          )
        })}
      </div>

      <div className="news-search city-search" style={{ width: '100%' }}>
        <Search size={14} className="news-search-icon" aria-hidden="true" />
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={loading && !catalog ? 'Loading clubs…' : 'Search any club…'} aria-label="Search clubs" autoComplete="off" />
        {query && <IconButton icon={X} label="Clear" size="sm" className="news-search-clear" onClick={() => setQuery('')} />}
      </div>
      {results.length > 0 && (
        <div className="city-results" style={{ width: '100%' }}>
          {results.map((t) => {
            const on = selected.includes(t.id)
            return (
              <button key={t.id} type="button" aria-pressed={on} className="nav-item" onClick={() => toggle(t.id)}>
                <img src={t.logo} alt="" width={22} height={22} loading="lazy" />
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.name}</span>
                  <span className="settings-row-hint"> · {t.league}</span>
                </span>
                {on && <Check size={16} style={{ color: 'var(--tool-football)' }} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
      {query.trim().length >= 2 && !loading && results.length === 0 && <div className="settings-row-hint">No clubs found.</div>}

      {selected.length > 0 && (
        <div className="ob-selected" aria-label="Your teams">
          {selected.map((id) => {
            const t = byId.get(id)
            return (
              <button key={id} type="button" className="chip chip-sm active" onClick={() => toggle(id)} aria-label={`Remove ${t?.name ?? 'team'}`}>
                {t?.logo && <img src={t.logo} alt="" width={16} height={16} />}
                {t?.short ?? t?.name ?? 'Team'} <X size={12} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// First-run setup. Opens by itself for brand-new visitors; Settings can
// reopen it. Closing at any point (Skip / ✕ / Esc) counts as done.
export function Onboarding() {
  const [open, setOpen]         = useState(() => needsOnboarding())
  const [step, setStep]         = useState(0)
  const [selected, setSelected] = useState(() => readFavTeamIds())
  const toast = useToast()

  useEffect(() => {
    const reopen = () => { setStep(0); setSelected(readFavTeamIds()); setOpen(true) }
    window.addEventListener(ONBOARDING_EVENT, reopen)
    return () => window.removeEventListener(ONBOARDING_EVENT, reopen)
  }, [])

  const close = () => { markOnboarded(); setOpen(false) }
  const finish = () => {
    writeFavTeamIds(selected)
    close()
    toast('You’re all set — welcome to Zentry', { tone: 'success' })
  }
  const last = step === STEPS.length - 1

  return (
    <Sheet open={open} onClose={close} width={540} title="Set up Zentry"
      footer={
        <div className="ob-footer">
          {step > 0
            ? <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>
            : <Button variant="ghost" onClick={close}>Skip</Button>}
          <Dots step={step} />
          {last
            ? <Button variant="primary" icon={Check} onClick={finish}>Done</Button>
            : <Button variant="primary" iconRight={ArrowRight} onClick={() => setStep(step + 1)}>Next</Button>}
        </div>
      }>
      {STEPS[step] === 'welcome' && <WelcomeStep />}
      {STEPS[step] === 'city' && <CityStep onNext={() => setStep(step + 1)} />}
      {STEPS[step] === 'teams' && <TeamsStep selected={selected} setSelected={setSelected} />}
    </Sheet>
  )
}
