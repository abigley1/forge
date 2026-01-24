/**
 * Dependency and Critical Path Utilities for Forge MCP Server
 */

import type { ForgeNode, TaskNode } from './types.js'
import { isTaskNode, isDecisionNode } from './types.js'

// ============================================================================
// Dependency Graph Types
// ============================================================================

export interface DependencyGraph {
  nodes: Set<string>
  edges: Map<string, Set<string>> // from -> to
}

// ============================================================================
// Dependency Graph Operations
// ============================================================================

/**
 * Build a dependency graph from task nodes
 */
export function buildDependencyGraph(
  nodes: Map<string, ForgeNode>
): DependencyGraph {
  const graph: DependencyGraph = {
    nodes: new Set(),
    edges: new Map(),
  }

  for (const [id, node] of nodes) {
    if (node.type !== 'task') continue

    graph.nodes.add(id)
    const task = node as TaskNode

    for (const depId of task.dependsOn) {
      if (!graph.edges.has(depId)) {
        graph.edges.set(depId, new Set())
      }
      graph.edges.get(depId)!.add(id)
    }
  }

  return graph
}

/**
 * Check if adding an edge would create a cycle using DFS
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  fromId: string,
  toId: string
): boolean {
  // Adding edge from -> to would create cycle if there's already a path from to -> from
  const visited = new Set<string>()
  const stack = [toId]

  while (stack.length > 0) {
    const current = stack.pop()!

    if (current === fromId) {
      return true // Found a path back to fromId
    }

    if (visited.has(current)) continue
    visited.add(current)

    const outgoing = graph.edges.get(current)
    if (outgoing) {
      for (const next of outgoing) {
        stack.push(next)
      }
    }
  }

  return false
}

/**
 * Get all nodes that are blocked by incomplete dependencies
 */
export function getBlockedTasks(nodes: Map<string, ForgeNode>): TaskNode[] {
  const blocked: TaskNode[] = []

  for (const node of nodes.values()) {
    if (node.type !== 'task') continue
    const task = node as TaskNode

    if (task.status === 'complete') continue

    // Check if any dependency is incomplete
    const isBlocked = task.dependsOn.some((depId) => {
      const dep = nodes.get(depId)
      if (!dep) return false
      if (isTaskNode(dep)) {
        return dep.status !== 'complete'
      }
      if (isDecisionNode(dep)) {
        return dep.status !== 'selected'
      }
      return false
    })

    if (isBlocked) {
      blocked.push(task)
    }
  }

  return blocked
}

/**
 * Get the critical path through incomplete tasks
 * Returns the longest chain of dependent incomplete tasks
 */
export function getCriticalPath(nodes: Map<string, ForgeNode>): TaskNode[] {
  const incompleteTasks = new Map<string, TaskNode>()

  // Collect incomplete tasks
  for (const [id, node] of nodes) {
    if (node.type === 'task' && (node as TaskNode).status !== 'complete') {
      incompleteTasks.set(id, node as TaskNode)
    }
  }

  if (incompleteTasks.size === 0) return []

  // Build adjacency list for incomplete tasks only
  const adj = new Map<string, string[]>()
  const indegree = new Map<string, number>()

  for (const id of incompleteTasks.keys()) {
    adj.set(id, [])
    indegree.set(id, 0)
  }

  for (const [id, incompleteTask] of incompleteTasks) {
    for (const depId of incompleteTask.dependsOn) {
      if (incompleteTasks.has(depId)) {
        adj.get(depId)!.push(id)
        indegree.set(id, (indegree.get(id) || 0) + 1)
      }
    }
  }

  // Find longest path using dynamic programming with topological sort
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()

  for (const id of incompleteTasks.keys()) {
    dist.set(id, 0)
    prev.set(id, null)
  }

  // Start with nodes that have no incomplete dependencies
  const queue: string[] = []
  for (const [id, deg] of indegree) {
    if (deg === 0) {
      queue.push(id)
      dist.set(id, 1) // Start at 1 (counts the node itself)
    }
  }

  // Process in topological order
  while (queue.length > 0) {
    const u = queue.shift()!
    const uDist = dist.get(u) || 0

    for (const v of adj.get(u) || []) {
      const newDist = uDist + 1
      if (newDist > (dist.get(v) || 0)) {
        dist.set(v, newDist)
        prev.set(v, u)
      }

      indegree.set(v, (indegree.get(v) || 0) - 1)
      if (indegree.get(v) === 0) {
        queue.push(v)
      }
    }
  }

  // Find the end of the longest path
  let maxDist = 0
  let endNode: string | null = null

  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d
      endNode = id
    }
  }

  if (!endNode) return []

  // Reconstruct the path
  const path: TaskNode[] = []
  let current: string | null = endNode

  while (current) {
    const task = incompleteTasks.get(current)
    if (task) {
      path.unshift(task)
    }
    current = prev.get(current) || null
  }

  return path
}

/**
 * Get nodes that would be unblocked if a task is completed
 */
export function getWouldUnblock(
  nodes: Map<string, ForgeNode>,
  taskId: string
): TaskNode[] {
  const wouldUnblock: TaskNode[] = []

  for (const node of nodes.values()) {
    if (node.type !== 'task') continue
    const task = node as TaskNode

    if (task.status === 'complete') continue
    if (!task.dependsOn.includes(taskId)) continue

    // Check if this task would be unblocked
    // (all other dependencies are complete)
    const otherDepsComplete = task.dependsOn.every((depId) => {
      if (depId === taskId) return true // This one will be complete
      const dep = nodes.get(depId)
      if (!dep) return true // Missing dep, ignore
      if (isTaskNode(dep)) {
        return dep.status === 'complete'
      }
      if (isDecisionNode(dep)) {
        return dep.status === 'selected'
      }
      return true
    })

    if (otherDepsComplete) {
      wouldUnblock.push(task)
    }
  }

  return wouldUnblock
}
