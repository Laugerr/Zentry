// First-run setup: shown once, to genuinely new visitors only.

const KEY   = 'zentry:onboarded'
const EVENT = 'zentry:onboarding'

// Anything here (other than the theme) means the person has used Zentry
// before — existing users never see setup.
const DATA_PREFIXES = ['zentry:', 'lr:', 'nt:', 'ft:']

export function needsOnboarding() {
  try {
    if (localStorage.getItem(KEY)) return false
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k !== 'zentry:theme' && DATA_PREFIXES.some((p) => k.startsWith(p))) {
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
