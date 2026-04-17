import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  RefreshCw, ExternalLink, AlertCircle, Globe, Newspaper, ChevronDown, Clock,
  Search, Bookmark, LayoutGrid, Rows, List as ListIcon, X, TrendingUp, Check,
} from 'lucide-react'

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

function CountryStats({ countryCode }) {
  const [info, setInfo]       = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [now, setNow]         = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setInfo(null); setWeather(null); setLoading(true); setError(null)
    async function load() {
      try {
        const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`)
        if (!res.ok) throw new Error('Country data unavailable')
        const [c] = await res.json()
        setInfo(c)
        const [lat, lon] = c.capitalInfo?.latlng ?? [c.latlng?.[0], c.latlng?.[1]]
        if (lat != null && lon != null) {
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&wind_speed_unit=kmh`)
          const wData = await wRes.json()
          setWeather(wData.current_weather)
        }
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    load()
  }, [countryCode])

  const tz = COUNTRY_TIMEZONES[countryCode]
  const localTime = tz ? now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : null
  const localDate = tz ? now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short' }) : null

  if (loading) return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem' }}>
      <div className="spinner" style={{ width: 16, height: 16 }} />
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading country stats…</span>
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', color: '#f87171', fontSize: '0.78rem' }}>
      <AlertCircle size={14} /> {error}
    </div>
  )
  if (!info) return null

  const currency   = Object.values(info.currencies ?? {})[0]
  const languages  = Object.values(info.languages ?? {}).join(', ')
  const dialCode   = (info.idd?.root ?? '') + (info.idd?.suffixes?.[0] ?? '')
  const tld        = info.tld?.[0] ?? '—'
  const population = info.population ? info.population.toLocaleString() : '—'
  const area       = info.area ? info.area.toLocaleString() + ' km²' : '—'
  const capital    = info.capital?.[0] ?? '—'
  const region     = [info.subregion, info.region].filter(Boolean).join(' · ')
  const landlocked = info.landlocked ? '🔒 Landlocked' : '🌊 Coastal'
  const borders    = info.borders?.length ? `${info.borders.length} countries` : 'No land borders'
  const wCode = weather?.weathercode
  const wLabel = WMO[wCode] ?? '🌡️ Unknown'

  function StatCard({ emoji, label, value, sub }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{emoji} {label}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{value}</span>
        {sub && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{sub}</span>}
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', background: 'linear-gradient(135deg, rgba(167,139,250,0.04) 0%, transparent 60%)', border: '1px solid rgba(167,139,250,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>{info.flag ?? COUNTRY_FEEDS[countryCode]?.flag}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{info.name?.common}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{region}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: '20px' }}>
          <span style={{ fontSize: '0.68rem' }}>🏛️</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>{capital}</span>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {localTime && (
          <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.62rem', color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>🕐 Local Time</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{localTime}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{localDate}</span>
          </div>
        )}
        {weather && (
          <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.62rem', color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>☁️ Weather · {capital}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>{weather.temperature}°C</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{wLabel} · 💨 {weather.windspeed} km/h</span>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
        <StatCard emoji="👥" label="Population"   value={population} />
        <StatCard emoji="📐" label="Area"          value={area} />
        <StatCard emoji="💰" label="Currency"      value={currency?.name ?? '—'} sub={currency ? `${currency.symbol} · ${Object.keys(info.currencies)[0]}` : undefined} />
        <StatCard emoji="🗣️" label="Languages"    value={languages || '—'} />
        <StatCard emoji="📞" label="Dial Code"     value={dialCode || '—'} />
        <StatCard emoji="🌐" label="Internet TLD"  value={tld} />
        <StatCard emoji="🚗" label="Driving Side"  value={info.car?.side === 'right' ? 'Right-hand' : info.car?.side === 'left' ? 'Left-hand' : '—'} />
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

// ─── NewsCard (grid / column) ─────────────────────────────────────────────────

function NewsCard({ article, sourceName, isRead, isBookmarked, onBookmark, onMarkRead }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      onClick={() => onMarkRead?.(article.link)}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
        overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s', cursor: 'pointer',
        opacity: isRead ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>

      {article.image && !imgErr && (
        <div style={{ width: '100%', height: 160, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          <img src={article.image} alt="" onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {isRead && (
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(10,10,15,0.9)', padding: '0.18rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <Check size={9} /> Read
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{sourceName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {article.pubDate && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                <Clock size={9} strokeWidth={1.5} />
                {timeAgo(article.pubDate)}
              </span>
            )}
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookmark?.(article, sourceName) }}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: isBookmarked ? '#facc15' : 'var(--text-muted)', display: 'flex' }}>
              <Bookmark size={12} fill={isBookmarked ? '#facc15' : 'none'} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {article.title}
        </h3>

        {article.description && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {article.description.length > 180 ? article.description.slice(0, 180) + '…' : article.description}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#a78bfa' }}>
          Read more <ExternalLink size={10} />
        </div>
      </div>
    </a>
  )
}

// ─── NewsListRow (compact list) ───────────────────────────────────────────────

function NewsListRow({ article, sourceName, isRead, isBookmarked, onBookmark, onMarkRead }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      onClick={() => onMarkRead?.(article.link)}
      style={{
        display: 'grid', gridTemplateColumns: article.image && !imgErr ? '96px 1fr auto' : '1fr auto',
        gap: '0.75rem', padding: '0.6rem 0.75rem', textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        alignItems: 'center', transition: 'all 0.15s', opacity: isRead ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>
      {article.image && !imgErr && (
        <div style={{ width: 96, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <img src={article.image} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          <span>{sourceName}</span>
          {article.pubDate && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              · <Clock size={9} /> {timeAgo(article.pubDate)}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '0.15rem' }}>
          {article.title}
        </div>
        {article.description && (
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {article.description}
          </div>
        )}
      </div>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookmark?.(article, sourceName) }}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: isBookmarked ? '#facc15' : 'var(--text-muted)', display: 'flex', alignSelf: 'center' }}>
        <Bookmark size={14} fill={isBookmarked ? '#facc15' : 'none'} strokeWidth={1.8} />
      </button>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Newspaper size={14} strokeWidth={1.5} style={{ color: '#a78bfa' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{feed.name}</span>
          {lastFetch && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>· {timeAgo(lastFetch)}</span>
          )}
          {(category !== 'all' || q) && !loading && (
            <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
              {filtered.length}/{articles.length}
            </span>
          )}
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost"
          style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
          <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem' }}>
          <AlertCircle size={14} strokeWidth={1.5} /> Failed to load: {error}
        </div>
      )}

      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: '10px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
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
  const [showCountryDrop, setShowCountryDrop] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [bookmarks, setBookmarks] = useState(() => readJSON(LS.bookmarks, []))
  const [readMap,   setReadMap]   = useState(() => readJSON(LS.read, {}))
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const locationDetected = useRef(!!saved.country) // don't overwrite persisted country on reload
  const [cacheTick, setCacheTick] = useState(0)

  // Re-render main when any feed populates its cache entry
  useEffect(() => subscribeCache(() => setCacheTick((n) => n + 1)), [])

  // Persist prefs
  useEffect(() => { writeJSON(LS.prefs, { view, country, category, layout }) }, [view, country, category, layout])
  useEffect(() => { writeJSON(LS.bookmarks, bookmarks) }, [bookmarks])
  useEffect(() => { writeJSON(LS.read, readMap) }, [readMap])

  // Responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close country picker on outside click
  useEffect(() => {
    if (!showCountryDrop) return
    const close = (e) => { if (!e.target.closest('[data-country-picker]')) { setShowCountryDrop(false); setCountrySearch('') } }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showCountryDrop])

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
    setBookmarks((prev) => {
      if (prev.some((b) => b.link === article.link)) return prev.filter((b) => b.link !== article.link)
      return [{ title: article.title, description: article.description, link: article.link, image: article.image, pubDate: article.pubDate, sourceName, savedAt: Date.now() }, ...prev].slice(0, 100)
    })
  }, [])

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1280 }}>

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
            <span className="gradient-text">News Tracker</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Live RSS feeds — global headlines and local news, no API key needed.
          </p>
        </div>
        <button onClick={() => setShowBookmarks(true)} className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem' }}>
          <Bookmark size={13} fill={bookmarks.length ? '#facc15' : 'none'} color={bookmarks.length ? '#facc15' : undefined} strokeWidth={1.8} />
          Bookmarks {bookmarks.length > 0 && <span style={{ color: '#facc15', fontWeight: 700 }}>{bookmarks.length}</span>}
        </button>
      </div>

      {/* Controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
        <div className="segmented">
          <button className={`segmented-option ${view === 'global' ? 'active' : ''}`}
            onClick={() => setView('global')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Globe size={12} /> Global
          </button>
          <button className={`segmented-option ${view === 'country' ? 'active' : ''}`}
            onClick={() => setView('country')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {countryMeta?.flag} {countryMeta?.label ?? 'Country'}
          </button>
        </div>

        {view === 'country' && (
          <div style={{ position: 'relative' }} data-country-picker>
            <button className="btn-ghost" onClick={() => { setShowCountryDrop((v) => !v); setCountrySearch('') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem' }}>
              {countryMeta?.flag} {countryMeta?.label}
              <ChevronDown size={13} style={{ transform: showCountryDrop ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showCountryDrop && (
              <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 220 }}>
                <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <input autoFocus type="text" placeholder="Search country…" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {COUNTRY_ORDER
                    .filter((code) => { const q = countrySearch.toLowerCase(); return !q || COUNTRY_FEEDS[code].label.toLowerCase().includes(q) || code.toLowerCase().includes(q) })
                    .map((code) => {
                      const meta = COUNTRY_FEEDS[code]
                      return (
                        <button key={code} onClick={() => { setCountry(code); setShowCountryDrop(false); setCountrySearch('') }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', textAlign: 'left', padding: '0.55rem 1rem', background: country === code ? 'rgba(139,92,246,0.1)' : 'transparent', color: country === code ? '#a78bfa' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <span>{meta.flag}</span><span>{meta.label}</span>
                        </button>
                      )
                    })}
                  {COUNTRY_ORDER.filter((code) => { const q = countrySearch.toLowerCase(); return !q || COUNTRY_FEEDS[code].label.toLowerCase().includes(q) || code.toLowerCase().includes(q) }).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search headlines…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input" style={{ paddingLeft: 30, paddingRight: search ? 30 : 12, fontSize: '0.82rem' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Layout toggle */}
        <div className="segmented" style={{ marginLeft: 'auto' }}>
          <button className={`segmented-option ${layout === 'columns' ? 'active' : ''}`} onClick={() => setLayout('columns')}
            title="Columns per source" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <LayoutGrid size={11} /> Columns
          </button>
          <button className={`segmented-option ${layout === 'unified' ? 'active' : ''}`} onClick={() => setLayout('unified')}
            title="Unified grid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Rows size={11} /> Unified
          </button>
          <button className={`segmented-option ${layout === 'list' ? 'active' : ''}`} onClick={() => setLayout('list')}
            title="Compact list" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ListIcon size={11} /> List
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid',
              cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.15s',
              background: category === cat.id ? 'rgba(139,92,246,0.15)' : 'transparent',
              borderColor: category === cat.id ? 'rgba(139,92,246,0.5)' : 'var(--border)',
              color: category === cat.id ? '#a78bfa' : 'var(--text-muted)',
            }}>
            <span style={{ fontSize: '0.8rem' }}>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Trending keywords strip */}
      {trending.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.6rem 0.9rem', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: '10px' }}>
          <TrendingUp size={13} style={{ color: '#fb923c', flexShrink: 0 }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.25rem' }}>Trending</span>
          {trending.map(({ word, count }) => (
            <button key={word} onClick={() => setSearch(word)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: search.toLowerCase() === word ? 'rgba(251,146,60,0.25)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${search.toLowerCase() === word ? 'rgba(251,146,60,0.5)' : 'var(--border)'}`,
                color: search.toLowerCase() === word ? '#fb923c' : 'var(--text-secondary)',
                padding: '0.2rem 0.6rem', borderRadius: 999, cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 500,
              }}>
              {word}<span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Country stats */}
      {view === 'country' && <CountryStats key={country} countryCode={country} />}

      {/* Source count hint (quieter, pushed below) */}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {visibleFeeds.length} source{visibleFeeds.length !== 1 ? 's' : ''} · up to 12 articles each · auto-refresh 5 min
      </div>

      {/* Invisible feed loaders to keep cache warm for unified/list layouts */}
      {layout !== 'columns' && visibleFeeds.map((feed) => (
        <FeedLoader key={`${view}-${country}-${feed.id}`} feed={feed} />
      ))}

      {/* Feed body */}
      {layout === 'columns' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${visibleFeeds.length}, 1fr)`, gap: '1.25rem', alignItems: 'start' }}>
          {visibleFeeds.map((feed) => (
            <FeedColumn key={`${view}-${country}-${feed.id}`} feed={feed} category={category} search={search}
              readSet={readSet} bookmarkSet={bookmarkSet} onBookmark={toggleBookmark} onMarkRead={markRead} />
          ))}
        </div>
      )}

      {layout === 'unified' && (
        <UnifiedGrid articles={mergedArticles} loading={anyLoading} search={search} category={category}
          readSet={readSet} bookmarkSet={bookmarkSet} onBookmark={toggleBookmark} onMarkRead={markRead} />
      )}

      {layout === 'list' && (
        <UnifiedList articles={mergedArticles} loading={anyLoading} search={search} category={category}
          readSet={readSet} bookmarkSet={bookmarkSet} onBookmark={toggleBookmark} onMarkRead={markRead} />
      )}

      {/* Bookmarks panel */}
      {showBookmarks && (
        <BookmarksPanel bookmarks={bookmarks} onClose={() => setShowBookmarks(false)}
          onRemove={(link) => setBookmarks((prev) => prev.filter((b) => b.link !== link))}
          onClear={() => { if (confirm('Remove all bookmarks?')) setBookmarks([]) }} />
      )}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 280, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }
  if (!articles.length) return <EmptyState search={search} category={category} />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
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
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
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
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{search ? '🔍' : catMeta?.emoji}</div>
      {search ? <>No matches for <strong style={{ color: 'var(--text-primary)' }}>"{search}"</strong></> : <>No {catMeta?.label} articles right now.</>}
    </div>
  )
}

// ─── Bookmarks side panel ─────────────────────────────────────────────────────

function BookmarksPanel({ bookmarks, onClose, onRemove, onClear }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(420px, 100vw)', background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)', zIndex: 101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bookmark size={15} fill="#facc15" color="#facc15" />
            <span style={{ fontWeight: 700 }}>Bookmarks</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{bookmarks.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {bookmarks.length > 0 && (
              <button onClick={onClear} className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}>
                Clear all
              </button>
            )}
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {bookmarks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bookmark size={32} strokeWidth={1.2} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
              <div>No bookmarks yet.</div>
              <div style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>Tap the ★ on any article to save it.</div>
            </div>
          )}
          {bookmarks.map((b) => (
            <div key={b.link} style={{ position: 'relative' }}>
              <a href={b.link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '0.65rem 0.8rem', paddingRight: '2.25rem', textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>
                <div style={{ fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{b.sourceName}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '0.2rem' }}>{b.title}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Saved {timeAgo(new Date(b.savedAt).toISOString())}</div>
              </a>
              <button onClick={() => onRemove(b.link)} title="Remove"
                style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
