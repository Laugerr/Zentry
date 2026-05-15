import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  BookOpen, Plus, Trash2, Upload, Play, Pause, RotateCcw,
  Flame, Check, X, AlertCircle, Eye, ArrowLeft, Settings,
  Calendar, Layers,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const LEARN_STEPS   = [1, 10]   // minutes: new cards go 1min → 10min → graduate
const RELEARN_STEPS = [10]      // minutes: lapsed review cards
const GRADUATING_INTERVAL = 1  // days: first interval after learning
const EASY_INTERVAL       = 4  // days: skip all steps on Easy
const DEFAULT_EASE        = 2.5
const MIN_EASE            = 1.3
const DEFAULT_NEW_PER_DAY = 20
const DEFAULT_MAX_REVIEWS = 200

// ─── Rating ───────────────────────────────────────────────────────────────────
// Returns updated card. Does NOT set .due for learning/relearn (caller handles ms offset).
function rateCard(card, rating) {
  const now = Date.now()
  let c = { ...card }

  if (c.state === 'new' || c.state === 'learning') {
    const steps = LEARN_STEPS

    if (rating === 0) {
      // Again — back to step 0
      c.state = 'learning'
      c.step  = 0
      c.due   = now + steps[0] * 60_000
    } else if (rating === 3) {
      // Easy — graduate immediately
      c.state    = 'review'
      c.interval = EASY_INTERVAL
      c.ease     = DEFAULT_EASE
      c.reps     = 1
      c.step     = 0
      c.due      = now + EASY_INTERVAL * 86_400_000
    } else {
      // Hard or Good — advance step
      const nextStep = rating === 1 ? c.step : (c.step ?? 0) + 1
      if (nextStep >= steps.length) {
        // Graduate
        c.state    = 'review'
        c.interval = GRADUATING_INTERVAL
        c.ease     = DEFAULT_EASE
        c.reps     = 1
        c.step     = 0
        c.due      = now + GRADUATING_INTERVAL * 86_400_000
      } else {
        c.state = 'learning'
        c.step  = nextStep
        c.due   = now + steps[nextStep] * 60_000
      }
    }

  } else if (c.state === 'relearn') {
    const steps = RELEARN_STEPS

    if (rating === 0) {
      c.step = 0
      c.due  = now + steps[0] * 60_000
    } else {
      const nextStep = rating === 1 ? c.step : (c.step ?? 0) + 1
      if (nextStep >= steps.length) {
        // Re-graduate: interval is already reduced (done when it lapsed)
        c.state = 'review'
        c.step  = 0
        c.due   = now + c.interval * 86_400_000
      } else {
        c.step = nextStep
        c.due  = now + steps[nextStep] * 60_000
      }
    }

  } else {
    // review
    if (rating === 0) {
      // Lapse
      c.lapses   = (c.lapses ?? 0) + 1
      c.ease     = Math.max(MIN_EASE, (c.ease ?? DEFAULT_EASE) - 0.2)
      c.interval = Math.max(1, Math.round((c.interval ?? 1) * 0.7))
      c.state    = 'relearn'
      c.step     = 0
      c.due      = now + RELEARN_STEPS[0] * 60_000
    } else {
      let { interval = 1, ease = DEFAULT_EASE } = c
      if      (rating === 1) { interval = Math.round(interval * 1.2); ease = Math.max(MIN_EASE, ease - 0.15) }
      else if (rating === 2) { interval = Math.round(interval * ease) }
      else                   { interval = Math.round(interval * ease * 1.3); ease = ease + 0.15 }
      c.interval = Math.max(1, interval)
      c.ease     = ease
      c.reps     = (c.reps ?? 0) + 1
      c.state    = 'review'
      c.due      = now + c.interval * 86_400_000
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

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const todayStr = () => new Date().toISOString().slice(0, 10)

// Per-deck daily counts — how many new/review cards already shown today
function dailyKey(deckId) { return `zentry:srs:daily:${deckId}:${todayStr()}` }
function loadDaily(deckId) {
  try { return JSON.parse(localStorage.getItem(dailyKey(deckId)) ?? '{}') } catch { return {} }
}
function saveDaily(deckId, data) {
  try { localStorage.setItem(dailyKey(deckId), JSON.stringify(data)) } catch {}
}
function bumpDaily(deckId, field) {
  const d = loadDaily(deckId)
  const next = { ...d, [field]: (d[field] ?? 0) + 1 }
  saveDaily(deckId, next)
  return next
}

function bumpStreak() {
  const s = loadStreak()
  const today = todayStr()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (s.last === today) return s
  const cur = s.last === yesterday ? (s.current ?? 0) + 1 : 1
  const longest = Math.max(cur, s.longest ?? 0)
  const next = { last: today, current: cur, longest }
  saveStreak(next)
  return next
}

// ─── Queue builder ─────────────────────────────────────────────────────────────
// Returns { learning[], reviews[], newCards[], counts }
function buildQueue(cards, deckId, deck) {
  const now        = Date.now()
  const newPerDay  = deck?.newPerDay  ?? DEFAULT_NEW_PER_DAY
  const maxReviews = deck?.maxReviews ?? DEFAULT_MAX_REVIEWS
  const daily      = loadDaily(deckId === '__all__' ? 'all' : deckId)
  const newSeen    = daily.newSeen    ?? 0
  const reviewsDone= daily.reviewsDone?? 0

  const deckCards  = deckId === '__all__' ? cards : cards.filter((c) => c.deckId === deckId)

  const learning = deckCards.filter((c) =>
    (c.state === 'learning' || c.state === 'relearn') && (c.due ?? 0) <= now
  )

  const reviews = deckCards.filter((c) =>
    c.state === 'review' && (c.due ?? 0) <= now
  ).slice(0, Math.max(0, maxReviews - reviewsDone))

  const newCards = deckCards.filter((c) =>
    c.state === 'new' || (!c.state && !c.reps)
  ).slice(0, Math.max(0, newPerDay - newSeen))

  return { learning, reviews, newCards }
}

// Count what's due (for display — not capped by daily limits for learning/review)
function countDue(cards, deckId) {
  const now = Date.now()
  const dc  = deckId === '__all__' ? cards : cards.filter((c) => c.deckId === deckId)
  const learning = dc.filter((c) => (c.state === 'learning' || c.state === 'relearn') && (c.due ?? 0) <= now).length
  const reviews  = dc.filter((c) => c.state === 'review' && (c.due ?? 0) <= now).length
  const newCount = dc.filter((c) => !c.state || c.state === 'new').length
  return { learning, reviews, newCount, total: learning + reviews + newCount }
}

// ─── IndexedDB — media blob store ────────────────────────────────────────────
const IDB_NAME  = 'zentry-srs-media'
const IDB_STORE = 'files'

function openMediaDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}
async function putMediaBlob(filename, blob) {
  const db = await openMediaDB()
  await new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const req = tx.objectStore(IDB_STORE).put(blob, filename)
    req.onsuccess = res; req.onerror = (e) => rej(e.target.error)
    tx.oncomplete = () => db.close()
  })
}
async function getMediaBlob(filename) {
  const db = await openMediaDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(filename)
    req.onsuccess = (e) => { db.close(); res(e.target.result ?? null) }
    req.onerror   = (e) => { db.close(); rej(e.target.error) }
  })
}

