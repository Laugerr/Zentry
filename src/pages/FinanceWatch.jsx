import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, Plus, Search,
  ArrowRightLeft, X, Star, Bitcoin, DollarSign,
} from 'lucide-react'

// ─── APIs (all free, no keys) ────────────────────────────────────────────────
//
//   FX rates  → Frankfurter  (ECB-backed)           https://www.frankfurter.app
//   Crypto    → CoinGecko public API                https://www.coingecko.com/api
//
// Both endpoints are CORS-enabled from the browser.

const FX_BASE     = 'https://api.frankfurter.dev/v1'
const CG_BASE     = 'https://api.coingecko.com/api/v3'
const REFRESH_MS  = 60 * 1000 // 1 min

// ─── Catalogues ──────────────────────────────────────────────────────────────

const FX_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',              flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound',     flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen',      flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc',       flag: '🇨🇭' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar',   flag: '🇨🇦' },
  { code: 'CNY', name: 'Chinese Yuan',      flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee',      flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real',    flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso',      flag: '🇲🇽' },
  { code: 'ZAR', name: 'South African Rand',flag: '🇿🇦' },
  { code: 'TRY', name: 'Turkish Lira',      flag: '🇹🇷' },
  { code: 'SEK', name: 'Swedish Krona',     flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone',   flag: '🇳🇴' },
  { code: 'PLN', name: 'Polish Zloty',      flag: '🇵🇱' },
  { code: 'KRW', name: 'South Korean Won',  flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar',  flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar',  flag: '🇭🇰' },
  { code: 'NZD', name: 'NZ Dollar',         flag: '🇳🇿' },
]

// CoinGecko coin ids + display
const CRYPTO_CATALOGUE = [
  { id: 'bitcoin',      symbol: 'BTC',   name: 'Bitcoin' },
  { id: 'ethereum',     symbol: 'ETH',   name: 'Ethereum' },
  { id: 'solana',       symbol: 'SOL',   name: 'Solana' },
  { id: 'cardano',      symbol: 'ADA',   name: 'Cardano' },
  { id: 'ripple',       symbol: 'XRP',   name: 'XRP' },
  { id: 'polkadot',     symbol: 'DOT',   name: 'Polkadot' },
  { id: 'dogecoin',     symbol: 'DOGE',  name: 'Dogecoin' },
  { id: 'chainlink',    symbol: 'LINK',  name: 'Chainlink' },
  { id: 'avalanche-2',  symbol: 'AVAX',  name: 'Avalanche' },
  { id: 'polygon-ecosystem-token', symbol: 'POL', name: 'Polygon' },
  { id: 'litecoin',     symbol: 'LTC',   name: 'Litecoin' },
  { id: 'uniswap',      symbol: 'UNI',   name: 'Uniswap' },
  { id: 'tether',       symbol: 'USDT',  name: 'Tether' },
  { id: 'binancecoin',  symbol: 'BNB',   name: 'BNB' },
  { id: 'tron',         symbol: 'TRX',   name: 'TRON' },
  { id: 'stellar',      symbol: 'XLM',   name: 'Stellar' },
]

// ─── Persistence ─────────────────────────────────────────────────────────────

const LS = {
  prefs:     'fw:prefs:v1',      // { tab, fxBase, fxQuote, quote }
  fxWatch:   'fw:fxwatch:v1',    // [ 'EUR', 'GBP', ... ] — favourite quote currencies
  cryptoWatch:'fw:cryptowatch:v1',// [ 'bitcoin', 'ethereum', ... ]
}
const readJSON  = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? '') ?? fb } catch { return fb } }
const writeJSON = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtMoney(value, currency) {
  if (value == null || !isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function fmtPct(pct) {
  if (pct == null || !isFinite(pct)) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

function fmtCompact(n) {
  if (n == null || !isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9)  return (n / 1e9 ).toFixed(2) + 'B'
  if (abs >= 1e6)  return (n / 1e6 ).toFixed(2) + 'M'
  if (abs >= 1e3)  return (n / 1e3 ).toFixed(2) + 'K'
  return n.toFixed(2)
}

// ─── Sparkline (plain SVG, no extra deps) ────────────────────────────────────

function Sparkline({ data, color = '#a78bfa', width = 110, height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`).join(' ')
  // Area polygon
  const areaPts = `0,${height} ${pts} ${width},${height}`
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <polygon points={areaPts} fill={color} opacity="0.1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Trend chip ──────────────────────────────────────────────────────────────

function TrendChip({ pct }) {
  if (pct == null || !isFinite(pct)) return <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
  const up = pct > 0
  const flat = Math.abs(pct) < 0.01
  const color = flat ? 'var(--text-muted)' : (up ? '#34d399' : '#f87171')
  const bg    = flat ? 'rgba(255,255,255,0.04)' : (up ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)')
  const Icon  = flat ? Minus : (up ? TrendingUp : TrendingDown)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.5rem', borderRadius: 6, background: bg, color,
      fontSize: '0.72rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
    }}>
      <Icon size={10} strokeWidth={2.2} />
      {fmtPct(pct)}
    </span>
  )
}

// ─── FX data loading ─────────────────────────────────────────────────────────

async function fetchFxLatest(base) {
  const res = await fetch(`${FX_BASE}/latest?base=${base}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
  return res.json()
}

// Fetch 30-day daily history for a base→quote pair (returns array of rates, oldest first)
async function fetchFxHistory(base, quote) {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  const iso = (d) => d.toISOString().slice(0, 10)
  const res = await fetch(`${FX_BASE}/${iso(start)}..${iso(end)}?base=${base}&symbols=${quote}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`FX history HTTP ${res.status}`)
  const json = await res.json()
  // rates: { '2024-01-02': { QUOTE: 1.09 }, ... }
  return Object.keys(json.rates).sort().map((d) => json.rates[d][quote])
}

// ─── Crypto data loading ────────────────────────────────────────────────────

async function fetchCrypto(ids, vs) {
  if (!ids.length) return {}
  const url = `${CG_BASE}/coins/markets?vs_currency=${vs.toLowerCase()}&ids=${ids.join(',')}&order=market_cap_desc&per_page=250&sparkline=true&price_change_percentage=24h`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`Crypto HTTP ${res.status}`)
  return res.json()
}

// ─── FX tab ──────────────────────────────────────────────────────────────────

function FxTab({ base, setBase }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [watch, setWatch] = useState(() => readJSON(LS.fxWatch, ['EUR', 'GBP', 'JPY', 'CHF']))

  useEffect(() => { writeJSON(LS.fxWatch, watch) }, [watch])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const json = await fetchFxLatest(base)
      setData(json); setFetchedAt(new Date())
    } catch (e) {
      setError(e.message || 'Failed to load FX rates')
    } finally { setLoading(false) }
  }, [base])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, REFRESH_MS); return () => clearInterval(id) }, [load])

  const toggleWatch = (code) => setWatch((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [code, ...prev])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Converter */}
      <Converter base={base} rates={data?.rates} />

      {/* Watchlist + all rates */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Rates</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              1 {base} =
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select value={base} onChange={(e) => setBase(e.target.value)} className="input" style={{ width: 'auto', minWidth: 100, padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
              {FX_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <button onClick={load} disabled={loading} className="btn-ghost"
              style={{ padding: '0.3rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
              <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
              {loading ? 'Loading' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.1rem', color: '#f87171', fontSize: '0.8rem' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
            {FX_CURRENCIES
              .filter((c) => c.code !== base)
              .sort((a, b) => {
                const aw = watch.includes(a.code) ? 0 : 1
                const bw = watch.includes(b.code) ? 0 : 1
                return aw - bw
              })
              .map((c) => {
                const rate = data.rates[c.code]
                const isWatched = watch.includes(c.code)
                if (rate == null) return null
                return (
                  <FxRow key={c.code} base={base} currency={c} rate={rate}
                    watched={isWatched} onWatch={() => toggleWatch(c.code)} />
                )
              })}
          </div>
        )}

        {fetchedAt && (
          <div style={{ padding: '0.55rem 1.1rem', borderTop: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            Source: European Central Bank · updated {fetchedAt.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Watched — with 30-day sparkline */}
      {data && watch.length > 0 && (
        <WatchSparklines base={base} quotes={watch.filter((q) => q !== base)} />
      )}
    </div>
  )
}

function FxRow({ base, currency, rate, watched, onWatch }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1.1rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
      gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <button onClick={onWatch} title={watched ? 'Unstar' : 'Star'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: watched ? '#facc15' : 'var(--text-muted)', padding: 2, display: 'flex' }}>
          <Star size={12} fill={watched ? '#facc15' : 'none'} strokeWidth={1.8} />
        </button>
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{currency.flag}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{currency.code}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currency.name}</div>
        </div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 600, color: '#a78bfa', whiteSpace: 'nowrap' }}>
        {rate.toFixed(rate < 1 ? 4 : rate < 100 ? 3 : 2)}
      </div>
    </div>
  )
}

// Fetch 30-day history for each quote in parallel and render sparklines
function WatchSparklines({ base, quotes }) {
  const [series, setSeries] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!quotes.length) { setSeries({}); return }
    let cancelled = false
    setLoading(true)
    Promise.allSettled(quotes.map((q) => fetchFxHistory(base, q).then((arr) => [q, arr])))
      .then((results) => {
        if (cancelled) return
        const out = {}
        for (const r of results) if (r.status === 'fulfilled') { const [q, arr] = r.value; out[q] = arr }
        setSeries(out)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [base, quotes.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!quotes.length) return null
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Starred · 30-day trend</span>
        {loading && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>loading history…</span>}
      </div>
      <div>
        {quotes.map((q) => {
          const data = series[q]
          const first = data?.[0]
          const last  = data?.[data.length - 1]
          const pct = first && last ? ((last - first) / first) * 100 : null
          const color = pct == null ? '#a78bfa' : (pct >= 0 ? '#34d399' : '#f87171')
          const meta = FX_CURRENCIES.find((c) => c.code === q)
          return (
            <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 110 }}>
                <span style={{ fontSize: '0.95rem' }}>{meta?.flag}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{q}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{base}/{q}</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline data={data} color={color} width={160} height={30} />
              </div>
              <div style={{ width: 90, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 600 }}>
                {last?.toFixed(last < 1 ? 4 : 3) ?? '—'}
              </div>
              <div style={{ width: 80, textAlign: 'right' }}>
                <TrendChip pct={pct} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Converter ───────────────────────────────────────────────────────────────

function Converter({ base, rates }) {
  const [amount, setAmount] = useState(100)
  const [quote, setQuote]   = useState(() => {
    const saved = readJSON(LS.prefs, {})
    return saved.quote ?? 'EUR'
  })
  useEffect(() => {
    const prev = readJSON(LS.prefs, {})
    writeJSON(LS.prefs, { ...prev, quote })
  }, [quote])

  const rate = rates?.[quote]
  const converted = rate != null ? amount * rate : null

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowRightLeft size={14} style={{ color: '#a78bfa' }} />
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Converter</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
        <div>
          <label className="label">From</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="input" style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace" }} />
            <div className="input" style={{ width: 'auto', minWidth: 80, padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem' }}>
              {FX_CURRENCIES.find((c) => c.code === base)?.flag} {base}
            </div>
          </div>
        </div>
        <div>
          <label className="label">To</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <div className="input" style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontWeight: 700 }}>
              {converted != null ? converted.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}
            </div>
            <select value={quote} onChange={(e) => setQuote(e.target.value)} className="input" style={{ width: 'auto', minWidth: 100 }}>
              {FX_CURRENCIES.filter((c) => c.code !== base).map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {rate != null && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          1 {base} = {rate.toFixed(4)} {quote} · 1 {quote} = {(1 / rate).toFixed(4)} {base}
        </div>
      )}
    </div>
  )
}

// ─── Crypto tab ──────────────────────────────────────────────────────────────

function CryptoTab({ quote, setQuote }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [watch,   setWatch]   = useState(() => readJSON(LS.cryptoWatch, ['bitcoin', 'ethereum', 'solana']))
  const [search,  setSearch]  = useState('')

  useEffect(() => { writeJSON(LS.cryptoWatch, watch) }, [watch])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const ids = CRYPTO_CATALOGUE.map((c) => c.id)
      const data = await fetchCrypto(ids, quote)
      setRows(data)
    } catch (e) {
      setError(e.message || 'Failed to load crypto prices — CoinGecko may be rate-limiting')
    } finally { setLoading(false) }
  }, [quote])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, REFRESH_MS); return () => clearInterval(id) }, [load])

  const toggleWatch = (id) => setWatch((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q))
  }, [rows, search])

  // Starred first, then rest by market cap
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aw = watch.includes(a.id) ? 0 : 1
      const bw = watch.includes(b.id) ? 0 : 1
      if (aw !== bw) return aw - bw
      return (b.market_cap ?? 0) - (a.market_cap ?? 0)
    })
  }, [filtered, watch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search coins…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input" style={{ paddingLeft: 30, paddingRight: search ? 30 : 12, fontSize: '0.82rem' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <span className="label" style={{ margin: 0 }}>Quote</span>
          <select value={quote} onChange={(e) => setQuote(e.target.value)} className="input" style={{ width: 'auto', minWidth: 90, padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
            {['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={load} disabled={loading} className="btn-ghost"
            style={{ padding: '0.3rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
            <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', fontSize: '0.8rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th>Coin</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>24h</th>
                <th className="mobile-hide" style={{ textAlign: 'right' }}>Market Cap</th>
                <th className="mobile-hide" style={{ textAlign: 'right' }}>Volume 24h</th>
                <th style={{ textAlign: 'right', width: 120 }}>7d</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan="7"><div style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} /></td></tr>
              ))}

              {sorted.map((c) => {
                const isWatched = watch.includes(c.id)
                const pct = c.price_change_percentage_24h
                const spark = c.sparkline_in_7d?.price
                const sparkColor = pct == null ? '#a78bfa' : (pct >= 0 ? '#34d399' : '#f87171')
                return (
                  <tr key={c.id}>
                    <td>
                      <button onClick={() => toggleWatch(c.id)} title={isWatched ? 'Unstar' : 'Star'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isWatched ? '#facc15' : 'var(--text-muted)', padding: 2, display: 'flex' }}>
                        <Star size={13} fill={isWatched ? '#facc15' : 'none'} strokeWidth={1.8} />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        {c.image && <img src={c.image} alt="" width="22" height="22" style={{ borderRadius: '50%', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>{c.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 600 }}>
                      {fmtMoney(c.current_price, quote)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <TrendChip pct={pct} />
                    </td>
                    <td className="mobile-hide" style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {fmtCompact(c.market_cap)}
                    </td>
                    <td className="mobile-hide" style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {fmtCompact(c.total_volume)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Sparkline data={spark} color={sparkColor} width={100} height={28} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.55rem 1.1rem', borderTop: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          Source: CoinGecko public API · auto-refresh 1 min · 7d sparkline
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .mobile-hide { display: none; }
        }
      `}</style>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function FinanceWatch() {
  const saved = readJSON(LS.prefs, {})
  const [tab,   setTab]   = useState(saved.tab   ?? 'fx')       // 'fx' | 'crypto'
  const [base,  setBase]  = useState(saved.fxBase ?? 'USD')
  const [quote, setQuote] = useState(saved.cryptoQuote ?? 'USD')

  useEffect(() => {
    const prev = readJSON(LS.prefs, {})
    writeJSON(LS.prefs, { ...prev, tab, fxBase: base, cryptoQuote: quote })
  }, [tab, base, quote])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1200 }}>
      {/* Heading */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
          <span className="gradient-text">Finance Watch</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Live FX rates from the European Central Bank and crypto prices from CoinGecko — no key, no paywall.
        </p>
      </div>

      {/* Tabs */}
      <div className="segmented">
        <button className={`segmented-option ${tab === 'fx' ? 'active' : ''}`} onClick={() => setTab('fx')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <DollarSign size={12} /> Currencies
        </button>
        <button className={`segmented-option ${tab === 'crypto' ? 'active' : ''}`} onClick={() => setTab('crypto')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Bitcoin size={12} /> Crypto
        </button>
      </div>

      {tab === 'fx'    ? <FxTab base={base} setBase={setBase} />
                       : <CryptoTab quote={quote} setQuote={setQuote} />}
    </div>
  )
}
