import { settingsStore } from './store'

// Unit / clock formatting that honours Settings. Each takes the settings
// object (from useSettings, so the caller re-renders on change) and falls
// back to the store's current value for plain helpers.

// Regions that use Fahrenheit day-to-day
const FAHRENHEIT_REGIONS = ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']

export function usesFahrenheit(s = settingsStore.get()) {
  if (s.units !== 'auto') return s.units === 'f'
  const region = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[1]?.toUpperCase()
  return FAHRENHEIT_REGIONS.includes(region)
}

export function uses12h(s = settingsStore.get()) {
  if (s.clock !== 'auto') return s.clock === '12'
  try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true }
  catch { return false }
}

// 14:05 / 2:05 PM (optionally with seconds, or in another time zone)
export function formatTime(date, { seconds = false, timeZone, settings } = {}) {
  const h12 = uses12h(settings)
  return new Date(date).toLocaleTimeString(h12 ? 'en-US' : 'en-GB', {
    hour: h12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    ...(seconds && { second: '2-digit' }),
    hour12: h12,
    ...(timeZone && { timeZone }),
  })
}

// Input is always Celsius (Open-Meteo) → "12°" or "54°"
export function formatTemp(celsius, settings) {
  if (celsius == null || Number.isNaN(celsius)) return '—'
  return `${Math.round(usesFahrenheit(settings) ? celsius * 9 / 5 + 32 : celsius)}°`
}

export const tempUnit = (settings) => (usesFahrenheit(settings) ? '°F' : '°C')

// Input is always km/h
export function formatWind(kmh, settings) {
  if (kmh == null) return '—'
  return usesFahrenheit(settings) ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`
}
