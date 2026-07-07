// Home widget catalogue — order here is the default layout. `size` is the
// bento footprint on desktop (4 columns): one = 1×1, wide = 2×1, tall = 2×2.
// Settings stores [{ id, on }] in the user's order (settings.homeWidgets).
export const HOME_WIDGETS = [
  { id: 'teams',     label: 'Your teams',      hint: 'Live scores & next matches of your starred clubs', size: 'wide' },
  { id: 'headlines', label: 'Top headlines',   hint: 'BBC World, swipe through the latest',              size: 'tall' },
  { id: 'match',     label: 'Match of the day', hint: 'A live or upcoming match from today',             size: 'wide' },
  { id: 'language',  label: 'Language streak', hint: 'Your study streak & level',                        size: 'one' },
  { id: 'radio',     label: 'Radio',           hint: 'Now playing, or resume your last station',        size: 'one' },
  { id: 'quick',     label: 'Quick start',     hint: 'Shortcuts to every tool (not shown on phones)',   size: 'wide' },
]

export const WIDGET_BY_ID = Object.fromEntries(HOME_WIDGETS.map((w) => [w.id, w]))

// Saved order + visibility, tolerant of widgets added or removed since it was
// saved: unknown ids are dropped, new widgets are appended (shown).
export function resolveLayout(saved) {
  const list = Array.isArray(saved) ? saved.filter((w) => WIDGET_BY_ID[w?.id]) : []
  const seen = new Set(list.map((w) => w.id))
  return [
    ...list.map((w) => ({ id: w.id, on: w.on !== false })),
    ...HOME_WIDGETS.filter((w) => !seen.has(w.id)).map((w) => ({ id: w.id, on: true })),
  ]
}
