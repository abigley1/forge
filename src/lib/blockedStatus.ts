/**
 * Blocked Status Calculation & Propagation
 *
 * This module handles the calculation of blocked status for nodes based on their dependencies.
 * A node is blocked if any of its dependencies are not yet resolved:
 * - Task dependencies: blocked if depended-on task is not 'complete'
 * - Decision dependencies: blocked if depended-on decision is not 'selected'
 */

import type { ForgeNode, TaskNode, DecisionNode } from '@/types/nodes'
import { isTaskNode, isDecisionNode, NodeType } from '@/types/nodes'

/**
 * Result of checking blocked status for a node
 */
export interface BlockedStatusResult {
  /** Whether the node is blocked */
  isBlocked: boolean
  /** IDs of nodes that are blocking this node */
  blockingNodeIds: string[]
  /** Detailed information about each blocking node */
  blockingNodes: BlockingNodeInfo[]
}

/**
 * Information about a node that is blocking another node
 */
export interface BlockingNodeInfo {
  /** ID of the blocking node */
  id: string
  /** Title of the blocking node */
  title: string
  /** Type of the blocking node */
  type: (typeof NodeType)[keyof typeof NodeType]
  /** Current status of the blocking node */
  status: string
  /** What status is required to unblock */
  requiredStatus: string
}

/**
 * Result of calculating which nodes would be unblocked by a status change
 */
export interface UnblockResult {
  /** IDs of nodes that would be newly unblocked */
  newlyUnblockedIds: string[]
  /** Detailed information about newly unblocked nodes */
  newlyUnblockedNodes: Array<{
    id: string
    title: string
    type: (typeof NodeType)[keyof typeof NodeType]
  }>
}

/**
 * Checks if a dependency node is considered "resolved" (not blocking)
 *
 * @param node - The dependency node to check
 * @returns true if the node is resolved and won't block dependents
 */
export function isDependencyResolved(node: ForgeNode): boolean {
  if (isTaskNode(node)) {
    return node.status === 'complete'
  }
  if (isDecisionNode(node)) {
    return node.status === 'selected'
  }
  // Components and Notes don't have blocking states - they're always "resolved"
  return true
}

/**
 * Gets the required status string for a node type to be considered resolved
 */
export function getRequiredStatusForResolution(
  nodeType: (typeof NodeType)[keyof typeof NodeType]
): string {
  switch (nodeType) {
    case NodeType.Task:
      return 'complete'
    case NodeType.Decision:
      return 'selected'
    default:
      return 'n/a'
  }
}

/**
 * Calculates the blocked status of a node based on its dependencies
 *
 * A node is blocked if ANY of its dependencies are not resolved:
 * - Task is blocked if it depends on a task that is not 'complete'
 * - Task is blocked if it depends on a decision that is not 'selected'
 *
 * @param node - The node to check
 * @param allNodes - Map of all nodes in the project
 * @returns BlockedStatusResult with blocking information
 */
export function calculateBlockedStatus(
  node: ForgeNode,
  allNodes: Map<string, ForgeNode>
): BlockedStatusResult {
  const result: BlockedStatusResult = {
    isBlocked: false,
    blockingNodeIds: [],
    blockingNodes: [],
  }

  // Only TaskNodes have dependsOn arrays
  if (!isTaskNode(node)) {
    return result
  }

  const taskNode = node as TaskNode

  // Check each dependency
  for (const depId of taskNode.dependsOn) {
    const depNode = allNodes.get(depId)

    // If dependency doesn't exist, we can't block on it
    if (!depNode) {
      continue
    }

    // Check if this dependency is resolved
    if (!isDependencyResolved(depNode)) {
      result.isBlocked = true
      result.blockingNodeIds.push(depId)
      result.blockingNodes.push({
        id: depId,
        title: depNode.title,
        type: depNode.type,
        status: getNodeStatus(depNode),
        requiredStatus: getRequiredStatusForResolution(depNode.type),
      })
    }
  }

  return result
}

/**
 * Gets the status string from any node type
 */
function getNodeStatus(node: ForgeNode): string {
  if (isTaskNode(node)) {
    return node.status
  }
  if (isDecisionNode(node)) {
    return node.status
  }
  // Components have status, Notes don't have a status field in the same way
  if ('status' in node) {
    return (node as { status: string }).status
  }
  return 'n/a'
}

/**
 * Calculates which nodes would be unblocked if a given node's status changed to resolved
 *
 * This is used to show a preview of what completing a task or selecting a decision would unblock.
 *
 * @param nodeId - The node whose status would change
 * @param allNodes - Map of all nodes in the project
 * @returns UnblockResult with nodes that would be newly unblocked
 */
export function calculateNodesToUnblock(
  nodeId: string,
  allNodes: Map<string, ForgeNode>
): UnblockResult {
  const result: UnblockResult = {
    newlyUnblockedIds: [],
    newlyUnblockedNodes: [],
  }

  // Find all nodes that depend on this node
  for (const [id, node] of allNodes) {
    if (!isTaskNode(node)) continue

    const taskNode = node as TaskNode

    // Skip if this node doesn't depend on the target node
    if (!taskNode.dependsOn.includes(nodeId)) continue

    // Check if this is currently blocked
    const currentStatus = calculateBlockedStatus(taskNode, allNodes)
    if (!currentStatus.isBlocked) continue

    // Check if removing this blocker would unblock the node
    // This happens when nodeId is the ONLY blocking node
    if (
      currentStatus.blockingNodeIds.length === 1 &&
      currentStatus.blockingNodeIds[0] === nodeId
    ) {
      result.newlyUnblockedIds.push(id)
      result.newlyUnblockedNodes.push({
        id,
        title: node.title,
        type: node.type,
      })
    }
  }

  return result
}

