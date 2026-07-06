// Backup / restore / reset of everything Zentry keeps in localStorage.
// Keys by prefix: zentry: (settings, theme, language decks, streaks),
// lr: (radio favourites / recents / volume), nt: (news bookmarks, read
// history, prefs), ft: (favourite teams).
// Not included: deck images/audio from imported .apkg files — they live in
// IndexedDB and can be hundreds of MB. Reset does clear them.

const PREFIXES = ['zentry:', 'lr:', 'nt:', 'ft:']
const MEDIA_DB = 'zentry-srs-media'
const FORMAT   = 'zentry-backup'

const ours = (key) => PREFIXES.some((p) => key.startsWith(p))

function ourKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && ours(k)) keys.push(k)
  }
  return keys
}

export function summarizeData() {
  const keys = ourKeys()
  const bytes = keys.reduce((n, k) => n + k.length + (localStorage.getItem(k)?.length ?? 0), 0)
  return { items: keys.length, kb: Math.max(1, Math.round(bytes / 1024)) }
}

// Downloads zentry-backup-YYYY-MM-DD.json
export function exportBackup() {
  const data = {}
  for (const k of ourKeys()) data[k] = localStorage.getItem(k)
  const payload = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `zentry-backup-${new Date().toISOString().slice(0, 10)}.json`,
  })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return Object.keys(data).length
}

// Validates a backup file's text. Returns { data, count, exportedAt } or throws
// with a message fit to show the user.
export function parseBackup(text) {
  let payload
  try { payload = JSON.parse(text) } catch { throw new Error('That file isn’t valid JSON.') }
  if (payload?.format !== FORMAT || typeof payload.data !== 'object' || !payload.data) {
    throw new Error('That doesn’t look like a Zentry backup file.')
  }
  const data = Object.fromEntries(
    Object.entries(payload.data).filter(([k, v]) => ours(k) && typeof v === 'string'),
  )
  return { data, count: Object.keys(data).length, exportedAt: payload.exportedAt }
}

// Replaces current data with the backup's. Caller reloads afterwards.
export function restoreBackup(data) {
  for (const k of ourKeys()) localStorage.removeItem(k)
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
}

// Clears every Zentry key + the deck media database. Caller reloads afterwards.
export async function resetAll() {
  for (const k of ourKeys()) localStorage.removeItem(k)
  await new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(MEDIA_DB)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    } catch { resolve() }
  })
}
