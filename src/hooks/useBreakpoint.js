import { useSyncExternalStore } from 'react'

// One source of truth for responsive breakpoints. Pages used to each keep
// their own `isMobile` state off window.innerWidth with different cutoffs
// (768 here, 900 there); this subscribes to matchMedia instead, so it only
// re-renders when a breakpoint is actually crossed — not on every resize.
export const BREAKPOINTS = {
  tablet:  768,  // ≥ 768px  — tablets portrait, small laptops
  desktop: 1024, // ≥ 1024px — tablets landscape, laptops, desktops
}

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function useBreakpoint() {
  const isTabletUp  = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`)
  const isDesktop   = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`)
  return {
    isMobile: !isTabletUp,
    isTablet: isTabletUp && !isDesktop,
    isDesktop,
  }
}
