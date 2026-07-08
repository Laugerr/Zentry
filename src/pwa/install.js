import { useSyncExternalStore } from 'react'

// "Install Zentry" support.
// Chrome / Edge / Android fire `beforeinstallprompt` once, early — so this
// module is imported from main.jsx to catch it before React renders. iOS
// Safari has no install API: there we show "Share → Add to Home Screen".

const VISITS_KEY    = 'zentry:visits'
const DISMISSED_KEY = 'zentry:install-dismissed'

let deferred = null   // the saved beforeinstallprompt event
let installed = false
const listeners = new Set()
const emit = () => { snapshot = compute(); listeners.forEach((fn) => fn()) }

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports as a Mac

// mode: 'installed' | 'prompt' (one-tap install) | 'ios' (manual steps) | 'unsupported'
function compute() {
  if (installed || isStandalone()) return { mode: 'installed' }
  if (deferred) return { mode: 'prompt' }
  if (isIOS()) return { mode: 'ios' }
  return { mode: 'unsupported' }
}
let snapshot = { mode: 'unsupported' }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own, gentler prompt
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit() })
  snapshot = compute()

  // Count visits (once per browser session) — the banner waits for the second
  try {
    if (!sessionStorage.getItem(VISITS_KEY)) {
      sessionStorage.setItem(VISITS_KEY, '1')
      localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) || 0) + 1))
    }
  } catch { /* ignore */ }
}

export function useInstall() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => snapshot,
  )
}

// Shows the browser's install dialog. Resolves to 'accepted' | 'dismissed'.
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null // a prompt event can only be used once
  emit()
  return outcome
}

// The one-time banner: from the 2nd visit, never after "Not now"
export function shouldOfferBanner() {
  try {
    return Number(localStorage.getItem(VISITS_KEY) || 0) >= 2 && !localStorage.getItem(DISMISSED_KEY)
  } catch { return false }
}
export function dismissBanner() {
  try { localStorage.setItem(DISMISSED_KEY, new Date().toISOString()) } catch { /* ignore */ }
}