// ─── MIME type detection ──────────────────────────────────────────────────────
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return {
    mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
    m4a: 'audio/mp4', opus: 'audio/ogg; codecs=opus', flac: 'audio/flac',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    avif: 'image/avif',
  }[ext] ?? 'application/octet-stream'
}

// ─── Media resolution (blob URL cache, lives for the page session) ────────────
const blobUrlCache = new Map()

async function resolveBlobUrl(filename) {
  if (blobUrlCache.has(filename)) return blobUrlCache.get(filename)
  const blob = await getMediaBlob(filename).catch(() => null)
  if (!blob) return null
  // Re-wrap with correct MIME type in case it was stored as octet-stream
  const typed = blob.type && blob.type !== 'application/octet-stream'
    ? blob
    : new Blob([await blob.arrayBuffer()], { type: getMimeType(filename) })
  const url = URL.createObjectURL(typed)
  blobUrlCache.set(filename, url)
  return url
}

// ─── Field tokenizer ──────────────────────────────────────────────────────────
// Splits a raw Anki field into {type:'text'|'sound'|'image', value/filename} tokens
function parseFieldTokens(raw = '') {
  const tokens = []
  const re = /(\[sound:[^\]]+\])|(<img[^>]+>)/gi
  let last = 0, m
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: raw.slice(last, m.index) })
    if (m[1]) {
      tokens.push({ type: 'sound', filename: m[1].replace(/^\[sound:|\]$/gi, '') })
    } else {
      const src = m[2].match(/src="([^"]+)"/i)?.[1]
      if (src) tokens.push({ type: 'image', filename: src })
    }
    last = re.lastIndex
  }
  if (last < raw.length) tokens.push({ type: 'text', value: raw.slice(last) })
  return tokens
}

