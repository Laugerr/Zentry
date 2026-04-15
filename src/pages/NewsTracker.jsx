import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, AlertCircle, Globe, Newspaper, ChevronDown, Clock } from 'lucide-react'

// ─── Feed catalogue ───────────────────────────────────────────────────────────

const GLOBAL_FEEDS = [
  { id: 'bbc-world',   name: 'BBC World',    url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'dw-english',  name: 'DW English',   url: 'https://rss.dw.com/xml/rss-en-all' },
  { id: 'npr',         name: 'NPR',          url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'bbc-tech',    name: 'BBC Tech',     url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'bbc-science', name: 'BBC Science',  url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
]

const COUNTRY_FEEDS = {
  DE: {
    label: 'Germany', flag: '🇩🇪',
    feeds: [
      { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2' },
      { id: 'spiegel',    name: 'Spiegel',    url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
      { id: 'dw-de',      name: 'DW Deutsch', url: 'https://rss.dw.com/xml/rss-de-all' },
      { id: 'zeit',       name: 'Zeit Online', url: 'https://newsfeed.zeit.de/index' },
    ],
  },
  GB: {
    label: 'United Kingdom', flag: '🇬🇧',
    feeds: [
      { id: 'bbc-uk',      name: 'BBC UK',       url: 'https://feeds.bbci.co.uk/news/uk/rss.xml' },
      { id: 'guardian-uk', name: 'The Guardian',  url: 'https://www.theguardian.com/uk/rss' },
      { id: 'sky-news',    name: 'Sky News',      url: 'https://feeds.skynews.com/feeds/rss/uk.xml' },
    ],
  },
  US: {
    label: 'United States', flag: '🇺🇸',
    feeds: [
      { id: 'npr-us',    name: 'NPR',              url: 'https://feeds.npr.org/1001/rss.xml' },
      { id: 'cnn',       name: 'CNN',              url: 'http://rss.cnn.com/rss/edition.rss' },
      { id: 'bbc-us',    name: 'BBC Americas',     url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml' },
    ],
  },
  FR: {
    label: 'France', flag: '🇫🇷',
    feeds: [
      { id: 'lemonde',    name: 'Le Monde',   url: 'https://www.lemonde.fr/rss/une.xml' },
      { id: 'france24',   name: 'France 24',  url: 'https://www.france24.com/fr/rss' },
      { id: 'bfm',        name: 'BFM TV',     url: 'https://www.bfmtv.com/rss/news-24-7/' },
    ],
  },
  ES: {
    label: 'Spain', flag: '🇪🇸',
    feeds: [
      { id: 'elpais',   name: 'El País',    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
      { id: 'elmundo',  name: 'El Mundo',   url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
    ],
  },
  IT: {
    label: 'Italy', flag: '🇮🇹',
    feeds: [
      { id: 'ansa',        name: 'ANSA',          url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml' },
      { id: 'repubblica',  name: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml' },
    ],
  },
  PL: {
    label: 'Poland', flag: '🇵🇱',
    feeds: [
      { id: 'tvn24',     name: 'TVN24',      url: 'https://tvn24.pl/najnowsze.xml' },
      { id: 'gazeta',    name: 'Gazeta',     url: 'https://rss.gazeta.pl/pub/rss/najnowsze.xml' },
    ],
  },
  NL: {
    label: 'Netherlands', flag: '🇳🇱',
    feeds: [
      { id: 'nu-nl',  name: 'NU.nl',    url: 'https://www.nu.nl/rss/Algemeen' },
      { id: 'nos',    name: 'NOS',      url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
    ],
  },
  SE: {
    label: 'Sweden', flag: '🇸🇪',
    feeds: [
      { id: 'svt',  name: 'SVT Nyheter', url: 'https://www.svt.se/nyheter/rss.xml' },
      { id: 'dn',   name: 'Dagens Nyheter', url: 'https://www.dn.se/rss/' },
    ],
  },
  BR: {
    label: 'Brazil', flag: '🇧🇷',
    feeds: [
      { id: 'g1',       name: 'G1 Globo',  url: 'https://g1.globo.com/rss/g1/' },
      { id: 'folha',    name: 'Folha',     url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
    ],
  },
  JP: {
    label: 'Japan', flag: '🇯🇵',
    feeds: [
      { id: 'nhk',     name: 'NHK World',  url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' },
      { id: 'japan-times', name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed' },
    ],
  },
  AU: {
    label: 'Australia', flag: '🇦🇺',
    feeds: [
      { id: 'abc-au',  name: 'ABC Australia',         url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
      { id: 'smh',     name: 'Sydney Morning Herald', url: 'https://www.smh.com.au/rss/feed.xml' },
    ],
  },
  MA: {
    label: 'Morocco', flag: '🇲🇦',
    feeds: [
      { id: 'hespress',  name: 'Hespress',   url: 'https://www.hespress.com/feed' },
      { id: 'medias24',  name: 'Médias24',   url: 'https://medias24.com/feed/' },
      { id: 'yabiladi',  name: 'Yabiladi',   url: 'https://www.yabiladi.com/articles/rss.xml' },
    ],
  },
  AE: {
    label: 'UAE', flag: '🇦🇪',
    feeds: [
      { id: 'arab-news',   name: 'Arab News',       url: 'https://www.arabnews.com/rss.xml' },
      { id: 'mee',         name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss' },
      { id: 'arab-weekly', name: 'Arab Weekly',     url: 'https://thearabweekly.com/feed' },
    ],
  },
  CN: {
    label: 'China', flag: '🇨🇳',
    feeds: [
      { id: 'china-daily', name: 'China Daily', url: 'https://www.chinadaily.com.cn/rss/world_rss.xml' },
      { id: 'globaltimes', name: 'Global Times', url: 'https://www.globaltimes.cn/rss/outbrain.xml' },
      { id: 'scmp',        name: 'SCMP',        url: 'https://www.scmp.com/rss/91/feed' },
    ],
  },
  PH: {
    label: 'Philippines', flag: '🇵🇭',
    feeds: [
      { id: 'rappler',    name: 'Rappler',    url: 'https://www.rappler.com/feed' },
      { id: 'gma',        name: 'GMA News',   url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
      { id: 'philstar',   name: 'Philstar',   url: 'https://www.philstar.com/rss/headlines' },
    ],
  },
  LT: {
    label: 'Lithuania', flag: '🇱🇹',
    feeds: [
      { id: 'euractiv',    name: 'Euractiv',       url: 'https://www.euractiv.com/feed/' },
      { id: 'dw-europe',   name: 'DW Europe',      url: 'https://rss.dw.com/xml/rss-en-eu' },
      { id: 'guardian-eu', name: 'Guardian Europe', url: 'https://www.theguardian.com/world/europe-news/rss' },
    ],
  },
  KE: {
    label: 'Kenya', flag: '🇰🇪',
    feeds: [
      { id: 'nation-ke',   name: 'Nation Africa',  url: 'https://nation.africa/kenya/rss.xml' },
      { id: 'standard-ke', name: 'The Standard',   url: 'https://www.standardmedia.co.ke/rss/headlines.php' },
      { id: 'kbc-ke',      name: 'KBC',            url: 'https://www.kbc.co.ke/feed/' },
    ],
  },
  NG: {
    label: 'Nigeria', flag: '🇳🇬',
    feeds: [
      { id: 'punch-ng',    name: 'Punch',          url: 'https://punchng.com/feed/' },
      { id: 'vanguard-ng', name: 'Vanguard',       url: 'https://www.vanguardngr.com/feed/' },
      { id: 'channels-ng', name: 'Channels TV',    url: 'https://www.channelstv.com/feed/' },
    ],
  },
  ZA: {
    label: 'South Africa', flag: '🇿🇦',
    feeds: [
      { id: 'iol-za',  name: 'IOL News',      url: 'https://www.iol.co.za/rss' },
      { id: 'mg-za',   name: 'Mail Guardian', url: 'https://mg.co.za/feed/' },
    ],
  },
  EG: {
    label: 'Egypt', flag: '🇪🇬',
    feeds: [
      { id: 'eg-ind',  name: 'Egypt Independent',  url: 'https://egyptindependent.com/feed/' },
      { id: 'eg-str',  name: 'Egyptian Streets',   url: 'https://egyptianstreets.com/feed/' },
      { id: 'eg-dne',  name: 'Daily News Egypt',   url: 'https://www.dailynewsegypt.com/feed/' },
    ],
  },
  GH: {
    label: 'Ghana', flag: '🇬🇭',
    feeds: [
      { id: 'gh-joy',  name: 'Joy Online',    url: 'https://www.myjoyonline.com/feed/' },
    ],
  },
  ET: {
    label: 'Ethiopia', flag: '🇪🇹',
    feeds: [
      { id: 'et-rep',  name: 'The Reporter',  url: 'https://www.thereporterethiopia.com/feed/' },
      { id: 'et-af',   name: 'Addis Fortune', url: 'https://addisfortune.news/feed/' },
    ],
  },
  TZ: {
    label: 'Tanzania', flag: '🇹🇿',
    feeds: [
      { id: 'tz-dn',   name: 'Daily News',    url: 'https://www.dailynews.co.tz/feed/' },
    ],
  },
  UG: {
    label: 'Uganda', flag: '🇺🇬',
    feeds: [
      { id: 'ug-obs',  name: 'The Observer',  url: 'https://observer.ug/feed/' },
    ],
  },
  ZW: {
    label: 'Zimbabwe', flag: '🇿🇼',
    feeds: [
      { id: 'zw-her',  name: 'The Herald',    url: 'https://www.herald.co.zw/feed/' },
      { id: 'zw-zl',   name: 'Zim Live',      url: 'https://www.zimlive.com/feed/' },
      { id: 'zw-nzw',  name: 'New Zimbabwe',  url: 'https://www.newzimbabwe.com/feed/' },
    ],
  },
  ZM: {
    label: 'Zambia', flag: '🇿🇲',
    feeds: [
      { id: 'zm-lt',   name: 'Lusaka Times',  url: 'https://www.lusakatimes.com/feed/' },
      { id: 'zm-dm',   name: 'Daily Mail',    url: 'https://www.daily-mail.co.zm/feed/' },
    ],
  },
  RW: {
    label: 'Rwanda', flag: '🇷🇼',
    feeds: [
      { id: 'rw-kt',   name: 'KT Press',      url: 'https://www.ktpress.rw/feed/' },
      { id: 'rw-rna',  name: 'RNA News',      url: 'https://www.rnanews.com/feed/' },
    ],
  },
  TN: {
    label: 'Tunisia', flag: '🇹🇳',
    feeds: [
      { id: 'tn-tl',   name: 'Tunisia Live',  url: 'https://www.tunisia-live.net/feed/' },
      { id: 'tn-bn',   name: 'Business News', url: 'https://www.businessnews.com.tn/rss' },
    ],
  },
  SN: {
    label: 'Senegal', flag: '🇸🇳',
    feeds: [
      { id: 'sn-sng',  name: 'Senego',        url: 'https://senego.com/feed' },
      { id: 'sn-an',   name: 'Africa News',   url: 'https://www.africanews.com/feed/' },
    ],
  },
  CI: {
    label: "Côte d'Ivoire", flag: '🇨🇮',
    feeds: [
      { id: 'ci-cn',   name: 'Connectionivoirienne', url: 'https://www.connectionivoirienne.net/feed' },
      { id: 'ci-atv',  name: 'AbidjanTV',            url: 'https://www.abidjantv.net/feed/' },
    ],
  },
  CM: {
    label: 'Cameroon', flag: '🇨🇲',
    feeds: [
      { id: 'cm-jdc',  name: 'Journal du Cameroun', url: 'https://www.journalducameroun.com/feed/' },
      { id: 'cm-ac',   name: 'Actu Cameroun',       url: 'https://actucameroun.com/feed/' },
    ],
  },
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

// ─── CountryStats component ───────────────────────────────────────────────────

function CountryStats({ countryCode }) {
  const [info, setInfo]       = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [now, setNow]         = useState(new Date())

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setInfo(null); setWeather(null); setLoading(true); setError(null)

    async function load() {
      try {
        // Country info
        const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`)
        if (!res.ok) throw new Error('Country data unavailable')
        const [c] = await res.json()
        setInfo(c)

        // Weather at capital
        const [lat, lon] = c.capitalInfo?.latlng ?? [c.latlng?.[0], c.latlng?.[1]]
        if (lat != null && lon != null) {
          const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&wind_speed_unit=kmh`
          )
          const wData = await wRes.json()
          setWeather(wData.current_weather)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [countryCode])

  const tz = COUNTRY_TIMEZONES[countryCode]
  const localTime = tz
    ? now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : null
  const localDate = tz
    ? now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short' })
    : null

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem' }}>
        <div className="spinner" style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading country stats…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', color: '#f87171', fontSize: '0.78rem' }}>
        <AlertCircle size={14} /> {error}
      </div>
    )
  }

  if (!info) return null

  const currency   = Object.values(info.currencies ?? {})[0]
  const languages  = Object.values(info.languages ?? {}).join(', ')
  const dialCode   = (info.idd?.root ?? '') + (info.idd?.suffixes?.[0] ?? '')
  const tld        = info.tld?.[0] ?? '—'
  const population = info.population ? info.population.toLocaleString() : '—'
  const area       = info.area ? info.area.toLocaleString() + ' km²' : '—'
  const capital    = info.capital?.[0] ?? '—'
  const region     = [info.subregion, info.region].filter(Boolean).join(' · ')
  const drivingSide = info.car?.side ? (info.car.side === 'right' ? '🚗 Right' : '🚗 Left') : '—'
  const landlocked = info.landlocked ? '🔒 Landlocked' : '🌊 Coastal'
  const borders    = info.borders?.length ? `${info.borders.length} countries` : 'No land borders'

  const wCode = weather?.weathercode
  const wLabel = WMO[wCode] ?? '🌡️ Unknown'

  function StatCard({ emoji, label, value, sub }) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '0.75rem 0.9rem',
        display: 'flex', flexDirection: 'column', gap: '0.2rem',
      }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          {emoji} {label}
        </span>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{value}</span>
        {sub && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{sub}</span>}
      </div>
    )
  }

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: '1.1rem',
      background: 'linear-gradient(135deg, rgba(167,139,250,0.04) 0%, transparent 60%)',
      border: '1px solid rgba(167,139,250,0.2)',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>{info.flag ?? COUNTRY_FEEDS[countryCode]?.flag}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {info.name?.common}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{region}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: '20px' }}>
          <span style={{ fontSize: '0.68rem' }}>🏛️</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>{capital}</span>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* ── Featured: Time + Weather ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {localTime && (
          <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.62rem', color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>🕐 Local Time</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              {localTime}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{localDate}</span>
          </div>
        )}
        {weather && (
          <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.62rem', color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>☁️ Weather · {capital}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>
              {weather.temperature}°C
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{wLabel} · 💨 {weather.windspeed} km/h</span>
          </div>
        )}
      </div>

      {/* ── Secondary stats grid ── */}
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
  // Try corsproxy.io first
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<item>') || text.includes('<entry>')) return parseRSS(text)
    }
  } catch { /* fall through */ }

  // Fallback: rss2json (returns JSON, works when XML proxies are blocked)
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status === 'ok' && json.items?.length) {
        return json.items.slice(0, 12).map((item) => ({
          title:       item.title ?? '',
          description: (item.description ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220),
          link:        item.link ?? '',
          image:       item.thumbnail || item.enclosure?.link || null,
          pubDate:     item.pubDate ?? null,
        })).filter((a) => a.title && a.link)
      }
    }
  } catch { /* fall through */ }

  // Last resort: allorigins
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.contents) throw new Error('Empty response')
  return parseRSS(json.contents)
}

function parseRSS(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')

  // Detect Atom vs RSS
  const isAtom = !!doc.querySelector('feed')
  const items  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item'))

  return items.slice(0, 12).map((item) => {
    const get  = (sel) => item.querySelector(sel)?.textContent?.trim() ?? ''
    const attr = (sel, a) => item.querySelector(sel)?.getAttribute(a) ?? ''

    const title = get('title').replace(/<!\[CDATA\[|\]\]>/g, '')
    const rawDesc = get('description') || get('summary') || get('content')
    const description = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220)

    // Link — RSS <link> can be text node or href attr
    const linkEl = item.querySelector('link')
    const link   = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || attr('guid', 'href') || get('guid')

    // Image — try multiple RSS image conventions
    const image =
      attr('enclosure[type^="image"]', 'url') ||
      attr('media\\:content[medium="image"], media\\:content[type^="image"]', 'url') ||
      attr('media\\:thumbnail', 'url') ||
      attr('media\\:content', 'url') ||
      (() => {
        const m = rawDesc.match(/<img[^>]+src="([^"]+)"/)
        return m ? m[1] : null
      })() || null

    const pubDate = get('pubDate') || get('published') || get('updated') || null

    return { title, description, link, image, pubDate }
  }).filter((a) => a.title && a.link)
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

// Countries ordered by geopolitical/economic weight
const COUNTRY_ORDER = [
  'US', 'CN', 'DE', 'GB', 'JP', 'FR', 'AU', 'BR', 'IT', 'ES', 'NL', 'SE', 'PL', 'AE', 'PH', 'LT',
  // Africa
  'NG', 'ZA', 'EG', 'KE', 'GH', 'ET', 'TZ', 'UG', 'ZW', 'ZM', 'RW', 'MA', 'TN', 'SN', 'CI', 'CM',
]

// ─── NewsCard ─────────────────────────────────────────────────────────────────

function NewsCard({ article, sourceName }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>

      {/* Image */}
      {article.image && !imgErr && (
        <div style={{ width: '100%', height: 160, overflow: 'hidden', flexShrink: 0 }}>
          <img src={article.image} alt="" onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
        {/* Source + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {sourceName}
          </span>
          {article.pubDate && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
              <Clock size={9} strokeWidth={1.5} />
              {timeAgo(article.pubDate)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {article.description.length > 180 ? article.description.slice(0, 180) + '…' : article.description}
          </p>
        )}

        {/* Read more */}
        <div style={{ marginTop: 'auto', paddingTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#a78bfa' }}>
          Read more <ExternalLink size={10} />
        </div>
      </div>
    </a>
  )
}

// ─── FeedColumn ───────────────────────────────────────────────────────────────

function FeedColumn({ feed, category }) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchRSS(feed.url)
      setArticles(data)
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [feed.url])

  useEffect(() => { load() }, [load])

  const filtered = category === 'all'
    ? articles
    : articles.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase()
        return (CATEGORY_KEYWORDS[category] ?? []).some((kw) => text.includes(kw))
      })

  const catMeta = CATEGORIES.find((c) => c.id === category)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Feed header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Newspaper size={14} strokeWidth={1.5} style={{ color: '#a78bfa' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{feed.name}</span>
          {lastFetch && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              · {timeAgo(lastFetch)}
            </span>
          )}
          {category !== 'all' && !loading && (
            <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
              {filtered.length}/{articles.length}
            </span>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost"
          style={{ padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
          <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem' }}>
          <AlertCircle size={14} strokeWidth={1.5} />
          Failed to load: {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: '10px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* No results for category */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{catMeta?.emoji}</div>
          No {catMeta?.label} articles in this feed right now.
        </div>
      )}

      {/* Cards */}
      {!loading && !error && filtered.map((article, i) => (
        <NewsCard key={i} article={article} sourceName={feed.name} />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewsTracker() {
  const [view, setView]           = useState('global')    // 'global' | 'country'
  const [country, setCountry]     = useState('DE')
  const [showCountryDrop, setShowCountryDrop] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [category, setCategory]   = useState('all')
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!showCountryDrop) return
    const close = (e) => { if (!e.target.closest('[data-country-picker]')) { setShowCountryDrop(false); setCountrySearch('') } }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showCountryDrop])

  // Detect actual location via IP on mount — tries multiple services
  useEffect(() => {
    async function detect() {
      const services = [
        async () => {
          const r = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) })
          if (r.ok) { const d = await r.json(); return d.country?.toUpperCase() }
        },
        async () => {
          const r = await fetch('https://ip-api.com/json?fields=countryCode', { signal: AbortSignal.timeout(5000) })
          if (r.ok) { const d = await r.json(); return d.countryCode?.toUpperCase() }
        },
      ]
      for (const svc of services) {
        try {
          const code = await svc()
          if (code && COUNTRY_FEEDS[code]) { setCountry(code); return }
        } catch { /* try next */ }
      }
      // Fallback: browser locale
      const lang = navigator.language || ''
      const code = lang.split('-')[1]?.toUpperCase()
      if (code && COUNTRY_FEEDS[code]) setCountry(code)
    }
    detect()
  }, [])

  // Active feed list
  const globalFeeds  = GLOBAL_FEEDS
  const countryFeeds = COUNTRY_FEEDS[country]?.feeds ?? []
  const activeFeeds  = view === 'global' ? globalFeeds : countryFeeds

  // Show up to 3 columns
  const visibleFeeds = activeFeeds.slice(0, 3)

  const countryMeta = COUNTRY_FEEDS[country]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1200 }}>

      {/* Heading */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
          <span className="gradient-text">News Tracker</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Live RSS feeds — global headlines and local news, no API key needed.
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Global / Country toggle */}
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

        {/* Country picker — only visible in country mode */}
        {view === 'country' && (
          <div style={{ position: 'relative' }} data-country-picker>
            <button className="btn-ghost" onClick={() => { setShowCountryDrop((v) => !v); setCountrySearch('') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem' }}>
              {countryMeta?.flag} {countryMeta?.label}
              <ChevronDown size={13} style={{ transform: showCountryDrop ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showCountryDrop && (
              <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 220 }}>
                {/* Search input */}
                <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search country…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.82rem',
                      color: 'var(--text-primary)', outline: 'none', fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                {/* Filtered list */}
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {COUNTRY_ORDER
                    .filter((code) => {
                      const q = countrySearch.toLowerCase()
                      return !q || COUNTRY_FEEDS[code].label.toLowerCase().includes(q) || code.toLowerCase().includes(q)
                    })
                    .map((code) => {
                      const meta = COUNTRY_FEEDS[code]
                      return (
                        <button key={code}
                          onClick={() => { setCountry(code); setShowCountryDrop(false); setCountrySearch('') }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', textAlign: 'left', padding: '0.55rem 1rem', background: country === code ? 'rgba(139,92,246,0.1)' : 'transparent', color: country === code ? '#a78bfa' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
                          <span>{meta.flag}</span>
                          <span>{meta.label}</span>
                        </button>
                      )
                    })}
                  {COUNTRY_ORDER.filter((code) => {
                    const q = countrySearch.toLowerCase()
                    return !q || COUNTRY_FEEDS[code].label.toLowerCase().includes(q) || code.toLowerCase().includes(q)
                  }).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source count hint */}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>
          {visibleFeeds.length} source{visibleFeeds.length !== 1 ? 's' : ''} · up to 12 articles each
        </span>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid',
              cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
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

      {/* Country stats */}
      {view === 'country' && <CountryStats key={country} countryCode={country} />}

      {/* Feed columns */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${visibleFeeds.length}, 1fr)`, gap: '1.25rem', alignItems: 'start' }}>
        {visibleFeeds.map((feed) => (
          <FeedColumn key={`${view}-${country}-${feed.id}`} feed={feed} category={category} />
        ))}
      </div>

    </div>
  )
}
