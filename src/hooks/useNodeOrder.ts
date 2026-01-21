/**
 * useNodeOrder Hook
 *
 * Manages node ordering with persistence to project metadata.
 * Provides ordered nodes and a reorder function that automatically
 * updates project metadata and saves to disk.
 */

import { useCallback, useMemo } from 'react'

import type { ForgeNode } from '@/types/nodes'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'

// ============================================================================
// Types
// ============================================================================

export interface UseNodeOrderOptions {
  /** Nodes to order (if not provided, uses all nodes from store) */
  nodes?: ForgeNode[]
  /** Whether to auto-save metadata after reorder (default: true) */
  autoSave?: boolean
}

export interface UseNodeOrderResult {
  /** Nodes sorted by custom order */
  orderedNodes: ForgeNode[]
  /** The current node order (array of node IDs) */
  nodeOrder: string[]
  /** Reorder nodes by providing new order of IDs */
  reorder: (newOrder: string[]) => Promise<void>
  /** Reset to default order (by type/modified date) */
  resetOrder: () => Promise<void>
  /** Whether the order has been customized */
  hasCustomOrder: boolean
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing node ordering with persistence.
 *
 * Features:
 * - Sorts nodes according to stored nodeOrder
 * - Handles nodes not in the order (appends them)
 * - Persists order to project metadata
 * - Auto-saves to disk (configurable)
 *
 * @example
 * const { orderedNodes, reorder } = useNodeOrder()
 *
 * // In your component:
 * <SortableNodeList
 *   nodes={orderedNodes}
 *   onReorder={async (newOrder) => {
 *     await reorder(newOrder)
 *   }}
 * />
 */
export function useNodeOrder(
  options: UseNodeOrderOptions = {}
): UseNodeOrderResult {
  const { autoSave = true } = options

  // Get store data
  const storeNodes = useNodesStore((state) => state.nodes)
  const project = useProjectStore((state) => state.project)
  const updateMetadata = useProjectStore((state) => state.updateMetadata)
  const saveMetadata = useProjectStore((state) => state.saveMetadata)

  // Use provided nodes or all nodes from store
  const nodes = useMemo(() => {
    if (options.nodes) {
      return options.nodes
    }
    return Array.from(storeNodes.values())
  }, [options.nodes, storeNodes])

  // Get stored node order from project metadata
  const storedOrder = useMemo(() => {
    return project?.metadata?.nodeOrder ?? []
  }, [project?.metadata?.nodeOrder])

  // Check if we have a custom order
  const hasCustomOrder = storedOrder.length > 0

  // Sort nodes by custom order
  const orderedNodes = useMemo(() => {
    if (!hasCustomOrder) {
      // Return nodes as-is (whatever order they're in)
      return nodes
    }

    // Create a map for O(1) lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Build ordered array
    const ordered: ForgeNode[] = []
    const seen = new Set<string>()

    // Add nodes in stored order
    for (const id of storedOrder) {
      const node = nodeMap.get(id)
      if (node) {
        ordered.push(node)
        seen.add(id)
      }
    }

    // Add any nodes not in stored order (new nodes)
    for (const node of nodes) {
      if (!seen.has(node.id)) {
        ordered.push(node)
      }
    }

    return ordered
  }, [nodes, storedOrder, hasCustomOrder])

  // Reorder function
  const reorder = useCallback(
    async (newOrder: string[]) => {
      // Update project metadata with new order
      updateMetadata({ nodeOrder: newOrder })

      // Auto-save if enabled
      if (autoSave) {
        try {
          await saveMetadata()
        } catch (error) {
          console.error('Failed to save node order:', error)
        }
      }
    },
    [updateMetadata, saveMetadata, autoSave]
  )

  // Reset order function
  const resetOrder = useCallback(async () => {
    // Clear the stored order
    updateMetadata({ nodeOrder: undefined })

    // Auto-save if enabled
    if (autoSave) {
      try {
        await saveMetadata()
      } catch (error) {
        console.error('Failed to save node order reset:', error)
      }
    }
  }, [updateMetadata, saveMetadata, autoSave])

  return {
    orderedNodes,
    nodeOrder: storedOrder,
    reorder,
    resetOrder,
    hasCustomOrder,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply a custom order to an array of nodes.
 * Useful for sorting filtered/grouped nodes while respecting custom order.
 *
 * @param nodes - Array of nodes to sort
 * @param order - Array of node IDs representing the desired order
 * @returns Sorted array of nodes
 */
export function applyNodeOrder(
  nodes: ForgeNode[],
  order: string[]
): ForgeNode[] {
  if (order.length === 0) {
    return nodes
  }

  // Create order index map for O(1) lookup
  const orderIndex = new Map(order.map((id, index) => [id, index]))

  // Sort nodes
  return [...nodes].sort((a, b) => {
    const indexA = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const indexB = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return indexA - indexB
  })
}

/**
 * Merge a new order with existing nodes, handling additions and deletions.
 *
 * @param currentNodes - Current array of nodes
 * @param storedOrder - Previously stored order
 * @returns Updated order array with invalid IDs removed and new IDs appended
 */
export function reconcileNodeOrder(
  currentNodes: ForgeNode[],
  storedOrder: string[]
): string[] {
  const currentIds = new Set(currentNodes.map((n) => n.id))

  // Filter out IDs that no longer exist
  const validOrder = storedOrder.filter((id) => currentIds.has(id))

  // Find new IDs not in stored order
  const orderedSet = new Set(validOrder)
  const newIds = currentNodes
    .filter((n) => !orderedSet.has(n.id))
    .map((n) => n.id)

  // Return combined order
  return [...validOrder, ...newIds]
}
