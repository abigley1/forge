/**
 * Sorting utilities for ForgeNode lists
 *
 * Provides stable sorting by various criteria with ascending/descending direction.
 */

import type { ForgeNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

/** Sort criteria options */
export type SortBy = 'type' | 'status' | 'modified' | 'title' | 'created'

/** Sort direction */
export type SortDirection = 'asc' | 'desc'

/** Sort configuration */
export interface SortConfig {
  sortBy: SortBy
  direction: SortDirection
}

/** Default sort configuration */
export const DEFAULT_SORT: SortConfig = {
  sortBy: 'modified',
  direction: 'desc',
}

/** Order for node types when sorting by type */
const NODE_TYPE_ORDER: Record<NodeType, number> = {
  [NodeType.Decision]: 0,
  [NodeType.Component]: 1,
  [NodeType.Task]: 2,
  [NodeType.Note]: 3,
  [NodeType.Subsystem]: 4,
  [NodeType.Assembly]: 5,
  [NodeType.Module]: 6,
}

/** Order for statuses when sorting by status (active first, completed/resolved last) */
const STATUS_ORDER: Record<string, number> = {
  // Task statuses - active first
  in_progress: 0,
  pending: 1,
  blocked: 2,
  complete: 3,
  // Decision/Component statuses
  considering: 4,
  selected: 5,
  rejected: 6,
  // Container statuses
  planning: 7,
  on_hold: 8,
}

/**
 * Get status from a node, or empty string if none
 */
function getNodeStatus(node: ForgeNode): string {
  return 'status' in node ? (node.status as string) : ''
}

/**
 * Get status sort order, defaulting to high number for unknown statuses
 */
function getStatusOrder(status: string): number {
  return status in STATUS_ORDER ? STATUS_ORDER[status] : 100
}

/**
 * Compare two values for sorting
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareValues<T>(a: T, b: T, direction: SortDirection): number {
  const multiplier = direction === 'asc' ? 1 : -1

  if (a < b) return -1 * multiplier
  if (a > b) return 1 * multiplier
  return 0
}

/**
 * Stable sort of nodes by the specified criteria
 *
 * Stable sort preserves the original order of equal elements.
 * This is achieved by using the original index as a tiebreaker.
 */
export function sortNodes(
  nodes: ForgeNode[],
  sortBy: SortBy,
  direction: SortDirection
): ForgeNode[] {
  // Create indexed array for stable sort
  const indexed = nodes.map((node, index) => ({ node, originalIndex: index }))

  indexed.sort((a, b) => {
    let result: number

    switch (sortBy) {
      case 'type':
        result = compareValues(
          NODE_TYPE_ORDER[a.node.type],
          NODE_TYPE_ORDER[b.node.type],
          direction
        )
        break

      case 'status': {
        const statusA = getNodeStatus(a.node)
        const statusB = getNodeStatus(b.node)
        result = compareValues(
          getStatusOrder(statusA),
          getStatusOrder(statusB),
          direction
        )
        break
      }

      case 'modified':
        result = compareValues(
          a.node.dates.modified.getTime(),
          b.node.dates.modified.getTime(),
          direction
        )
        break

      case 'created':
        result = compareValues(
          a.node.dates.created.getTime(),
          b.node.dates.created.getTime(),
          direction
        )
        break

      case 'title':
        result = compareValues(
          a.node.title.toLowerCase(),
          b.node.title.toLowerCase(),
          direction
        )
        break

      default:
        result = 0
    }

    // Stable sort: use original index as tiebreaker
    if (result === 0) {
      return a.originalIndex - b.originalIndex
    }

    return result
  })

  return indexed.map(({ node }) => node)
}

/** Sort option for UI display */
export interface SortOption {
  value: SortBy
  label: string
}

/** Available sort options for dropdown */
export const SORT_OPTIONS: SortOption[] = [
  { value: 'modified', label: 'Modified' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
]
