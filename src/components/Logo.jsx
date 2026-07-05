// The Bento Z — four tiles in the tool colours (News, Football, Radio,
// Language) with a Z cut through. Uses the theme's --tool-* colours, so it's a
// touch brighter in dark mode. public/favicon.svg is the static twin.
export function Logo({ size = 28, wordmark = false, className = '' }) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={wordmark ? undefined : 'img'}
      aria-label={wordmark ? undefined : 'Zentry'}
      aria-hidden={wordmark || undefined}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--tool-news)" />
      <rect x="34" y="2" width="28" height="28" rx="9" fill="var(--tool-football)" />
      <rect x="2" y="34" width="28" height="28" rx="9" fill="var(--tool-radio)" />
      <rect x="34" y="34" width="28" height="28" rx="9" fill="var(--tool-language)" />
      <path d="M19 20h26L19 44h26" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (!wordmark) return mark
  return (
    <span className={`logo ${className}`.trim()} style={{ '--logo-size': `${size}px` }}>
      {mark}
      <span className="logo-word">zentry</span>
    </span>
  )
}
