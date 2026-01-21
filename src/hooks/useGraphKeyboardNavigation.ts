/**
 * Hook for keyboard navigation in the graph view
 * Supports Tab focus, arrow keys, Enter, and Escape
 */

import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import type { Node as RFNode } from 'reactflow'

export interface UseGraphKeyboardNavigationProps<T = unknown> {
  /** All navigable nodes */
  nodes: RFNode<T>[]
  /** Currently selected node ID */
  selectedNodeId: string | null
  /** Callback when a node is selected */
  onSelect: (nodeId: string | null) => void
  /** Callback when a node is focused (for announcements) */
  onFocus?: (nodeId: string, index: number, total: number) => void
  /** Whether navigation is enabled */
  enabled?: boolean
}

export interface UseGraphKeyboardNavigationReturn {
  /** Currently focused node ID (separate from selected) */
  focusedNodeId: string | null
  /** Handle keydown event - attach to container */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /** Focus the first node (for Tab-in) */
  focusFirst: () => void
  /** Focus the last node */
  focusLast: () => void
  /** Clear focus */
  clearFocus: () => void
  /** Set focus to a specific node */
  setFocusedNodeId: (nodeId: string | null) => void
  /** Get props for the graph container */
  getContainerProps: () => {
    tabIndex: number
    role: string
    'aria-label': string
    'aria-activedescendant': string | undefined
  }
}

/**
 * Get next index with wrap-around
 */
function getNextIndex(
  current: number,
  total: number,
  direction: 'next' | 'prev'
): number {
  if (total === 0) return -1
  if (direction === 'next') {
    return (current + 1) % total
  }
  return (current - 1 + total) % total
}

/**
 * Hook for managing keyboard navigation in graph view
 *
 * @returns Navigation state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   focusedNodeId,
 *   handleKeyDown,
 *   getContainerProps
 * } = useGraphKeyboardNavigation({
 *   nodes: rfNodes,
 *   selectedNodeId: activeNodeId,
 *   onSelect: setActiveNode,
 *   onFocus: (id, index, total) => announce(`${id}, ${index + 1} of ${total}`)
 * })
 *
 * return (
 *   <div {...getContainerProps()} onKeyDown={handleKeyDown}>
 *     <ReactFlow ... />
 *   </div>
 * )
 * ```
 */
export function useGraphKeyboardNavigation<T = unknown>({
  nodes,
  onSelect,
  onFocus,
  enabled = true,
}: UseGraphKeyboardNavigationProps<T>): UseGraphKeyboardNavigationReturn {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const prevNodesRef = useRef<RFNode<T>[]>([])

  // Filter to only include navigable nodes (forgeNode type, not clusters)
  const navigableNodes = useMemo(() => {
    return nodes.filter((node) => node.type === 'forgeNode')
  }, [nodes])

  // Get current focused index
  const focusedIndex = useMemo(() => {
    if (!focusedNodeId) return -1
    return navigableNodes.findIndex((n) => n.id === focusedNodeId)
  }, [focusedNodeId, navigableNodes])

  // Clear focus when the focused node is removed
  useEffect(() => {
    const currentIds = new Set(navigableNodes.map((n) => n.id))

    // If the focused node was removed, clear focus
    // This is an intentional state sync to clean up stale focus
    if (focusedNodeId && !currentIds.has(focusedNodeId)) {
      setFocusedNodeId(null) // eslint-disable-line react-hooks/set-state-in-effect
    }

    prevNodesRef.current = navigableNodes
  }, [navigableNodes, focusedNodeId])

  // Focus helpers
  const focusNode = useCallback(
    (nodeId: string, index: number) => {
      setFocusedNodeId(nodeId)
      onFocus?.(nodeId, index, navigableNodes.length)
    },
    [onFocus, navigableNodes.length]
  )

  const focusFirst = useCallback(() => {
    if (navigableNodes.length > 0) {
      focusNode(navigableNodes[0].id, 0)
    }
  }, [navigableNodes, focusNode])

  const focusLast = useCallback(() => {
    if (navigableNodes.length > 0) {
      const lastIndex = navigableNodes.length - 1
      focusNode(navigableNodes[lastIndex].id, lastIndex)
    }
  }, [navigableNodes, focusNode])

  const clearFocus = useCallback(() => {
    setFocusedNodeId(null)
  }, [])

  // Keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || navigableNodes.length === 0) return

      const key = event.key

      // Handle Tab-in (first focus)
      // Note: This is handled at container level, not by this handler

      // Arrow navigation
      if (key === 'ArrowDown' || key === 'ArrowRight') {
        event.preventDefault()

        if (focusedIndex === -1) {
          // No focus yet, start at first
          focusNode(navigableNodes[0].id, 0)
        } else {
          const nextIndex = getNextIndex(
            focusedIndex,
            navigableNodes.length,
            'next'
          )
          focusNode(navigableNodes[nextIndex].id, nextIndex)
        }
      } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
        event.preventDefault()

        if (focusedIndex === -1) {
          // No focus yet, start at last
          focusNode(
            navigableNodes[navigableNodes.length - 1].id,
            navigableNodes.length - 1
          )
        } else {
          const prevIndex = getNextIndex(
            focusedIndex,
            navigableNodes.length,
            'prev'
          )
          focusNode(navigableNodes[prevIndex].id, prevIndex)
        }
      } else if (key === 'Home') {
        event.preventDefault()
        focusFirst()
      } else if (key === 'End') {
        event.preventDefault()
        focusLast()
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault()

        // Select the focused node
        if (focusedNodeId) {
          onSelect(focusedNodeId)
        }
      } else if (key === 'Escape') {
        event.preventDefault()

        // Deselect and clear focus
        onSelect(null)
        clearFocus()
      }
    },
    [
      enabled,
      navigableNodes,
      focusedIndex,
      focusedNodeId,
      focusNode,
      focusFirst,
      focusLast,
      onSelect,
      clearFocus,
    ]
  )

  // Get container props for accessibility
  const getContainerProps = useCallback(
    () => ({
      tabIndex: enabled ? 0 : -1,
      role: 'application',
      'aria-label': `Graph view with ${navigableNodes.length} nodes. Use arrow keys to navigate, Enter to select, Escape to deselect.`,
      'aria-activedescendant': focusedNodeId || undefined,
    }),
    [enabled, navigableNodes.length, focusedNodeId]
  )

  return {
    focusedNodeId,
    handleKeyDown,
    focusFirst,
    focusLast,
    clearFocus,
    setFocusedNodeId,
    getContainerProps,
  }
}
