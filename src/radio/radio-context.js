import { createContext, useContext } from 'react'

export const RadioContext = createContext(null)

// const radio = useRadio()
// radio.station, radio.status ('idle' | 'loading' | 'playing' | 'paused' | 'error')
// radio.play(station, queue?) · toggle() · stop() · next() · prev() · shuffle()
// radio.volume / setVolume · muted / toggleMute · sleep / setSleepMinutes
// radio.recents / clearRecents() · radio.lastStation
export function useRadio() {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('useRadio must be used inside <RadioProvider>')
  return ctx
}