function renderTextToken(raw = '') {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|li|tr|td)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── AudioButton ──────────────────────────────────────────────────────────────
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
      {url && (
        <audio ref={audioRef} src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <button onClick={toggle} disabled={!url} style={{
        width: 52, height: 52, borderRadius: '50%', border: 'none',
        background: playing ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.12)',
        outline: `2px solid ${playing ? '#a78bfa' : 'rgba(167,139,250,0.35)'}`,
        color: url ? '#a78bfa' : 'var(--text-muted)',
        cursor: url ? 'pointer' : 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
        boxShadow: playing ? '0 0 16px rgba(167,139,250,0.35)' : 'none',
      }}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
    </div>
  )
}

// ─── MediaField component ─────────────────────────────────────────────────────
function MediaField({ text = '', style = {}, autoPlay = false }) {
  const cleaned = useMemo(() => text
    .replace(/\[anki:[^\]]+\]/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .trim()
  , [text])

  const tokens = useMemo(() => parseFieldTokens(cleaned), [cleaned])
  const [urls, setUrls] = useState({})

  useEffect(() => {
    const filenames = tokens
      .filter(t => t.type === 'sound' || t.type === 'image')
      .map(t => t.filename)
    if (!filenames.length) return
    let alive = true
    Promise.all(filenames.map(async f => [f, await resolveBlobUrl(f).catch(() => null)]))
      .then(pairs => { if (alive) setUrls(Object.fromEntries(pairs.filter(([, u]) => u))) })
    return () => { alive = false }
  }, [tokens])

  const firstSoundIdx = tokens.findIndex(t => t.type === 'sound')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', ...style }}>
      {tokens.map((token, i) => {
        if (token.type === 'text') {
          const clean = renderTextToken(token.value)
          return clean ? <div key={i} style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>{clean}</div> : null
        }
        if (token.type === 'image') {
          const url = urls[token.filename]
          return url
            ? <img key={i} src={url} alt="" style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: 12, display: 'block', objectFit: 'contain', margin: '4px 0' }} />
            : <div key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⏳ image loading…</div>
        }
        if (token.type === 'sound') {
          return (
            <AudioButton
              key={i}
              url={urls[token.filename]}
              autoPlay={autoPlay && i === firstSoundIdx}
            />
          )
        }
        return null
      })}
    </div>
  )
}

// ─── Field cleaner (keeps [sound:] and <img>, strips the rest) ────────────────
function cleanField(raw = '') {
  // Only remove truly useless tags; keep sound + img for MediaField to resolve
  return raw
    .replace(/\[anki:[^\]]+\]/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .trim()
}

