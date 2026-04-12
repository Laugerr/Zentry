import { useState, useEffect, useCallback } from 'react'
import { Check, Target, BookOpen, ChevronDown } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const LANGUAGE_PRESETS = [
  'German',
  'French',
  'Spanish',
  'Arabic',
  'Italian',
  'Portuguese',
  'Japanese',
  'Mandarin',
  'Korean',
  'Dutch',
  'Swedish',
  'Polish',
  'Russian',
]

// ─── localStorage helpers ────────────────────────────────────────────────────

function storageKey(language) {
  return `zentry:lang:${language.toLowerCase().trim()}`
}

function loadPlan(language) {
  if (!language) return null
  try {
    const raw = localStorage.getItem(storageKey(language))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePlan(language, plan) {
  if (!language) return
  try {
    localStorage.setItem(storageKey(language), JSON.stringify(plan))
  } catch {
    /* storage quota edge case — silently skip */
  }
}

function defaultPlan() {
  return {
    weeklyGoal: '',
    days: DAYS.reduce((acc, day) => {
      acc[day] = { tasks: '', completed: false }
      return acc
    }, {}),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayCard({ day, data, onChange, dayIndex }) {
  const today = new Date().getDay() // 0 = Sunday
  // Map JS Sunday=0 to our Monday-first index (Mon=1..Sun=0 → 0-indexed: Mon=0..Sun=6)
  const todayIdx = today === 0 ? 6 : today - 1
  const isToday = dayIndex === todayIdx

  function toggle() {
    onChange({ ...data, completed: !data.completed })
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        border: isToday
          ? '1px solid rgba(139, 92, 246, 0.4)'
          : data.completed
          ? '1px solid rgba(34, 197, 94, 0.2)'
          : undefined,
        boxShadow: isToday ? '0 0 16px rgba(139, 92, 246, 0.12)' : undefined,
        opacity: data.completed ? 0.75 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: '0.78rem',
              color: isToday ? '#a78bfa' : 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            {day.slice(0, 3).toUpperCase()}
          </span>
          {isToday && (
            <span className="badge badge-purple" style={{ fontSize: '0.58rem' }}>
              Today
            </span>
          )}
          {data.completed && (
            <span className="badge badge-green" style={{ fontSize: '0.58rem' }}>
              Done
            </span>
          )}
        </div>

        {/* Checkbox */}
        <button
          onClick={toggle}
          className={`checkbox-custom ${data.completed ? 'checked' : ''}`}
          aria-label={`Mark ${day} as ${data.completed ? 'incomplete' : 'complete'}`}
          title={data.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {data.completed && <Check size={11} color="white" strokeWidth={3} />}
        </button>
      </div>

      {/* Tasks textarea */}
      <textarea
        className="input"
        placeholder={`Goals for ${day}…`}
        value={data.tasks}
        onChange={(e) => onChange({ ...data, tasks: e.target.value })}
        style={{ fontSize: '0.82rem', minHeight: 72, lineHeight: 1.5 }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LanguagePlanner() {
  const [language, setLanguage] = useState('German')
  const [customLang, setCustomLang] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [plan, setPlan] = useState(defaultPlan)

  // Active language resolves to custom input if non-preset entry
  const activeLang = customLang.trim() || language

  // Load plan from localStorage whenever active language changes
  useEffect(() => {
    const saved = loadPlan(activeLang)
    setPlan(saved ?? defaultPlan())
  }, [activeLang])

  // Auto-save whenever plan changes
  useEffect(() => {
    if (activeLang) savePlan(activeLang, plan)
  }, [plan, activeLang])

  const completedCount = DAYS.filter((d) => plan.days[d]?.completed).length
  const progressPct = Math.round((completedCount / 7) * 100)

  const updateDay = useCallback((day, data) => {
    setPlan((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: data },
    }))
  }, [])

  function selectPreset(lang) {
    setLanguage(lang)
    setCustomLang('')
    setShowDropdown(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100 }}>
      {/* Page heading */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            letterSpacing: '-0.03em',
          }}
        >
          <span className="gradient-text">Language Planner</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Weekly learning tracker — saved automatically per language.
        </p>
      </div>

      {/* Controls row */}
      <div
        className="card"
        style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}
      >
        {/* Language selector */}
        <div style={{ flex: '0 0 auto', minWidth: 200, position: 'relative' }}>
          <label className="label">Language</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type="text"
              placeholder="Type or pick a language…"
              value={customLang || language}
              onChange={(e) => {
                setCustomLang(e.target.value)
                setLanguage('')
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn-ghost"
              onClick={() => setShowDropdown((v) => !v)}
              style={{ flexShrink: 0, padding: '0.6rem 0.6rem' }}
              aria-label="Show language presets"
            >
              <ChevronDown
                size={14}
                style={{
                  transform: showDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                marginTop: '0.375rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {LANGUAGE_PRESETS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => selectPreset(lang)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.55rem 1rem',
                    background: lang === language && !customLang
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'transparent',
                    color: lang === language && !customLang
                      ? '#a78bfa'
                      : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!(lang === language && !customLang))
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    if (!(lang === language && !customLang))
                      e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weekly goal */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Target size={11} />
            This week's main goal
          </label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Complete Duolingo unit 4, learn 50 new words…"
            value={plan.weeklyGoal}
            onChange={(e) => setPlan((p) => ({ ...p, weeklyGoal: e.target.value }))}
          />
        </div>
      </div>

      {/* Progress card */}
      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={16} style={{ color: 'var(--accent-purple)' }} strokeWidth={1.5} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {activeLang}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {completedCount} / 7 days &nbsp;
          <span style={{ color: '#a78bfa' }}>({progressPct}%)</span>
        </div>
      </div>

      {/* Day grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.875rem',
        }}
      >
        {DAYS.map((day, idx) => (
          <DayCard
            key={day}
            day={day}
            data={plan.days[day] ?? { tasks: '', completed: false }}
            dayIndex={idx}
            onChange={(data) => updateDay(day, data)}
          />
        ))}
      </div>

      {/* Footer hint */}
      <p
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: 'center',
          paddingBottom: '0.5rem',
        }}
      >
        Plans are saved automatically to localStorage per language. Switch languages to
        maintain separate plans.
      </p>
    </div>
  )
}
