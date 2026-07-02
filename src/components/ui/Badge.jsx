// Small status pill. Tones map to the semantic color tokens so they stay
// legible in both themes.
// tone: purple | orange | pink | green | red | blue | yellow | neutral
export function Badge({ tone = 'neutral', icon: Icon, className = '', children, ...rest }) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()} {...rest}>
      {Icon && <Icon size={10} strokeWidth={2.2} aria-hidden="true" />}
      {children}
    </span>
  )
}
