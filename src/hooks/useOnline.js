import { useEffect, useState } from 'react'

// Tracks browser connectivity. The app is a PWA that serves cached data when
// offline — this lets the UI tell the user their data may be stale instead of
// silently showing old content or spinning forever.
export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
