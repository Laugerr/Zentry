import { useEffect, useState } from 'react'
import { useMediaQuery } from './useBreakpoint'

const THEME_KEY = 'zentry:theme'

// The stored *preference* — 'auto' (follow the OS, the default), 'light' or
// 'dark'. index.html resolves it before first paint; this hook keeps it in
// sync afterwards, including when the OS switches while the app is open.
function readPref() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'auto') return v
  } catch { /* ignore */ }
  return 'auto'
}

export function useTheme() {
  const [pref, setPref] = useState(readPref)
  const systemLight     = useMediaQuery('(prefers-color-scheme: light)')
  const theme           = pref === 'auto' ? (systemLight ? 'light' : 'dark') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, pref) } catch { /* ignore */ }
  }, [pref])

  return { pref, theme, setPref }
}
