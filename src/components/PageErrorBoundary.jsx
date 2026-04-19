import { Component } from 'react'
import { AlertCircle, RefreshCw, Home as HomeIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

// Class component because hooks can't catch render errors.
// Resets when the route key changes (handled by `key` prop in App.jsx).
export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Page error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', minHeight: '60%' }}>
        <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(248,113,113,0.12)', color: '#f87171',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={26} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.05rem', marginBottom: '0.5rem' }}>
            This tool hit a snag
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {msg}
          </p>
          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => this.setState({ error: null })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} /> Retry
            </button>
            <Link to="/home" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <HomeIcon size={12} /> Home
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
