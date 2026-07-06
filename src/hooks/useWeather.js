import { useCachedFetch } from './useCachedFetch'
import { useSettings } from '../settings/store'

// Shared WMO weather-code → emoji map.
export const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

// Location: the city chosen in Settings, or detected via IP. Then current
// conditions from Open-Meteo (always metric — display units are applied by
// formatTemp / formatWind, so switching °C/°F needs no refetch).
async function fetchWeatherAt(lat, lon, signal) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  const wxRes = await fetch(url, { signal })
  if (!wxRes.ok) throw new Error('wx')
  const j = await wxRes.json()
  return {
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    humidity: j.current.relative_humidity_2m,
    wind: j.current.wind_speed_10m,
    code: j.current.weathercode,
    hi: j.daily.temperature_2m_max?.[0] ?? null,
    lo: j.daily.temperature_2m_min?.[0] ?? null,
  }
}

async function fetchWeatherByIp({ signal }) {
  const geoRes = await fetch('https://ipinfo.io/json', { signal })
  if (!geoRes.ok) throw new Error('geo')
  const { loc, city, country } = await geoRes.json()
  if (!loc) throw new Error('loc')
  const [lat, lon] = loc.split(',').map(Number)
  return { city, country, ...(await fetchWeatherAt(lat, lon, signal)) }
}

// One shared cache key per location, so the Home hero and anything else
// showing weather dedupe to a single round-trip.
export function useWeather() {
  const [{ city }] = useSettings()
  const key = city ? `weather:${city.lat},${city.lon}` : 'weather:ip'
  const fetcher = city
    ? async ({ signal }) => ({ city: city.name, country: city.country, ...(await fetchWeatherAt(city.lat, city.lon, signal)) })
    : fetchWeatherByIp
  return useCachedFetch(key, fetcher, { ttl: 15 * 60_000 })
}
