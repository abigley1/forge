/**
 * Outline View Utilities
 *
 * Functions for grouping and organizing nodes for the outline view.
 */

import { NodeType } from '@/types/nodes'
import type { ForgeNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

/**
 * A group of nodes organized by type
 */
export interface NodeGroup {
  type: NodeType
  label: string
  nodes: ForgeNode[]
}

/**
 * Order of node types in the outline
 */
export const NODE_TYPE_ORDER: NodeType[] = [
  NodeType.Task,
  NodeType.Decision,
  NodeType.Component,
  NodeType.Note,
]

/**
 * Labels for each node type
 */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.Task]: 'Tasks',
  [NodeType.Decision]: 'Decisions',
  [NodeType.Component]: 'Components',
  [NodeType.Note]: 'Notes',
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Groups nodes by their type, returning groups in a consistent order.
 * Empty groups are included to maintain consistent structure.
 *
 * @param nodes - Map or array of nodes to group
 * @param includeEmpty - Whether to include groups with no nodes (default: true)
 * @returns Array of node groups ordered by NODE_TYPE_ORDER
 *
 * @example
 * const groups = groupNodesByType(nodesMap)
 * // Returns: [
 * //   { type: 'task', label: 'Tasks', nodes: [...] },
 * //   { type: 'decision', label: 'Decisions', nodes: [...] },
 * //   { type: 'component', label: 'Components', nodes: [...] },
 * //   { type: 'note', label: 'Notes', nodes: [...] },
 * // ]
 */
export function groupNodesByType(
  nodes: Map<string, ForgeNode> | ForgeNode[],
  includeEmpty = true
): NodeGroup[] {
  // Convert Map to array if needed
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes

  // Create a map of nodes by type
  const nodesByType = new Map<NodeType, ForgeNode[]>()

  // Initialize all types to empty arrays
  for (const type of NODE_TYPE_ORDER) {
    nodesByType.set(type, [])
  }

  // Group nodes by type
  for (const node of nodeArray) {
    const typeNodes = nodesByType.get(node.type)
    if (typeNodes) {
      typeNodes.push(node)
    }
  }

  // Build result in order
  const groups: NodeGroup[] = []

  for (const type of NODE_TYPE_ORDER) {
    const nodes = nodesByType.get(type) || []

    if (includeEmpty || nodes.length > 0) {
      groups.push({
        type,
        label: NODE_TYPE_LABELS[type],
        nodes,
      })
    }
  }

  return groups
}

/**
 * Gets the count of nodes for each type.
 *
 * @param nodes - Map or array of nodes
 * @returns Record mapping node type to count
 */
export function getNodeCountsByType(
  nodes: Map<string, ForgeNode> | ForgeNode[]
): Record<NodeType, number> {
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes

  const counts: Record<NodeType, number> = {
    [NodeType.Task]: 0,
    [NodeType.Decision]: 0,
    [NodeType.Component]: 0,
    [NodeType.Note]: 0,
  }

  for (const node of nodeArray) {
    counts[node.type]++
  }

  return counts
}

/**
 * Storage key for persisted collapse state
 */
export const COLLAPSE_STATE_STORAGE_KEY = 'forge-outline-collapse-state'

/**
 * Type for collapse state - maps node type to collapsed boolean
 */
export type CollapseState = Partial<Record<NodeType, boolean>>

/**
 * Gets the collapse state from localStorage.
 *
 * @returns Persisted collapse state or empty object
 */
export function getPersistedCollapseState(): CollapseState {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(COLLAPSE_STATE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as CollapseState
      }
    }
  } catch {
    // Invalid JSON or storage error, return empty
  }

  return {}
}

/**
 * Persists collapse state to localStorage.
 *
 * @param state - Collapse state to persist
 */
export function persistCollapseState(state: CollapseState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(COLLAPSE_STATE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked, ignore silently
  }
}
