/**
 * Critical path calculation for dependency graphs.
 *
 * The critical path is the longest chain through incomplete tasks/decisions
 * in the dependency graph. Delaying any task on the critical path will delay
 * the entire project.
 */

import type { ForgeNode, TaskNode, DecisionNode } from '@/types/nodes'
import { isTaskNode, isDecisionNode, NodeType } from '@/types/nodes'
import { DependencyGraph, topologicalSort, CycleError } from './dependencyGraph'

/**
 * Information about a node on the critical path
 */
export interface CriticalPathNode {
  /** Node ID */
  id: string
  /** Node title */
  title: string
  /** Node type */
  type: typeof NodeType.Task | typeof NodeType.Decision
  /** Current status */
  status: string
  /** Distance from start of critical path (0-indexed position) */
  distance: number
}

/**
 * Result of critical path calculation
 */
export interface CriticalPathResult {
  /** Ordered list of nodes on the critical path (from start to end) */
  nodes: CriticalPathNode[]
  /** Set of node IDs on the critical path for quick lookup */
  nodeIds: Set<string>
  /** Set of edge keys (format: "sourceId->targetId") on the critical path */
  edgeKeys: Set<string>
  /** Total length of the critical path (number of nodes) */
  length: number
  /** Whether a valid critical path was found */
  hasPath: boolean
}

/**
 * Stable empty critical path result (reused to prevent unnecessary re-renders)
 */
const EMPTY_CRITICAL_PATH_RESULT: CriticalPathResult = Object.freeze({
  nodes: [] as CriticalPathNode[],
  nodeIds: new Set<string>(),
  edgeKeys: new Set<string>(),
  length: 0,
  hasPath: false,
})

/**
 * Creates an empty critical path result
 * Returns a stable reference to prevent unnecessary re-renders
 */
export function createEmptyCriticalPathResult(): CriticalPathResult {
  return EMPTY_CRITICAL_PATH_RESULT
}

/**
 * Checks if a node is incomplete (can be on the critical path)
 *
 * @param node - The node to check
 * @returns true if the node is incomplete
 */
export function isIncompleteNode(node: ForgeNode): boolean {
  if (isTaskNode(node)) {
    return node.status !== 'complete'
  }
  if (isDecisionNode(node)) {
    return node.status !== 'selected'
  }
  // Notes and Components are not part of the critical path
  return false
}

/**
 * Checks if a node can be on the critical path (is a task or decision)
 *
 * @param node - The node to check
 * @returns true if the node is a task or decision
 */
export function canBeOnCriticalPath(
  node: ForgeNode
): node is TaskNode | DecisionNode {
  return isTaskNode(node) || isDecisionNode(node)
}

/**
 * Creates an edge key for quick set lookup
 */
