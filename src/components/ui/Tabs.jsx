import { useRef } from 'react'

// Segmented control for switching views / filters. Roving tabindex + arrow
// keys, so it's one Tab stop for keyboard users instead of N.
// options: [{ value, label, icon?, count? }]
export function Tabs({ value, onChange, options, label, size = 'md', block = false, className = '' }) {
  const refs = useRef([])

  const onKeyDown = (e, i) => {
    const last = options.length - 1
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(options[next].value)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={['segmented', `segmented-${size}`, block && 'segmented-block', className].filter(Boolean).join(' ')}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`segmented-option${selected ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
            {opt.label}
            {opt.count != null && <span className="segmented-count">{opt.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
