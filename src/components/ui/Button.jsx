// Buttons used across every tool. Hover / focus / pressed states live in CSS
// (.btn in index.css) rather than onMouseEnter, so touch and keyboard users
// get the same feedback as mouse users, and tap targets grow on touch screens.

const ICON_SIZE = { sm: 13, md: 15 }

export function Button({
  variant = 'secondary', // primary | secondary | ghost | danger
  size = 'md',           // sm | md
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...rest
}) {
  const cls = ['btn', `btn-${variant}-v`, `btn-${size}`, block && 'btn-block', className]
    .filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading
        ? <span className="spinner btn-spinner" aria-hidden="true" />
        : Icon && <Icon size={ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight size={ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />}
    </button>
  )
}

// Icon-only button. `label` is required: it becomes the aria-label and the
// tooltip, so screen readers never hit an unnamed button.
export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  active,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = ['btn', 'btn-icon', `btn-${variant}-v`, `btn-${size}`, active && 'is-active', className]
    .filter(Boolean).join(' ')
  return (
    <button
      type={type}
      className={cls}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      {...rest}
    >
      <Icon size={ICON_SIZE[size] + 1} strokeWidth={1.9} aria-hidden="true" />
    </button>
  )
}
