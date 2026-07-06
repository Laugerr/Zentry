import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Square, Volume2, VolumeX, Moon, Loader, AlertCircle, ChevronRight } from 'lucide-react'
import { IconButton, Sheet } from '../components/ui'
import { useRadio } from './radio-context'
import { genreColor, stationSubtitle } from './stations'

// Station "artwork": the genre colour as a gradient tile, with equaliser bars
// that dance while the stream is playing.
export function RadioArt({ station, size = 44, status }) {
  const color = station?._color ?? genreColor(station?.tags)
  const live = status === 'playing'
  return (
    <span className={`radio-art${live ? ' is-live' : ''}`}
      style={{ width: size, height: size, '--art': color, borderRadius: size * 0.28 }} aria-hidden="true">
      {status === 'loading' ? <Loader size={size * 0.4} className="radio-art-spin" />
        : status === 'error' ? <AlertCircle size={size * 0.4} />
        : <span className="radio-eq" style={{ height: size * 0.42 }}><i /><i /><i /><i /></span>}
    </span>
  )
}

// Compact player. variant="bar" sits above the phone tab bar / at the bottom
// of the tablet layout; variant="card" docks in the desktop sidebar.
// Tapping it opens the Now Playing sheet with the full controls.
export function MiniPlayer({ variant = 'bar' }) {
  const radio = useRadio()
  const [open, setOpen] = useState(false)
  if (!radio.station) return null
  const { station, status } = radio
  const playing = status === 'playing' || status === 'loading'

  return (
    <>
      <div className={`mini-player mini-player-${variant}`}>
        <button type="button" className="mini-player-main" onClick={() => setOpen(true)} aria-label={`Now playing: ${station.name}. Open player`}>
          <RadioArt station={station} status={status} size={variant === 'card' ? 38 : 42} />
          <span className="mini-player-text">
            <span className="mini-player-title">{station.name}</span>
            <span className="mini-player-sub">{status === 'error' ? 'Stream unavailable' : status === 'loading' ? 'Connecting…' : stationSubtitle(station) || 'Live radio'}</span>
          </span>
        </button>
        <button type="button" className="mini-player-pp" onClick={radio.toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        {variant === 'bar' && radio.queue.length > 1 && (
          <button type="button" className="mini-player-skip" onClick={radio.next} aria-label="Next station">
            <SkipForward size={18} fill="currentColor" />
          </button>
        )}
      </div>
      <NowPlayingSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const SLEEP_OPTIONS = [0, 15, 30, 60, 120]

export function NowPlayingSheet({ open, onClose }) {
  const radio = useRadio()
  const { pathname } = useLocation()
  const { station, status } = radio
  if (!station) return null
  const playing = status === 'playing' || status === 'loading'
  const canSkip = radio.queue.length > 1
  const sleepLeft = radio.sleep ? Math.max(1, Math.round((radio.sleep.until - Date.now()) / 60_000)) : 0

  return (
    <Sheet open={open} onClose={onClose} title="Now playing" width={440}>
      <div className="np">
        <RadioArt station={station} status={status} size={148} />
        <div className="np-title">{station.name}</div>
        <div className="np-sub">{status === 'error' ? 'Stream unavailable — skipping…' : stationSubtitle(station) || 'Live radio'}</div>

        <div className="np-controls">
          <IconButton icon={Shuffle} label="Shuffle" onClick={radio.shuffle} disabled={!canSkip} />
          <IconButton icon={SkipBack} label="Previous station" variant="secondary" onClick={radio.prev} disabled={!canSkip} />
          <button type="button" className="np-play" onClick={radio.toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
          <IconButton icon={SkipForward} label="Next station" variant="secondary" onClick={radio.next} disabled={!canSkip} />
          <IconButton icon={Square} label="Stop" onClick={() => { radio.stop(); onClose() }} />
        </div>

        <div className="np-volume">
          <IconButton icon={radio.muted ? VolumeX : Volume2} label={radio.muted ? 'Unmute' : 'Mute'} size="sm" onClick={radio.toggleMute} />
          <input type="range" min="0" max="1" step="0.02" aria-label="Volume"
            value={radio.muted ? 0 : radio.volume}
            onChange={(e) => { radio.setVolume(parseFloat(e.target.value)); if (radio.muted) radio.toggleMute() }} />
        </div>

        <div className="np-sleep">
          <span className="np-sleep-label"><Moon size={14} aria-hidden="true" /> Sleep timer{radio.sleep ? ` · ${sleepLeft} min left` : ''}</span>
          <div className="chip-row" role="group" aria-label="Sleep timer">
            {SLEEP_OPTIONS.map((m) => {
              const on = m === 0 ? !radio.sleep : radio.sleep?.minutes === m
              return (
                <button key={m} type="button" aria-pressed={on} className={`chip chip-sm${on ? ' active' : ''}`}
                  onClick={() => radio.setSleepMinutes(m)}>
                  {m === 0 ? 'Off' : m < 60 ? `${m} min` : `${m / 60} h`}
                </button>
              )
            })}
          </div>
        </div>

        {pathname !== '/radio' && (
          <Link to="/radio" viewTransition className="np-open" onClick={onClose}>
            Browse stations <ChevronRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </Sheet>
  )
}
