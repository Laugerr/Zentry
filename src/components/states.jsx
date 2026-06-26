import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'

// Shared presentation for the "no data" and "fetch failed" states.
// Every tool rolls its own fetch logic; these give them one consistent look
// so a failure or an empty result feels the same across the whole app.

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div style={wrap}>
      <div style={{ ...iconBadge, background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div style={titleStyle}>{title}</div>
      {hint && <div style={hintStyle}>{hint}</div>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  )
}

export function InlineError({ message = 'Something went wrong.', onRetry }) {
  return (
    <div style={wrap} role="alert">
      <div style={{ ...iconBadge, background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
        <AlertCircle size={24} strokeWidth={1.8} />
      </div>
      <div style={titleStyle}>Couldn’t load this</div>
      <div style={hintStyle}>{message}</div>
      {onRetry && (
        <button
          className="btn-ghost"
          onClick={onRetry}
          style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  )
}

const wrap = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  textAlign: 'center', padding: '2.5rem 1.25rem', gap: '0.4rem',
}
const iconBadge = {
  width: 52, height: 52, borderRadius: 14,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem',
}
const titleStyle = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.95rem', fontWeight: 600,
  color: 'var(--text-primary)',
}
const hintStyle = {
  fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 360,
  wordBreak: 'break-word',
}
