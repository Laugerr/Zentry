import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import {
  RefreshCw, ExternalLink, Globe, Newspaper, ChevronDown, Clock,
  Search, Bookmark, LayoutGrid, Rows, List as ListIcon, X, TrendingUp, Check,
} from 'lucide-react'
import { InlineError, EmptyState as EmptyNotice } from '../components/states'
import { Button, IconButton, Card, Tabs, Sheet, Skeleton, useToast } from '../components/ui'
import { useSettings } from '../settings/store'
import { COUNTRY_FACTS } from '../news/countryFacts'
import { formatTime, formatTemp, formatWind } from '../settings/format'

// ─── Feed catalogue ───────────────────────────────────────────────────────────

const GLOBAL_FEEDS = [
  { id: 'bbc-world',   name: 'BBC World',    url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'dw-english',  name: 'DW English',   url: 'https://rss.dw.com/xml/rss-en-all' },
  { id: 'npr',         name: 'NPR',          url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'bbc-tech',    name: 'BBC Tech',     url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'bbc-science', name: 'BBC Science',  url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
]

const COUNTRY_FEEDS = {
  DE: { label: 'Germany', flag: '🇩🇪', feeds: [
    { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2' },
    { id: 'spiegel',    name: 'Spiegel',    url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
    { id: 'dw-de',      name: 'DW Deutsch', url: 'https://rss.dw.com/xml/rss-de-all' },
    { id: 'zeit',       name: 'Zeit Online', url: 'https://newsfeed.zeit.de/index' },
  ] },
  GB: { label: 'United Kingdom', flag: '🇬🇧', feeds: [
    { id: 'bbc-uk',      name: 'BBC UK',       url: 'https://feeds.bbci.co.uk/news/uk/rss.xml' },
    { id: 'guardian-uk', name: 'The Guardian',  url: 'https://www.theguardian.com/uk/rss' },
    { id: 'sky-news',    name: 'Sky News',      url: 'https://feeds.skynews.com/feeds/rss/uk.xml' },
  ] },
  US: { label: 'United States', flag: '🇺🇸', feeds: [
    { id: 'npr-us',  name: 'NPR',      url: 'https://feeds.npr.org/1001/rss.xml' },
    { id: 'abc-us',  name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' },
    { id: 'cbs-us',  name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
  ] },
  FR: { label: 'France', flag: '🇫🇷', feeds: [
    { id: 'lemonde',    name: 'Le Monde',   url: 'https://www.lemonde.fr/rss/une.xml' },
    { id: 'france24',   name: 'France 24',  url: 'https://www.france24.com/fr/rss' },
    { id: 'bfm',        name: 'BFM TV',     url: 'https://www.bfmtv.com/rss/news-24-7/' },
  ] },
  ES: { label: 'Spain', flag: '🇪🇸', feeds: [
    { id: 'elpais',   name: 'El País',    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
    { id: 'elmundo',  name: 'El Mundo',   url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
  ] },
  IT: { label: 'Italy', flag: '🇮🇹', feeds: [
    { id: 'ansa',        name: 'ANSA',          url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml' },
    { id: 'repubblica',  name: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml' },
  ] },
  PL: { label: 'Poland', flag: '🇵🇱', feeds: [
    { id: 'tvn24',     name: 'TVN24',      url: 'https://tvn24.pl/najnowsze.xml' },
    { id: 'gazeta',    name: 'Gazeta',     url: 'https://rss.gazeta.pl/pub/rss/najnowsze.xml' },
  ] },
  NL: { label: 'Netherlands', flag: '🇳🇱', feeds: [
    { id: 'nu-nl',  name: 'NU.nl',    url: 'https://www.nu.nl/rss/Algemeen' },
    { id: 'nos',    name: 'NOS',      url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
  ] },
  SE: { label: 'Sweden', flag: '🇸🇪', feeds: [
    { id: 'svt',  name: 'SVT Nyheter', url: 'https://www.svt.se/nyheter/rss.xml' },
    { id: 'dn',   name: 'Dagens Nyheter', url: 'https://www.dn.se/rss/' },
  ] },
  BR: { label: 'Brazil', flag: '🇧🇷', feeds: [
    { id: 'g1',       name: 'G1 Globo',  url: 'https://g1.globo.com/rss/g1/' },
    { id: 'folha',    name: 'Folha',     url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  ] },
  JP: { label: 'Japan', flag: '🇯🇵', feeds: [
    { id: 'nhk',     name: 'NHK World',  url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' },
    { id: 'japan-times', name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed' },
  ] },
  AU: { label: 'Australia', flag: '🇦🇺', feeds: [
    { id: 'abc-au',  name: 'ABC Australia',         url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
    { id: 'smh',     name: 'Sydney Morning Herald', url: 'https://www.smh.com.au/rss/feed.xml' },
  ] },
  MA: { label: 'Morocco', flag: '🇲🇦', feeds: [
    { id: 'medias24',  name: 'Médias24',          url: 'https://medias24.com/feed/' },
    { id: 'mwn',       name: 'Morocco World News', url: 'https://www.moroccoworldnews.com/feed/' },
    { id: 'nap',       name: 'North Africa Post',  url: 'https://northafricapost.com/feed/' },
  ] },
  AE: { label: 'UAE', flag: '🇦🇪', feeds: [
    { id: 'mee',        name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss' },
    { id: 'aljazeera',  name: 'Al Jazeera',      url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { id: 'al-monitor', name: 'Al Monitor',      url: 'https://www.al-monitor.com/rss' },
  ] },
  CN: { label: 'China', flag: '🇨🇳', feeds: [
    { id: 'china-daily', name: 'China Daily', url: 'https://www.chinadaily.com.cn/rss/world_rss.xml' },
    { id: 'globaltimes', name: 'Global Times', url: 'https://www.globaltimes.cn/rss/outbrain.xml' },
    { id: 'scmp',        name: 'SCMP',        url: 'https://www.scmp.com/rss/91/feed' },
  ] },
  PH: { label: 'Philippines', flag: '🇵🇭', feeds: [
    { id: 'rappler',    name: 'Rappler',    url: 'https://www.rappler.com/feed' },
    { id: 'gma',        name: 'GMA News',   url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
    { id: 'philstar',   name: 'Philstar',   url: 'https://www.philstar.com/rss/headlines' },
  ] },
  LT: { label: 'Lithuania', flag: '🇱🇹', feeds: [
    { id: 'euractiv',    name: 'Euractiv',       url: 'https://www.euractiv.com/feed/' },
    { id: 'dw-europe',   name: 'DW Europe',      url: 'https://rss.dw.com/xml/rss-en-eu' },
    { id: 'guardian-eu', name: 'Guardian Europe', url: 'https://www.theguardian.com/world/europe-news/rss' },
  ] },
  KE: { label: 'Kenya', flag: '🇰🇪', feeds: [
    { id: 'nation-ke',   name: 'Nation Africa',  url: 'https://nation.africa/africa/rss.xml' },
    { id: 'standard-ke', name: 'The Standard',   url: 'https://www.standardmedia.co.ke/rss/headlines.php' },
    { id: 'kbc-ke',      name: 'KBC',            url: 'https://www.kbc.co.ke/feed/' },
  ] },
  NG: { label: 'Nigeria', flag: '🇳🇬', feeds: [
    { id: 'punch-ng',    name: 'Punch',          url: 'https://punchng.com/feed/' },
    { id: 'vanguard-ng', name: 'Vanguard',       url: 'https://www.vanguardngr.com/feed/' },
    { id: 'channels-ng', name: 'Channels TV',    url: 'https://www.channelstv.com/feed/' },
  ] },
  ZA: { label: 'South Africa', flag: '🇿🇦', feeds: [
    { id: 'iol-za',  name: 'IOL News',      url: 'https://www.iol.co.za/rss' },
    { id: 'mg-za',   name: 'Mail Guardian', url: 'https://mg.co.za/feed/' },
  ] },
  EG: { label: 'Egypt', flag: '🇪🇬', feeds: [
    { id: 'eg-ind',  name: 'Egypt Independent',  url: 'https://egyptindependent.com/feed/' },
    { id: 'eg-str',  name: 'Egyptian Streets',   url: 'https://egyptianstreets.com/feed/' },
    { id: 'eg-dne',  name: 'Daily News Egypt',   url: 'https://www.dailynewsegypt.com/feed/' },
  ] },
  GH: { label: 'Ghana', flag: '🇬🇭', feeds: [
    { id: 'gh-joy',  name: 'Joy Online',    url: 'https://www.myjoyonline.com/feed/' },
  ] },
  ET: { label: 'Ethiopia', flag: '🇪🇹', feeds: [
    { id: 'et-mon',  name: 'Ethiopian Monitor', url: 'https://ethiopianmonitor.com/feed/' },
    { id: 'et-af',   name: 'Addis Fortune',     url: 'https://addisfortune.news/feed/' },
  ] },
  TZ: { label: 'Tanzania', flag: '🇹🇿', feeds: [
    { id: 'tz-dn',   name: 'Daily News',    url: 'https://www.dailynews.co.tz/feed/' },
  ] },
  UG: { label: 'Uganda', flag: '🇺🇬', feeds: [
    { id: 'ug-obs',  name: 'The Observer',  url: 'https://observer.ug/feed/' },
  ] },
  ZW: { label: 'Zimbabwe', flag: '🇿🇼', feeds: [
    { id: 'zw-nzw',  name: 'New Zimbabwe',  url: 'https://www.newzimbabwe.com/feed/' },
    { id: 'zw-eye',  name: 'ZimEye',        url: 'https://www.zimeye.net/feed/' },
  ] },
  ZM: { label: 'Zambia', flag: '🇿🇲', feeds: [
    { id: 'zm-lt',   name: 'Lusaka Times',  url: 'https://www.lusakatimes.com/feed/' },
    { id: 'zm-dm',   name: 'Daily Mail',    url: 'https://www.daily-mail.co.zm/feed/' },
  ] },
  RW: { label: 'Rwanda', flag: '🇷🇼', feeds: [
    { id: 'rw-kt',   name: 'KT Press',      url: 'https://www.ktpress.rw/feed/' },
    { id: 'rw-rna',  name: 'RNA News',      url: 'https://www.rnanews.com/feed/' },
  ] },
  TN: { label: 'Tunisia', flag: '🇹🇳', feeds: [
    { id: 'tn-tl',   name: 'Tunisia Live',  url: 'https://www.tunisia-live.net/feed/' },
    { id: 'tn-bn',   name: 'Business News', url: 'https://www.businessnews.com.tn/rss' },
  ] },
  SN: { label: 'Senegal', flag: '🇸🇳', feeds: [
    { id: 'sn-sng',  name: 'Senego',        url: 'https://senego.com/feed' },
    { id: 'sn-an',   name: 'Africa News',   url: 'https://www.africanews.com/feed/' },
  ] },
  CI: { label: "Côte d'Ivoire", flag: '🇨🇮', feeds: [
    { id: 'ci-cn',   name: 'Connectionivoirienne', url: 'https://www.connectionivoirienne.net/feed' },
    { id: 'ci-atv',  name: 'AbidjanTV',            url: 'https://www.abidjantv.net/feed/' },
  ] },
  CM: { label: 'Cameroon', flag: '🇨🇲', feeds: [
    { id: 'cm-jdc',  name: 'Journal du Cameroun', url: 'https://www.journalducameroun.com/feed/' },
    { id: 'cm-ac',   name: 'Actu Cameroun',       url: 'https://actucameroun.com/feed/' },
  ] },
}

// ─── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',            label: 'All News',      emoji: '📰' },
  { id: 'world',          label: 'World',         emoji: '🌍' },
  { id: 'politics',       label: 'Politics',      emoji: '🏛️' },
  { id: 'technology',     label: 'Technology',    emoji: '💻' },
  { id: 'business',       label: 'Business',      emoji: '📈' },
  { id: 'science',        label: 'Science',       emoji: '🔬' },
  { id: 'health',         label: 'Health',        emoji: '🏥' },
  { id: 'sports',         label: 'Sports',        emoji: '⚽' },
  { id: 'entertainment',  label: 'Entertainment', emoji: '🎬' },
  { id: 'environment',    label: 'Environment',   emoji: '🌱' },
]

const CATEGORY_KEYWORDS = {
  world:         ['world', 'international', 'global', 'foreign', 'nato', 'united nations', 'crisis', 'summit', 'war', 'conflict', 'treaty', 'diplomat'],
  politics:      ['election', 'president', 'prime minister', 'parliament', 'government', 'vote', 'policy', 'congress', 'senate', 'chancellor', 'opposition', 'party', 'democrat', 'republican', 'political', 'minister'],
  technology:    ['tech', 'ai', 'artificial intelligence', 'software', 'cyber', 'digital', 'robot', 'computer', 'internet', 'app', 'data', 'hack', 'openai', 'google', 'microsoft', 'apple', 'chip', 'startup', 'silicon'],
  business:      ['economy', 'market', 'stock', 'trade', 'finance', 'bank', 'gdp', 'inflation', 'investment', 'company', 'billion', 'profit', 'recession', 'imf', 'revenue', 'industry', 'merger'],
  science:       ['science', 'research', 'study', 'climate', 'space', 'nasa', 'discovery', 'fossil', 'species', 'ocean', 'planet', 'asteroid', 'physics', 'biology', 'chemistry', 'experiment'],
  health:        ['health', 'medical', 'hospital', 'virus', 'vaccine', 'cancer', 'drug', 'disease', 'pandemic', 'who', 'patient', 'treatment', 'mental health', 'surgery', 'nutrition', 'outbreak'],
  sports:        ['football', 'soccer', 'basketball', 'tennis', 'olympic', 'athlete', 'championship', 'match', 'league', 'goal', 'sport', 'player', 'coach', 'tournament', 'formula', 'cycling', 'swimming'],
  entertainment: ['film', 'movie', 'music', 'celebrity', 'award', 'netflix', 'tv', 'show', 'album', 'actor', 'singer', 'box office', 'oscar', 'grammy', 'concert', 'streaming', 'director'],
  environment:   ['climate change', 'environment', 'emission', 'carbon', 'renewable', 'solar', 'wind energy', 'pollution', 'biodiversity', 'deforestation', 'glacier', 'flood', 'drought', 'wildfire', 'green'],
}

// ─── Country stats constants ──────────────────────────────────────────────────

const COUNTRY_TIMEZONES = {
  DE: 'Europe/Berlin',    GB: 'Europe/London',     US: 'America/New_York',
  FR: 'Europe/Paris',     ES: 'Europe/Madrid',     IT: 'Europe/Rome',
  PL: 'Europe/Warsaw',    NL: 'Europe/Amsterdam',  SE: 'Europe/Stockholm',
  BR: 'America/Sao_Paulo', JP: 'Asia/Tokyo',       AU: 'Australia/Sydney',
  MA: 'Africa/Casablanca', AE: 'Asia/Dubai',       CN: 'Asia/Shanghai',
  PH: 'Asia/Manila',      LT: 'Europe/Vilnius',
  KE: 'Africa/Nairobi',   NG: 'Africa/Lagos',
  ZA: 'Africa/Johannesburg', EG: 'Africa/Cairo',   GH: 'Africa/Accra',
  ET: 'Africa/Addis_Ababa',  TZ: 'Africa/Dar_es_Salaam', UG: 'Africa/Kampala',
  ZW: 'Africa/Harare',    ZM: 'Africa/Lusaka',    RW: 'Africa/Kigali',
  TN: 'Africa/Tunis',     SN: 'Africa/Dakar',     CI: 'Africa/Abidjan',
  CM: 'Africa/Douala',
}

const WMO = {
  0: '☀️ Clear',       1: '🌤️ Mainly clear',  2: '⛅ Partly cloudy',
  3: '☁️ Overcast',    45: '🌫️ Foggy',         48: '🌫️ Icy fog',
  51: '🌦️ Light drizzle', 53: '🌦️ Drizzle',   55: '🌧️ Heavy drizzle',
  61: '🌧️ Light rain', 63: '🌧️ Rain',          65: '🌧️ Heavy rain',
  71: '🌨️ Light snow', 73: '❄️ Snow',           75: '❄️ Heavy snow',
  80: '🌦️ Showers',   81: '🌧️ Showers',        82: '🌧️ Heavy showers',
  95: '⛈️ Thunderstorm', 96: '⛈️ T-storm+hail', 99: '⛈️ T-storm+hail',
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const LS = {
  prefs:     'nt:prefs:v2',     // { view, country, category, layout, compact }
  bookmarks: 'nt:bookmarks:v1', // [{ title, link, image, pubDate, sourceName, savedAt }]
  read:      'nt:read:v1',      // { [link]: true }  (capped at 500 entries)
}
const readJSON  = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? '') ?? fb } catch { return fb } }
const writeJSON = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

// ─── CountryStats component ───────────────────────────────────────────────────

// Facts are bundled (src/news/countryFacts.js); only the capital's current
// weather is fetched — and the card still renders if that fails.
function CountryStats({ countryCode }) {
  const info = COUNTRY_FACTS[countryCode]
  const [weather, setWeather] = useState(null)
  const [now, setNow]         = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setWeather(null)
    const [lat, lon] = info?.capitalLatLng ?? []
    if (lat == null) return
    const ctrl = new AbortController()
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&wind_speed_unit=kmh`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setWeather(d.current_weather ?? null))
      .catch(() => { /* weather is optional */ })
    return () => ctrl.abort()
  }, [info])

  const tz = COUNTRY_TIMEZONES[countryCode]
  const [settings] = useSettings()
  const localTime = tz ? formatTime(now, { timeZone: tz, seconds: true, settings }) : null
  const localDate = tz ? now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short' }) : null

  if (!info) return null

  const currency   = info.currency
  const languages  = info.languages.join(', ')
  const dialCode   = info.dialCode
  const tld        = info.tld || '—'
  const population = info.population ? info.population.toLocaleString() : '—'
  const area       = info.area ? info.area.toLocaleString() + ' km²' : '—'
  const capital    = info.capital || '—'
  const region     = [info.subregion, info.region].filter(Boolean).join(' · ')
  const landlocked = info.landlocked ? '🔒 Landlocked' : '🌊 Coastal'
  const borders    = info.borders ? `${info.borders} countr${info.borders === 1 ? 'y' : 'ies'}` : 'No land borders'
  const wCode = weather?.weathercode
  const wLabel = WMO[wCode] ?? '🌡️ Unknown'

  function StatCard({ emoji, label, value, sub }) {
    return (
      <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>{emoji} {label}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{value}</span>
        {sub && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{sub}</span>}
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', background: 'linear-gradient(135deg, color-mix(in srgb, var(--tool-news) 6%, var(--bg-card)) 0%, var(--bg-card) 60%)', border: '1px solid var(--border-accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>{info.flag ?? COUNTRY_FEEDS[countryCode]?.flag}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{info.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{region}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', background: 'var(--accent-soft)', border: '1px solid var(--border-accent)', borderRadius: '20px' }}>
          <span style={{ fontSize: '0.75rem' }}>🏛️</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-text)' }}>{capital}</span>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {localTime && (
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-accent)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-text)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>🕐 Local Time</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{localTime}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{localDate}</span>
          </div>
        )}
        {weather && (
          <div style={{ background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--success)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>☁️ Weather · {capital}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>{formatTemp(weather.temperature, settings)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wLabel} · 💨 {formatWind(weather.windspeed, settings)}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
        <StatCard emoji="👥" label="Population"   value={population} sub="2023 estimate" />
        <StatCard emoji="📐" label="Area"          value={area} />
        <StatCard emoji="💰" label="Currency"      value={currency?.name ?? '—'} sub={currency ? [currency.symbol, currency.code].filter(Boolean).join(' · ') : undefined} />
        <StatCard emoji="🗣️" label="Languages"    value={languages || '—'} />
        <StatCard emoji="📞" label="Dial Code"     value={dialCode || '—'} />
        <StatCard emoji="🌐" label="Internet TLD"  value={tld} />
        <StatCard emoji="🚗" label="Driving Side"  value={info.drivesOn === 'left' ? 'Left-hand' : 'Right-hand'} />
        <StatCard emoji="🌊" label="Geography"     value={landlocked} />
        <StatCard emoji="🗺️" label="Land Borders" value={borders} />
      </div>
    </div>
  )
}

// ─── RSS fetcher / parser ─────────────────────────────────────────────────────

async function fetchRSS(url) {
  const bust = `&_t=${Math.floor(Date.now() / 60000)}`

  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(15000), cache: 'no-store',
    })
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<item>') || text.includes('<entry>')) return parseRSS(text)
    }
  } catch { /* fall through */ }

  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}${bust}`, { signal: AbortSignal.timeout(15000) })
    if (res.ok) {
      const json = await res.json()
      if (json.status === 'ok' && json.items?.length) {
        return sortByDate(json.items.slice(0, 12).map((item) => {
          const extractImg = (str) => { const m = (str || '').match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : null }
          const rawImg =
            (item.thumbnail && item.thumbnail.startsWith('http') ? item.thumbnail : null) ||
            (item.enclosure?.link && item.enclosure.link.startsWith('http') ? item.enclosure.link : null) ||
            extractImg(item.content) || extractImg(item.description) || null
          return {
            title:       item.title ?? '',
            description: (item.description ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220),
            link:        item.link ?? '',
            image:       rawImg,
            pubDate:     item.pubDate ?? null,
          }
        }).filter((a) => a.title && a.link))
      }
    }
  } catch { /* fall through */ }

  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.contents) throw new Error('Empty response')
  return parseRSS(json.contents)
}

function sortByDate(articles) {
  return articles.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate) : new Date(0)
    const db = b.pubDate ? new Date(b.pubDate) : new Date(0)
    return db - da
  })
}

function parseRSS(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const isAtom = !!doc.querySelector('feed')
  const items  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item'))

  return sortByDate(items.slice(0, 12).map((item) => {
    const get  = (sel) => item.querySelector(sel)?.textContent?.trim() ?? ''
    const attr = (sel, a) => item.querySelector(sel)?.getAttribute(a) ?? ''
    const title = get('title').replace(/<!\[CDATA\[|\]\]>/g, '')
    const rawDesc = get('description') || get('summary') || get('content')
    const description = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220)
    const linkEl = item.querySelector('link')
    const link   = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || attr('guid', 'href') || get('guid')
    const rawXml = item.outerHTML || ''
    const extractImg = (str) => { const m = str.match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : null }
    const rawImage =
      attr('enclosure[type^="image"]', 'url') ||
      attr('media\\:content[medium="image"], media\\:content[type^="image"]', 'url') ||
      attr('media\\:content[url]', 'url') ||
      attr('media\\:thumbnail', 'url') ||
      attr('media\\:content', 'url') ||
      get('media\\:thumbnail') ||
      (() => { const m = rawXml.match(/url="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/i); return m ? m[1] : null })() ||
      extractImg(rawDesc) ||
      extractImg(get('content\\:encoded') || get('content')) ||
      (() => { const m = rawXml.match(/<itunes:image[^>]+href="([^"]+)"/i); return m ? m[1] : null })() ||
      null
    const image = rawImage && rawImage.startsWith('http') ? rawImage : null
    const pubDate = get('pubDate') || get('published') || get('updated') || null
    return { title, description, link, image, pubDate }
  }).filter((a) => a.title && a.link))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr)
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const COUNTRY_ORDER = [
  'US', 'CN', 'DE', 'GB', 'JP', 'FR', 'AU', 'BR', 'IT', 'ES', 'NL', 'SE', 'PL', 'AE', 'PH', 'LT',
  'NG', 'ZA', 'EG', 'KE', 'GH', 'ET', 'TZ', 'UG', 'ZW', 'ZM', 'RW', 'MA', 'TN', 'SN', 'CI', 'CM',
]

// Stopwords for trending-keyword extraction
const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','in','on','at','to','for','with','by','from','as','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its',
  'he','she','him','her','they','them','their','we','us','our','you','your','my','mine','i','me','not','no','yes','so','if','than',
  'then','about','after','before','over','under','up','down','out','new','say','says','said','one','two','three','first','last','more',
  'most','some','any','all','now','time','year','years','day','days','week','today','tomorrow','yesterday','here','there','when',
  'where','what','who','how','why','which','into','onto','off','back','also','just','only','still','very','much','many','own','much',
  'vs','via','via','per','near','against','amid','among','since','while','because','though','although','toward','towards','across',
  'between','within','without','around','inside','outside','along','upon','off','re','amp','nbsp','said','told','told','told',
])
function extractKeywords(articles, limit = 10) {
  const counts = new Map()
  for (const a of articles) {
    const text = `${a.title || ''} ${a.description || ''}`.toLowerCase()
    // Split on non-word while keeping accented chars
    const tokens = text.split(/[^a-zà-ÿ0-9]+/i).filter(Boolean)
    for (const t of tokens) {
      if (t.length < 4) continue
      if (STOPWORDS.has(t)) continue
      if (/^\d+$/.test(t)) continue
      counts.set(t, (counts.get(t) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

// ─── useFeed hook (shared cache) ──────────────────────────────────────────────

// Module-scope cache so revisiting a feed is instant (and enables cross-component sharing).
const feedCache = new Map() // url -> { articles, ts }
const FEED_STALE_MS = 5 * 60 * 1000
const cacheListeners = new Set()
function notifyCache() { cacheListeners.forEach((fn) => fn()) }
function subscribeCache(fn) { cacheListeners.add(fn); return () => cacheListeners.delete(fn) }

function useFeed(feed) {
  const [articles, setArticles]   = useState(() => feedCache.get(feed.url)?.articles ?? [])
  const [loading,  setLoading]    = useState(!feedCache.has(feed.url))
  const [error,    setError]      = useState(null)
  const [lastFetch, setLastFetch] = useState(() => feedCache.get(feed.url)?.ts ?? null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchRSS(feed.url)
      feedCache.set(feed.url, { articles: data, ts: new Date() })
      notifyCache()
      setArticles(data)
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [feed.url])

  // Load on mount if cache is absent or stale
  useEffect(() => {
    const cached = feedCache.get(feed.url)
    if (!cached || Date.now() - (cached.ts?.getTime?.() ?? 0) > FEED_STALE_MS) load()
    else { setArticles(cached.articles); setLastFetch(cached.ts); setLoading(false) }
  }, [feed.url, load])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, FEED_STALE_MS)
    return () => clearInterval(id)
  }, [load])

  return { articles, loading, error, lastFetch, refresh: load }
}

// ─── Bookmark toggle (shared by card + row) ──────────────────────────────────
// Sits inside the article <a>, so it stops the click from opening the link.
// Visually small, but the hit area is 36px (44px on touch) via .news-bm.
function BookmarkToggle({ saved, onToggle }) {
  return (
    <button
      type="button"
      className={`news-bm${saved ? ' saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
      title={saved ? 'Remove bookmark' : 'Bookmark'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
    >
      <Bookmark size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}

// ─── NewsCard (grid / column) ─────────────────────────────────────────────────

function NewsCard({ article, sourceName, isRead, isBookmarked, onBookmark, onMarkRead }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      onClick={() => onMarkRead?.(article.link)}
      className={`news-card${isRead ? ' is-read' : ''}`}>

      {article.image && !imgErr && (
        <div className="news-card-media">
          <img src={article.image} alt="" loading="lazy" onError={() => setImgErr(true)} />
          {isRead && (
            <div className="news-read-badge">
              <Check size={10} aria-hidden="true" /> Read
            </div>
          )}
        </div>
      )}

      <div className="news-card-body">
        <div className="news-meta">
          <span className="news-source">{sourceName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {article.pubDate && (
              <span className="news-time">
                <Clock size={11} strokeWidth={1.6} aria-hidden="true" />
                {timeAgo(article.pubDate)}
              </span>
            )}
            <BookmarkToggle saved={isBookmarked} onToggle={() => onBookmark?.(article, sourceName)} />
          </div>
        </div>

        <h3 className="news-title">{article.title}</h3>

        {article.description && (
          <p className="news-desc">
            {article.description.length > 180 ? article.description.slice(0, 180) + '…' : article.description}
          </p>
        )}

        <div className="news-readmore">
          Read more <ExternalLink size={11} aria-hidden="true" />
        </div>
      </div>
    </a>
  )
}

// ─── NewsListRow (compact list) ───────────────────────────────────────────────

function NewsListRow({ article, sourceName, isRead, isBookmarked, onBookmark, onMarkRead }) {
  const [imgErr, setImgErr] = useState(false)
  const hasImg = article.image && !imgErr
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      onClick={() => onMarkRead?.(article.link)}
      className={`news-row${hasImg ? ' has-img' : ''}${isRead ? ' is-read' : ''}`}>
      {hasImg && (
        <div className="news-row-thumb">
          <img src={article.image} alt="" loading="lazy" onError={() => setImgErr(true)} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div className="news-meta-inline">
          <span className="news-source">{sourceName}</span>
          {article.pubDate && (
            <span className="news-time">
              · <Clock size={11} strokeWidth={1.6} aria-hidden="true" /> {timeAgo(article.pubDate)}
            </span>
          )}
        </div>
        <div className="news-row-title">{article.title}</div>
        {article.description && <div className="news-row-desc">{article.description}</div>}
      </div>
      <BookmarkToggle saved={isBookmarked} onToggle={() => onBookmark?.(article, sourceName)} />
    </a>
  )
}

// ─── FeedColumn (one feed per column, original layout) ────────────────────────

function FeedColumn({ feed, category, search, readSet, bookmarkSet, onBookmark, onMarkRead }) {
  const { articles, loading, error, lastFetch, refresh } = useFeed(feed)
  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    let arr = articles
    if (category !== 'all') {
      arr = arr.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase()
        return (CATEGORY_KEYWORDS[category] ?? []).some((kw) => text.includes(kw))
      })
    }
    if (q) {
      arr = arr.filter((a) => `${a.title} ${a.description}`.toLowerCase().includes(q))
    }
    return arr
  }, [articles, category, q])

  const catMeta = CATEGORIES.find((c) => c.id === category)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flexWrap: 'wrap' }}>
          <Newspaper size={14} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} aria-hidden="true" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{feed.name}</span>
          {lastFetch && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {timeAgo(lastFetch)}</span>
          )}
          {(category !== 'all' || q) && !loading && (
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {filtered.length}/{articles.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" icon={RefreshCw} loading={loading} onClick={refresh}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <InlineError message={error} onRetry={refresh} />
      )}

      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} h={80} r={10} />)}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{q ? '🔍' : catMeta?.emoji}</div>
          {q ? `No matches for "${search}" in this feed.` : `No ${catMeta?.label} articles in this feed right now.`}
        </div>
      )}

      {!loading && !error && filtered.map((article, i) => (
        <NewsCard key={i} article={article} sourceName={feed.name}
          isRead={readSet.has(article.link)}
          isBookmarked={bookmarkSet.has(article.link)}
          onBookmark={onBookmark} onMarkRead={onMarkRead} />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULTS = { view: 'global', country: 'DE', category: 'all', layout: 'columns' }

export default function NewsTracker() {
  const saved = readJSON(LS.prefs, {})
  const [view,     setView]     = useState(saved.view     ?? DEFAULTS.view)
  const [country,  setCountry]  = useState(saved.country  ?? DEFAULTS.country)
  const [category, setCategory] = useState(saved.category ?? DEFAULTS.category)
  const [layout,   setLayout]   = useState(saved.layout   ?? DEFAULTS.layout)   // columns | unified | list
  const [search,   setSearch]   = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [bookmarks, setBookmarks] = useState(() => readJSON(LS.bookmarks, []))
  const [readMap,   setReadMap]   = useState(() => readJSON(LS.read, {}))
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [sourceIdx, setSourceIdx] = useState(0)   // Columns view below desktop: one source at a time
  const { isMobile, isDesktop } = useBreakpoint()
  const toast = useToast()
  const locationDetected = useRef(!!saved.country) // don't overwrite persisted country on reload
  const [cacheTick, setCacheTick] = useState(0)

  // Re-render main when any feed populates its cache entry
  useEffect(() => subscribeCache(() => setCacheTick((n) => n + 1)), [])

  // Persist prefs
  useEffect(() => { writeJSON(LS.prefs, { view, country, category, layout }) }, [view, country, category, layout])
  useEffect(() => { writeJSON(LS.bookmarks, bookmarks) }, [bookmarks])
  useEffect(() => { writeJSON(LS.read, readMap) }, [readMap])

  // A different feed set starts on its first source
  useEffect(() => { setSourceIdx(0) }, [view, country])

  // Detect location only once (first visit) — persisted selection wins afterwards
  useEffect(() => {
    if (locationDetected.current) return
    locationDetected.current = true
    async function detect() {
      const services = [
        async () => { const r = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) }); if (r.ok) return (await r.json()).country?.toUpperCase() },
        async () => { const r = await fetch('https://ip-api.com/json?fields=countryCode', { signal: AbortSignal.timeout(5000) }); if (r.ok) return (await r.json()).countryCode?.toUpperCase() },
      ]
      for (const svc of services) {
        try { const code = await svc(); if (code && COUNTRY_FEEDS[code]) { setCountry(code); return } } catch { /* try next */ }
      }
      const code = (navigator.language || '').split('-')[1]?.toUpperCase()
      if (code && COUNTRY_FEEDS[code]) setCountry(code)
    }
    detect()
  }, [])

  // Bookmark / read actions
  const bookmarkSet = useMemo(() => new Set(bookmarks.map((b) => b.link)), [bookmarks])
  const readSet     = useMemo(() => new Set(Object.keys(readMap)), [readMap])

  const toggleBookmark = useCallback((article, sourceName) => {
    const wasSaved = bookmarkSet.has(article.link)
    setBookmarks((prev) => {
      if (prev.some((b) => b.link === article.link)) return prev.filter((b) => b.link !== article.link)
      return [{ title: article.title, description: article.description, link: article.link, image: article.image, pubDate: article.pubDate, sourceName, savedAt: Date.now() }, ...prev].slice(0, 100)
    })
    toast(wasSaved ? 'Bookmark removed' : 'Bookmarked', { tone: wasSaved ? 'neutral' : 'success' })
  }, [bookmarkSet, toast])

  const markRead = useCallback((link) => {
    setReadMap((prev) => {
      if (prev[link]) return prev
      const next = { ...prev, [link]: Date.now() }
      // Cap to most-recent 500 to keep localStorage small
      const entries = Object.entries(next)
      if (entries.length > 500) {
        entries.sort((a, b) => b[1] - a[1])
        return Object.fromEntries(entries.slice(0, 500))
      }
      return next
    })
  }, [])

  // Active feed list
  const activeFeeds = view === 'global' ? GLOBAL_FEEDS : (COUNTRY_FEEDS[country]?.feeds ?? [])
  const visibleFeeds = activeFeeds.slice(0, 3)
  const countryMeta = COUNTRY_FEEDS[country]
  const activeSource = visibleFeeds[Math.min(sourceIdx, visibleFeeds.length - 1)]

  // For unified/list views, merge all articles across visible feeds
  const allFeedData = visibleFeeds.map((f) => ({ feed: f, data: feedCache.get(f.url) }))
  const anyLoading = allFeedData.some(({ data }) => !data)

  // Fetch every visible feed so unified view has data (hook bound per feed)
  // We render invisible <FeedLoader/> markers to ensure the cache is populated.
  const mergedArticles = useMemo(() => {
    if (layout === 'columns') return []
    const merged = []
    for (const { feed, data } of allFeedData) {
      if (!data?.articles) continue
      for (const a of data.articles) merged.push({ ...a, _sourceName: feed.name })
    }
    const q = search.trim().toLowerCase()
    let arr = merged
    if (category !== 'all') {
      arr = arr.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase()
        return (CATEGORY_KEYWORDS[category] ?? []).some((kw) => text.includes(kw))
      })
    }
    if (q) arr = arr.filter((a) => `${a.title} ${a.description}`.toLowerCase().includes(q))
    arr.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
    return arr
  // allFeedData changes reference each render; depend on the URLs + tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, category, search, visibleFeeds.map((f) => f.url).join('|'), cacheTick])

  // Trending keywords computed from currently loaded articles
  const trending = useMemo(() => {
    const all = []
    for (const f of visibleFeeds) {
      const d = feedCache.get(f.url)
      if (d?.articles) all.push(...d.articles)
    }
    return extractKeywords(all, 8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFeeds.map((f) => f.url).join('|'), cacheTick])

  // Country picker
  const closePicker = () => { setPickerOpen(false); setCountrySearch('') }
  const pickCountry = (code) => { setCountry(code); setView('country'); closePicker() }
  const countryMatches = COUNTRY_ORDER.filter((code) => {
    const q = countrySearch.toLowerCase()
    return !q || COUNTRY_FEEDS[code].label.toLowerCase().includes(q) || code.toLowerCase().includes(q)
  })

  const savedStyle = bookmarks.length ? { color: 'var(--warning)', fill: 'var(--warning)' } : undefined
  const bookmarksButton = (
    <Button variant="secondary" onClick={() => setShowBookmarks(true)} aria-label={`Bookmarks (${bookmarks.length})`}>
      <Bookmark size={14} strokeWidth={1.8} style={savedStyle} aria-hidden="true" />
      {!isMobile && 'Bookmarks'}
      {bookmarks.length > 0 && <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{bookmarks.length}</span>}
    </Button>
  )

  const feedProps = { category, search, readSet, bookmarkSet, onBookmark: toggleBookmark, onMarkRead: markRead }

  return (
    <div className="news-page">

      {/* Heading — on phones the app header already names the page */}
      {!isMobile && (
        <div className="news-heading">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 750, lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.04em' }}>News</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Live RSS feeds — global headlines and local news, no API key needed.
            </p>
          </div>
          {bookmarksButton}
        </div>
      )}

      {/* Controls — one row on desktop, two compact rows on phones */}
      <Card padding="sm" className="news-controls">
        <div className="news-controls-row">
          {/* Tapping the already-selected country tab opens the picker (the
              chevron hints at it) — on phones there's no room for "Change". */}
          <Tabs label="News scope" className="news-scope-tabs" value={view}
            onChange={(v) => (v === 'country' && view === 'country' ? setPickerOpen(true) : setView(v))}
            options={[
              { value: 'global',  label: 'Global', icon: Globe },
              { value: 'country', label: `${countryMeta?.flag ?? ''} ${countryMeta?.label ?? 'Country'}`.trim(),
                iconRight: view === 'country' ? ChevronDown : undefined },
            ]} />
          {view === 'country' && !isMobile && (
            <Button variant="ghost" size="sm" iconRight={ChevronDown} onClick={() => setPickerOpen(true)}>
              Change
            </Button>
          )}
          {isMobile && <div style={{ marginLeft: 'auto' }}>{bookmarksButton}</div>}
        </div>
        <div className="news-controls-row">
          <div className="news-search">
            <Search size={14} className="news-search-icon" aria-hidden="true" />
            <input type="text" placeholder="Search headlines…" aria-label="Search headlines" value={search}
              onChange={(e) => setSearch(e.target.value)} className="input" />
            {search && <IconButton icon={X} label="Clear search" size="sm" className="news-search-clear" onClick={() => setSearch('')} />}
          </div>
          <Tabs label="Layout" iconOnly={!isDesktop} className="news-layout-tabs" value={layout} onChange={setLayout} options={[
            { value: 'columns', label: 'Columns', icon: LayoutGrid },
            { value: 'unified', label: 'Unified', icon: Rows },
            { value: 'list',    label: 'List',    icon: ListIcon },
          ]} />
        </div>
      </Card>

      {/* Category chips — one swipeable row */}
      <div className="chip-row" role="group" aria-label="Category">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
            aria-pressed={category === cat.id}
            className={`chip${category === cat.id ? ' active' : ''}`}>
            <span aria-hidden="true">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Trending keywords — tap to search, tap again to clear */}
      {trending.length > 0 && (
        <div className="news-trending">
          <span className="news-trending-label"><TrendingUp size={13} aria-hidden="true" /> Trending</span>
          <div className="news-trending-chips">
            {trending.map(({ word, count }) => {
              const on = search.toLowerCase() === word
              return (
                <button key={word} type="button" onClick={() => setSearch(on ? '' : word)}
                  aria-pressed={on} className={`chip chip-sm${on ? ' active' : ''}`}>
                  {word}<span className="chip-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Country stats */}
      {view === 'country' && <CountryStats key={country} countryCode={country} />}

      {/* Source count hint (quieter, pushed below) */}
      {!isMobile && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          {visibleFeeds.length} source{visibleFeeds.length !== 1 ? 's' : ''} · up to 12 articles each · auto-refresh 5 min
        </div>
      )}

      {/* Invisible feed loaders to keep cache warm for unified/list layouts */}
      {layout !== 'columns' && visibleFeeds.map((feed) => (
        <FeedLoader key={`${view}-${country}-${feed.id}`} feed={feed} />
      ))}

      {/* Feed body — Columns: side by side on desktop, one source per tab below */}
      {layout === 'columns' && isDesktop && (
        <div className="news-columns" style={{ gridTemplateColumns: `repeat(${visibleFeeds.length}, minmax(0, 1fr))` }}>
          {visibleFeeds.map((feed) => (
            <FeedColumn key={`${view}-${country}-${feed.id}`} feed={feed} {...feedProps} />
          ))}
        </div>
      )}

      {layout === 'columns' && !isDesktop && activeSource && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {visibleFeeds.length > 1 && (
            <Tabs label="Source" block value={activeSource.id}
              onChange={(id) => setSourceIdx(visibleFeeds.findIndex((f) => f.id === id))}
              options={visibleFeeds.map((f) => ({ value: f.id, label: f.name }))} />
          )}
          <FeedColumn key={`${view}-${country}-${activeSource.id}`} feed={activeSource} {...feedProps} />
        </div>
      )}

      {layout === 'unified' && <UnifiedGrid articles={mergedArticles} loading={anyLoading} {...feedProps} />}
      {layout === 'list'    && <UnifiedList articles={mergedArticles} loading={anyLoading} {...feedProps} />}

      {/* Country picker */}
      <Sheet open={pickerOpen} onClose={closePicker} title="Choose a country" width={420}>
        <div className="news-search" style={{ marginBottom: '0.75rem' }}>
          <Search size={14} className="news-search-icon" aria-hidden="true" />
          <input type="text" placeholder="Search country…" aria-label="Search country" value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)} className="input" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {countryMatches.map((code) => {
            const meta = COUNTRY_FEEDS[code]
            const current = country === code
            return (
              <button key={code} type="button" onClick={() => pickCountry(code)}
                aria-current={current || undefined}
                className={`nav-item${current ? ' active' : ''}`}>
                <span aria-hidden="true">{meta.flag}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{meta.label}</span>
                {current && <Check size={14} aria-hidden="true" />}
              </button>
            )
          })}
          {countryMatches.length === 0 && (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No countries found</div>
          )}
        </div>
      </Sheet>

      {/* Bookmarks */}
      <BookmarksPanel open={showBookmarks} bookmarks={bookmarks} onClose={() => setShowBookmarks(false)}
        onRemove={(link) => setBookmarks((prev) => prev.filter((b) => b.link !== link))}
        onClear={() => { if (confirm('Remove all bookmarks?')) setBookmarks([]) }} />
    </div>
  )
}

// ─── FeedLoader — invisible component that populates the shared cache ─────────

function FeedLoader({ feed }) {
  useFeed(feed)
  return null
}

// ─── Unified grid ─────────────────────────────────────────────────────────────

function UnifiedGrid({ articles, loading, search, category, readSet, bookmarkSet, onBookmark, onMarkRead }) {
  if (loading && articles.length === 0) {
    return (
      <div className="news-grid">
        {[...Array(6)].map((_, i) => <Skeleton key={i} h={280} r={10} />)}
      </div>
    )
  }
  if (!articles.length) return <EmptyState search={search} category={category} />
  return (
    <div className="news-grid">
      {articles.map((a, i) => (
        <NewsCard key={`${a.link}-${i}`} article={a} sourceName={a._sourceName}
          isRead={readSet.has(a.link)} isBookmarked={bookmarkSet.has(a.link)}
          onBookmark={onBookmark} onMarkRead={onMarkRead} />
      ))}
    </div>
  )
}

function UnifiedList({ articles, loading, search, category, readSet, bookmarkSet, onBookmark, onMarkRead }) {
  if (loading && articles.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} h={80} r={10} />)}
      </div>
    )
  }
  if (!articles.length) return <EmptyState search={search} category={category} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {articles.map((a, i) => (
        <NewsListRow key={`${a.link}-${i}`} article={a} sourceName={a._sourceName}
          isRead={readSet.has(a.link)} isBookmarked={bookmarkSet.has(a.link)}
          onBookmark={onBookmark} onMarkRead={onMarkRead} />
      ))}
    </div>
  )
}

function EmptyState({ search, category }) {
  const catMeta = CATEGORIES.find((c) => c.id === category)
  return search
    ? <EmptyNotice icon={Search} title={`No matches for “${search}”`} hint="Try a different word, or clear the search." />
    : <EmptyNotice icon={Newspaper} title={`No ${catMeta?.label} articles right now`} hint="Feeds refresh every 5 minutes — or try another category." />
}

// ─── Bookmarks (bottom sheet on phones, dialog on larger screens) ────────────

function BookmarksPanel({ open, bookmarks, onClose, onRemove, onClear }) {
  return (
    <Sheet open={open} onClose={onClose} width={460}
      title={`Bookmarks${bookmarks.length ? ` · ${bookmarks.length}` : ''}`}
      footer={bookmarks.length > 0 && <Button variant="danger" size="sm" onClick={onClear}>Clear all</Button>}>
      {bookmarks.length === 0 ? (
        <EmptyNotice art="bookmarks" title="No bookmarks yet" hint="Tap the bookmark icon on any article to save it here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {bookmarks.map((b) => (
            <div key={b.link} style={{ position: 'relative' }}>
              <a href={b.link} target="_blank" rel="noopener noreferrer" className="news-saved">
                <div className="news-source" style={{ marginBottom: '0.2rem' }}>{b.sourceName}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '0.2rem' }}>{b.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saved {timeAgo(new Date(b.savedAt).toISOString())}</div>
              </a>
              <IconButton icon={X} label="Remove bookmark" size="sm" className="news-saved-remove" onClick={() => onRemove(b.link)} />
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
