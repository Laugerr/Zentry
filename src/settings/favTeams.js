import { useSyncExternalStore } from 'react'

// Favourite football teams (ESPN team ids). Written by the Football page's ★
// buttons and by first-run setup; read by Home ("Your teams", greeting).
// Changes are broadcast so every reader updates without a reload.

const KEY   = 'ft:favorites:v1'
const EVENT = 'zentry:favorites'

function parse(raw) {
  try { return (JSON.parse(raw || '[]') ?? []).map(String) } catch { return [] }
}

export function readFavTeamIds() {
  try { return parse(localStorage.getItem(KEY)) } catch { return [] }
}

export function writeFavTeamIds(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set(ids.map(String))])) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT))
}

// Snapshot is cached on the raw string so useSyncExternalStore gets a stable
// array until the stored value actually changes.
let cache = { raw: undefined, ids: [] }
function snapshot() {
  let raw = null
  try { raw = localStorage.getItem(KEY) } catch { /* ignore */ }
  if (raw !== cache.raw) cache = { raw, ids: parse(raw) }
  return cache.ids
}
function subscribe(fn) {
  window.addEventListener(EVENT, fn)
  window.addEventListener('storage', fn)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', fn)
  }
}

export function useFavTeamIds() {
  return useSyncExternalStore(subscribe, snapshot)
}
