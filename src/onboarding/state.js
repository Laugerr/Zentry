// First-run setup: shown once, to genuinely new visitors only.

const KEY   = 'zentry:onboarded'
const EVENT = 'zentry:onboarding'

// Anything here means the person has used Zentry before — existing users
// never see setup. Bookkeeping keys written on every visit don't count.
const DATA_PREFIXES = ['zentry:', 'lr:', 'nt:', 'ft:']
const NOT_DATA = new Set(['zentry:theme', 'zentry:visits', 'zentry:install-dismissed'])

export function needsOnboarding() {
  try {
    if (localStorage.getItem(KEY)) return false
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && !NOT_DATA.has(k) && DATA_PREFIXES.some((p) => k.startsWith(p))) {
        markOnboarded()
        return false
      }
    }
    return true
  } catch { return false }
}

export function markOnboarded() {
  try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* ignore */ }
}

// Settings → "Run setup again"
export function requestOnboarding() {
  window.dispatchEvent(new Event(EVENT))
}
export const ONBOARDING_EVENT = EVENT
