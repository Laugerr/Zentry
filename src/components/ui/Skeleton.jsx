// Loading placeholder. Pages used to each define their own pulsing block;
// this is the shared one (shimmer is disabled under reduced motion).
export function Skeleton({ h = 14, w = '100%', r = 6, className = '', style }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{ height: h, width: w, borderRadius: r, ...style }}
    />
  )
}
