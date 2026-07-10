// Weather tool data — Open-Meteo forecast (free, no key). Values stay metric;
// display units come from Settings via settings/format.js.

export const WMO = {
  0: { label: 'Clear', icon: '☀️', night: '🌙', sky: 'clear' },
  1: { label: 'Mostly clear', icon: '🌤️', night: '🌙', sky: 'clear' },
  2: { label: 'Partly cloudy', icon: '⛅', night: '☁️', sky: 'cloudy' },
  3: { label: 'Overcast', icon: '☁️', sky: 'cloudy' },
  45: { label: 'Fog', icon: '🌫️', sky: 'fog' },
  48: { label: 'Rime fog', icon: '🌫️', sky: 'fog' },
  51: { label: 'Light drizzle', icon: '🌦️', sky: 'rain' },
  53: { label: 'Drizzle', icon: '🌦️', sky: 'rain' },
  55: { label: 'Heavy drizzle', icon: '🌧️', sky: 'rain' },
  56: { label: 'Freezing drizzle', icon: '🌧️', sky: 'rain' },
  57: { label: 'Freezing drizzle', icon: '🌧️', sky: 'rain' },
  61: { label: 'Light rain', icon: '🌧️', sky: 'rain' },
  63: { label: 'Rain', icon: '🌧️', sky: 'rain' },
  65: { label: 'Heavy rain', icon: '🌧️', sky: 'rain' },
  66: { label: 'Freezing rain', icon: '🌧️', sky: 'rain' },
  67: { label: 'Freezing rain', icon: '🌧️', sky: 'rain' },
  71: { label: 'Light snow', icon: '🌨️', sky: 'snow' },
  73: { label: 'Snow', icon: '❄️', sky: 'snow' },
  75: { label: 'Heavy snow', icon: '❄️', sky: 'snow' },
  77: { label: 'Snow grains', icon: '🌨️', sky: 'snow' },
  80: { label: 'Rain showers', icon: '🌦️', sky: 'rain' },
  81: { label: 'Rain showers', icon: '🌧️', sky: 'rain' },
  82: { label: 'Violent showers', icon: '⛈️', sky: 'storm' },
  85: { label: 'Snow showers', icon: '🌨️', sky: 'snow' },
  86: { label: 'Snow showers', icon: '❄️', sky: 'snow' },
  95: { label: 'Thunderstorm', icon: '⛈️', sky: 'storm' },
  96: { label: 'Thunder + hail', icon: '⛈️', sky: 'storm' },
  99: { label: 'Thunder + hail', icon: '⛈️', sky: 'storm' },
}
export const wmo = (code, isDay = true) => {
  const w = WMO[code] ?? { label: '—', icon: '🌡️', sky: 'cloudy' }
  return { ...w, icon: !isDay && w.night ? w.night : w.icon }
}

export async function fetchForecast(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto', forecast_days: 7,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,precipitation',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
  })
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!r.ok) throw new Error('Forecast unavailable')
  const j = await r.json()

  // Open-Meteo times are the city's local wall-clock time without an offset.
  // Shift "now" into that clock so indexes line up wherever the user is.
  const localNow = new Date(Date.now() + j.utc_offset_seconds * 1000).toISOString().slice(0, 13)
  const start = Math.max(0, j.hourly.time.findIndex((t) => t.slice(0, 13) === localNow))
  const hours = j.hourly.time.slice(start, start + 24).map((t, i) => ({
    time: t,
    temp: j.hourly.temperature_2m[start + i],
    rain: j.hourly.precipitation_probability[start + i] ?? 0,
    code: j.hourly.weather_code[start + i],
    isDay: j.hourly.is_day[start + i] === 1,
  }))
  const days = j.daily.time.map((t, i) => ({
    date: t,
    code: j.daily.weather_code[i],
    max: j.daily.temperature_2m_max[i],
    min: j.daily.temperature_2m_min[i],
    rain: j.daily.precipitation_probability_max[i] ?? 0,
    sunrise: j.daily.sunrise[i],
    sunset: j.daily.sunset[i],
    uv: j.daily.uv_index_max[i],
  }))
  const c = j.current
  return {
    timezone: j.timezone,
    offset: j.utc_offset_seconds,
    localNow: c.time,
    current: {
      temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m,
      code: c.weather_code, isDay: c.is_day === 1, wind: c.wind_speed_10m, windDir: c.wind_direction_10m,
      pressure: c.pressure_msl, visibility: c.visibility, precip: c.precipitation,
    },
    hours, days,
  }
}

// "Rain likely around 15:00" — first hour in the next 8 with ≥ 50% chance
export function rainAlert(hours) {
  const soon = hours.slice(0, 8)
  if (soon[0]?.rain >= 60) return { now: true, hour: soon[0] }
  const hit = soon.slice(1).find((h) => h.rain >= 50)
  return hit ? { now: false, hour: hit } : null
}

export function uvLabel(uv) {
  if (uv == null) return '—'
  return uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : uv < 8 ? 'High' : uv < 11 ? 'Very high' : 'Extreme'
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const compass = (deg) => DIRS[Math.round(((deg ?? 0) % 360) / 45) % 8]
