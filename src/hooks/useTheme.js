import { useEffect } from 'react'
import { useMediaQuery } from './useBreakpoint'
import { useSettings } from '../settings/store'

// The theme *preference* lives in the settings store — 'auto' (follow the OS,
// the default), 'light' or 'dark' — so the header toggle, the More sheet and
// the Settings page always agree. index.html resolves it before first paint;
// this keeps <html data-theme> in sync afterwards, including when the OS
// switches while the app is open.
export function useTheme() {
  const [{ theme: pref }, set] = useSettings()
  const systemLight = useMediaQuery('(prefers-color-scheme: light)')
  const theme       = pref === 'auto' ? (systemLight ? 'light' : 'dark') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return { pref, theme, setPref: (value) => set({ theme: value }) }
}