// ─── .apkg import ─────────────────────────────────────────────────────────────
async function parseApkg(file, deckId, onProgress) {
  const JSZip   = (await import('jszip')).default
  const initSql = (await import('sql.js')).default
  const SQL     = await initSql({ locateFile: () => '/sql-wasm.wasm' })

  const zip    = await JSZip.loadAsync(file)
  const dbFile = zip.file('collection.anki21') ?? zip.file('collection.anki2')
  if (!dbFile) throw new Error('No collection file found in .apkg')

  const buf = await dbFile.async('arraybuffer')
  const db  = new SQL.Database(new Uint8Array(buf))
  const res = db.exec('SELECT flds, tags FROM notes')
  db.close()

  if (!res.length || !res[0].values.length) throw new Error('No notes found')

  // ── Extract & store media files in IndexedDB ──────────────────────────────
  let mediaStored = 0
  const mediaFile = zip.file('media')
  if (mediaFile) {
    try {
      const mediaMap = JSON.parse(await mediaFile.async('text')) // {"0":"dog.jpg","1":"hello.mp3"}
      const entries  = Object.entries(mediaMap)
      for (const [numericName, realName] of entries) {
        const zf = zip.file(numericName)
        if (!zf) continue
        const buf  = await zf.async('arraybuffer')
        const blob = new Blob([buf], { type: getMimeType(realName) })
        await putMediaBlob(realName, blob)
        mediaStored++
        onProgress?.({ mediaStored, mediaTotal: entries.length })
      }
    } catch { /* media map missing or corrupt — skip silently */ }
  }

  const cards = res[0].values.map(([flds, tags]) => {
    const parts = flds.split('\x1f')
    return {
      id: uid(), deckId,
      front: cleanField(parts[0]),
      back:  cleanField(parts[1]),
      tags:  (tags ?? '').trim(),
      state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0,
    }
  }).filter((c) => c.front || c.back)

  return { cards, mediaStored }
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const panel = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem 1.2rem' }

const btnPrimary = {
  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
  border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8,
  padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
}
const btnGhost = {
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
}
const labelStyle = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: '0.4rem',
  fontFamily: "'JetBrains Mono', monospace",
}

