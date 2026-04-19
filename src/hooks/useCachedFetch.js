import { useState, useEffect, useRef, useCallback } from 'react'

// Module-scope cache shared across every consumer of useCachedFetch.
// Shape: key -> { data, ts, inflight }
//  - `data` + `ts` is the last successful response and when it landed
//  - `inflight` is a Promise so concurrent mounts dedupe to a single network call
const cache = new Map()

/**
 * Stale-while-revalidate fetch hook with cross-component dedup.
 *
 *   const { data, loading, error, refresh } = useCachedFetch(
 *     'btc-price',
 *     ({ signal }) => fetch(url, { signal }).then(r => r.json()),
 *     { ttl: 60_000 }
 *   )
 *
 * - Returns cached data immediately if it's younger than `ttl`
 * - Otherwise calls `fetcher({ signal })` once; later mounts during that
 *   request reuse the same promise instead of re-firing the network call
 * - `refresh()` invalidates the cache and refetches
 */
export function useCachedFetch(key, fetcher, { ttl = 5 * 60_000, enabled = true } = {}) {
  const [tick, setTick] = useState(0)            // bumped to force re-evaluation
  const fetcherRef      = useRef(fetcher)
  fetcherRef.current    = fetcher

  const hit = cache.get(key)
  const fresh = hit?.data !== undefined && (Date.now() - hit.ts) < ttl

  const [state, setState] = useState(() => fresh
    ? { data: hit.data, loading: false, error: null }
    : { data: hit?.data ?? null, loading: enabled, error: null }
  )

  useEffect(() => {
    if (!enabled || !key) return
    const cur = cache.get(key)
    if (cur?.data !== undefined && (Date.now() - cur.ts) < ttl) {
      setState({ data: cur.data, loading: false, error: null })
      return
    }
    let cancelled = false

    // Reuse an in-flight request if one exists.
    // IMPORTANT: we intentionally don't bind an AbortController to component
    // lifetime here. React 19 StrictMode mounts the effect twice — if the
    // first mount's cleanup aborted the shared fetch, the second mount would
    // synchronously pick up the already-aborted promise from the cache and
    // hang on loading forever. The cache is module-scoped and survives
    // unmounts, so we let fetches run to completion (a signal param is still
    // passed as `undefined` to preserve the fetcher API).
    let promise = cur?.inflight
    if (!promise) {
      promise = Promise.resolve().then(() => fetcherRef.current({ signal: undefined }))
        .then((data) => {
          cache.set(key, { data, ts: Date.now() })
          return data
        })
        .catch((err) => {
          // Drop only the inflight marker so the next mount can retry.
          const c = cache.get(key)
          if (c) cache.set(key, { data: c.data, ts: c.ts ?? 0 })
          throw err
        })
      cache.set(key, { ...(cur ?? {}), inflight: promise })
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    promise
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((err) => { if (!cancelled) setState((s) => ({ data: s.data, loading: false, error: err })) })

    return () => { cancelled = true }
  }, [key, enabled, ttl, tick])

  const refresh = useCallback(() => {
    cache.delete(key)
    setTick((t) => t + 1)
  }, [key])

  return { ...state, refresh }
}

// Test/debug escape hatch — clears one key or the whole cache.
export function invalidateCache(key) {
  if (key) cache.delete(key); else cache.clear()
}
