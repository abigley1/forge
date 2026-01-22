/**
 * Outline View Utilities
 *
 * Functions for grouping and organizing nodes for the outline view.
 */

import { NodeType, isTaskNode } from '@/types/nodes'
import type { ForgeNode, TaskNode } from '@/types/nodes'

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
  } catch (error) {
    // Log error for debugging - helps diagnose localStorage issues
    console.debug('[outline] Failed to read collapse state:', error)
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
  } catch (error) {
    // Log error - could be quota exceeded or storage blocked
    console.debug('[outline] Failed to persist collapse state:', error)
  }
}

// ============================================================================
// Milestone Grouping
// ============================================================================

/**
 * Progress information for a milestone
 */
export interface MilestoneProgress {
  /** Total number of tasks in the milestone */
  total: number
  /** Number of completed tasks */
  completed: number
  /** Number of in-progress tasks */
  inProgress: number
  /** Number of pending tasks */
  pending: number
  /** Number of blocked tasks */
  blocked: number
  /** Completion percentage (0-100) */
  percentage: number
}

/**
 * A group of tasks organized by milestone
 */
export interface MilestoneGroup {
  /** Milestone name (empty string for "No Milestone" group) */
  milestone: string
  /** Display label for the milestone */
  label: string
  /** Tasks in this milestone */
  tasks: TaskNode[]
  /** Progress information */
  progress: MilestoneProgress
}

/** Special key for tasks without a milestone */
export const NO_MILESTONE_KEY = ''

/** Display label for tasks without a milestone */
export const NO_MILESTONE_LABEL = 'No Milestone'

/**
 * Calculates progress for a group of tasks.
 *
 * @param tasks - Array of task nodes
 * @returns Progress information
 */
export function calculateMilestoneProgress(
  tasks: TaskNode[]
): MilestoneProgress {
  const total = tasks.length
  let completed = 0
  let inProgress = 0
  let pending = 0
  let blocked = 0

  for (const task of tasks) {
    switch (task.status) {
      case 'complete':
        completed++
        break
      case 'in_progress':
        inProgress++
        break
      case 'blocked':
        blocked++
        break
      case 'pending':
      default:
        pending++
        break
    }
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total,
    completed,
    inProgress,
    pending,
    blocked,
    percentage,
  }
}

/**
 * Groups task nodes by their milestone field.
 * Tasks without a milestone are grouped under "No Milestone".
 *
 * @param nodes - Map or array of nodes (non-task nodes are filtered out)
 * @param includeEmpty - Whether to include the "No Milestone" group if empty (default: false)
 * @returns Array of milestone groups, sorted alphabetically with "No Milestone" last
 *
 * @example
 * const groups = groupTasksByMilestone(nodesMap)
 * // Returns: [
 * //   { milestone: 'Sprint 1', label: 'Sprint 1', tasks: [...], progress: {...} },
 * //   { milestone: 'Sprint 2', label: 'Sprint 2', tasks: [...], progress: {...} },
 * //   { milestone: '', label: 'No Milestone', tasks: [...], progress: {...} },
 * // ]
 */
export function groupTasksByMilestone(
  nodes: Map<string, ForgeNode> | ForgeNode[],
  includeEmpty = false
): MilestoneGroup[] {
  // Convert Map to array if needed and filter to task nodes
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes
  const taskNodes = nodeArray.filter(isTaskNode)

  // Group tasks by milestone
  const tasksByMilestone = new Map<string, TaskNode[]>()

  for (const task of taskNodes) {
    const milestone = task.milestone || NO_MILESTONE_KEY
    const existing = tasksByMilestone.get(milestone)
    if (existing) {
      existing.push(task)
    } else {
      tasksByMilestone.set(milestone, [task])
    }
  }

  // Build groups array
  const groups: MilestoneGroup[] = []
  const milestones = Array.from(tasksByMilestone.keys())

  // Sort milestones alphabetically, keeping empty (No Milestone) last
  milestones.sort((a, b) => {
    if (a === NO_MILESTONE_KEY) return 1
    if (b === NO_MILESTONE_KEY) return -1
    return a.localeCompare(b)
  })

  for (const milestone of milestones) {
    const tasks = tasksByMilestone.get(milestone) || []

    // Skip empty "No Milestone" group unless includeEmpty
    if (milestone === NO_MILESTONE_KEY && tasks.length === 0 && !includeEmpty) {
      continue
    }

    groups.push({
      milestone,
      label: milestone || NO_MILESTONE_LABEL,
      tasks,
      progress: calculateMilestoneProgress(tasks),
    })
  }

  return groups
}

/**
 * Gets all unique milestones from nodes.
 *
 * @param nodes - Map or array of nodes
 * @returns Sorted array of unique milestone names
 */
export function getAllMilestones(
  nodes: Map<string, ForgeNode> | ForgeNode[]
): string[] {
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes
  const milestones = new Set<string>()

  for (const node of nodeArray) {
    if (isTaskNode(node) && node.milestone) {
      milestones.add(node.milestone)
    }
  }

  return Array.from(milestones).sort((a, b) => a.localeCompare(b))
}

/**
 * Storage key for milestone collapse state
 */
export const MILESTONE_COLLAPSE_STATE_STORAGE_KEY =
  'forge-milestone-collapse-state'

/**
 * Type for milestone collapse state - maps milestone name to collapsed boolean
 */
export type MilestoneCollapseState = Record<string, boolean>

/**
 * Gets the milestone collapse state from localStorage.
 *
 * @returns Persisted collapse state or empty object
 */
export function getPersistedMilestoneCollapseState(): MilestoneCollapseState {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(MILESTONE_COLLAPSE_STATE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as MilestoneCollapseState
      }
    }
  } catch (error) {
    // Log error for debugging - helps diagnose localStorage issues
    console.debug('[outline] Failed to read milestone collapse state:', error)
  }

  return {}
}

/**
 * Persists milestone collapse state to localStorage.
 *
 * @param state - Collapse state to persist
 */
export function persistMilestoneCollapseState(
  state: MilestoneCollapseState
): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      MILESTONE_COLLAPSE_STATE_STORAGE_KEY,
      JSON.stringify(state)
    )
  } catch (error) {
    // Log error - could be quota exceeded or storage blocked
    console.debug(
      '[outline] Failed to persist milestone collapse state:',
      error
    )
  }
}
