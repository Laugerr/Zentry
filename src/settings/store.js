import { useSyncExternalStore } from 'react'

// App settings — one tiny external store so any component (or plain helper,
// like a kickoff-time formatter) can read them, and every subscriber
// re-renders when they change. Persisted to localStorage; other tabs follow
// along via the `storage` event.
//
// theme: 'auto' | 'light' | 'dark'   (own key — index.html reads it before paint)
// units: 'auto' | 'c' | 'f'          temperature (+ wind: km/h or mph)
// clock: 'auto' | '24' | '12'
// city:  null (detect by IP) | { name, admin, country, lat, lon }

const KEY       = 'zentry:settings:v1'
const THEME_KEY = 'zentry:theme'
const DEFAULTS  = { units: 'auto', clock: 'auto', city: null }

function load() {
  let saved = {}
  let theme = 'auto'
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {} } catch { /* ignore */ }
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark' || t === 'auto') theme = t
  } catch { /* ignore */ }
  return { ...DEFAULTS, ...saved, theme }
}

let state = load()
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export const settingsStore = {
  get: () => state,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  set(patch) {
    state = { ...state, ...patch }
    const { theme, ...rest } = state
    try {
      localStorage.setItem(KEY, JSON.stringify(rest))
      localStorage.setItem(THEME_KEY, theme)
    } catch { /* ignore */ }
    emit()
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === THEME_KEY) { state = load(); emit() }
  })
}

// const [settings, setSettings] = useSettings()
// setSettings({ units: 'f' })
export function useSettings() {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get)
  return [settings, settingsStore.set]
}
