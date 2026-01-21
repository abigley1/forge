/**
 * Graph announcer component for screen reader accessibility
 * Announces selection changes and navigation actions in the graph view
 */

import { useEffect, useState, useRef } from 'react'

export interface GraphAnnouncerProps {
  /** Current announcement message */
  message?: string
  /** Politeness level for aria-live */
  politeness?: 'polite' | 'assertive'
  /** Delay before clearing announcement (ms) */
  clearDelay?: number
}

/**
 * Screen reader announcer for graph interactions
 * Uses aria-live region to announce selection changes and navigation
 */
export function GraphAnnouncer({
  message,
  politeness = 'polite',
  clearDelay = 1000,
}: GraphAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const prevMessageRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Only update if message actually changed (not on every render)
    if (message !== prevMessageRef.current && message) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set the new announcement
      // This is an intentional state sync from prop to internal state
      setAnnouncement(message) // eslint-disable-line react-hooks/set-state-in-effect

      // Clear after delay
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('')
      }, clearDelay)
    }

    prevMessageRef.current = message

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearDelay])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