/**
 * Finds all nodes that would be transitively unblocked by completing a chain of dependencies
 *
 * This considers cascading effects - if A blocks B and B blocks C,
 * completing A might eventually lead to C being unblocked (after B is also completed).
 *
 * @param nodeId - The starting node
 * @param allNodes - Map of all nodes
 * @returns Array of all node IDs that would eventually be unblocked
 */
export function calculateTransitiveUnblocks(
  nodeId: string,
  allNodes: Map<string, ForgeNode>
): string[] {
  const toUnblock: string[] = []
  const visited = new Set<string>()

  function traverse(currentId: string): void {
    if (visited.has(currentId)) return
    visited.add(currentId)

    // Find nodes directly unblocked by this one
    const directUnblocks = calculateNodesToUnblock(currentId, allNodes)

    for (const unblockedId of directUnblocks.newlyUnblockedIds) {
      toUnblock.push(unblockedId)
      // Recursively check what this node might unblock
      traverse(unblockedId)
    }
  }

  traverse(nodeId)
  return toUnblock
}

/**
 * Gets all nodes that are currently blocking any progress (have dependents that are blocked)
 *
 * @param allNodes - Map of all nodes
 * @returns Array of node IDs that are blocking other nodes
 */
export function getBlockingNodes(allNodes: Map<string, ForgeNode>): string[] {
  const blockingSet = new Set<string>()

  for (const [, node] of allNodes) {
    const status = calculateBlockedStatus(node, allNodes)
    for (const blockerId of status.blockingNodeIds) {
      blockingSet.add(blockerId)
    }
  }

  return Array.from(blockingSet)
}

/**
 * Gets all nodes that are currently blocked
 *
 * @param allNodes - Map of all nodes
 * @returns Array of node IDs that are blocked
 */
export function getBlockedNodes(allNodes: Map<string, ForgeNode>): string[] {
  const blocked: string[] = []

  for (const [id, node] of allNodes) {
    const status = calculateBlockedStatus(node, allNodes)
    if (status.isBlocked) {
      blocked.push(id)
    }
  }

  return blocked
}

/**
 * Checks if a node should have its status automatically updated to 'blocked'
 *
 * @param node - The node to check
 * @param allNodes - Map of all nodes
 * @returns true if the node should be marked as blocked
 */
export function shouldBeBlocked(
  node: ForgeNode,
  allNodes: Map<string, ForgeNode>
): boolean {
  if (!isTaskNode(node)) return false
  const status = calculateBlockedStatus(node, allNodes)
  return status.isBlocked
}

/**
 * Calculates status change cascade effects
 *
 * When a node's status changes to resolved, this calculates which dependent nodes
 * should have their blocked status updated.
 *
 * @param changedNodeId - The node whose status changed
 * @param newStatus - The new status of the node
 * @param allNodes - Map of all nodes
 * @returns Object with newly unblocked and still blocked node IDs
 */
export function calculateStatusCascade(
  changedNodeId: string,
  newStatus: string,
  allNodes: Map<string, ForgeNode>
): {
  newlyUnblocked: string[]
  stillBlocked: string[]
} {
  const changedNode = allNodes.get(changedNodeId)
  if (!changedNode) {
    return { newlyUnblocked: [], stillBlocked: [] }
  }

  // Check if this change resolves the node
  const isNowResolved =
    (isTaskNode(changedNode) && newStatus === 'complete') ||
    (isDecisionNode(changedNode) && newStatus === 'selected')

  if (!isNowResolved) {
    return { newlyUnblocked: [], stillBlocked: [] }
  }

  const newlyUnblocked: string[] = []
  const stillBlocked: string[] = []

  // Find all nodes that depend on the changed node
  for (const [id, node] of allNodes) {
    if (!isTaskNode(node)) continue

    const taskNode = node as TaskNode

    // Skip if this node doesn't depend on the changed node
    if (!taskNode.dependsOn.includes(changedNodeId)) continue

    // Create a virtual updated nodes map where the changed node is resolved
    const virtualNodes = new Map(allNodes)
    const updatedChangedNode = { ...changedNode }
    if (isTaskNode(updatedChangedNode)) {
      ;(updatedChangedNode as TaskNode).status = 'complete'
    } else if (isDecisionNode(updatedChangedNode)) {
      ;(updatedChangedNode as DecisionNode).status = 'selected'
    }
    virtualNodes.set(changedNodeId, updatedChangedNode)

    // Check if this node would be unblocked with the change
    const statusAfterChange = calculateBlockedStatus(taskNode, virtualNodes)

    if (!statusAfterChange.isBlocked) {
      newlyUnblocked.push(id)
    } else {
      stillBlocked.push(id)
    }
  }

  return { newlyUnblocked, stillBlocked }
}
