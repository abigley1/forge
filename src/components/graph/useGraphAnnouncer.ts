/**
 * Hook for managing graph announcements for screen readers
 */

import { useCallback, useState, useRef, useEffect } from 'react'

export interface UseGraphAnnouncerReturn {
  /** Current announcement */
  announcement: string
  /** Announce a message to screen readers */
  announce: (message: string) => void
  /** Announce node selection */
  announceNodeSelected: (title: string, nodeType: string) => void
  /** Announce node deselection */
  announceNodeDeselected: () => void
  /** Announce node focused (keyboard navigation) */
  announceNodeFocused: (
    title: string,
    nodeType: string,
    index: number,
    total: number
  ) => void
  /** Announce graph summary */
  announceGraphSummary: (nodeCount: number, edgeCount: number) => void
  /** Announce filter applied */
  announceFilterApplied: (visibleCount: number, totalCount: number) => void
  /** Announce minimap toggled */
  announceMinimapToggled: (visible: boolean) => void
  /** Announce layout reset */
  announceLayoutReset: () => void
  /** Clear announcement */
  clear: () => void
}

/**
 * Hook for managing graph announcements
 * Provides functions to announce various graph interactions to screen readers
 *
 * @param clearDelay - Delay before clearing announcement (ms)
 * @returns Announcement state and control functions
 *
 * @example
 * ```tsx
 * const { announcement, announceNodeSelected } = useGraphAnnouncer()
 *
 * // In selection handler:
 * announceNodeSelected('My Task', 'task')
 *
 * return <GraphAnnouncer message={announcement} />
 * ```
 */
export function useGraphAnnouncer(clearDelay = 1000): UseGraphAnnouncerReturn {
  const [announcement, setAnnouncement] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  const announce = useCallback(
    (message: string) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setAnnouncement(message)

      // Clear after delay
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('')
      }, clearDelay)
    },
    [clearDelay]
  )

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setAnnouncement('')
  }, [])

  const announceNodeSelected = useCallback(
    (title: string, nodeType: string) => {
      announce(`Selected ${nodeType}: ${title}`)
    },
    [announce]
  )

  const announceNodeDeselected = useCallback(() => {
    announce('Node deselected')
  }, [announce])

  const announceNodeFocused = useCallback(
    (title: string, nodeType: string, index: number, total: number) => {
      announce(`${title}, ${nodeType}, ${index + 1} of ${total}`)
    },
    [announce]
  )

  const announceGraphSummary = useCallback(
    (nodeCount: number, edgeCount: number) => {
      const nodeWord = nodeCount === 1 ? 'node' : 'nodes'
      const edgeWord = edgeCount === 1 ? 'connection' : 'connections'
      announce(`Graph view: ${nodeCount} ${nodeWord}, ${edgeCount} ${edgeWord}`)
    },
    [announce]
  )

  const announceFilterApplied = useCallback(
    (visibleCount: number, totalCount: number) => {
      if (visibleCount === totalCount) {
        announce(`Showing all ${totalCount} nodes`)
      } else {
        announce(`Showing ${visibleCount} of ${totalCount} nodes`)
      }
    },
    [announce]
  )

  const announceMinimapToggled = useCallback(
    (visible: boolean) => {
      announce(visible ? 'Minimap shown' : 'Minimap hidden')
    },
    [announce]
  )

  const announceLayoutReset = useCallback(() => {
    announce('Layout reset complete')
  }, [announce])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    announcement,
    announce,
    announceNodeSelected,
    announceNodeDeselected,
    announceNodeFocused,
    announceGraphSummary,
    announceFilterApplied,
    announceMinimapToggled,
    announceLayoutReset,
    clear,
  }
}
