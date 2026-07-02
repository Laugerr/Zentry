import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { ToastContext } from './toast-context'

const ICONS = { success: CheckCircle2, danger: AlertCircle, info: Info }
const MAX_VISIBLE = 3

// Short, non-blocking confirmations ("Bookmarked", "Copied"). Bottom-center
// on phones, bottom-right on larger screens. Announced via aria-live.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, { tone = 'neutral', duration = 3000 } = {}) => {
    const id = ++nextId.current
    setToasts((list) => [...list, { id, message, tone, duration }].slice(-MAX_VISIBLE))
    return id
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-region" role="status" aria-live="polite">
          {toasts.map((t) => <ToastItem key={t.id} {...t} onDismiss={dismiss} />)}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ id, message, tone, duration, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const Icon = ICONS[tone]
  return (
    <div className={`toast toast-${tone}`}>
      {Icon && <Icon size={15} strokeWidth={2} aria-hidden="true" />}
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  )
}
