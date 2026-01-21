/**
 * Hook for detecting prefers-reduced-motion media query
 */

import { useState, useEffect } from 'react'

/**
 * Check if reduced motion is preferred
 * Can be used outside of React components
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Hook that returns whether the user prefers reduced motion
 * Automatically updates when the preference changes
 *
 * @returns true if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const reducedMotion = useReducedMotion()
 *
 * return (
 *   <div className={reducedMotion ? '' : 'transition-all duration-200'}>
 *     Content
 *   </div>
 * )
 * ```
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    prefersReducedMotion()
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Update state when preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return reducedMotion
}
