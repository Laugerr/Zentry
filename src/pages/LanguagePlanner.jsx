import { useState, useEffect, useRef, useMemo } from 'react'
import {
  BookOpen, Plus, Trash2, Upload, Play, Pause, RotateCcw,
  Flame, Check, X, AlertCircle, Eye, EyeOff, ArrowLeft, Settings,
  Calendar, Layers, BarChart2, Undo2, Tag, Moon, Search,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const LEARN_STEPS         = [1, 10]
const RELEARN_STEPS       = [10]
const GRADUATING_INTERVAL = 1
const EASY_INTERVAL       = 4
const DEFAULT_EASE        = 2.5
const MIN_EASE            = 1.3
const DEFAULT_NEW_PER_DAY = 20
const DEFAULT_MAX_REVIEWS = 200
const WORK_SECS           = 25 * 60
const BREAK_SECS          = 5 * 60

// ─── SM-2 ─────────────────────────────────────────────────────────────────────
function rateCard(card, rating) {
  const now = Date.now()
  let c = { ...card }
  if (c.state === 'new' || c.state === 'learning') {
    if (rating === 0) {
      c.state = 'learning'; c.step = 0; c.due = now + LEARN_STEPS[0] * 60_000
    } else if (rating === 3) {
      c.state = 'review'; c.interval = EASY_INTERVAL; c.ease = DEFAULT_EASE
      c.reps = 1; c.step = 0; c.due = now + EASY_INTERVAL * 86_400_000
    } else {
      const next = rating === 1 ? c.step : (c.step ?? 0) + 1
      if (next >= LEARN_STEPS.length) {
        c.state = 'review'; c.interval = GRADUATING_INTERVAL; c.ease = DEFAULT_EASE
        c.reps = 1; c.step = 0; c.due = now + GRADUATING_INTERVAL * 86_400_000
      } else {
        c.state = 'learning'; c.step = next; c.due = now + LEARN_STEPS[next] * 60_000
      }
    }
  } else if (c.state === 'relearn') {
    if (rating === 0) { c.step = 0; c.due = now + RELEARN_STEPS[0] * 60_000 }
    else {
      const next = rating === 1 ? c.step : (c.step ?? 0) + 1
      if (next >= RELEARN_STEPS.length) { c.state = 'review'; c.step = 0; c.due = now + c.interval * 86_400_000 }
      else { c.step = next; c.due = now + RELEARN_STEPS[next] * 60_000 }
    }
  } else {
    if (rating === 0) {
      c.lapses = (c.lapses ?? 0) + 1; c.ease = Math.max(MIN_EASE, (c.ease ?? DEFAULT_EASE) - 0.2)
      c.interval = Math.max(1, Math.round((c.interval ?? 1) * 0.7))
      c.state = 'relearn'; c.step = 0; c.due = now + RELEARN_STEPS[0] * 60_000
    } else {
      let { interval = 1, ease = DEFAULT_EASE } = c
      if      (rating === 1) { interval = Math.round(interval * 1.2); ease = Math.max(MIN_EASE, ease - 0.15) }
      else if (rating === 2) { interval = Math.round(interval * ease) }
      else                   { interval = Math.round(interval * ease * 1.3); ease += 0.15 }
      c.interval = Math.max(1, interval); c.ease = ease
      c.reps = (c.reps ?? 0) + 1; c.state = 'review'; c.due = now + c.interval * 86_400_000
    }
  }
  c.lastReviewed = now
  return c
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const DECKS_KEY  = 'zentry:srs:decks'
const CARDS_KEY  = 'zentry:srs:cards'
const STREAK_KEY = 'zentry:srs:streak'
const loadDecks  = () => { try { return JSON.parse(localStorage.getItem(DECKS_KEY)  ?? '[]') } catch { return [] } }
const loadCards  = () => { try { return JSON.parse(localStorage.getItem(CARDS_KEY)  ?? '[]') } catch { return [] } }
const loadStreak = () => { try { return JSON.parse(localStorage.getItem(STREAK_KEY) ?? '{}') } catch { return {} } }
const saveDecks  = (d) => { try { localStorage.setItem(DECKS_KEY,  JSON.stringify(d)) } catch {} }
const saveCards  = (c) => { try { localStorage.setItem(CARDS_KEY,  JSON.stringify(c)) } catch {} }
const saveStreak = (s) => { try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)) } catch {} }
const uid        = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const todayStr   = () => new Date().toISOString().slice(0, 10)
const fmtTime    = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function dailyKey(deckId) { return `zentry:srs:daily:${deckId}:${todayStr()}` }
function loadDaily(deckId) { try { return JSON.parse(localStorage.getItem(dailyKey(deckId)) ?? '{}') } catch { return {} } }
function saveDaily(deckId, d) { try { localStorage.setItem(dailyKey(deckId), JSON.stringify(d)) } catch {} }
function studyTimeKey() { return `zentry:srs:studytime:${todayStr()}` }
function loadStudyTime() { return parseInt(localStorage.getItem(studyTimeKey()) ?? '0') || 0 }
function addStudyTime(secs) { localStorage.setItem(studyTimeKey(), String(loadStudyTime() + secs)) }
function bumpDaily(deckId, field) {
  const d = loadDaily(deckId); const next = { ...d, [field]: (d[field] ?? 0) + 1 }
  saveDaily(deckId, next); return next
}
function bumpStreak() {
  const s = loadStreak(); const today = todayStr()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (s.last === today) return s
  const cur = s.last === yesterday ? (s.current ?? 0) + 1 : 1
  const longest = Math.max(cur, s.longest ?? 0)
  const next = { last: today, current: cur, longest }
  saveStreak(next); return next
}

// ─── Queue builder ────────────────────────────────────────────────────────────
function buildQueue(cards, deckId, deck) {
  const now = Date.now()
  const newPerDay   = deck?.newPerDay  ?? DEFAULT_NEW_PER_DAY
  const maxReviews  = deck?.maxReviews ?? DEFAULT_MAX_REVIEWS
  const daily       = loadDaily(deckId === '__all__' ? 'all' : deckId)
  const newSeen     = daily.newSeen    ?? 0
  const reviewsDone = daily.reviewsDone ?? 0
  const today = todayStr()
  const dc = (deckId === '__all__' ? cards : cards.filter(c => c.deckId === deckId))
    .filter(c => !c.suspended && c.buried !== today)
  const learning  = dc.filter(c => (c.state === 'learning' || c.state === 'relearn') && (c.due ?? 0) <= now)
  const reviews   = dc.filter(c => c.state === 'review' && (c.due ?? 0) <= now).slice(0, Math.max(0, maxReviews - reviewsDone))
  const newCards  = dc.filter(c => c.state === 'new' || (!c.state && !c.reps)).slice(0, Math.max(0, newPerDay - newSeen))
  return { learning, reviews, newCards }
}

// ─── Stats data ───────────────────────────────────────────────────────────────
function buildHeatmapData() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('zentry:srs:daily:')) continue
    const parts = key.split(':'); const date = parts[parts.length - 1]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    try {
      const d = JSON.parse(localStorage.getItem(key) ?? '{}')
      data[date] = (data[date] ?? 0) + (d.newSeen ?? 0) + (d.reviewsDone ?? 0)
    } catch {}
  }
  return Array.from({ length: 91 }, (_, i) => {
    const d = new Date(Date.now() - (90 - i) * 86_400_000)
    const dateStr = d.toISOString().slice(0, 10)
    return { date: dateStr, count: data[dateStr] ?? 0, dow: d.getDay() }
  })
}

function buildForecastData(cards) {
  const now = Date.now()
  return Array.from({ length: 7 }, (_, i) => {
    const start = now + i * 86_400_000; const end = start + 86_400_000
    const count = cards.filter(c => {
      if (!c.due) return i === 0
      return c.due >= start && c.due < end
    }).length
    const d = new Date(start)
    return { label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }), count }
  })
}