// ─── Review session ───────────────────────────────────────────────────────────
function ReviewSession({ cards: allCards, deckId, deck, onDone, onUpdateCard }) {
  const { learning, reviews, newCards } = buildQueue(allCards, deckId, deck)

  // Queue: learning first (urgent), then reviews, then new
  const initialQueue = useRef([...learning, ...reviews, ...newCards])
  const requeue      = useRef([])   // cards that need to come back (Again on learning)
  const seenNew      = useRef(new Set())
  const seenReview   = useRef(new Set())

  const [idx,      setIdx]      = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [stats,    setStats]    = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [done,     setDone]     = useState(false)
  const [streak,   setStreak]   = useState(loadStreak)

  // Remaining counts for the Anki-style counter
  const [remaining, setRemaining] = useState({
    learning: learning.length,
    reviews:  reviews.length,
    newCards: newCards.length,
  })

  const queue = initialQueue.current

  function currentCard() {
    if (idx < queue.length) return queue[idx]
    // Check requeue
    const now = Date.now()
    const ready = requeue.current.filter((c) => c._requeueDue <= now)
    if (ready.length) {
      requeue.current = requeue.current.filter((c) => c._requeueDue > now)
      ready.forEach((c) => queue.push(c))
      return queue[idx]
    }
    // Show not-yet-due requeue cards anyway (like Anki does in short sessions)
    if (requeue.current.length) {
      requeue.current.sort((a, b) => a._requeueDue - b._requeueDue)
      const c = requeue.current.shift()
      queue.push(c)
      return queue[idx]
    }
    return null
  }

  useEffect(() => {
    function onKey(e) {
      const card = currentCard()
      if (!card) return
      if (e.code === 'Space') { e.preventDefault(); if (!revealed) setRevealed(true) }
      if (!revealed) return
      if (e.key === '1') rate(card, 0)
      if (e.key === '2') rate(card, 1)
      if (e.key === '3') rate(card, 2)
      if (e.key === '4') rate(card, 3)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, idx])

  function rate(card, rating) {
    // Track daily counts (only first time card is shown)
    const realDeckId = deckId === '__all__' ? card.deckId : deckId
    if ((card.state === 'new' || !card.state) && !seenNew.current.has(card.id)) {
      seenNew.current.add(card.id)
      bumpDaily(realDeckId, 'newSeen')
    } else if (card.state === 'review' && !seenReview.current.has(card.id)) {
      seenReview.current.add(card.id)
      bumpDaily(realDeckId, 'reviewsDone')
    }

    const updated = rateCard(card, rating)
    onUpdateCard(updated)

    const key = ['again', 'hard', 'good', 'easy'][rating]
    setStats((s) => ({ ...s, [key]: s[key] + 1 }))

    // If card needs to come back (learning/relearn not graduated)
    if (updated.state === 'learning' || updated.state === 'relearn') {
      requeue.current.push({ ...updated, _requeueDue: updated.due })
    }

    // Update remaining counter
    setRemaining((r) => {
      const wasLearning = card.state === 'learning' || card.state === 'relearn'
      const wasReview   = card.state === 'review'
      const wasNew      = card.state === 'new' || !card.state
      const comesBack   = updated.state === 'learning' || updated.state === 'relearn'
      return {
        learning: comesBack
          ? r.learning + (wasLearning ? 0 : 1)
          : Math.max(0, r.learning - (wasLearning ? 1 : 0)),
        reviews:  Math.max(0, r.reviews  - (wasReview   ? 1 : 0)),
        newCards: Math.max(0, r.newCards - (wasNew       ? 1 : 0)),
      }
    })

    const nextIdx = idx + 1
    const hasMore = nextIdx < queue.length || requeue.current.length > 0
    if (!hasMore) {
      const s = bumpStreak()
      setStreak(s)
      setDone(true)
    } else {
      setIdx(nextIdx)
      setRevealed(false)
    }
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done) {
    const total = stats.again + stats.hard + stats.good + stats.easy
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Session complete</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>{total} cards · streak {streak.current ?? 1} 🔥</div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['Again','#f87171',stats.again],['Hard','#fbbf24',stats.hard],['Good','#60a5fa',stats.good],['Easy','#4ade80',stats.easy]].map(([l,c,v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: c }}>{v}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</span>
            </div>
          ))}
        </div>
        <button onClick={onDone} style={{ ...btnPrimary, padding: '0.75rem 2rem', fontSize: '0.88rem' }}>
          Back to decks
        </button>
      </div>
    )
  }

  const card = currentCard()
  if (!card) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        No cards available. <button onClick={onDone} style={{ ...btnGhost, marginTop: '1rem' }}>Back</button>
      </div>
    )
  }

  const totalRemaining = remaining.learning + remaining.reviews + remaining.newCards

  const RATINGS = [
    { label: 'Again', key: 0, color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    { label: 'Hard',  key: 1, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
    { label: 'Good',  key: 2, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
    { label: 'Easy',  key: 3, color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Top bar — back + Anki-style counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={onDone} style={{ ...btnGhost, padding: '0.35rem 0.6rem' }}><ArrowLeft size={14} /></button>
        <div style={{ flex: 1 }} />
        {/* Anki counter: red=learning, green=reviews, blue=new */}
        <div style={{ display: 'flex', gap: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 700 }}>
          <span style={{ color: '#f87171' }}>{remaining.learning}</span>
          <span style={{ color: '#4ade80' }}>{remaining.reviews}</span>
          <span style={{ color: '#60a5fa' }}>{remaining.newCards}</span>
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => !revealed && setRevealed(true)}
        style={{ ...panel, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2.5rem 2rem', cursor: revealed ? 'default' : 'pointer' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {card.state === 'new' || !card.state ? 'New' : card.state === 'learning' ? 'Learning' : card.state === 'relearn' ? 'Relearn' : 'Review'}
          </div>
          <MediaField
            text={card.front}
            style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, textAlign: 'center' }}
          />
        </div>

        {revealed ? (
          <>
            <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Answer</div>
              <MediaField
                text={card.back}
                autoPlay={revealed}
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 600, color: '#a78bfa', lineHeight: 1.4, textAlign: 'center' }}
              />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Eye size={12} /> click or Space to reveal
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
          {RATINGS.map(({ label, key, color, bg, border }) => {
            // Show next interval hint
            const preview = rateCard(card, key)
            const hint = preview.state === 'learning' || preview.state === 'relearn'
              ? `${LEARN_STEPS[preview.step ?? 0] ?? RELEARN_STEPS[0]}m`
              : `${preview.interval}d`
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

      {!revealed && (
        <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>Space</kbd> reveal &nbsp;·&nbsp;
          <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>1</kbd>–
          <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>4</kbd> rate
        </div>
      )}
    </div>
  )
}

// ─── Deck row ─────────────────────────────────────────────────────────────────
function DeckRow({ deck, cards, onReview, onEdit }) {
  const { learning, reviews, newCards } = buildQueue(cards, deck.id, deck)
  const total = cards.filter((c) => c.deckId === deck.id).length
  const due   = learning.length + reviews.length + newCards.length

  return (
    <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</div>
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

// ─── Deck editor modal ────────────────────────────────────────────────────────
function DeckEditor({ deck, cards, onClose, onSaveCards, onDeleteDeck, onUpdateDeck }) {
  const deckCards = cards.filter((c) => c.deckId === deck.id)
  const [front, setFront]   = useState('')
  const [back,  setBack]    = useState('')
  const [tab,   setTab]     = useState('cards')
  const [newPerDay,   setNewPerDay]   = useState(deck.newPerDay   ?? DEFAULT_NEW_PER_DAY)
  const [maxReviews,  setMaxReviews]  = useState(deck.maxReviews  ?? DEFAULT_MAX_REVIEWS)

  function addCard() {
    if (!front.trim() || !back.trim()) return
    onSaveCards([...cards, { id: uid(), deckId: deck.id, front: front.trim(), back: back.trim(), state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0 }])
    setFront(''); setBack('')
  }

  function deleteCard(id) { onSaveCards(cards.filter((c) => c.id !== id)) }

  function resetCard(id) {
    onSaveCards(cards.map((c) => c.id === id
      ? { ...c, state: 'new', due: null, interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, step: 0, lastReviewed: null }
      : c
    ))
  }

  const TABS = [['cards','Cards'],['add','Add card'],['settings','Settings']]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ ...panel, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{deck.name}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { if (confirm(`Delete "${deck.name}" and all its cards?`)) onDeleteDeck(deck.id) }}
              style={{ ...btnGhost, padding: '0.35rem 0.6rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.25)' }}>
              <Trash2 size={13} />
            </button>
            <button onClick={onClose} style={{ ...btnGhost, padding: '0.35rem 0.6rem' }}><X size={14} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', borderRadius: 8, padding: 3 }}>
          {TABS.map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '0.4rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit',
              background: tab === k ? 'var(--bg-card)' : 'transparent',
              color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={labelStyle}>Front</label>
              <textarea className="input" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question or word…" style={{ width: '100%', minHeight: 80, fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div><label style={labelStyle}>Back</label>
              <textarea className="input" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer or translation…" style={{ width: '100%', minHeight: 80, fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button onClick={addCard} disabled={!front.trim() || !back.trim()} style={{ ...btnPrimary, alignSelf: 'flex-end' }}>
              <Plus size={13} /> Add card
            </button>
          </div>
        )}

        {tab === 'cards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420, overflowY: 'auto' }}>
            {deckCards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No cards yet.</div>
            )}
            {deckCards.map((c) => {
              const stateColor = c.state === 'review' ? '#4ade80' : c.state === 'learning' || c.state === 'relearn' ? '#f87171' : '#60a5fa'
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--input-bg)', borderRadius: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.front}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.back}</div>
                    <div style={{ fontSize: '0.62rem', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", color: stateColor }}>
                      {c.state ?? 'new'}{c.reps > 0 ? ` · ${c.reps} reps · ${c.interval}d · ease ${c.ease?.toFixed(2)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button onClick={() => resetCard(c.id)} title="Reset" style={{ ...btnGhost, padding: '0.3rem 0.45rem' }}><RotateCcw size={11} /></button>
                    <button onClick={() => deleteCard(c.id)} style={{ ...btnGhost, padding: '0.3rem 0.45rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}><Trash2 size={11} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>New cards per day</label>
              <input type="number" className="input" min={1} max={9999} value={newPerDay}
                onChange={(e) => setNewPerDay(parseInt(e.target.value) || 20)}
                style={{ width: 100, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={labelStyle}>Max reviews per day</label>
              <input type="number" className="input" min={1} max={9999} value={maxReviews}
                onChange={(e) => setMaxReviews(parseInt(e.target.value) || 200)}
                style={{ width: 100, fontSize: '0.85rem' }} />
            </div>
            <button onClick={() => { onUpdateDeck({ ...deck, newPerDay, maxReviews }); onClose() }} style={{ ...btnPrimary, alignSelf: 'flex-start' }}>
              <Check size={13} /> Save settings
            </button>
          </div>
        )}
      </div>
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
      const { cards: importedCards, mediaStored } = await parseApkg(file, targetId, (p) => {
        setStatus({ loading: true, msg: `Storing media… ${p.mediaStored}/${p.mediaTotal}` })
      })
      const name = newName.trim() || file.name.replace('.apkg', '')
      onImport(targetId, name, importedCards)
      const mediaPart = mediaStored > 0 ? ` · ${mediaStored} media file${mediaStored !== 1 ? 's' : ''} stored` : ''
      setStatus({ ok: true, msg: `Imported ${importedCards.length} cards into "${name}"${mediaPart}` })
      setNewName('')
    } catch (e) {
      setStatus({ ok: false, msg: e.message ?? 'Import failed' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 560 }}>
      <div style={panel}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>Import .apkg</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Export from Anki: File → Export → .apkg. Images and audio are skipped; text cards are fully imported with SM-2 scheduling ready.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={labelStyle}>Import into</label>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="input" style={{ fontSize: '0.85rem' }}>
            <option value="">— Create new deck —</option>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {!deckId && (
            <input className="input" placeholder="New deck name (or leave blank to use filename)…"
              value={newName} onChange={(e) => setNewName(e.target.value)} style={{ fontSize: '0.85rem' }} />
          )}
        </div>
        <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Upload size={28} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Drop .apkg here or click to browse</div>
          <input ref={fileRef} type="file" accept=".apkg" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
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
      <div style={{ ...panel, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Supported:</strong> Basic, Basic (reversed), Vocabulary — any note type with at least two text fields.<br />
        <strong style={{ color: 'var(--text-secondary)' }}>Not supported:</strong> Cloze deletions, audio, images, LaTeX.
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LanguagePlanner() {
  const [decks,     setDecks]     = useState(loadDecks)
  const [cards,     setCards]     = useState(loadCards)
  const [tab,       setTab]       = useState('today')
  const [reviewing, setReviewing] = useState(null)  // { id, name, ...deck } | null
  const [editing,   setEditing]   = useState(null)
  const [newDeckName, setNewDeckName] = useState('')
  const [streak,    setStreak]    = useState(loadStreak)

  useEffect(() => { saveDecks(decks) }, [decks])
  useEffect(() => { saveCards(cards) }, [cards])

  // All-decks due count
  const allDue = decks.reduce((sum, d) => {
    const q = buildQueue(cards, d.id, d)
    return sum + q.learning.length + q.reviews.length + q.newCards.length
  }, 0)

  function createDeck() {
    if (!newDeckName.trim()) return
    const deck = { id: uid(), name: newDeckName.trim(), createdAt: Date.now(), newPerDay: DEFAULT_NEW_PER_DAY, maxReviews: DEFAULT_MAX_REVIEWS }
    setDecks((d) => [...d, deck])
    setNewDeckName('')
    setEditing(deck)
  }

  function deleteDeck(id) {
    setDecks((d) => d.filter((x) => x.id !== id))
    setCards((c) => c.filter((x) => x.deckId !== id))
    setEditing(null)
  }

  function updateDeck(updated) {
    setDecks((d) => d.map((x) => x.id === updated.id ? updated : x))
  }

  function handleImport(targetDeckId, deckName, newCards) {
    setDecks((d) => d.find((x) => x.id === targetDeckId) ? d : [...d, { id: targetDeckId, name: deckName, createdAt: Date.now(), newPerDay: DEFAULT_NEW_PER_DAY, maxReviews: DEFAULT_MAX_REVIEWS }])
    setCards((c) => [...c, ...newCards])
  }

  function updateCard(updated) {
    setCards((c) => c.map((x) => x.id === updated.id ? updated : x))
  }

  // ── Review mode ───────────────────────────────────────────────────────────────
  if (reviewing) {
    const deck = decks.find((d) => d.id === reviewing.id) ?? reviewing
    return (
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '1rem 0' }}>
        <ReviewSession
          cards={cards}
          deckId={reviewing.id ?? '__all__'}
          deck={deck}
          onDone={() => { setReviewing(null); setStreak(loadStreak()) }}
          onUpdateCard={updateCard}
        />
      </div>
    )
  }

  const dueByDeck = decks.map((d) => {
    const q = buildQueue(cards, d.id, d)
    return { deck: d, ...q, due: q.learning.length + q.reviews.length + q.newCards.length }
  }).filter((x) => x.due > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 860 }}>

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          <span className="gradient-text">Flashcards</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          Spaced repetition — study smarter, not harder.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 56 }}>
          <Calendar size={14} style={{ color: allDue > 0 ? '#f87171' : '#4ade80' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>{allDue}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 56 }}>
          <Layers size={14} style={{ color: '#60a5fa' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>{cards.length}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cards</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 56 }}>
          <Flame size={14} style={{ color: '#f97316' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>{streak.current ?? 0}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Streak</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 56 }}>
          <BookOpen size={14} style={{ color: '#a78bfa' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>{decks.length}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Decks</span>
        </div>
        {allDue > 0 && (
          <button onClick={() => setReviewing({ id: '__all__', name: 'All decks' })} style={{ ...btnPrimary, marginLeft: 'auto', padding: '0.65rem 1.4rem', fontSize: '0.88rem' }}>
            <Play size={14} /> Study all ({allDue})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['today','Today'],['decks','Decks'],['import','Import .apkg']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '0.45rem 1.1rem', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
            background: tab === k ? 'var(--bg-card)' : 'transparent',
            color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* Today */}
      {tab === 'today' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dueByDeck.length === 0 && (
            <div style={{ ...panel, textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Nothing due right now</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {decks.length === 0 ? 'Create a deck or import an .apkg to get started.' : 'All caught up — come back tomorrow.'}
              </div>
            </div>
          )}
          {dueByDeck.map(({ deck, learning, reviews, newCards, due }) => (
            <div key={deck.id} style={{ ...panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 5 }}>{deck.name}</div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {learning.length > 0 && <span style={{ fontSize: '0.7rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{learning.length}</span>}
                  {reviews.length  > 0 && <span style={{ fontSize: '0.7rem', color: '#4ade80', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{reviews.length}</span>}
                  {newCards.length > 0 && <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{newCards.length}</span>}
                </div>
              </div>
              <button onClick={() => setReviewing(deck)} style={{ ...btnPrimary }}>
                <Play size={13} /> Start
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Decks */}
      {tab === 'decks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input className="input" placeholder="New deck name…" value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDeck()}
              style={{ flex: 1, fontSize: '0.85rem' }} />
            <button onClick={createDeck} disabled={!newDeckName.trim()} style={btnPrimary}>
              <Plus size={13} /> Create
            </button>
          </div>
          {decks.length === 0 && (
            <div style={{ ...panel, textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No decks yet.
            </div>
          )}
          {decks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} cards={cards} onReview={setReviewing} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* Import */}
      {tab === 'import' && <ImportPanel decks={decks} onImport={handleImport} />}

      {/* Deck editor */}
      {editing && (
        <DeckEditor
          deck={editing}
          cards={cards}
          onClose={() => setEditing(null)}
          onSaveCards={setCards}
          onDeleteDeck={deleteDeck}
          onUpdateDeck={updateDeck}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
