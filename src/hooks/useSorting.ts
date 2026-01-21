/**
 * URL-synced Sorting State Hook
 *
 * Uses nuqs to persist sort state in the URL query string.
 */

import { useQueryState, parseAsString } from 'nuqs'
import { useCallback, useMemo } from 'react'

import {
  sortNodes as sortNodesUtil,
  DEFAULT_SORT,
  SORT_OPTIONS,
  type SortBy,
  type SortDirection,
  type SortConfig,
} from '@/lib/sorting'
import type { ForgeNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface UseSortingReturn {
  /** Current sort configuration */
  sortConfig: SortConfig
  /** Current sort criteria */
  sortBy: SortBy
  /** Current sort direction */
  direction: SortDirection
  /** Set sort criteria */
  setSortBy: (sortBy: SortBy) => void
  /** Set sort direction */
  setDirection: (direction: SortDirection) => void
  /** Toggle sort direction */
  toggleDirection: () => void
  /** Reset to default sort */
  resetSort: () => void
  /** Sort an array of nodes */
  sortNodes: (nodes: ForgeNode[]) => ForgeNode[]
  /** Available sort options */
  sortOptions: typeof SORT_OPTIONS
}

// ============================================================================
// Parsers
// ============================================================================

const sortByParser = parseAsString.withDefault(DEFAULT_SORT.sortBy)
const directionParser = parseAsString.withDefault(DEFAULT_SORT.direction)

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing URL-synced sorting state
 */
export function useSorting(): UseSortingReturn {
  const [sortByRaw, setSortByState] = useQueryState('sort', sortByParser)
  const [directionRaw, setDirectionState] = useQueryState(
    'dir',
    directionParser
  )

  // Validate and cast to correct types
  const sortBy = useMemo((): SortBy => {
    const validSortBy = SORT_OPTIONS.find((opt) => opt.value === sortByRaw)
    return validSortBy ? (sortByRaw as SortBy) : DEFAULT_SORT.sortBy
  }, [sortByRaw])

  const direction = useMemo((): SortDirection => {
    if (directionRaw === 'asc' || directionRaw === 'desc') {
      return directionRaw
    }
    return DEFAULT_SORT.direction
  }, [directionRaw])

  // Sort config object
  const sortConfig: SortConfig = useMemo(
    () => ({ sortBy, direction }),
    [sortBy, direction]
  )

  // Actions
  const setSortBy = useCallback(
    (newSortBy: SortBy) => {
      // Clear from URL if default, otherwise set
      if (newSortBy === DEFAULT_SORT.sortBy) {
        void setSortByState(null)
      } else {
        void setSortByState(newSortBy)
      }
    },
    [setSortByState]
  )

  const setDirection = useCallback(
    (newDirection: SortDirection) => {
      // Clear from URL if default, otherwise set
      if (newDirection === DEFAULT_SORT.direction) {
        void setDirectionState(null)
      } else {
        void setDirectionState(newDirection)
      }
    },
    [setDirectionState]
  )

  const toggleDirection = useCallback(() => {
    setDirection(direction === 'asc' ? 'desc' : 'asc')
  }, [direction, setDirection])

  const resetSort = useCallback(() => {
    void setSortByState(null)
    void setDirectionState(null)
  }, [setSortByState, setDirectionState])

  // Sort nodes function
  const sortNodes = useCallback(
    (nodes: ForgeNode[]): ForgeNode[] => {
      return sortNodesUtil(nodes, sortBy, direction)
    },
    [sortBy, direction]
  )

  return {
    sortConfig,
    sortBy,
    direction,
    setSortBy,
    setDirection,
    toggleDirection,
    resetSort,
    sortNodes,
    sortOptions: SORT_OPTIONS,
  }
}