// ─── Deck colors & goal ──────────────────────────────────────────────────────
const DECK_COLOR_PALETTE = [
  { gradient: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '📚', accent: '#a78bfa' },
  { gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', emoji: '🌸', accent: '#f87171' },
  { gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', emoji: '🌊', accent: '#60a5fa' },
  { gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', emoji: '🌿', accent: '#4ade80' },
  { gradient: 'linear-gradient(135deg,#fa709a,#fee140)', emoji: '🔥', accent: '#fbbf24' },
  { gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', emoji: '✨', accent: '#e879f9' },
  { gradient: 'linear-gradient(135deg,#f9d423,#f83600)', emoji: '🍊', accent: '#fb923c' },
  { gradient: 'linear-gradient(135deg,#2af598,#009efd)', emoji: '💎', accent: '#34d399' },
]
const GOAL_KEY  = 'zentry:srs:goal'
const loadGoal  = () => parseInt(localStorage.getItem(GOAL_KEY) ?? '20') || 20
const saveGoal  = (g) => { try { localStorage.setItem(GOAL_KEY, String(g)) } catch {} }
function deckColor(deck) { return DECK_COLOR_PALETTE[(deck.colorIdx ?? 0) % DECK_COLOR_PALETTE.length] }
function getTotalReviewedToday() {
  const today = todayStr(); let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('zentry:srs:daily:') || !key.endsWith(`:${today}`)) continue
    try { const d = JSON.parse(localStorage.getItem(key) ?? '{}'); total += (d.newSeen ?? 0) + (d.reviewsDone ?? 0) } catch {}
  }
  return total
}
function buildCalData() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('zentry:srs:daily:')) continue
    const parts = key.split(':'); const date = parts[parts.length - 1]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    try { const d = JSON.parse(localStorage.getItem(key) ?? '{}'); data[date] = (data[date] ?? 0) + (d.newSeen ?? 0) + (d.reviewsDone ?? 0) } catch {}
  }
  return data
}

// ─── IndexedDB — media ────────────────────────────────────────────────────────
const IDB_NAME = 'zentry-srs-media'; const IDB_STORE = 'files'
function openMediaDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error)
  })
}
async function putMediaBlob(filename, blob) {
  const db = await openMediaDB()
  await new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const req = tx.objectStore(IDB_STORE).put(blob, filename)
    req.onsuccess = res; req.onerror = e => rej(e.target.error); tx.oncomplete = () => db.close()
  })
}
async function getMediaBlob(filename) {
  const db = await openMediaDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(filename)
    req.onsuccess = e => { db.close(); res(e.target.result ?? null) }
    req.onerror   = e => { db.close(); rej(e.target.error) }
  })
}
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return { mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4',opus:'audio/ogg; codecs=opus',flac:'audio/flac',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',avif:'image/avif' }[ext] ?? 'application/octet-stream'
}
const blobUrlCache = new Map()
async function resolveBlobUrl(filename) {
  if (blobUrlCache.has(filename)) return blobUrlCache.get(filename)
  const blob = await getMediaBlob(filename).catch(() => null)
  if (!blob) return null
  const typed = blob.type && blob.type !== 'application/octet-stream' ? blob : new Blob([await blob.arrayBuffer()], { type: getMimeType(filename) })
  const url = URL.createObjectURL(typed); blobUrlCache.set(filename, url); return url
}

// ─── Field parsing & rendering ────────────────────────────────────────────────
function parseFieldTokens(raw = '') {
  const tokens = []; const re = /(\[sound:[^\]]+\])|(<img[^>]+>)/gi
  let last = 0, m
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: raw.slice(last, m.index) })
    if (m[1]) tokens.push({ type: 'sound', filename: m[1].replace(/^\[sound:|\]$/gi, '') })
    else { const src = m[2].match(/src="([^"]+)"/i)?.[1]; if (src) tokens.push({ type: 'image', filename: src }) }
    last = re.lastIndex
  }
  if (last < raw.length) tokens.push({ type: 'text', value: raw.slice(last) })
  return tokens
}
function renderTextToken(raw = '') {
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(div|p|li|tr|td)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

function AudioButton({ url, autoPlay }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (autoPlay && url && audioRef.current) {
      const t = setTimeout(() => audioRef.current?.play().catch(() => {}), 120)
      return () => clearTimeout(t)
    }
  }, [autoPlay, url])
  function toggle() {
    if (!audioRef.current || !url) return
    playing ? audioRef.current.pause() : audioRef.current.play().catch(() => {})
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
      {url && <audio ref={audioRef} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
      <button onClick={toggle} disabled={!url} style={{
        width: 52, height: 52, borderRadius: '50%', border: 'none',
        background: playing ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.12)',
        outline: `2px solid ${playing ? '#a78bfa' : 'rgba(167,139,250,0.35)'}`,
        color: url ? '#a78bfa' : 'var(--text-muted)', cursor: url ? 'pointer' : 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
        boxShadow: playing ? '0 0 16px rgba(167,139,250,0.35)' : 'none',
      }}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
    </div>
  )
}

function MediaField({ text = '', style = {}, autoPlay = false }) {
  const cleaned = useMemo(() => text.replace(/\[anki:[^\]]+\]/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim(), [text])
  const tokens  = useMemo(() => parseFieldTokens(cleaned), [cleaned])
  const [urls, setUrls] = useState({})
  useEffect(() => {
    const filenames = tokens.filter(t => t.type === 'sound' || t.type === 'image').map(t => t.filename)
    if (!filenames.length) return
    let alive = true
    Promise.all(filenames.map(async f => [f, await resolveBlobUrl(f).catch(() => null)]))
      .then(pairs => { if (alive) setUrls(Object.fromEntries(pairs.filter(([,u]) => u))) })
    return () => { alive = false }
  }, [tokens])
  const firstSoundIdx = tokens.findIndex(t => t.type === 'sound')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', ...style }}>
      {tokens.map((token, i) => {
        if (token.type === 'text') { const clean = renderTextToken(token.value); return clean ? <div key={i} style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>{clean}</div> : null }
        if (token.type === 'image') { const url = urls[token.filename]; return url ? <img key={i} src={url} alt="" style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: 12, display: 'block', objectFit: 'contain', margin: '4px 0' }} /> : <div key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⏳</div> }
        if (token.type === 'sound') return <AudioButton key={i} url={urls[token.filename]} autoPlay={autoPlay && i === firstSoundIdx} />
        return null
      })}
    </div>
  )
}

function cleanField(raw = '') { return raw.replace(/\[anki:[^\]]+\]/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim() }

// ─── .apkg import ─────────────────────────────────────────────────────────────
async function parseApkg(file, deckId, onProgress) {
  const JSZip   = (await import('jszip')).default
  const initSql = (await import('sql.js')).default
  const SQL     = await initSql({ locateFile: () => '/sql-wasm.wasm' })
  const zip     = await JSZip.loadAsync(file)
  const dbFile  = zip.file('collection.anki21') ?? zip.file('collection.anki2')
  if (!dbFile) throw new Error('No collection file found in .apkg')
  const buf = await dbFile.async('arraybuffer')
  const db  = new SQL.Database(new Uint8Array(buf))
  const res = db.exec('SELECT flds, tags FROM notes')
  db.close()
  if (!res.length || !res[0].values.length) throw new Error('No notes found')
  let mediaStored = 0
  const mediaFile = zip.file('media')
  if (mediaFile) {
    try {
      const mediaMap = JSON.parse(await mediaFile.async('text'))
      const entries  = Object.entries(mediaMap)
      for (const [num, real] of entries) {
        const zf = zip.file(num); if (!zf) continue
        const blob = new Blob([await zf.async('arraybuffer')], { type: getMimeType(real) })
        await putMediaBlob(real, blob); mediaStored++
        onProgress?.({ mediaStored, mediaTotal: entries.length })
      }
    } catch {}
  }
  const cards = res[0].values.map(([flds, tags]) => {
    const parts = flds.split('\x1f')
    return { id: uid(), deckId, front: cleanField(parts[0]), back: cleanField(parts[1]), tags: (tags ?? '').trim(), state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0 }
  }).filter(c => c.front || c.back)
  return { cards, mediaStored }
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const panel     = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem 1.2rem' }
const btnPrimary = { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }
const btnGhost  = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }
const labelStyle = { display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace" }

// ─── Deck ring (SVG donut) ────────────────────────────────────────────────────
function DeckRing({ cards, deckId, size = 72 }) {
  const dc      = cards.filter(c => c.deckId === deckId)
  const total   = dc.length
  if (!total) return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border)' }} />
  const counts  = {
    new:      dc.filter(c => !c.state || c.state === 'new').length,
    learning: dc.filter(c => c.state === 'learning' || c.state === 'relearn').length,
    review:   dc.filter(c => c.state === 'review' && (c.interval ?? 0) < 21).length,
    mastered: dc.filter(c => c.state === 'review' && (c.interval ?? 0) >= 21).length,
  }
  const COLORS  = { new: '#60a5fa', learning: '#f87171', review: '#4ade80', mastered: '#a78bfa' }
  const r       = (size - 10) / 2
  const circ    = 2 * Math.PI * r
  let offset    = 0
  const segs    = Object.entries(counts).filter(([,v]) => v > 0).map(([key, count]) => {
    const dash = (count / total) * circ
    const seg  = { key, color: COLORS[key], dash, offset }
    offset += dash; return seg
  })
  const masteredPct = Math.round((counts.mastered / total) * 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        {segs.map(({ key, color, dash, offset: off }) => (
          <circle key={key} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={-off}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>{masteredPct}%</span>
        <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 1 }}>done</span>
      </div>
    </div>
  )
}

// ─── Goal ring ────────────────────────────────────────────────────────────────
function GoalRing({ done, goal, size = 56 }) {
  const pct  = Math.min(done / Math.max(goal, 1), 1)
  const r    = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const color = pct >= 1 ? '#4ade80' : '#a78bfa'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700, color, lineHeight: 1 }}>{done}</span>
      </div>
    </div>
  )
}

