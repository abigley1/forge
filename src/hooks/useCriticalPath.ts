/**
 * useCriticalPath Hook
 *
 * Provides critical path calculation and utilities for nodes.
 * The critical path is the longest chain through incomplete tasks/decisions.
 */

import { useMemo, useCallback } from 'react'
import { useNodesStore } from '@/store/useNodesStore'
import {
  calculateCriticalPath,
  isOnCriticalPath,
  isEdgeOnCriticalPath,
  getCriticalPathPosition,
  getNonCriticalIncompleteNodes,
  calculateSlack,
  type CriticalPathResult,
} from '@/lib/criticalPath'

export interface UseCriticalPathOptions {
  /** Node ID to check critical path membership for */
  nodeId?: string
}

export interface UseCriticalPathResult {
  /** The full critical path result */
  criticalPath: CriticalPathResult
  /** Whether the specified node is on the critical path (if nodeId provided) */
  isNodeOnCriticalPath: boolean
  /** Position of the node on the critical path (0-indexed, -1 if not on path) */
  nodePosition: number
  /** Check if any node is on the critical path */
  checkIsOnCriticalPath: (nodeId: string) => boolean
  /** Check if an edge is on the critical path */
  checkIsEdgeOnCriticalPath: (sourceId: string, targetId: string) => boolean
  /** Get position of any node on the critical path */
  getNodePosition: (nodeId: string) => number
  /** Get all node IDs on the critical path */
  criticalPathNodeIds: string[]
  /** Get all incomplete node IDs NOT on the critical path */
  nonCriticalIncompleteIds: string[]
  /** Get slack value for a node (0 for critical path nodes) */
  getSlack: (nodeId: string) => number
  /** Whether a valid critical path exists */
  hasCriticalPath: boolean
  /** Length of the critical path */
  pathLength: number
}

/**
 * Hook for calculating and querying critical path information
 */
export function useCriticalPath(
  options: UseCriticalPathOptions = {}
): UseCriticalPathResult {
  const { nodeId } = options

  const nodes = useNodesStore((state) => state.nodes)

  // Calculate the critical path (memoized based on nodes)
  const criticalPath = useMemo(() => {
    return calculateCriticalPath(nodes)
  }, [nodes])

  // Calculate slack values (memoized)
  const slackMap = useMemo(() => {
    return calculateSlack(nodes, criticalPath)
  }, [nodes, criticalPath])

  // Get non-critical incomplete nodes (memoized)
  const nonCriticalIncompleteIds = useMemo(() => {
    return getNonCriticalIncompleteNodes(nodes, criticalPath)
  }, [nodes, criticalPath])

  // Check if the specified node is on the critical path
  const isNodeOnCriticalPath = useMemo(() => {
    if (!nodeId) return false
    return isOnCriticalPath(nodeId, criticalPath)
  }, [nodeId, criticalPath])

  // Get position of the specified node
  const nodePosition = useMemo(() => {
    if (!nodeId) return -1
    return getCriticalPathPosition(nodeId, criticalPath)
  }, [nodeId, criticalPath])

  // Check if any node is on the critical path
  const checkIsOnCriticalPath = useCallback(
    (id: string): boolean => {
      return isOnCriticalPath(id, criticalPath)
    },
    [criticalPath]
  )

  // Check if an edge is on the critical path
  const checkIsEdgeOnCriticalPath = useCallback(
    (sourceId: string, targetId: string): boolean => {
      return isEdgeOnCriticalPath(sourceId, targetId, criticalPath)
    },
    [criticalPath]
  )

  // Get position of any node
  const getNodePosition = useCallback(
    (id: string): number => {
      return getCriticalPathPosition(id, criticalPath)
    },
    [criticalPath]
  )

  // Get slack value for a node
  const getSlack = useCallback(
    (id: string): number => {
      return slackMap.get(id) ?? -1
    },
    [slackMap]
  )

  // Get critical path node IDs
  const criticalPathNodeIds = useMemo(() => {
    return Array.from(criticalPath.nodeIds)
  }, [criticalPath])

  return {
    criticalPath,
    isNodeOnCriticalPath,
    nodePosition,
    checkIsOnCriticalPath,
    checkIsEdgeOnCriticalPath,
    getNodePosition,
    criticalPathNodeIds,
    nonCriticalIncompleteIds,
    getSlack,
    hasCriticalPath: criticalPath.hasPath,
    pathLength: criticalPath.length,
  }
}

/**
 * Convenience hook for checking if a specific node is on the critical path
 */
export function useIsOnCriticalPath(nodeId: string | undefined) {
  const nodes = useNodesStore((state) => state.nodes)

  return useMemo(() => {
    if (!nodeId) return false
    const criticalPath = calculateCriticalPath(nodes)
    return isOnCriticalPath(nodeId, criticalPath)
  }, [nodeId, nodes])
}

/**
 * Convenience hook for getting critical path info for a specific node
 */
export function useNodeCriticalPathInfo(nodeId: string | undefined) {
  const nodes = useNodesStore((state) => state.nodes)

  return useMemo(() => {
    if (!nodeId) {
      return {
        isOnCriticalPath: false,
        position: -1,
        pathLength: 0,
        criticalPath: null,
      }
    }

    const criticalPath = calculateCriticalPath(nodes)
    const position = getCriticalPathPosition(nodeId, criticalPath)

    return {
      isOnCriticalPath: criticalPath.nodeIds.has(nodeId),
      position,
      pathLength: criticalPath.length,
      criticalPath,
    }
  }, [nodeId, nodes])
}

export default useCriticalPath
