import { ILLUSTRATIONS } from './illustrations'

// Decorative empty-state drawing (bookmarks | matches | radio | decks | offline).
// The markup is a static constant from illustrations.js — never user input —
// so injecting it is safe, and keeps the drawings as plain, editable SVG.
export function Illustration({ name, width = 160 }) {
  const svg = ILLUSTRATIONS[name]
  if (!svg) return null
  return (
    <span
      className="illo"
      aria-hidden="true"
      style={{ width, height: width * 0.75 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
