import { useState, useEffect, useCallback } from 'react'
import {
  Check, Target, BookOpen, ChevronDown, Plus, Trash2,
  Flame, Clock, Star, ExternalLink, X, RotateCcw, Eye,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const CEFR_COLOR = {
  A1: '#94a3b8', A2: '#60a5fa', B1: '#34d399',
  B2: '#fbbf24', C1: '#f97316', C2: '#a78bfa',
}

const LANGUAGE_PRESETS = [
  'German', 'French', 'Spanish', 'Arabic', 'Italian', 'Portuguese',
  'Japanese', 'Mandarin', 'Korean', 'Dutch', 'Swedish', 'Polish', 'Russian',
]

const todayISO = () => new Date().toISOString().slice(0, 10)

// ─── localStorage ─────────────────────────────────────────────────────────────

const storageKey = (lang) => `zentry:lang:${lang.toLowerCase().trim()}`

function defaultPlan() {
  return {
    weeklyGoal: '',
    cefrCurrent: 'A1',
    cefrTarget: 'B1',
    days: DAYS.reduce((a, d) => { a[d] = { tasks: '', minutes: 0, completed: false }; return a }, {}),
    vocab: [],
    streak: { lastStudiedDate: '', currentStreak: 0, longestStreak: 0 },
    resources: [],
    notes: '',
  }
}

function mergePlan(saved) {
  const def = defaultPlan()
  return {
    ...def, ...saved,
    streak: { ...def.streak, ...(saved.streak ?? {}) },
    days: Object.fromEntries(DAYS.map((d) => [d, { ...def.days[d], ...(saved.days?.[d] ?? {}) }])),
    vocab: saved.vocab ?? [],
    resources: saved.resources ?? [],
  }
}

function loadPlan(lang) {
  if (!lang) return defaultPlan()
  try {
    const raw = localStorage.getItem(storageKey(lang))
    return raw ? mergePlan(JSON.parse(raw)) : defaultPlan()
  } catch { return defaultPlan() }
}

function savePlan(lang, plan) {
  if (!lang) return
  try { localStorage.setItem(storageKey(lang), JSON.stringify(plan)) } catch { /* quota */ }
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

function DayCard({ day, data, onChange, dayIndex }) {
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const isToday = dayIndex === todayIdx

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: '0.65rem',
      border: isToday ? '1px solid rgba(139,92,246,0.4)' : data.completed ? '1px solid rgba(34,197,94,0.2)' : undefined,
      boxShadow: isToday ? '0 0 16px rgba(139,92,246,0.1)' : undefined,
      opacity: data.completed ? 0.78 : 1, transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.75rem', color: isToday ? '#a78bfa' : 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {day.slice(0, 3).toUpperCase()}
          </span>
          {isToday && <span className="badge badge-purple" style={{ fontSize: '0.55rem' }}>Today</span>}
          {data.completed && <span className="badge badge-green" style={{ fontSize: '0.55rem' }}>Done</span>}
        </div>
        <button onClick={() => onChange({ ...data, completed: !data.completed })}
          className={`checkbox-custom ${data.completed ? 'checked' : ''}`}
          title={data.completed ? 'Mark incomplete' : 'Mark complete'}>
          {data.completed && <Check size={11} color="white" strokeWidth={3} />}
        </button>
      </div>

      {/* Tasks */}
      <textarea className="input" placeholder={`Goals for ${day}…`}
        value={data.tasks} onChange={(e) => onChange({ ...data, tasks: e.target.value })}
        style={{ fontSize: '0.8rem', minHeight: 64, lineHeight: 1.5, resize: 'vertical' }} />

      {/* Minutes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Clock size={11} strokeWidth={1.5} style={{ opacity: 0.4 }} />
        <input type="number" min={0} max={999} className="input"
          placeholder="0" value={data.minutes || ''}
          onChange={(e) => onChange({ ...data, minutes: Math.max(0, parseInt(e.target.value) || 0) })}
          style={{ width: 64, fontSize: '0.78rem', padding: '0.3rem 0.5rem' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>min</span>
      </div>
    </div>
  )
}

// ─── VocabBuilder ─────────────────────────────────────────────────────────────

function VocabBuilder({ vocab, onChange }) {
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [mode, setMode] = useState('list')   // 'list' | 'flashcard'
  const [cardIdx, setCardIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const unlearned = vocab.filter((v) => !v.learned)
  const safeIdx = Math.min(cardIdx, Math.max(0, unlearned.length - 1))
  const card = unlearned[safeIdx]

  function addWord() {
    if (!word.trim() || !translation.trim()) return
    onChange([...vocab, { id: Date.now().toString(), word: word.trim(), translation: translation.trim(), learned: false }])
    setWord(''); setTranslation('')
  }

  function toggleLearned(id) {
    onChange(vocab.map((v) => v.id === id ? { ...v, learned: !v.learned } : v))
  }

  function deleteWord(id) {
    onChange(vocab.filter((v) => v.id !== id))
    if (cardIdx >= unlearned.length - 1) setCardIdx(Math.max(0, unlearned.length - 2))
  }

  function nextCard() { setCardIdx((i) => (i + 1) % unlearned.length); setRevealed(false) }
  function prevCard() { setCardIdx((i) => (i - 1 + unlearned.length) % unlearned.length); setRevealed(false) }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={15} strokeWidth={1.5} style={{ color: '#a78bfa' }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Vocabulary</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {vocab.filter(v => v.learned).length}/{vocab.length} learned
          </span>
        </div>
        <div className="segmented">
          {['list', 'flashcard'].map((m) => (
            <button key={m} className={`segmented-option ${mode === m ? 'active' : ''}`}
              onClick={() => { setMode(m); setRevealed(false); setCardIdx(0) }}>
              {m === 'list' ? 'List' : 'Flashcard'}
            </button>
          ))}
        </div>
      </div>

      {/* Add word form */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Word…" value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWord()}
          style={{ flex: 1, minWidth: 100, fontSize: '0.82rem' }} />
        <input className="input" placeholder="Translation…" value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWord()}
          style={{ flex: 1, minWidth: 100, fontSize: '0.82rem' }} />
        <button className="btn-primary" onClick={addWord}
          disabled={!word.trim() || !translation.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}>
          <Plus size={13} /> Add
        </button>
      </div>

      {/* List mode */}
      {mode === 'list' && (
        vocab.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>No words yet — add your first one above.</p>
          : <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Translation</th>
                    <th style={{ textAlign: 'center' }}>Learned</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {vocab.map((v) => (
                    <tr key={v.id} style={{ opacity: v.learned ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 500 }}>{v.word}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{v.translation}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => toggleLearned(v.id)}
                          className={`checkbox-custom ${v.learned ? 'checked' : ''}`}
                          style={{ margin: '0 auto' }}>
                          {v.learned && <Check size={10} color="white" strokeWidth={3} />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => deleteWord(v.id)} className="btn-ghost"
                          style={{ padding: '0.3rem 0.5rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {/* Flashcard mode */}
      {mode === 'flashcard' && (
        unlearned.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>All words learned! Add more or unmark some to keep practicing.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              {/* Card */}
              <div onClick={() => setRevealed((r) => !r)} style={{
                width: '100%', minHeight: 130, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                borderRadius: '12px', cursor: 'pointer', padding: '1.5rem', userSelect: 'none',
                transition: 'background 0.2s',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {revealed ? 'Translation' : 'Word'}
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: revealed ? '#34d399' : 'var(--text-primary)', textAlign: 'center' }}>
                  {revealed ? card.translation : card.word}
                </span>
                {!revealed && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={11} /> tap to reveal
                  </span>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn-ghost" onClick={prevCard} style={{ padding: '0.4rem 0.7rem' }}>←</button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                  {safeIdx + 1} / {unlearned.length}
                </span>
                <button className="btn-ghost" onClick={nextCard} style={{ padding: '0.4rem 0.7rem' }}>→</button>
                <button className="btn-ghost" onClick={() => { toggleLearned(card.id); nextCard() }}
                  style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#34d399', borderColor: 'rgba(52,211,153,0.25)', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}>
                  <Check size={12} /> Got it
                </button>
              </div>
            </div>
      )}
    </div>
  )
}

// ─── ResourceLinks ────────────────────────────────────────────────────────────

function ResourceLinks({ resources, onChange }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  function add() {
    if (!title.trim() || !url.trim()) return
    const href = url.startsWith('http') ? url.trim() : 'https://' + url.trim()
    onChange([...resources, { id: Date.now().toString(), title: title.trim(), url: href }])
    setTitle(''); setUrl('')
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ExternalLink size={14} strokeWidth={1.5} style={{ color: '#a78bfa' }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Resources</span>
      </div>

      {/* Add form */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Title…" value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: '0 0 120px', fontSize: '0.8rem' }} />
        <input className="input" placeholder="URL…" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1, minWidth: 140, fontSize: '0.8rem' }} />
        <button className="btn-primary" onClick={add}
          disabled={!title.trim() || !url.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {/* List */}
      {resources.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No resources saved yet.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {resources.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={11} strokeWidth={1.5} style={{ opacity: 0.35, flexShrink: 0 }} />
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, color: '#a78bfa', fontSize: '0.82rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </a>
                <button onClick={() => onChange(resources.filter((x) => x.id !== r.id))}
                  className="btn-ghost" style={{ padding: '0.2rem 0.4rem', flexShrink: 0, color: '#f87171', borderColor: 'rgba(239,68,68,0.15)' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LanguagePlanner() {
  const [language, setLanguage]   = useState('German')
  const [customLang, setCustomLang] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [plan, setPlan]           = useState(defaultPlan)

  const activeLang = customLang.trim() || language

  // Load on language change
  useEffect(() => { setPlan(loadPlan(activeLang)) }, [activeLang])

  // Auto-save
  useEffect(() => { if (activeLang) savePlan(activeLang, plan) }, [plan, activeLang])

  // ── Derived stats ────────────────────────────────────────────────────────────
  const completedDays  = DAYS.filter((d) => plan.days[d]?.completed).length
  const totalMinutes   = Object.values(plan.days).reduce((s, d) => s + (d.minutes || 0), 0)
  const totalWords     = plan.vocab.length
  const learnedWords   = plan.vocab.filter((v) => v.learned).length
  const cefrPct        = (CEFR_LEVELS.indexOf(plan.cefrCurrent) / (CEFR_LEVELS.length - 1)) * 100

  // ── Updaters ─────────────────────────────────────────────────────────────────
  const updateDay = useCallback((day, data) => {
    setPlan((prev) => {
      const wasComplete = prev.days[day]?.completed
      const nowComplete = data.completed

      let streak = { ...prev.streak }
      if (!wasComplete && nowComplete) {
        const today = todayISO()
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        if (streak.lastStudiedDate === today) {
          // already counted today
        } else if (streak.lastStudiedDate === yesterday) {
          streak.currentStreak += 1
        } else {
          streak.currentStreak = 1
        }
        streak.lastStudiedDate  = today
        streak.longestStreak    = Math.max(streak.longestStreak, streak.currentStreak)
      }

      return { ...prev, streak, days: { ...prev.days, [day]: data } }
    })
  }, [])

  function selectPreset(lang) { setLanguage(lang); setCustomLang(''); setShowDropdown(false) }

  // ── Stat pill renderer ───────────────────────────────────────────────────────
  function StatPill({ icon: Icon, label, value, color = '#a78bfa' }) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem' }}>
        <Icon size={18} strokeWidth={1.5} style={{ color, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{label}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100 }}>

      {/* Heading */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>
          <span className="gradient-text">Language Planner</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Weekly planner, vocabulary builder, resources — all saved per language.
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Language picker */}
        <div style={{ flex: '0 0 auto', minWidth: 200, position: 'relative' }}>
          <label className="label">Language</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" type="text" placeholder="Type or pick a language…"
              value={customLang || language}
              onChange={(e) => { setCustomLang(e.target.value); setLanguage('') }}
              style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={() => setShowDropdown((v) => !v)}
              style={{ flexShrink: 0, padding: '0.6rem' }}>
              <ChevronDown size={14} style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
          {showDropdown && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.375rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              {LANGUAGE_PRESETS.map((lang) => (
                <button key={lang} onClick={() => selectPreset(lang)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.55rem 1rem', background: lang === language && !customLang ? 'rgba(139,92,246,0.1)' : 'transparent', color: lang === language && !customLang ? '#a78bfa' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weekly goal */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Target size={11} /> This week's goal
          </label>
          <input className="input" type="text" placeholder="e.g. Complete Duolingo unit 4, learn 50 new words…"
            value={plan.weeklyGoal}
            onChange={(e) => setPlan((p) => ({ ...p, weeklyGoal: e.target.value }))} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <StatPill icon={Flame}    label="Day streak"       value={plan.streak.currentStreak}                color="#f97316" />
        <StatPill icon={Star}     label="Words learned"    value={`${learnedWords} / ${totalWords}`}        color="#fbbf24" />
        <StatPill icon={Clock}    label="Minutes this week" value={`${totalMinutes} min`}                   color="#34d399" />
        <StatPill icon={BookOpen} label="Days completed"   value={`${completedDays} / 7`}                  color="#a78bfa" />
      </div>

      {/* CEFR tracker */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>CEFR Level</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>track where you are and where you're heading</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <label className="label" style={{ margin: '0 0 0.3rem' }}>Current</label>
              <div className="segmented">
                {CEFR_LEVELS.map((l) => (
                  <button key={l} className={`segmented-option ${plan.cefrCurrent === l ? 'active' : ''}`}
                    style={plan.cefrCurrent === l ? { color: CEFR_COLOR[l], borderColor: CEFR_COLOR[l] + '55' } : {}}
                    onClick={() => setPlan((p) => ({ ...p, cefrCurrent: l }))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" style={{ margin: '0 0 0.3rem' }}>Target</label>
              <div className="segmented">
                {CEFR_LEVELS.map((l) => (
                  <button key={l} className={`segmented-option ${plan.cefrTarget === l ? 'active' : ''}`}
                    style={plan.cefrTarget === l ? { color: CEFR_COLOR[l], borderColor: CEFR_COLOR[l] + '55' } : {}}
                    onClick={() => setPlan((p) => ({ ...p, cefrTarget: l }))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: CEFR_COLOR[plan.cefrCurrent], minWidth: 24 }}>{plan.cefrCurrent}</span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${cefrPct}%`, background: `linear-gradient(90deg, #a78bfa, ${CEFR_COLOR[plan.cefrCurrent]})` }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: CEFR_COLOR[plan.cefrTarget], minWidth: 24, textAlign: 'right' }}>{plan.cefrTarget}</span>
        </div>
        {plan.streak.longestStreak > 0 && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Longest streak: <span style={{ color: '#f97316', fontWeight: 600 }}>{plan.streak.longestStreak} days</span>
          </p>
        )}
      </div>

      {/* Weekly day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' }}>
        {DAYS.map((day, idx) => (
          <DayCard key={day} day={day} dayIndex={idx}
            data={plan.days[day] ?? { tasks: '', minutes: 0, completed: false }}
            onChange={(data) => updateDay(day, data)} />
        ))}
      </div>

      {/* Vocabulary builder */}
      <VocabBuilder
        vocab={plan.vocab}
        onChange={(vocab) => setPlan((p) => ({ ...p, vocab }))} />

      {/* Bottom row — Resources + Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        <ResourceLinks
          resources={plan.resources}
          onChange={(resources) => setPlan((p) => ({ ...p, resources }))} />

        {/* Study notes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Study Notes</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {plan.notes.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea className="input" placeholder="Grammar rules, tips, things to remember…"
            value={plan.notes} onChange={(e) => setPlan((p) => ({ ...p, notes: e.target.value }))}
            style={{ minHeight: 140, fontSize: '0.82rem', lineHeight: 1.6, resize: 'vertical' }} />
        </div>
      </div>

    </div>
  )
}
