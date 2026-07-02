import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Dialog that is a centered modal on tablet/desktop and a bottom sheet on
// phones (the switch is pure CSS, see .sheet in index.css). Handles Esc,
// focus trapping and returning focus to whatever opened it.
export function Sheet({ open, onClose, title, children, footer, width = 520 }) {
  const panelRef = useRef(null)
  const titleId  = useId()
  // Read onClose through a ref so an inline arrow from the parent doesn't
  // re-run the effect (and yank focus) on every render.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const panel  = panelRef.current
    // Focus the first control, or the panel itself if there isn't one
    const first = panel.querySelector('.sheet-body')?.querySelector(FOCUSABLE) || panel
    first.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); return }
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="sheet"
        style={{ '--sheet-width': `${width}px` }}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {title && (
          <div className="sheet-header">
            <h2 id={titleId} className="sheet-title">{title}</h2>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
