import { useRef } from 'react'

// Segmented control for switching views / filters. Roving tabindex + arrow
// keys, so it's one Tab stop for keyboard users instead of N.
// options: [{ value, label, icon?, iconRight?, count? }]
// iconOnly: show just the icons; labels stay as tooltips + screen-reader text.
export function Tabs({ value, onChange, options, label, size = 'md', block = false, iconOnly = false, className = '' }) {
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
        const IconRight = opt.iconRight
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={iconOnly ? opt.label : undefined}
            className={`segmented-option${selected ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {Icon && <Icon size={iconOnly ? 15 : 13} strokeWidth={2} aria-hidden="true" />}
            {iconOnly ? <span className="sr-only">{opt.label}</span> : <span className="segmented-label">{opt.label}</span>}
            {IconRight && <IconRight size={13} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />}
            {opt.count != null && <span className="segmented-count">{opt.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
