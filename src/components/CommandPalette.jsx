import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Newspaper, Briefcase, BookOpen, FileText, Radio, Trophy, DollarSign,
  ArrowRight, CornerDownLeft, ArrowUp, ArrowDown, Command,
} from 'lucide-react'

// Static command catalogue — tools + deep-links into specific tool sections.
// Adding a new tool? Drop it here.
const COMMANDS = [
  // Tools
  { id: 'tool-news',     group: 'Tools', icon: Newspaper, label: 'News Tracker',     hint: 'Live RSS feeds',                  path: '/news',     keywords: 'headlines articles rss' },
  { id: 'tool-jobs',     group: 'Tools', icon: Briefcase, label: 'Job Hunter',       hint: 'German job listings',             path: '/jobs',     keywords: 'work career employment bundesagentur' },
  { id: 'tool-language', group: 'Tools', icon: BookOpen,  label: 'Language Planner', hint: 'Weekly learning tracker',         path: '/language', keywords: 'learn study vocabulary' },
  { id: 'tool-cv',       group: 'Tools', icon: FileText,  label: 'CV Builder',       hint: 'Build your Lebenslauf',           path: '/cv',       keywords: 'resume lebenslauf pdf' },
  { id: 'tool-radio',    group: 'Tools', icon: Radio,     label: 'Live Radio',       hint: 'World radio map',                 path: '/radio',    keywords: 'stream music station listen' },
  { id: 'tool-football', group: 'Tools', icon: Trophy,    label: 'Football Today',   hint: 'Scores & fixtures',               path: '/football', keywords: 'soccer matches premier league scores' },
  { id: 'tool-finance',  group: 'Tools', icon: DollarSign,label: 'Finance Watch',    hint: 'FX rates & crypto',               path: '/finance',  keywords: 'money stocks currency bitcoin ethereum crypto forex' },

  // Quick actions — open a tool with a specific intent (fragment hints post-navigate)
  { id: 'a-bookmarks',   group: 'Actions', icon: Newspaper, label: 'Open News bookmarks', hint: 'Saved articles', path: '/news',    keywords: 'saved star favourite' },
  { id: 'a-radio-favs',  group: 'Actions', icon: Radio,     label: 'Radio favourites',    hint: 'Starred stations', path: '/radio',  keywords: 'saved star favourite' },
  { id: 'a-football-favs',group:'Actions', icon: Trophy,    label: 'Favourite teams',     hint: 'Your starred clubs', path: '/football', keywords: 'favourite team follow' },
]

function scoreCommand(cmd, q) {
  if (!q) return 1
  const hay = `${cmd.label} ${cmd.hint} ${cmd.keywords}`.toLowerCase()
  const needle = q.toLowerCase()
  // Label prefix match ranks highest; then label contains; then keyword contains.
  const labelLc = cmd.label.toLowerCase()
  if (labelLc.startsWith(needle)) return 100 - labelLc.indexOf(needle)
  if (labelLc.includes(needle))   return 50 - labelLc.indexOf(needle)
  if (hay.includes(needle))       return 10
  // Fuzzy: every char of needle appears in order in hay
  let i = 0
  for (const ch of hay) { if (ch === needle[i]) i++; if (i === needle.length) break }
  if (i === needle.length) return 1
  return 0
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery]     = useState('')
  const [activeIdx, setIdx]   = useState(0)
  const inputRef              = useRef(null)
  const listRef               = useRef(null)
  const navigate              = useNavigate()

  // Reset on open
  useEffect(() => {
    if (open) { setQuery(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10) }
  }, [open])

  // Escape closes, ⌘K toggles handled by parent
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const scored = COMMANDS.map((c) => ({ cmd: c, score: scoreCommand(c, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.map((x) => x.cmd)
  }, [query])

  // Clamp active index when results change
  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, results.length - 1))) }, [results])

  // Keep active item scrolled into view
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function run(cmd) {
    onClose()
    navigate(cmd.path)
  }

  function onInputKey(e) {
    if (e.key === 'ArrowDown')   { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')  { e.preventDefault(); const cmd = results[activeIdx]; if (cmd) run(cmd) }
    else if (e.key === 'Home')   { e.preventDefault(); setIdx(0) }
    else if (e.key === 'End')    { e.preventDefault(); setIdx(results.length - 1) }
  }

  if (!open) return null

  // Group results by group
  const grouped = results.reduce((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd); return acc
  }, {})
  const groupOrder = ['Tools', 'Actions']
  let runningIdx = 0

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 500 }} />
      <div style={{
        position: 'fixed', top: '15vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(560px, 92vw)', zIndex: 501,
        background: 'var(--bg-secondary)', border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.15)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '70vh',
      }}>
        {/* Search row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIdx(0) }}
            onKeyDown={onInputKey}
            placeholder="Jump to a tool or action…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: "'Inter', sans-serif",
            }}
          />
          <kbd style={kbdStyle}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0.4rem 0.6rem' }}>
          {results.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No matches for <strong style={{ color: 'var(--text-primary)' }}>"{query}"</strong>
            </div>
          )}
          {groupOrder.map((group) => {
            const items = grouped[group]
            if (!items?.length) return null
            return (
              <div key={group} style={{ marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.5rem 0.85rem 0.35rem' }}>
                  {group}
                </div>
                {items.map((cmd) => {
                  const idx = runningIdx++
                  const active = idx === activeIdx
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onMouseEnter={() => setIdx(idx)}
                      onClick={() => run(cmd)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        textAlign: 'left', padding: '0.55rem 0.85rem', borderRadius: 8,
                        background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                        border: '1px solid ' + (active ? 'rgba(139,92,246,0.3)' : 'transparent'),
                        color: active ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: active ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: active ? '#a78bfa' : 'var(--text-secondary)',
                      }}>
                        <Icon size={14} strokeWidth={1.8} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cmd.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{cmd.hint}</div>
                      </div>
                      <ArrowRight size={12} style={{ color: active ? '#a78bfa' : 'var(--text-muted)', flexShrink: 0, opacity: active ? 1 : 0.4 }} />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.55rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <kbd style={kbdStyle}><ArrowUp size={9} /></kbd>
            <kbd style={kbdStyle}><ArrowDown size={9} /></kbd>
            Navigate
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <kbd style={kbdStyle}><CornerDownLeft size={9} /></kbd>
            Open
          </span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Command size={10} /> + <kbd style={kbdStyle}>K</kbd>
          </span>
        </div>
      </div>
    </>
  )
}

const kbdStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 18, height: 18, padding: '0 4px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
  borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
  fontWeight: 600, color: 'var(--text-secondary)',
}
