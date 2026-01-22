/**
 * useBlockedStatus Hook
 *
 * Provides blocked status information for nodes and handles status change cascades
 * with toast notifications for newly unblocked nodes.
 */

import { useMemo, useCallback } from 'react'
import { useNodesStore } from '@/store/useNodesStore'
import { useToast } from '@/components/ui/Toast'
import {
  calculateBlockedStatus,
  calculateNodesToUnblock,
  calculateStatusCascade,
  getBlockedNodes,
  getBlockingNodes,
  shouldBeBlocked,
  type BlockedStatusResult,
  type UnblockResult,
} from '@/lib/blockedStatus'
import type { ForgeNode, TaskNode, DecisionNode } from '@/types/nodes'
import { isTaskNode, isDecisionNode } from '@/types/nodes'

export interface UseBlockedStatusOptions {
  /** Node ID to check blocked status for */
  nodeId?: string
  /** Whether to automatically show toast when nodes are unblocked */
  showUnblockToast?: boolean
}

export interface UseBlockedStatusResult {
  /** Blocked status for the specified node (if nodeId provided) */
  blockedStatus: BlockedStatusResult | null
  /** Get blocked status for any node */
  getBlockedStatusForNode: (nodeId: string) => BlockedStatusResult | null
  /** Get nodes that would be unblocked by completing/selecting a node */
  getNodesToUnblock: (nodeId: string) => UnblockResult
  /** All currently blocked node IDs */
  blockedNodeIds: string[]
  /** All nodes that are blocking other nodes */
  blockingNodeIds: string[]
  /** Update a node's status and handle cascade with toast notifications */
  updateStatusWithCascade: (
    nodeId: string,
    newStatus: string
  ) => {
    success: boolean
    unblocked: string[]
  }
  /** Check if a node should have its status set to 'blocked' */
  checkShouldBeBlocked: (nodeId: string) => boolean
}

/**
 * Hook for managing blocked status of nodes with cascade notifications
 */
export function useBlockedStatus(
  options: UseBlockedStatusOptions = {}
): UseBlockedStatusResult {
  const { nodeId, showUnblockToast = true } = options

  const nodes = useNodesStore((state) => state.nodes)
  const updateNode = useNodesStore((state) => state.updateNode)
  const getNodeById = useNodesStore((state) => state.getNodeById)
  const toast = useToast()

  // Calculate blocked status for the specified node
  const blockedStatus = useMemo(() => {
    if (!nodeId) return null
    const node = nodes.get(nodeId)
    if (!node) return null
    return calculateBlockedStatus(node, nodes)
  }, [nodeId, nodes])

  // Get blocked status for any node
  const getBlockedStatusForNode = useCallback(
    (id: string): BlockedStatusResult | null => {
      const node = nodes.get(id)
      if (!node) return null
      return calculateBlockedStatus(node, nodes)
    },
    [nodes]
  )

  // Get nodes that would be unblocked
  const getNodesToUnblock = useCallback(
    (id: string): UnblockResult => {
      return calculateNodesToUnblock(id, nodes)
    },
    [nodes]
  )

  // Get all blocked node IDs
  const blockedNodeIds = useMemo(() => {
    return getBlockedNodes(nodes)
  }, [nodes])

  // Get all blocking node IDs
  const blockingNodeIds = useMemo(() => {
    return getBlockingNodes(nodes)
  }, [nodes])

  // Check if a node should be blocked
  const checkShouldBeBlocked = useCallback(
    (id: string): boolean => {
      const node = nodes.get(id)
      if (!node) return false
      return shouldBeBlocked(node, nodes)
    },
    [nodes]
  )

  // Update status with cascade handling
  const updateStatusWithCascade = useCallback(
    (
      id: string,
      newStatus: string
    ): { success: boolean; unblocked: string[] } => {
      const node = getNodeById(id)
      if (!node) {
        return { success: false, unblocked: [] }
      }

      // Calculate cascade effects before updating
      const cascade = calculateStatusCascade(id, newStatus, nodes)

      // Update the node's status
      let updatedNode: ForgeNode
      if (isTaskNode(node)) {
        updatedNode = {
          ...node,
          status: newStatus as TaskNode['status'],
          dates: { ...node.dates, modified: new Date() },
        }
      } else if (isDecisionNode(node)) {
        updatedNode = {
          ...node,
          status: newStatus as DecisionNode['status'],
          dates: { ...node.dates, modified: new Date() },
        }
      } else {
        // For other node types, just update dates.modified
        updatedNode = {
          ...node,
          dates: { ...node.dates, modified: new Date() },
        }
      }

      updateNode(id, updatedNode)

      // Update newly unblocked nodes to remove 'blocked' status
      for (const unblockedId of cascade.newlyUnblocked) {
        const unblockedNode = getNodeById(unblockedId)
        if (unblockedNode && isTaskNode(unblockedNode)) {
          // Change status from 'blocked' to 'pending'
          if (unblockedNode.status === 'blocked') {
            updateNode(unblockedId, {
              ...unblockedNode,
              status: 'pending',
              dates: { ...unblockedNode.dates, modified: new Date() },
            })
          }
        }
      }

      // Show toast for newly unblocked nodes
      if (showUnblockToast && cascade.newlyUnblocked.length > 0) {
        const unblockedTitles = cascade.newlyUnblocked
          .map((unblockedId) => getNodeById(unblockedId)?.title)
          .filter(Boolean) as string[]

        if (unblockedTitles.length === 1) {
          toast.success({
            title: 'Node unblocked',
            description: `"${unblockedTitles[0]}" is now ready to work on`,
          })
        } else if (unblockedTitles.length > 1) {
          const displayTitles = unblockedTitles.slice(0, 3)
          const remaining = unblockedTitles.length - 3

          toast.success({
            title: `${unblockedTitles.length} nodes unblocked`,
            description:
              remaining > 0
                ? `${displayTitles.join(', ')} and ${remaining} more are now ready`
                : `${displayTitles.join(', ')} are now ready to work on`,
          })
        }
      }

      return { success: true, unblocked: cascade.newlyUnblocked }
    },
    [nodes, getNodeById, updateNode, showUnblockToast, toast]
  )

  return {
    blockedStatus,
    getBlockedStatusForNode,
    getNodesToUnblock,
    blockedNodeIds,
    blockingNodeIds,
    updateStatusWithCascade,
    checkShouldBeBlocked,
  }
}

/**
 * Convenience hook for getting unblock preview data for a specific node
 */
export function useUnblockPreview(nodeId: string | undefined) {
  const nodes = useNodesStore((state) => state.nodes)

  return useMemo(() => {
    if (!nodeId) {
      return { nodesToUnblock: [], count: 0 }
    }

    const result = calculateNodesToUnblock(nodeId, nodes)
    return {
      nodesToUnblock: result.newlyUnblockedNodes,
      count: result.newlyUnblockedIds.length,
    }
  }, [nodeId, nodes])
}

/**
 * Convenience hook for getting blocked status of a specific node
 */
export function useNodeBlockedStatus(nodeId: string | undefined) {
  const nodes = useNodesStore((state) => state.nodes)

  return useMemo(() => {
    if (!nodeId) {
      return null
    }

    const node = nodes.get(nodeId)
    if (!node) {
      return null
    }

    return calculateBlockedStatus(node, nodes)
  }, [nodeId, nodes])
}

export default useBlockedStatus
