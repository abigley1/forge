/**
 * Filter Results Announcer Component
 *
 * Uses aria-live to announce filter result counts for screen readers.
 * Announces when the filtered node count changes.
 */

import { useEffect, useRef, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface FilterResultsAnnouncerProps {
  /** Total count of filtered results */
  resultCount: number
  /** Total count of all nodes (unfiltered) */
  totalCount: number
  /** Whether any filters are active */
  hasActiveFilters: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * Screen reader announcer for filter results
 */
export function FilterResultsAnnouncer({
  resultCount,
  totalCount,
  hasActiveFilters,
}: FilterResultsAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('')
  const prevCountRef = useRef(resultCount)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending announcement
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only announce if count has changed and filters are active
    if (resultCount !== prevCountRef.current) {
      prevCountRef.current = resultCount

      // Debounce announcements to avoid spam during rapid filtering
      timeoutRef.current = setTimeout(() => {
        if (hasActiveFilters) {
          if (resultCount === 0) {
            setAnnouncement('No nodes match the current filters')
          } else if (resultCount === 1) {
            setAnnouncement('1 node matches the current filters')
          } else {
            setAnnouncement(
              `${resultCount} nodes match the current filters out of ${totalCount} total`
            )
          }
        } else {
          setAnnouncement(`Showing all ${totalCount} nodes`)
        }
      }, 300)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [resultCount, totalCount, hasActiveFilters])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// ============================================================================
// Visual Results Count Component
// ============================================================================

interface FilterResultsCountProps {
  /** Total count of filtered results */
  resultCount: number
  /** Total count of all nodes (unfiltered) */
  totalCount: number
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Callback to clear all filters */
  onClearFilters?: () => void
  /** Additional class name */
  className?: string
}

/**
 * Visual display of filter results count with clear button
 */
export function FilterResultsCount({
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
  className,
}: FilterResultsCountProps) {
  if (!hasActiveFilters) {
    return null
  }

  return (
    <div className={className} role="status" aria-live="polite">
      <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-xs">
        {resultCount === 0 ? (
          'No matches'
        ) : resultCount === totalCount ? (
          `${totalCount} nodes`
        ) : (
          <>
            <span className="font-medium">{resultCount}</span>
            <span className="text-forge-muted dark:text-forge-muted-dark">
              {' '}
              / {totalCount}
            </span>
          </>
        )}
      </span>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-forge-accent hover:text-forge-accent-hover dark:text-forge-accent-dark dark:hover:text-forge-accent-hover-dark ml-2 text-xs underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