export function createEdgeKey(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`
}

/**
 * Builds a dependency graph from nodes, considering only task dependencies
 *
 * @param nodes - Map of all nodes
 * @returns DependencyGraph with edges representing dependencies
 */
export function buildGraphFromNodes(
  nodes: Map<string, ForgeNode>
): DependencyGraph {
  const graph = new DependencyGraph()

  // Add all nodes to the graph
  nodes.forEach((_, id) => {
    graph.addNode(id)
  })

  // Add edges based on task dependencies
  nodes.forEach((node) => {
    if (isTaskNode(node) && node.dependsOn.length > 0) {
      node.dependsOn.forEach((dependencyId) => {
        if (nodes.has(dependencyId)) {
          // addEdge(from, to) means "from depends on to"
          // So node.dependsOn contains IDs this node depends on
          try {
            graph.addEdge(node.id, dependencyId, false) // Don't validate cycles here
          } catch (error) {
            // Log unexpected errors (cycles are expected to be rare in valid data)
            if (error instanceof CycleError) {
              console.debug(
                '[criticalPath] Cycle in graph build:',
                error.cyclePath.join(' -> ')
              )
            } else {
              console.warn(
                '[criticalPath] Unexpected error adding edge:',
                error
              )
            }
          }
        }
      })
    }
  })

  return graph
}

/**
 * Calculates the critical path through incomplete tasks/decisions.
 *
 * The critical path is the longest chain of incomplete tasks/decisions
 * in the dependency graph. This uses dynamic programming on the topologically
 * sorted graph to find the longest path.
 *
 * @param nodes - Map of all nodes in the project
 * @returns CriticalPathResult with the critical path information
 */
export function calculateCriticalPath(
  nodes: Map<string, ForgeNode>
): CriticalPathResult {
  if (nodes.size === 0) {
    return createEmptyCriticalPathResult()
  }

  // Filter to only incomplete tasks and decisions
  const incompleteNodes = new Map<string, ForgeNode>()
  nodes.forEach((node, id) => {
    if (canBeOnCriticalPath(node) && isIncompleteNode(node)) {
      incompleteNodes.set(id, node)
    }
  })

  if (incompleteNodes.size === 0) {
    return createEmptyCriticalPathResult()
  }

  // Build a subgraph with only incomplete nodes
  const subgraph = new DependencyGraph()
  incompleteNodes.forEach((_, id) => {
    subgraph.addNode(id)
  })

  // Add edges only between incomplete nodes
  incompleteNodes.forEach((node, id) => {
    if (isTaskNode(node)) {
      node.dependsOn.forEach((depId) => {
        if (incompleteNodes.has(depId)) {
          try {
            subgraph.addEdge(id, depId, false)
          } catch (error) {
            // Log cycle errors for debugging
            if (error instanceof CycleError) {
              console.debug(
                '[criticalPath] Cycle in subgraph:',
                error.cyclePath.join(' -> ')
              )
            } else {
              console.warn(
                '[criticalPath] Unexpected error adding subgraph edge:',
                error
              )
            }
          }
        }
      })
    }
  })

  // Perform topological sort on the subgraph
  const sortResult = topologicalSort(subgraph)

  if (!sortResult.success) {
    // Graph has cycles, return empty result
    return createEmptyCriticalPathResult()
  }

  const sorted = sortResult.sorted

  if (sorted.length === 0) {
    return createEmptyCriticalPathResult()
  }

  // Dynamic programming to find longest path
  // distance[id] = longest path length ending at this node
  // predecessor[id] = previous node on the longest path
  const distance = new Map<string, number>()
  const predecessor = new Map<string, string | null>()

  // Initialize all nodes with distance 1 (just themselves) and no predecessor
  sorted.forEach((id) => {
    distance.set(id, 1)
    predecessor.set(id, null)
  })

  // Process nodes in topological order
  // For each node, update distances of its dependents
  // In our graph: getDependents returns nodes that depend on this node
  // These are the nodes that come AFTER in the dependency chain
  for (const nodeId of sorted) {
    const currentDist = distance.get(nodeId) ?? 1
    const dependents = subgraph.getDependents(nodeId)

    for (const depId of dependents) {
      if (incompleteNodes.has(depId)) {
        const newDist = currentDist + 1
        const existingDist = distance.get(depId) ?? 1

        if (newDist > existingDist) {
          distance.set(depId, newDist)
          predecessor.set(depId, nodeId)
        }
      }
    }
  }

  // Find the node with maximum distance (end of critical path)
  let maxDistance = 0
  let endNodeId: string | null = null

  distance.forEach((dist, id) => {
    if (dist > maxDistance) {
      maxDistance = dist
      endNodeId = id
    }
  })

  if (!endNodeId || maxDistance === 0) {
    return createEmptyCriticalPathResult()
  }

  // Backtrack to reconstruct the critical path
  const pathIds: string[] = []
  let current: string | null = endNodeId

  while (current !== null) {
    pathIds.unshift(current) // Add to front to maintain order
    current = predecessor.get(current) ?? null
  }

  // Build the result
  const criticalNodes: CriticalPathNode[] = []
  const nodeIdSet = new Set<string>()
  const edgeKeySet = new Set<string>()

  pathIds.forEach((id, index) => {
    const node = nodes.get(id)
    if (node && canBeOnCriticalPath(node)) {
      criticalNodes.push({
        id,
        title: node.title,
        type: node.type,
        status: node.status,
        distance: index,
      })
      nodeIdSet.add(id)

      // Add edge to next node in path
      if (index < pathIds.length - 1) {
        const nextId = pathIds[index + 1]
        // Edge from dependency (this node) to dependent (next node)
        edgeKeySet.add(createEdgeKey(id, nextId))
      }
    }
  })

  return {
    nodes: criticalNodes,
    nodeIds: nodeIdSet,
    edgeKeys: edgeKeySet,
    length: criticalNodes.length,
    hasPath: criticalNodes.length > 0,
  }
}

/**
 * Checks if a node is on the critical path
 *
 * @param nodeId - The node ID to check
 * @param criticalPath - The critical path result
 * @returns true if the node is on the critical path
 */
export function isOnCriticalPath(
  nodeId: string,
  criticalPath: CriticalPathResult
): boolean {
  return criticalPath.nodeIds.has(nodeId)
}

/**
 * Checks if an edge is on the critical path
 *
 * @param sourceId - The source node ID
 * @param targetId - The target node ID
 * @param criticalPath - The critical path result
 * @returns true if the edge is on the critical path
 */
export function isEdgeOnCriticalPath(
  sourceId: string,
  targetId: string,
  criticalPath: CriticalPathResult
): boolean {
  return criticalPath.edgeKeys.has(createEdgeKey(sourceId, targetId))
}

/**
 * Gets the position of a node on the critical path
 *
 * @param nodeId - The node ID to check
 * @param criticalPath - The critical path result
 * @returns The 0-indexed position, or -1 if not on path
 */
export function getCriticalPathPosition(
  nodeId: string,
  criticalPath: CriticalPathResult
): number {
  const node = criticalPath.nodes.find((n) => n.id === nodeId)
  return node?.distance ?? -1
}

/**
 * Gets all nodes that are NOT on the critical path but are incomplete
 *
 * @param nodes - Map of all nodes
 * @param criticalPath - The critical path result
 * @returns Array of node IDs that are incomplete but not on critical path
 */
export function getNonCriticalIncompleteNodes(
  nodes: Map<string, ForgeNode>,
  criticalPath: CriticalPathResult
): string[] {
  const result: string[] = []

  nodes.forEach((node, id) => {
    if (
      canBeOnCriticalPath(node) &&
      isIncompleteNode(node) &&
      !criticalPath.nodeIds.has(id)
    ) {
      result.push(id)
    }
  })

  return result
}

/**
 * Calculates slack time for nodes (how much they can be delayed without affecting critical path)
 * A node on the critical path has zero slack.
 *
 * @param nodes - Map of all nodes
 * @param criticalPath - The critical path result
 * @returns Map of node ID to slack value (0 for critical path nodes)
 */
export function calculateSlack(
  nodes: Map<string, ForgeNode>,
  criticalPath: CriticalPathResult
): Map<string, number> {
  const slack = new Map<string, number>()

  // Critical path nodes have zero slack
  criticalPath.nodeIds.forEach((id) => {
    slack.set(id, 0)
  })

  // For now, non-critical incomplete nodes get a slack of 1
  // A more sophisticated implementation would calculate actual slack based on paths
  nodes.forEach((node, id) => {
    if (
      canBeOnCriticalPath(node) &&
      isIncompleteNode(node) &&
      !criticalPath.nodeIds.has(id)
    ) {
      slack.set(id, 1) // Simplified: just mark as non-critical
    }
  })

  return slack
}
