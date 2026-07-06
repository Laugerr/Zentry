// Shared radio helpers — used by the app-wide player (RadioProvider), the
// mini-player / Now Playing sheet and the Live Radio page.

export const RADIO_LS = {
  favs:    'lr:favs:v1',
  recents: 'lr:recents:v1',
  volume:  'lr:volume:v1',
  last:    'lr:last:v1',
}

export const readJSON  = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) ?? '') ?? fallback } catch { return fallback } }
export const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

// Colour per genre (from the station's tags) — the artwork / marker colour.
export function genreColor(tags = '') {
  const t = tags.toLowerCase()
  if (t.includes('news') || t.includes('talk') || t.includes('speech'))                return '#f87171'
  if (t.includes('jazz') || t.includes('blues'))                                        return '#fbbf24'
  if (t.includes('classical') || t.includes('classic'))                                 return '#a78bfa'
  if (t.includes('pop') || t.includes('top') || t.includes('hits'))                     return '#f472b6'
  if (t.includes('rock') || t.includes('metal') || t.includes('punk') || t.includes('indie')) return '#fb923c'
  if (t.includes('electronic') || t.includes('techno') || t.includes('house') || t.includes('edm') || t.includes('dance')) return '#22d3ee'
  if (t.includes('ambient') || t.includes('chillout') || t.includes('lounge'))          return '#34d399'
  if (t.includes('hiphop') || t.includes('hip-hop') || t.includes('rap') || t.includes('r&b') || t.includes('rnb')) return '#c084fc'
  if (t.includes('reggae') || t.includes('latin') || t.includes('salsa'))               return '#fde047'
  if (t.includes('country') || t.includes('folk'))                                      return '#84cc16'
  if (t.includes('world') || t.includes('ethnic'))                                      return '#60a5fa'
  return '#94a3b8'
}

// The fields worth keeping when a station is stored (recents, last played,
// the play queue) — Radio Browser objects carry dozens we never use.
export function minimalStation(s) {
  return {
    stationuuid: s.stationuuid, name: s.name, country: s.country, countrycode: s.countrycode,
    tags: s.tags, url: s.url, url_resolved: s.url_resolved, favicon: s.favicon,
    bitrate: s.bitrate, codec: s.codec, geo_lat: s.geo_lat, geo_long: s.geo_long,
    clickcount: s.clickcount, _lon: s._lon, _lat: s._lat, _color: s._color,
  }
}

export function stationSubtitle(s) {
  return [s.country, s.tags?.split(',')[0], s.bitrate > 0 ? `${s.bitrate} kbps` : null].filter(Boolean).join(' · ')
}
