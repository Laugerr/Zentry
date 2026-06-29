import { useCachedFetch } from './useCachedFetch'

// Shared WMO weather-code → emoji map. Both the Layout header pill and the
// Home hero render weather, so this lives in one place.
export const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

// Detect location via IP, then pull current conditions from Open-Meteo.
// Returns a rich payload; consumers pick the fields they need.
async function fetchWeather({ signal }) {
  const geoRes = await fetch('https://ipinfo.io/json', { signal })
  if (!geoRes.ok) throw new Error('geo')
  const { loc, city, country } = await geoRes.json()
  if (!loc) throw new Error('loc')
  const [lat, lon] = loc.split(',').map(Number)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  const wxRes = await fetch(url, { signal })
  if (!wxRes.ok) throw new Error('wx')
  const j = await wxRes.json()
  return {
    city, country,
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    humidity: j.current.relative_humidity_2m,
    wind: Math.round(j.current.wind_speed_10m),
    code: j.current.weathercode,
    hi: Math.round(j.daily.temperature_2m_max?.[0] ?? 0),
    lo: Math.round(j.daily.temperature_2m_min?.[0] ?? 0),
  }
}

// Single shared cache key so the header pill and the Home hero dedupe to one
// geo + weather round-trip instead of firing the same two requests twice.
export function useWeather() {
  return useCachedFetch('weather:current', fetchWeather, { ttl: 15 * 60_000 })
}
