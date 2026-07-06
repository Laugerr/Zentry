import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Home as HomeIcon, Newspaper, BookOpen, Radio, Trophy, Settings as SettingsIcon,
  ArrowRight, CornerDownLeft, ArrowUp, ArrowDown, Command,
} from 'lucide-react'

// Static command catalogue — tools + deep-links into specific tool sections.
// Adding a new tool? Drop it here. Each row's icon chip takes the tool colour
// of the page it opens (TONE_BY_PATH), same as the sidebar.
const TONE_BY_PATH = { '/home': 'ink', '/news': 'news', '/football': 'football', '/radio': 'radio', '/language': 'language' }

const COMMANDS = [
  // Tools
  { id: 'tool-home',     group: 'Tools', icon: HomeIcon,  label: 'Home',             hint: 'Daily dashboard',                 path: '/home',     keywords: 'overview dashboard start' },
  { id: 'tool-news',     group: 'Tools', icon: Newspaper, label: 'News Tracker',     hint: 'Live RSS feeds',                  path: '/news',     keywords: 'headlines articles rss' },
  { id: 'tool-language', group: 'Tools', icon: BookOpen,  label: 'Language Planner', hint: 'Weekly learning tracker',         path: '/language', keywords: 'learn study vocabulary' },
  { id: 'tool-radio',    group: 'Tools', icon: Radio,     label: 'Live Radio',       hint: 'World radio map',                 path: '/radio',    keywords: 'stream music station listen' },
  { id: 'tool-football', group: 'Tools', icon: Trophy,    label: 'Football Today',   hint: 'Scores & fixtures',               path: '/football', keywords: 'soccer matches premier league scores' },
  { id: 'tool-settings', group: 'Tools', icon: SettingsIcon, label: 'Settings',        hint: 'Units, city, backup & reset',     path: '/settings', keywords: 'preferences theme celsius fahrenheit clock city export import reset backup' },

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
    navigate(cmd.path, { viewTransition: true })
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--backdrop)', backdropFilter: 'blur(4px)', zIndex: 500 }} />
      <div role="dialog" aria-modal="true" aria-label="Search" style={{
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(580px, 92vw)', zIndex: 501,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-pop)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '72vh',
      }}>
        {/* Search row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.15rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIdx(0) }}
            onKeyDown={onInputKey}
            placeholder="Jump to a tool or action…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'var(--font-sans)',
            }}
          />
          <kbd style={kbdStyle}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.5rem 0.6rem' }}>
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.55rem 0.75rem 0.4rem' }}>
                  {group}
                </div>
                {items.map((cmd) => {
                  const idx = runningIdx++
                  const active = idx === activeIdx
                  const Icon = cmd.icon
                  const tone = TONE_BY_PATH[cmd.path] ?? 'neutral'
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onMouseEnter={() => setIdx(idx)}
                      onClick={() => run(cmd)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        textAlign: 'left', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)',
                        background: active ? 'var(--surface-2)' : 'transparent',
                        border: '1px solid ' + (active ? 'var(--border)' : 'transparent'),
                        color: 'var(--text-primary)',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}>
                      <span className={`nav-chip nav-chip-${tone}`} style={{ width: 34, height: 34 }} aria-hidden="true">
                        <Icon size={17} strokeWidth={2} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{cmd.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{cmd.hint}</div>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: active ? 1 : 0 }} />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="palette-foot" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 1.1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
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
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
  fontWeight: 600, color: 'var(--text-secondary)',
}