// ─── Stats tab ────────────────────────────────────────────────────────────────
function StatsTab({ cards, decks, streak }) {
  const heatmap  = useMemo(() => buildHeatmapData(), [])
  const forecast = useMemo(() => buildForecastData(cards), [cards])
  const calData  = useMemo(() => buildCalData(), [])
  const now      = new Date()
  const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const maxCount   = Math.max(...heatmap.map(d => d.count), 1)
  const maxForecast= Math.max(...forecast.map(d => d.count), 1)

  // Group heatmap into weeks
  const weeks = useMemo(() => {
    const w = []; let week = []
    // pad start
    const firstDow = heatmap[0]?.dow ?? 0
    for (let i = 0; i < firstDow; i++) week.push(null)
    for (const day of heatmap) {
      week.push(day)
      if (week.length === 7) { w.push(week); week = [] }
    }
    if (week.length) { while (week.length < 7) week.push(null); w.push(week) }
    return w
  }, [heatmap])

  const heatColor = (count) => {
    if (!count) return 'var(--border)'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity < 0.25) return 'rgba(167,139,250,0.25)'
    if (intensity < 0.5)  return 'rgba(167,139,250,0.45)'
    if (intensity < 0.75) return 'rgba(167,139,250,0.7)'
    return '#a78bfa'
  }

  const totalReviewed  = heatmap.reduce((s, d) => s + d.count, 0)
  const activeDays     = heatmap.filter(d => d.count > 0).length
  const todayCards     = heatmap[heatmap.length - 1]?.count ?? 0
  const studyMinToday  = Math.round(loadStudyTime() / 60)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Today',         value: todayCards,    color: todayCards > 0 ? '#4ade80' : 'var(--text-muted)' },
          { label: '90-day total',  value: totalReviewed, color: '#60a5fa' },
          { label: 'Active days',   value: activeDays,    color: '#fbbf24' },
          { label: 'Best streak',   value: `${streak.longest ?? 0}🔥`, color: '#f97316' },
          { label: 'Study min today', value: studyMinToday > 0 ? `${studyMinToday}m` : '—', color: studyMinToday > 0 ? '#a78bfa' : 'var(--text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...panel, padding: '0.9rem 1rem' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={panel}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
          Study activity · last 90 days
        </div>
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.date}: ${day.count} cards` : ''}
                  style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: day ? heatColor(day.count) : 'transparent',
                    transition: 'background 0.2s',
                    cursor: day?.count ? 'default' : 'default',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
          Less
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? 'var(--border)' : `rgba(167,139,250,${0.2 + v * 0.8})` }} />
          ))}
          More
        </div>
      </div>

      {/* Forecast */}
      <div style={panel}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontFamily: "'JetBrains Mono', monospace" }}>
          Due forecast · next 7 days
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: 80 }}>
          {forecast.map(({ label, count }, i) => {
            const pct = count / maxForecast
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{count}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max(4, pct * 56)}px`,
                  background: i === 0
                    ? 'linear-gradient(180deg, #a78bfa, #7c3aed)'
                    : 'rgba(167,139,250,0.3)',
                  transition: 'height 0.4s ease',
                }} />
                <span style={{ fontSize: '0.6rem', color: i === 0 ? '#a78bfa' : 'var(--text-muted)', fontWeight: i === 0 ? 700 : 400 }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Month calendar */}
      {(() => {
        const { year, month } = calMonth
        const firstDow    = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const cells = []
        for (let i = 0; i < firstDow; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          cells.push({ day: d, ds, count: calData[ds] ?? 0 })
        }
        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        const maxDay    = Math.max(...cells.filter(Boolean).map(c => c.count), 1)
        const isToday   = (c) => c?.ds === todayStr()
        return (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                {monthName}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 0 ? { year: y-1, month: 11 } : { year: y, month: m-1 })} style={{ ...btnGhost, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>‹</button>
                <button onClick={() => setCalMonth({ year: now.getFullYear(), month: now.getMonth() })} style={{ ...btnGhost, padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>Today</button>
                <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 11 ? { year: y+1, month: 0 } : { year: y, month: m+1 })} style={{ ...btnGhost, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
              {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, paddingBottom: 4 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {cells.map((cell, i) => (
                <div key={i} title={cell ? `${cell.ds}: ${cell.count} cards` : ''} style={{
                  aspectRatio: '1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: isToday(cell) ? 700 : 400,
                  background: !cell ? 'transparent' : cell.count === 0 ? 'var(--input-bg)' : `rgba(167,139,250,${0.2 + (cell.count / maxDay) * 0.75})`,
                  color: isToday(cell) ? '#fff' : cell?.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  outline: isToday(cell) ? '2px solid #a78bfa' : 'none',
                  outlineOffset: -2,
                  cursor: cell?.count > 0 ? 'default' : 'default',
                }}>
                  {cell?.day}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Deck breakdown */}
      {decks.length > 0 && (
        <div style={panel}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontFamily: "'JetBrains Mono', monospace" }}>
            Deck breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {decks.map(deck => {
              const dc       = cards.filter(c => c.deckId === deck.id)
              const total    = dc.length
              const counts   = {
                new:      dc.filter(c => !c.state || c.state === 'new').length,
                learning: dc.filter(c => c.state === 'learning' || c.state === 'relearn').length,
                review:   dc.filter(c => c.state === 'review' && (c.interval ?? 0) < 21).length,
                mastered: dc.filter(c => c.state === 'review' && (c.interval ?? 0) >= 21).length,
              }
              const LABELS = { new: ['New','#60a5fa'], learning: ['Learning','#f87171'], review: ['Review','#4ade80'], mastered: ['Mastered','#a78bfa'] }
              return (
                <div key={deck.id} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <DeckRing cards={cards} deckId={deck.id} size={68} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {Object.entries(counts).filter(([,v]) => v > 0).map(([k, v]) => (
                        <span key={k} style={{ fontSize: '0.68rem', color: LABELS[k][1], fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {v} <span style={{ fontWeight: 400, opacity: 0.7 }}>{LABELS[k][0]}</span>
                        </span>
                      ))}
                      {total === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No cards</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[['New','#60a5fa'],['Learning','#f87171'],['Review','#4ade80'],['Mastered','#a78bfa']].map(([l,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dictionary popup ─────────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html.replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1').replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').trim()
}

const LANG_NAMES = { en:'English', fr:'French', de:'German', es:'Spanish', it:'Italian', pt:'Portuguese', ja:'Japanese', zh:'Chinese', ru:'Russian', ar:'Arabic', ko:'Korean', nl:'Dutch', pl:'Polish', sv:'Swedish' }
const DICT_LANG_KEY = 'zentry:srs:dictlang'

function DictionaryPopup({ word, onClose }) {
  const [fullJson, setFullJson] = useState(null)
  const [lang,     setLang]     = useState(() => localStorage.getItem(DICT_LANG_KEY) ?? 'en')
  const [langs,    setLangs]    = useState([])
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(null); setData(null); setFullJson(null); setLangs([])
    fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(json => {
        const available = Object.keys(json).filter(k => Array.isArray(json[k]) && json[k].length)
        setFullJson(json); setLangs(available)
        const preferred = available.includes(lang) ? lang : (available[0] ?? 'en')
        setLang(preferred)
        setData((json[preferred] ?? []).slice(0, 6))
      })
      .catch(e => { if (e.name !== 'AbortError') setError('No definition found for "' + word + '"') })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [word])

  function switchLang(l) {
    setLang(l); localStorage.setItem(DICT_LANG_KEY, l)
    if (fullJson) setData((fullJson[l] ?? []).slice(0, 6))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...panel, width: '100%', maxWidth: 520, maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem' }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{word}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>Wiktionary</span>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: '0.3rem 0.5rem' }}><X size={14} /></button>
        </div>

        {/* Language tabs */}
        {langs.length > 1 && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: '0.65rem', marginBottom: '0.1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {langs.map(l => (
              <button key={l} onClick={() => switchLang(l)} style={{
                padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: lang === l ? '#a78bfa' : 'var(--input-bg)',
                color: lang === l ? '#fff' : 'var(--text-muted)',
              }}>
                {LANG_NAMES[l] ?? l}
              </button>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingTop: '0.5rem' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <div style={{ width: 14, height: 14, borderRadius: 99, border: '2px solid var(--border)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              Looking up…
            </div>
          )}
          {error && <div style={{ padding: '1rem 0', color: '#f87171', fontSize: '0.82rem' }}>{error}</div>}
          {data && data.map((section, si) => (
            <div key={si} style={{ marginBottom: '1.1rem' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.45rem' }}>
                {section.partOfSpeech}
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {section.definitions.slice(0, 4).map((def, di) => (
                  <li key={di} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {stripHtml(def.definition)}
                    {def.examples?.[0] && (
                      <div style={{ marginTop: 3, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)' }}>
                        {stripHtml(def.examples[0])}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Review session ───────────────────────────────────────────────────────────
function ReviewSession({ cards: allCards, deckId, deck, onDone, onUpdateCard }) {
  const { learning, reviews, newCards } = buildQueue(allCards, deckId, deck)
  const initialQueue = useRef([...learning, ...reviews, ...newCards])
  const requeue      = useRef([])
  const seenNew      = useRef(new Set())
  const seenReview   = useRef(new Set())
  const undoStack    = useRef([])   // ← undo history

  const [idx,          setIdx]         = useState(0)
  const [flipPhase,    setFlipPhase]   = useState('front')  // 'front' | 'flipping' | 'back'
  const [stats,        setStats]       = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [done,         setDone]        = useState(false)
  const [streak,       setStreak]      = useState(loadStreak)
  const [remaining,    setRemaining]   = useState({ learning: learning.length, reviews: reviews.length, newCards: newCards.length })
  const [showStreak,   setShowStreak]  = useState(false)
  const [pomodoro,     setPomodoro]    = useState({ phase: 'work', left: WORK_SECS, running: false })
  const [selectedWord, setSelectedWord]= useState('')
  const [dictWord,     setDictWord]    = useState(null)
  const cardRef         = useRef()
  const selectedWordRef = useRef('')

  // Pomodoro tick
  useEffect(() => {
    if (!pomodoro.running) return
    const id = setInterval(() => {
      setPomodoro(p => {
        if (p.left <= 1) {
          const next = p.phase === 'work' ? 'break' : 'work'
          if (p.phase === 'work') addStudyTime(WORK_SECS)
          return { phase: next, left: next === 'work' ? WORK_SECS : BREAK_SECS, running: true }
        }
        return { ...p, left: p.left - 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [pomodoro.running])

  // Word selection for dictionary
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (text && text.length >= 2 && text.split(/\s+/).length <= 4) {
        const range = sel.getRangeAt(0)
        if (cardRef.current?.contains(range.commonAncestorContainer)) {
          selectedWordRef.current = text; setSelectedWord(text); return
        }
      }
      selectedWordRef.current = ''; setSelectedWord('')
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  const queue   = initialQueue.current
  const revealed = flipPhase === 'back'

  function currentCard() {
    if (idx < queue.length) return queue[idx]
    const now = Date.now()
    const ready = requeue.current.filter(c => c._requeueDue <= now)
    if (ready.length) { requeue.current = requeue.current.filter(c => c._requeueDue > now); ready.forEach(c => queue.push(c)); return queue[idx] }
    if (requeue.current.length) { requeue.current.sort((a,b) => a._requeueDue - b._requeueDue); const c = requeue.current.shift(); queue.push(c); return queue[idx] }
    return null
  }

  function reveal() {
    if (flipPhase !== 'front') return
    setFlipPhase('flipping')
    setTimeout(() => setFlipPhase('back'), 220)
  }

  useEffect(() => {
    function onKey(e) {
      const card = currentCard(); if (!card) return
      if (e.code === 'Space') { e.preventDefault(); if (flipPhase === 'front') reveal() }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doUndo() }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); suspendCard(); return }
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); buryCard(); return }
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && selectedWordRef.current) { e.preventDefault(); setDictWord(selectedWordRef.current); selectedWordRef.current = ''; setSelectedWord(''); return }
      if (flipPhase !== 'back') return
      if (e.key === '1') rate(card, 0)
      if (e.key === '2') rate(card, 1)
      if (e.key === '3') rate(card, 2)
      if (e.key === '4') rate(card, 3)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipPhase, idx])

  function rate(card, rating) {
    const realDeckId = deckId === '__all__' ? card.deckId : deckId
    if ((card.state === 'new' || !card.state) && !seenNew.current.has(card.id)) { seenNew.current.add(card.id); bumpDaily(realDeckId, 'newSeen') }
    else if (card.state === 'review' && !seenReview.current.has(card.id)) { seenReview.current.add(card.id); bumpDaily(realDeckId, 'reviewsDone') }

    // Save undo snapshot BEFORE updating
    undoStack.current.push({ card: { ...card }, idx, remaining: { ...remaining }, stats: { ...stats } })
    if (undoStack.current.length > 20) undoStack.current.shift()

    const updated = rateCard(card, rating)
    updated.history = [...(card.history ?? []).slice(-49), { ts: Date.now(), rating, interval: updated.interval ?? 0, ease: +(updated.ease ?? DEFAULT_EASE).toFixed(2) }]
    onUpdateCard(updated)
    const key = ['again','hard','good','easy'][rating]
    setStats(s => ({ ...s, [key]: s[key] + 1 }))
    if (updated.state === 'learning' || updated.state === 'relearn') requeue.current.push({ ...updated, _requeueDue: updated.due })

    setRemaining(r => {
      const wasLearning = card.state === 'learning' || card.state === 'relearn'
      const wasReview   = card.state === 'review'; const wasNew = card.state === 'new' || !card.state
      const comesBack   = updated.state === 'learning' || updated.state === 'relearn'
      return {
        learning: comesBack ? r.learning + (wasLearning ? 0 : 1) : Math.max(0, r.learning - (wasLearning ? 1 : 0)),
        reviews:  Math.max(0, r.reviews  - (wasReview ? 1 : 0)),
        newCards: Math.max(0, r.newCards - (wasNew ? 1 : 0)),
      }
    })

    const nextIdx = idx + 1
    const hasMore = nextIdx < queue.length || requeue.current.length > 0
    if (!hasMore) { const s = bumpStreak(); setStreak(s); setDone(true); setTimeout(() => setShowStreak(true), 400) }
    else { setIdx(nextIdx); setFlipPhase('front') }
  }

  function doUndo() {
    if (!undoStack.current.length) return
    const snap = undoStack.current.pop()
    onUpdateCard(snap.card)
    setIdx(snap.idx)
    setStats(snap.stats)
    setRemaining(snap.remaining)
    requeue.current = requeue.current.filter(c => c.id !== snap.card.id)
    setFlipPhase('front')
  }

  function skipCard(updateFn) {
    const card = currentCard(); if (!card) return
    onUpdateCard(updateFn(card))
    requeue.current = requeue.current.filter(c => c.id !== card.id)
    const nextIdx = idx + 1
    const hasMore = nextIdx < queue.length || requeue.current.length > 0
    if (!hasMore) { const s = bumpStreak(); setStreak(s); setDone(true); setTimeout(() => setShowStreak(true), 400) }
    else { setIdx(nextIdx); setFlipPhase('front') }
  }
  function suspendCard() { skipCard(c => ({ ...c, suspended: true })) }
  function buryCard()    { skipCard(c => ({ ...c, buried: todayStr() })) }

  // ── Done screen ───────────────────────────────────────────────────────────────
  if (done) {
    const total = stats.again + stats.hard + stats.good + stats.easy
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Session complete</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>{total} cards reviewed</div>
        </div>
        {/* Animated streak */}
        {showStreak && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem', borderRadius: 50, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <Flame size={22} style={{ color: '#f97316' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>{streak.current ?? 1}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>day streak</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['Again','#f87171',stats.again],['Hard','#fbbf24',stats.hard],['Good','#60a5fa',stats.good],['Easy','#4ade80',stats.easy]].map(([l,c,v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: c }}>{v}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</span>
            </div>
          ))}
        </div>
        <button onClick={onDone} style={{ ...btnPrimary, padding: '0.75rem 2rem', fontSize: '0.88rem' }}>Back to decks</button>
      </div>
    )
  }

  const card = currentCard()
  if (!card) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No cards. <button onClick={onDone} style={{ ...btnGhost }}>Back</button></div>

  const RATINGS = [
    { label: 'Again', key: 0, color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    { label: 'Hard',  key: 1, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
    { label: 'Good',  key: 2, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
    { label: 'Easy',  key: 3, color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)'  },
  ]

  const stateLabel = card.state === 'new' || !card.state ? 'New' : card.state === 'learning' ? 'Learning' : card.state === 'relearn' ? 'Relearn' : 'Review'
  const tags = card.tags ? card.tags.split(/\s+/).filter(Boolean) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={onDone} style={{ ...btnGhost, padding: '0.35rem 0.6rem' }}><ArrowLeft size={14} /></button>
        {undoStack.current.length > 0 && (
          <button onClick={doUndo} title="Undo last rating (Ctrl+Z)" style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}>
            <Undo2 size={14} />
          </button>
        )}
        <button onClick={suspendCard} title="Suspend card (skip forever until unsuspended)" style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.25)' }}>
          <EyeOff size={13} />
        </button>
        <button onClick={buryCard} title="Bury until tomorrow" style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#60a5fa', borderColor: 'rgba(96,165,250,0.25)' }}>
          <Moon size={13} />
        </button>
        <div style={{ flex: 1 }} />
        {/* Pomodoro timer */}
        <button
          onClick={() => setPomodoro(p => ({ ...p, running: !p.running }))}
          onDoubleClick={() => setPomodoro({ phase: 'work', left: WORK_SECS, running: false })}
          title={pomodoro.running ? 'Pause timer (double-click to reset)' : 'Start 25-min focus timer'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s',
            background: pomodoro.phase === 'work' ? 'rgba(249,115,22,0.12)' : 'rgba(96,165,250,0.12)',
            color:      pomodoro.phase === 'work' ? '#f97316' : '#60a5fa',
            outline:    pomodoro.running ? `1px solid ${pomodoro.phase === 'work' ? 'rgba(249,115,22,0.35)' : 'rgba(96,165,250,0.35)'}` : '1px solid var(--border)',
          }}
        >
          {pomodoro.phase === 'work' ? '🍅' : '☕'} {fmtTime(pomodoro.left)}
          {!pomodoro.running && <Play size={10} style={{ opacity: 0.6 }} />}
          {pomodoro.running  && <Pause size={10} style={{ opacity: 0.6 }} />}
        </button>
        <div style={{ display: 'flex', gap: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 700 }}>
          <span style={{ color: '#f87171' }}>{remaining.learning}</span>
          <span style={{ color: '#4ade80' }}>{remaining.reviews}</span>
          <span style={{ color: '#60a5fa' }}>{remaining.newCards}</span>
        </div>
      </div>

      {/* Card with 3D flip */}
      <div style={{ perspective: '1200px' }}>
        <div
          ref={cardRef}
          style={{
            ...panel,
            minHeight: 300,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '1.5rem', padding: '2.5rem 2rem',
            cursor: flipPhase === 'front' ? 'pointer' : 'default',
            transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
            transform: flipPhase === 'flipping' ? 'rotateX(90deg) scale(0.97)' : 'rotateX(0deg) scale(1)',
            opacity: flipPhase === 'flipping' ? 0 : 1,
          }}
          onClick={() => flipPhase === 'front' && reveal()}
        >
          {/* State badge + tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--input-bg)', padding: '2px 8px', borderRadius: 99 }}>
              {stateLabel}
            </span>
            {tags.slice(0, 4).map(t => (
              <span key={t} style={{ fontSize: '0.58rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '1px 7px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Tag size={8} /> {t}
              </span>
            ))}
          </div>

          {/* Front */}
          <MediaField
            text={card.front}
            style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, textAlign: 'center', width: '100%' }}
          />

          {/* Back */}
          {flipPhase === 'back' ? (
            <>
              <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Answer</div>
                <MediaField
                  text={card.back}
                  autoPlay={true}
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 600, color: '#a78bfa', lineHeight: 1.4, textAlign: 'center', width: '100%' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Eye size={12} /> click or Space to reveal
            </div>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {flipPhase === 'back' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
          {RATINGS.map(({ label, key, color, bg, border }) => {
            const preview = rateCard(card, key)
            const hint = preview.state === 'learning' || preview.state === 'relearn' ? `${LEARN_STEPS[preview.step ?? 0] ?? RELEARN_STEPS[0]}m` : `${preview.interval}d`
            return (
              <button key={key} onClick={() => rate(card, key)} style={{
                padding: '0.75rem 0.5rem', borderRadius: 10,
                border: `1px solid ${border}`, background: bg, color,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                {label}
                <span style={{ fontSize: '0.58rem', opacity: 0.7, fontWeight: 400 }}>{hint}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Word selection → dictionary lookup */}
      {selectedWord && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, fontSize: '0.78rem' }}>
          <Search size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)' }}>Selected: <strong style={{ color: 'var(--text-primary)' }}>{selectedWord}</strong></span>
          <button onClick={() => { setDictWord(selectedWord); setSelectedWord('') }} style={{ ...btnPrimary, padding: '0.25rem 0.7rem', fontSize: '0.72rem', marginLeft: 'auto' }}>
            Look up
          </button>
          <button onClick={() => setSelectedWord('')} style={{ ...btnGhost, padding: '0.25rem 0.4rem' }}><X size={11} /></button>
        </div>
      )}

      {flipPhase === 'front' && (
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 2 }}>
          {[['Space','reveal'],['1–4','rate'],['S','suspend'],['B','bury'],['D','dict'],['Ctrl+Z','undo']].map(([k,v],i,a) => (
            <span key={k}><kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4, fontSize: '0.62rem' }}>{k}</kbd> {v}{i < a.length-1 ? <span style={{ opacity: 0.35 }}> · </span> : null}</span>
          ))}
        </div>
      )}

      {dictWord && <DictionaryPopup word={dictWord} onClose={() => setDictWord(null)} />}
    </div>
  )
}

// ─── Hero banner ─────────────────────────────────────────────────────────────
function HeroBanner({ streak, allDue, totalCards, decks, onStudyAll, reviewedToday, goal, onGoalChange }) {
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const [editing, setEditing] = useState(false)
  const [goalInput, setGoalInput] = useState(String(goal))
  return (
    <div style={{ ...panel, background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(167,139,250,0.04) 100%)', borderColor: 'rgba(167,139,250,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {greeting} <span style={{ fontSize: '1.1rem' }}>👋</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
            {allDue > 0 ? `${allDue} cards waiting for review` : totalCards > 0 ? 'All caught up — great work!' : 'Import a deck to get started'}
          </div>
        </div>
        {allDue > 0 && (
          <button onClick={onStudyAll} style={{ ...btnPrimary, padding: '0.65rem 1.4rem', fontSize: '0.88rem', animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <Play size={14} /> Study all ({allDue})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
        {/* Goal ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <GoalRing done={reviewedToday} goal={goal} size={52} />
          <div>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  style={{ width: 52, fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', padding: '2px 6px', fontFamily: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Enter') { onGoalChange(parseInt(goalInput) || 20); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
                  autoFocus />
                <button onClick={() => { onGoalChange(parseInt(goalInput) || 20); setEditing(false) }} style={{ ...btnPrimary, padding: '2px 7px', fontSize: '0.7rem' }}><Check size={10} /></button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.88rem', color: reviewedToday >= goal ? '#4ade80' : 'var(--text-primary)' }}>{reviewedToday}/{goal}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>daily goal</div>
              </button>
            )}
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: 'var(--border)' }} />

        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Flame size={18} style={{ color: (streak.current ?? 0) > 0 ? '#f97316' : 'var(--text-muted)' }} />
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.88rem', color: (streak.current ?? 0) > 0 ? '#f97316' : 'var(--text-muted)' }}>{streak.current ?? 0}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>day streak</div>
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: 'var(--border)' }} />

        {[
          { val: totalCards, label: 'cards',  color: '#60a5fa' },
          { val: decks.length, label: 'decks', color: '#a78bfa' },
        ].map(({ val, label, color }) => (
          <div key={label}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.88rem', color }}>{val}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Word of the day ──────────────────────────────────────────────────────────
function WordOfDay({ cards }) {
  const card = useMemo(() => {
    if (!cards.length) return null
    const seed = new Date().toDateString()
    let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return cards[h % cards.length]
  }, [cards])
  const [revealed, setRevealed] = useState(false)
  if (!card) return null
  return (
    <div style={{ ...panel, borderColor: 'rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.04)' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.65rem' }}>
        ✦ Word of the day
      </div>
      <div style={{ fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', padding: '0.5rem 0' }}>
        {card.front}
      </div>
      {revealed ? (
        <div style={{ textAlign: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Answer</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#a78bfa' }}>{card.back}</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button onClick={() => setRevealed(true)} style={{ ...btnGhost, fontSize: '0.75rem' }}><Eye size={12} /> Reveal</button>
        </div>
      )}
    </div>
  )
}

// ─── Struggling cards ─────────────────────────────────────────────────────────
function StrugglingCards({ cards, onStudy }) {
  const struggling = useMemo(() =>
    cards.filter(c => (c.lapses ?? 0) >= 3).sort((a,b) => (b.lapses??0) - (a.lapses??0)).slice(0, 5),
    [cards]
  )
  if (!struggling.length) return null
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>Struggling cards</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', padding: '1px 7px', borderRadius: 99 }}>{struggling.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
        {struggling.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.65rem', background: 'var(--input-bg)', borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.front}</div>
            </div>
            <span style={{ fontSize: '0.62rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, flexShrink: 0 }}>{c.lapses} lapses</span>
          </div>
        ))}
      </div>
      <button onClick={onStudy} style={{ ...btnGhost, fontSize: '0.78rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
        <Play size={11} /> Practice these
      </button>
    </div>
  )
}

// ─── Recently mastered ────────────────────────────────────────────────────────
function RecentlyMastered({ cards }) {
  const mastered = useMemo(() =>
    cards.filter(c => c.state === 'review' && c.lastReviewed)
      .sort((a,b) => (b.lastReviewed??0) - (a.lastReviewed??0)).slice(0, 8),
    [cards]
  )
  if (!mastered.length) return null
  return (
    <div style={panel}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.65rem' }}>
        Recently in review
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {mastered.map(c => (
          <span key={c.id} style={{ fontSize: '0.72rem', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 10px', borderRadius: 99, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.front}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Deck grid card ───────────────────────────────────────────────────────────
function DeckGridCard({ deck, cards, onReview, onEdit }) {
  const dc = deckColor(deck)
  const { learning, reviews, newCards } = buildQueue(cards, deck.id, deck)
  const total = cards.filter(c => c.deckId === deck.id).length
  const due   = learning.length + reviews.length + newCards.length
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Cover */}
      <div style={{ background: dc.gradient, padding: '1.5rem 1rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', minHeight: 80 }}>
        <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{dc.emoji}</span>
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 99, padding: '0.2rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
          {total} cards
        </div>
      </div>
      {/* Body */}
      <div style={{ background: 'var(--bg-card)', padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          {learning.length > 0 && <span style={{ fontSize: '0.65rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{learning.length} learning</span>}
          {reviews.length  > 0 && <span style={{ fontSize: '0.65rem', color: '#4ade80', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{reviews.length} review</span>}
          {newCards.length > 0 && <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{newCards.length} new</span>}
          {due === 0 && total > 0 && <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>✓ caught up</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button onClick={() => onEdit(deck)} style={{ ...btnGhost, padding: '0.35rem 0.55rem', flex: '0 0 auto' }}><Settings size={12} /></button>
          <button onClick={() => onReview(deck)} disabled={due === 0} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: due === 0 ? 0.4 : 1, cursor: due === 0 ? 'not-allowed' : 'pointer', padding: '0.4rem' }}>
            <Play size={12} /> {due > 0 ? `Study (${due})` : 'Study'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Deck row ─────────────────────────────────────────────────────────────────
function DeckRow({ deck, cards, onReview, onEdit }) {
  const dc = deckColor(deck)
  const { learning, reviews, newCards } = buildQueue(cards, deck.id, deck)
  const total = cards.filter(c => c.deckId === deck.id).length
  const due   = learning.length + reviews.length + newCards.length
  return (
    <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderLeft: `4px solid ${dc.accent}` }}>
      <DeckRing cards={cards} deckId={deck.id} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{total} cards</span>
          {learning.length > 0 && <span style={{ fontSize: '0.7rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{learning.length} learning</span>}
          {reviews.length  > 0 && <span style={{ fontSize: '0.7rem', color: '#4ade80', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{reviews.length} review</span>}
          {newCards.length > 0 && <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{newCards.length} new</span>}
          {due === 0 && total > 0 && <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>All caught up ✓</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button onClick={() => onEdit(deck)} style={{ ...btnGhost, padding: '0.4rem 0.7rem' }}><Settings size={13} /></button>
        <button onClick={() => onReview(deck)} disabled={due === 0} style={{ ...btnPrimary, opacity: due === 0 ? 0.4 : 1, cursor: due === 0 ? 'not-allowed' : 'pointer' }}>
          <Play size={12} /> Study {due > 0 ? `(${due})` : ''}
        </button>
      </div>
    </div>
  )
}

// ─── Ease badge ───────────────────────────────────────────────────────────────
function EaseBadge({ ease }) {
  if (!ease) return null
  const color = ease >= 2.5 ? '#4ade80' : ease >= 2.0 ? '#fbbf24' : '#f87171'
  const label = ease >= 2.5 ? 'Easy' : ease >= 2.0 ? 'Medium' : 'Hard'
  return (
    <span style={{ fontSize: '0.58rem', fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}44`, padding: '1px 6px', borderRadius: 99, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
      {label} {ease.toFixed(1)}
    </span>
  )
}

// ─── Card stats drawer ────────────────────────────────────────────────────────
function CardStatsDrawer({ card, onClose }) {
  const history = card.history ?? []
  const RCOLORS = ['#f87171','#fbbf24','#60a5fa','#4ade80']
  const RLABELS = ['Again','Hard','Good','Easy']
  const maxInterval = Math.max(...history.map(h => h.interval), 1)

  const due = card.due ? new Date(card.due) : null
  const dueStr = due
    ? (card.state === 'review' ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `in ${Math.max(1, Math.ceil((card.due - Date.now()) / 60_000))} min`)
    : '—'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...panel, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.front}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.back}</div>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: '0.3rem 0.5rem', flexShrink: 0 }}><X size={14} /></button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {[
            { label: 'State',    value: card.state ?? 'new',             color: card.state === 'review' ? '#4ade80' : card.state === 'learning' || card.state === 'relearn' ? '#f87171' : '#60a5fa' },
            { label: 'Interval', value: card.interval > 0 ? `${card.interval}d` : '—', color: 'var(--text-primary)' },
            { label: 'Next due', value: dueStr,                          color: '#a78bfa' },
            { label: 'Reviews',  value: card.reps ?? 0,                  color: '#4ade80' },
            { label: 'Lapses',   value: card.lapses ?? 0,                color: (card.lapses ?? 0) > 0 ? '#f87171' : 'var(--text-muted)' },
            { label: 'Ease',     value: (card.ease ?? DEFAULT_EASE).toFixed(2), color: (card.ease ?? DEFAULT_EASE) >= 2.5 ? '#4ade80' : (card.ease ?? DEFAULT_EASE) >= 2.0 ? '#fbbf24' : '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1rem', color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Ease bar */}
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Ease factor</div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, ((card.ease ?? DEFAULT_EASE) / 4) * 100)}%`, background: (card.ease ?? DEFAULT_EASE) >= 2.5 ? '#4ade80' : (card.ease ?? DEFAULT_EASE) >= 2.0 ? '#fbbf24' : '#f87171', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>
            <span>1.3 (hard)</span><span>2.5 (default)</span><span>4.0 (easy)</span>
          </div>
        </div>

        {/* Review history */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'JetBrains Mono', monospace" }}>
              Review history · last {history.length} reviews
            </div>
            {/* Rating dots */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {history.map((h, i) => (
                <div key={i} title={`${RLABELS[h.rating]} · ${h.interval}d · ${new Date(h.ts).toLocaleDateString()}`} style={{ width: 12, height: 12, borderRadius: '50%', background: RCOLORS[h.rating], flexShrink: 0, cursor: 'default' }} />
              ))}
            </div>
            {/* Interval progression bar chart */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 48 }}>
              {history.map((h, i) => (
                <div key={i} title={`${h.interval}d`} style={{ flex: 1, minWidth: 4, maxWidth: 20, borderRadius: '3px 3px 0 0', background: RCOLORS[h.rating], height: `${Math.max(4, (h.interval / maxInterval) * 44)}px`, opacity: 0.75, transition: 'height 0.3s ease' }} />
              ))}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>Interval (days) per review</div>
          </div>
        )}
        {history.length === 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>No review history yet — study this card to track progress.</div>
        )}
      </div>
    </div>
  )
}

// ─── Export deck CSV ──────────────────────────────────────────────────────────
function exportDeckCSV(deck, deckCards) {
  const header = ['front','back','tags','state','interval','ease','reps','lapses']
  const rows = deckCards.map(c => [
    `"${(c.front ?? '').replace(/"/g,'""')}"`,
    `"${(c.back  ?? '').replace(/"/g,'""')}"`,
    `"${(c.tags  ?? '').replace(/"/g,'""')}"`,
    c.state ?? 'new',
    c.interval ?? 0,
    (c.ease ?? DEFAULT_EASE).toFixed(2),
    c.reps ?? 0,
    c.lapses ?? 0,
  ])
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a'); a.href = url; a.download = `${deck.name}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Deck editor ──────────────────────────────────────────────────────────────
function DeckEditor({ deck, cards, onClose, onSaveCards, onDeleteDeck, onUpdateDeck }) {
  const deckCards = cards.filter(c => c.deckId === deck.id)
  const [front,      setFront]      = useState('')
  const [back,       setBack]       = useState('')
  const [tab,        setTab]        = useState('cards')
  const [newPerDay,  setNewPerDay]  = useState(deck.newPerDay  ?? DEFAULT_NEW_PER_DAY)
  const [maxReviews, setMaxReviews] = useState(deck.maxReviews ?? DEFAULT_MAX_REVIEWS)
  const [statsCard,  setStatsCard]  = useState(null)

  function addCard() {
    if (!front.trim() || !back.trim()) return
    onSaveCards([...cards, { id: uid(), deckId: deck.id, front: front.trim(), back: back.trim(), state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0 }])
    setFront(''); setBack('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ ...panel, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{deck.name}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => exportDeckCSV(deck, deckCards)} title="Export as CSV" style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)', fontSize: '0.72rem' }}>↓ CSV</button>
            <button onClick={() => { if (confirm(`Delete "${deck.name}"?`)) onDeleteDeck(deck.id) }} style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.25)' }}><Trash2 size={13} /></button>
            <button onClick={onClose} style={{ ...btnGhost, padding: '0.35rem 0.6rem' }}><X size={14} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', borderRadius: 8, padding: 3 }}>
          {[['cards','Cards'],['add','Add card'],['settings','Settings']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', background: tab === k ? 'var(--bg-card)' : 'transparent', color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>{l}</button>
          ))}
        </div>

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={labelStyle}>Front</label><textarea className="input" value={front} onChange={e => setFront(e.target.value)} placeholder="Question or word…" style={{ width: '100%', minHeight: 80, fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }} /></div>
            <div><label style={labelStyle}>Back</label><textarea className="input" value={back} onChange={e => setBack(e.target.value)} placeholder="Answer or translation…" style={{ width: '100%', minHeight: 80, fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }} /></div>
            <button onClick={addCard} disabled={!front.trim() || !back.trim()} style={{ ...btnPrimary, alignSelf: 'flex-end' }}><Plus size={13} /> Add card</button>
          </div>
        )}

        {tab === 'cards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420, overflowY: 'auto' }}>
            {deckCards.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No cards yet.</div>}
            {deckCards.map(c => {
              const stateColor = c.state === 'review' ? '#4ade80' : c.state === 'learning' || c.state === 'relearn' ? '#f87171' : '#60a5fa'
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--input-bg)', borderRadius: 8, cursor: 'pointer' }} onClick={() => setStatsCard(c)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{c.front}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{c.back}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {c.suspended
                        ? <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', padding: '1px 6px', borderRadius: 99, fontFamily: "'JetBrains Mono', monospace" }}>Suspended</span>
                        : <span style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: stateColor }}>{c.state ?? 'new'}{c.reps > 0 ? ` · ${c.interval}d · ${c.reps}r` : ''}</span>
                      }
                      {c.buried === todayStr() && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', padding: '1px 6px', borderRadius: 99, fontFamily: "'JetBrains Mono', monospace" }}>Buried today</span>}
                      {c.reps > 0 && !c.suspended && <EaseBadge ease={c.ease} />}
                      {c.lapses > 0 && <span style={{ fontSize: '0.58rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>{c.lapses} lapses</span>}
                      {c.tags && c.tags.split(/\s+/).filter(Boolean).map(t => (
                        <span key={t} style={{ fontSize: '0.58rem', color: 'var(--text-muted)', background: 'var(--border)', padding: '0 5px', borderRadius: 99 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {c.suspended && <button onClick={() => onSaveCards(cards.map(x => x.id === c.id ? { ...x, suspended: false } : x))} title="Unsuspend" style={{ ...btnGhost, padding: '0.3rem 0.45rem', color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)' }}><Eye size={11} /></button>}
                    <button onClick={() => onSaveCards(cards.map(x => x.id === c.id ? { ...x, state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0, lastReviewed: null, suspended: false, buried: null } : x))} title="Reset" style={{ ...btnGhost, padding: '0.3rem 0.45rem' }}><RotateCcw size={11} /></button>
                    <button onClick={() => onSaveCards(cards.filter(x => x.id !== c.id))} style={{ ...btnGhost, padding: '0.3rem 0.45rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}><Trash2 size={11} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={labelStyle}>New cards per day</label><input type="number" className="input" min={1} max={9999} value={newPerDay} onChange={e => setNewPerDay(parseInt(e.target.value) || 20)} style={{ width: 100, fontSize: '0.85rem' }} /></div>
            <div><label style={labelStyle}>Max reviews per day</label><input type="number" className="input" min={1} max={9999} value={maxReviews} onChange={e => setMaxReviews(parseInt(e.target.value) || 200)} style={{ width: 100, fontSize: '0.85rem' }} /></div>
            <button onClick={() => { onUpdateDeck({ ...deck, newPerDay, maxReviews }); onClose() }} style={{ ...btnPrimary, alignSelf: 'flex-start' }}><Check size={13} /> Save</button>
          </div>
        )}
      </div>
      {statsCard && <CardStatsDrawer card={statsCard} onClose={() => setStatsCard(null)} />}
    </div>
  )
}

// ─── Import panel ─────────────────────────────────────────────────────────────
function ImportPanel({ decks, onImport }) {
  const [deckId,  setDeckId]  = useState(decks[0]?.id ?? '')
  const [newName, setNewName] = useState('')
  const [status,  setStatus]  = useState(null)
  const fileRef = useRef()

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.apkg')) { setStatus({ ok: false, msg: 'File must be a .apkg' }); return }
    setStatus('loading')
    try {
      const targetId = deckId || uid()
      const { cards: importedCards, mediaStored } = await parseApkg(file, targetId, p => {
        setStatus({ loading: true, msg: `Storing media… ${p.mediaStored}/${p.mediaTotal}` })
      })
      const name = newName.trim() || file.name.replace('.apkg', '')
      onImport(targetId, name, importedCards)
      const mediaPart = mediaStored > 0 ? ` · ${mediaStored} media files stored` : ''
      setStatus({ ok: true, msg: `Imported ${importedCards.length} cards into "${name}"${mediaPart}` })
      setNewName('')
    } catch (e) { setStatus({ ok: false, msg: e.message ?? 'Import failed' }) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560 }}>
      <div style={panel}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>Import .apkg</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Export from Anki: File → Export → .apkg. Text, images and audio are all imported.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={labelStyle}>Import into</label>
          <select value={deckId} onChange={e => setDeckId(e.target.value)} className="input" style={{ fontSize: '0.85rem' }}>
            <option value="">— Create new deck —</option>
            {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {!deckId && <input className="input" placeholder="New deck name…" value={newName} onChange={e => setNewName(e.target.value)} style={{ fontSize: '0.85rem' }} />}
        </div>
        <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Upload size={28} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Drop .apkg here or click to browse</div>
          <input ref={fileRef} type="file" accept=".apkg" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>
        {status && (status === 'loading' || status.loading) && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 14, height: 14, borderRadius: 99, border: '2px solid var(--border)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            {status.msg ?? 'Parsing…'}
          </div>
        )}
        {status && !status.loading && status !== 'loading' && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: status.ok ? '#4ade80' : '#f87171' }}>
            {status.ok ? <Check size={14} /> : <AlertCircle size={14} />}
            {status.msg}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LanguagePlanner() {
  const [decks,       setDecks]       = useState(loadDecks)
  const [cards,       setCards]       = useState(loadCards)
  const [tab,         setTab]         = useState('today')
  const [reviewing,   setReviewing]   = useState(null)
  const [editing,     setEditing]     = useState(null)
  const [newDeckName, setNewDeckName] = useState('')
  const [streak,      setStreak]      = useState(loadStreak)
  const [gridView,    setGridView]    = useState(false)
  const [goal,        setGoal]        = useState(loadGoal)
  const [reviewedToday, setReviewedToday] = useState(getTotalReviewedToday)

  useEffect(() => { saveDecks(decks) }, [decks])
  useEffect(() => { saveCards(cards) }, [cards])

  const allDue = decks.reduce((sum, d) => { const q = buildQueue(cards, d.id, d); return sum + q.learning.length + q.reviews.length + q.newCards.length }, 0)

  function createDeck() {
    if (!newDeckName.trim()) return
    const deck = { id: uid(), name: newDeckName.trim(), createdAt: Date.now(), newPerDay: DEFAULT_NEW_PER_DAY, maxReviews: DEFAULT_MAX_REVIEWS, colorIdx: decks.length % DECK_COLOR_PALETTE.length }
    setDecks(d => [...d, deck]); setNewDeckName(''); setEditing(deck)
  }
  function deleteDeck(id) { setDecks(d => d.filter(x => x.id !== id)); setCards(c => c.filter(x => x.deckId !== id)); setEditing(null) }
  function updateDeck(updated) { setDecks(d => d.map(x => x.id === updated.id ? updated : x)) }
  function handleImport(targetId, name, newCards) {
    setDecks(d => d.find(x => x.id === targetId) ? d : [...d, { id: targetId, name, createdAt: Date.now(), newPerDay: DEFAULT_NEW_PER_DAY, maxReviews: DEFAULT_MAX_REVIEWS, colorIdx: d.length % DECK_COLOR_PALETTE.length }])
    setCards(c => [...c, ...newCards])
  }
  function updateCard(updated) { setCards(c => c.map(x => x.id === updated.id ? updated : x)) }
  function handleGoalChange(g) { setGoal(g); saveGoal(g) }
  function refreshReviewedToday() { setReviewedToday(getTotalReviewedToday()) }

  if (reviewing) {
    const deck = decks.find(d => d.id === reviewing.id) ?? reviewing
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '1rem 0' }}>
        <ReviewSession cards={cards} deckId={reviewing.id ?? '__all__'} deck={deck}
          onDone={() => { setReviewing(null); setStreak(loadStreak()); refreshReviewedToday() }}
          onUpdateCard={updateCard} />
      </div>
    )
  }

  const dueByDeck       = decks.map(d => { const q = buildQueue(cards, d.id, d); return { deck: d, ...q, due: q.learning.length + q.reviews.length + q.newCards.length } }).filter(x => x.due > 0)
  const strugglingCards = useMemo(() => cards.filter(c => (c.lapses ?? 0) >= 3), [cards])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 900 }}>

      {/* Hero banner */}
      <HeroBanner
        streak={streak} allDue={allDue} totalCards={cards.length} decks={decks}
        onStudyAll={() => setReviewing({ id: '__all__', name: 'All decks' })}
        reviewedToday={reviewedToday} goal={goal} onGoalChange={handleGoalChange}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          ['today', allDue > 0 ? `Today (${allDue})` : 'Today'],
          ['decks',  `Decks${decks.length ? ` (${decks.length})` : ''}`],
          ['stats',  'Stats'],
          ['import', 'Import .apkg'],
        ].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '0.45rem 1.1rem', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
            background: tab === k ? 'var(--bg-card)' : 'transparent',
            color: tab === k ? 'var(--text-primary)' : k === 'today' && allDue > 0 && tab !== 'today' ? '#f87171' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* Today */}
      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <WordOfDay cards={cards} />
          {dueByDeck.length === 0 ? (
            <div style={{ ...panel, textAlign: 'center', padding: '2.5rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Nothing due right now</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {decks.length === 0 ? 'Create a deck or import an .apkg to get started.' : 'All caught up — come back tomorrow.'}
              </div>
            </div>
          ) : (
            dueByDeck.map(({ deck, learning, reviews, newCards }) => {
              const dc = deckColor(deck)
              return (
                <div key={deck.id} style={{ ...panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderLeft: `4px solid ${dc.accent}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{dc.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 4 }}>{deck.name}</div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {learning.length > 0 && <span style={{ fontSize: '0.7rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{learning.length} learning</span>}
                        {reviews.length  > 0 && <span style={{ fontSize: '0.7rem', color: '#4ade80', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{reviews.length} review</span>}
                        {newCards.length > 0 && <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{newCards.length} new</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setReviewing(deck)} style={btnPrimary}><Play size={13} /> Start</button>
                </div>
              )
            })
          )}
          <StrugglingCards cards={cards} onStudy={() => setReviewing({ id: '__all__', name: 'Struggling cards' })} />
          <RecentlyMastered cards={cards} />
        </div>
      )}

      {/* Decks */}
      {tab === 'decks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <input className="input" placeholder="New deck name…" value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createDeck()} style={{ flex: 1, fontSize: '0.85rem' }} />
            <button onClick={createDeck} disabled={!newDeckName.trim()} style={btnPrimary}><Plus size={13} /> Create</button>
            <button onClick={() => setGridView(v => !v)} title={gridView ? 'List view' : 'Grid view'} style={{ ...btnGhost, padding: '0.45rem 0.65rem' }}>
              {gridView ? <Layers size={14} /> : <BarChart2 size={14} style={{ transform: 'rotate(90deg)' }} />}
            </button>
          </div>
          {decks.length === 0 && <div style={{ ...panel, textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No decks yet.</div>}
          {gridView
            ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {decks.map(deck => <DeckGridCard key={deck.id} deck={deck} cards={cards} onReview={setReviewing} onEdit={setEditing} />)}
              </div>
            : decks.map(deck => <DeckRow key={deck.id} deck={deck} cards={cards} onReview={setReviewing} onEdit={setEditing} />)
          }
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && <StatsTab cards={cards} decks={decks} streak={streak} />}

      {/* Import */}
      {tab === 'import' && <ImportPanel decks={decks} onImport={handleImport} />}

      {editing && (
        <DeckEditor deck={editing} cards={cards} onClose={() => setEditing(null)}
          onSaveCards={setCards} onDeleteDeck={deleteDeck} onUpdateDeck={updateDeck} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop  { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}
