import { useState } from 'react'
import { Star } from 'lucide-react'
import { RadioArt } from '../../radio/NowPlaying'
import { flag, stationMeta } from '../../radio/stations'

// Station logo when Radio Browser has one, genre-coloured artwork otherwise
// (and whenever this station is the one playing — so the EQ bars show).
export function StationArt({ station, size, status }) {
  const [broken, setBroken] = useState(false)
  if (status || !station.favicon || broken) {
    return <RadioArt station={station} status={status ?? 'paused'} size={size} />
  }
  return (
    <span className="station-logo" style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      <img src={station.favicon} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    </span>
  )
}

// One row in the station list. The row itself is the play button; the star is
// a sibling (not nested — buttons can't contain buttons).
export function StationRow({ station, status, favourite, onPlay, onToggleFav }) {
  const playing = !!status
  return (
    <div className={`station-row${playing ? ' is-playing' : ''}`}>
      <button type="button" className="station-row-main" onClick={() => onPlay(station)}
        aria-label={`${playing ? 'Playing' : 'Play'} ${station.name}`}>
        <StationArt station={station} size={42} status={status} />
        <span className="station-row-text">
          <span className="station-name">{station.name}</span>
          <span className="station-meta">{flag(station.countrycode)} {stationMeta(station)}</span>
        </span>
      </button>
      <button type="button" className={`station-fav${favourite ? ' on' : ''}`} onClick={() => onToggleFav(station)}
        aria-pressed={favourite} aria-label={favourite ? `Remove ${station.name} from favourites` : `Add ${station.name} to favourites`}>
        <Star size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

// Square tile for the swipeable browse rows
export function StationTile({ station, status, onPlay }) {
  return (
    <button type="button" className={`station-tile${status ? ' is-playing' : ''}`} onClick={() => onPlay(station)}
      aria-label={`${status ? 'Playing' : 'Play'} ${station.name}`}>
      <StationArt station={station} size={104} status={status} />
      <span className="station-name">{station.name}</span>
      <span className="station-meta">{flag(station.countrycode)} {station.country || station.countrycode}</span>
    </button>
  )
}
