/**
 * URL-Based Node Navigation Hook
 *
 * Syncs the active node ID with the URL query parameter (?node=id)
 * enabling browser back/forward navigation and deep linking.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { useNodesStore } from '@/store/useNodesStore'

// Parser for node ID URL parameter
const nodeIdParser = parseAsString.withDefault('')

export interface UseNodeNavigationReturn {
  /** Currently active node ID from URL */
  activeNodeId: string | null
  /** Navigate to a node (updates URL and store) */
  navigateToNode: (nodeId: string | null) => void
  /** Go back in navigation history */
  goBack: () => void
  /** Go forward in navigation history */
  goForward: () => void
  /** Check if we can go back */
  canGoBack: boolean
  /** Check if we can go forward */
  canGoForward: boolean
}

/**
 * Hook for URL-synced node navigation.
 *
 * Syncs the active node ID between:
 * - URL query parameter (?node=<id>)
 * - Zustand nodes store (activeNodeId)
 *
 * This enables:
 * - Deep linking to specific nodes
 * - Browser back/forward navigation
 * - Shareable URLs
 */
export function useNodeNavigation(): UseNodeNavigationReturn {
  // URL state via nuqs
  const [urlNodeId, setUrlNodeId] = useQueryState('node', nodeIdParser)

  // Store state
  const storeActiveNodeId = useNodesStore((state) => state.activeNodeId)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)
  const hasNode = useNodesStore((state) => state.hasNode)

  // Track if we're syncing to prevent loops
  const isSyncingRef = useRef(false)

  // Convert empty string to null for consistency
  const activeNodeId = urlNodeId || null

  // Sync URL -> Store (when URL changes, e.g., from back/forward)
  useEffect(() => {
    if (isSyncingRef.current) return

    // URL changed - update store
    const targetId = urlNodeId || null

    // Only update if different and node exists (or clearing)
    if (targetId !== storeActiveNodeId) {
      if (targetId === null || hasNode(targetId)) {
        isSyncingRef.current = true
        setActiveNode(targetId)
        isSyncingRef.current = false
      }
    }
  }, [urlNodeId, storeActiveNodeId, setActiveNode, hasNode])

  // Sync Store -> URL (when store changes, e.g., from programmatic selection)
  useEffect(() => {
    if (isSyncingRef.current) return

    const currentUrlId = urlNodeId || null
    if (storeActiveNodeId !== currentUrlId) {
      isSyncingRef.current = true
      void setUrlNodeId(storeActiveNodeId || null)
      isSyncingRef.current = false
    }
  }, [storeActiveNodeId, urlNodeId, setUrlNodeId])

  // Navigate to a node
  const navigateToNode = useCallback(
    (nodeId: string | null) => {
      // Validate node exists (or is null for clearing)
      if (nodeId !== null && !hasNode(nodeId)) {
        console.warn(`Cannot navigate to non-existent node: ${nodeId}`)
        return
      }

      isSyncingRef.current = true

      // Update both URL and store
      void setUrlNodeId(nodeId)
      setActiveNode(nodeId)

      isSyncingRef.current = false
    },
    [hasNode, setUrlNodeId, setActiveNode]
  )

  // Browser navigation helpers
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    }
  }, [])

  const goForward = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.forward()
    }
  }, [])

  // Note: These are approximations - the browser doesn't expose exact back/forward state
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1
  const canGoForward = false // Cannot reliably detect forward history

  return {
    activeNodeId,
    navigateToNode,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  }
}
