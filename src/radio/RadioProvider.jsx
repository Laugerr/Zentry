import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RadioContext } from './radio-context'
import { RADIO_LS, readJSON, writeJSON, minimalStation, stationSubtitle } from './stations'

// App-wide radio player. It lives above the router, so the stream keeps
// playing while you move between pages — the Live Radio page, the
// mini-player and the Now Playing sheet are all just remotes for it.
// Also wires the Media Session API (lock screen, notification, headphone and
// keyboard media keys) and keeps the sleep timer running across pages.
export function RadioProvider({ children }) {
  const audioRef = useRef(null)
  const [station, setStation] = useState(null)
  const [status,  setStatus]  = useState('idle')
  const [queue,   setQueue]   = useState([])
  const [muted,   setMuted]   = useState(false)
  const [sleep,   setSleep]   = useState(null) // { until: ms, minutes }
  const [volume,  setVolume]  = useState(() => {
    const v = readJSON(RADIO_LS.volume, 0.8)
    return typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.8
  })
  const [recents, setRecents]         = useState(() => readJSON(RADIO_LS.recents, []))
  const [lastStation, setLastStation] = useState(() => readJSON(RADIO_LS.last, null))

  useEffect(() => { writeJSON(RADIO_LS.volume, volume) }, [volume])
  useEffect(() => { writeJSON(RADIO_LS.recents, recents) }, [recents])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted }, [muted])

  // Mirror the <audio> element's real state — it's the source of truth
  useEffect(() => {
    const a = audioRef.current
    const on = {
      playing: () => setStatus('playing'),
      waiting: () => setStatus('loading'),
      pause:   () => setStatus((s) => (s === 'error' || s === 'idle' ? s : 'paused')),
      error:   () => { if (a.getAttribute('src')) setStatus('error') },
    }
    for (const [ev, fn] of Object.entries(on)) a.addEventListener(ev, fn)
    return () => { for (const [ev, fn] of Object.entries(on)) a.removeEventListener(ev, fn) }
  }, [])

  const play = useCallback((next, nextQueue) => {
    const a = audioRef.current
    const s = minimalStation(next)
    if (nextQueue) setQueue(nextQueue.map(minimalStation))
    setStation(s)
    setLastStation(s)
    writeJSON(RADIO_LS.last, s)
    setRecents((prev) => [s, ...prev.filter((r) => r.stationuuid !== s.stationuuid)].slice(0, 30))
    setStatus('loading')
    a.src = s.url_resolved || s.url
    // play() straight away (not on 'canplay') so it stays inside the user's
    // tap — mobile browsers only allow audio started by a gesture.
    a.play().catch((err) => { if (err?.name !== 'AbortError') setStatus('error') })
  }, [])

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!station) { if (lastStation) play(lastStation); return }
    if (a.paused) a.play().catch(() => setStatus('error'))
    else a.pause()
  }, [station, lastStation, play])

  const stop = useCallback(() => {
    const a = audioRef.current
    a.pause()
    a.removeAttribute('src')
    a.load()
    setStation(null)
    setStatus('idle')
    setSleep(null)
  }, [])

  const step = useCallback((dir) => {
    if (!station || queue.length < 2) return
    const i = queue.findIndex((s) => s.stationuuid === station.stationuuid)
    const n = ((i < 0 ? 0 : i + dir) % queue.length + queue.length) % queue.length
    play(queue[n])
  }, [station, queue, play])
  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => step(-1), [step])
  const shuffle = useCallback(() => {
    if (queue.length) play(queue[Math.floor(Math.random() * queue.length)])
  }, [queue, play])

  const toggleMute   = useCallback(() => setMuted((m) => !m), [])
  const clearRecents = useCallback(() => setRecents([]), [])
  const setSleepMinutes = useCallback((min) => {
    setSleep(min > 0 ? { until: Date.now() + min * 60_000, minutes: min } : null)
  }, [])

  // A dead stream skips to the next station after 3s (if there is one)
  useEffect(() => {
    if (status !== 'error' || queue.length < 2) return
    const id = setTimeout(next, 3000)
    return () => clearTimeout(id)
  }, [status, queue.length, next])

  // Sleep timer — runs here so it keeps counting on every page
  useEffect(() => {
    if (!sleep) return
    const id = setTimeout(stop, Math.max(0, sleep.until - Date.now()))
    return () => clearTimeout(id)
  }, [sleep, stop])

  // Media Session: lock screen / notification controls + media keys
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = station
      ? new window.MediaMetadata({
          title: station.name,
          artist: stationSubtitle(station) || 'Live radio',
          album: 'Zentry Radio',
          artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
        })
      : null
    const handlers = {
      play: toggle, pause: toggle, stop,
      nexttrack: queue.length > 1 ? next : null,
      previoustrack: queue.length > 1 ? prev : null,
    }
    for (const [action, fn] of Object.entries(handlers)) {
      try { ms.setActionHandler(action, fn) } catch { /* unsupported action */ }
    }
  }, [station, queue.length, toggle, stop, next, prev])
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : station ? 'paused' : 'none'
    }
  }, [status, station])

  const value = useMemo(() => ({
    station, status, queue, recents, clearRecents, lastStation,
    volume, setVolume, muted, toggleMute, sleep, setSleepMinutes,
    play, toggle, stop, next, prev, shuffle,
  }), [station, status, queue, recents, clearRecents, lastStation, volume, muted, toggleMute, sleep, setSleepMinutes, play, toggle, stop, next, prev, shuffle])

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" />
    </RadioContext.Provider>
  )
}
