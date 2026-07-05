import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'
import { Button } from './ui'
import { Illustration } from './Illustration'
import { useOnline } from '../hooks/useOnline'

// Shared presentation for the "no data" and "fetch failed" states.
// Every tool rolls its own fetch logic; these give them one consistent look
// so a failure or an empty result feels the same across the whole app.

// `art` swaps the icon badge for an illustration (see Illustration.jsx).
export function EmptyState({ icon: Icon = Inbox, art, title, hint, action }) {
  return (
    <div style={wrap}>
      {art ? <div style={{ marginBottom: '0.6rem' }}><Illustration name={art} /></div> : (
        <div style={{ ...iconBadge, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
          <Icon size={24} strokeWidth={1.8} />
        </div>
      )}
      <div style={titleStyle}>{title}</div>
      {hint && <div style={hintStyle}>{hint}</div>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  )
}

// When the device is offline the failure is almost always "no network", so
// say that (with the offline illustration) instead of a raw fetch error.
export function InlineError({ message = 'Something went wrong.', onRetry }) {
  const online = useOnline()
  return (
    <div style={wrap} role="alert">
      {online ? (
        <div style={{ ...iconBadge, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <AlertCircle size={24} strokeWidth={1.8} />
        </div>
      ) : <div style={{ marginBottom: '0.6rem' }}><Illustration name="offline" /></div>}
      <div style={titleStyle}>{online ? 'Couldn’t load this' : 'You’re offline'}</div>
      <div style={hintStyle}>{online ? message : 'Reconnect and tap Retry to load the latest.'}</div>
      {onRetry && (
        <Button icon={RefreshCw} size="sm" onClick={onRetry} style={{ marginTop: '1rem' }}>
          Retry
        </Button>
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
  fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 650, letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
}
const hintStyle = {
  fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 360,
  wordBreak: 'break-word',
}
