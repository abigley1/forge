/**
 * URL-synced Filter State Hook
 *
 * Uses nuqs to persist filter state in the URL query string.
 * Supports:
 * - Type filtering (multiple node types)
 * - Tag filtering (multiple tags with AND logic)
 * - Status filtering (multiple statuses)
 * - Text search with debounce
 */

import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs'
import { useCallback, useMemo } from 'react'

import { NodeType } from '@/types/nodes'
import type { ForgeNode } from '@/types/nodes'
import type { NodeStatus } from '@/components/nodes/config'

// ============================================================================
// Type Guards
// ============================================================================

const VALID_NODE_TYPES: ReadonlySet<string> = new Set(Object.values(NodeType))
const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'selected',
  'considering',
  'rejected',
  'in_progress',
  'blocked',
  'complete',
])

function isValidNodeType(value: string): value is NodeType {
  return VALID_NODE_TYPES.has(value)
}

function isValidStatus(value: string): value is NodeStatus {
  return VALID_STATUSES.has(value)
}

// ============================================================================
// Types
// ============================================================================

export interface FilterState {
  /** Selected node types (empty = show all) */
  types: NodeType[]
  /** Selected tags (AND logic - node must have ALL selected tags) */
  tags: string[]
  /** Selected statuses (empty = show all) */
  statuses: NodeStatus[]
  /** Search query */
  search: string
}

export interface UseFiltersReturn {
  /** Current filter state */
  filters: FilterState
  /** Set selected types */
  setTypes: (types: NodeType[]) => void
  /** Toggle a single type */
  toggleType: (type: NodeType) => void
  /** Set selected tags */
  setTags: (tags: string[]) => void
  /** Add a tag to the filter */
  addTag: (tag: string) => void
  /** Remove a tag from the filter */
  removeTag: (tag: string) => void
  /** Toggle a tag in the filter */
  toggleTag: (tag: string) => void
  /** Set selected statuses */
  setStatuses: (statuses: NodeStatus[]) => void
  /** Toggle a single status */
  toggleStatus: (status: NodeStatus) => void
  /** Set search query */
  setSearch: (search: string) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Check if any filters are active */
  hasActiveFilters: boolean
  /** Filter nodes based on current filters */
  filterNodes: (nodes: Map<string, ForgeNode>) => ForgeNode[]
  /** Count of active filters */
  activeFilterCount: number
}

// ============================================================================
// Parsers
// ============================================================================

const typesParser = parseAsArrayOf(parseAsString).withDefault([])
const tagsParser = parseAsArrayOf(parseAsString).withDefault([])
const statusesParser = parseAsArrayOf(parseAsString).withDefault([])
const searchParser = parseAsString.withDefault('')

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing URL-synced filter state
 */
export function useFilters(): UseFiltersReturn {
  // URL state
  const [types, setTypesState] = useQueryState('types', typesParser)
  const [tags, setTagsState] = useQueryState('tags', tagsParser)
  const [statuses, setStatusesState] = useQueryState('statuses', statusesParser)
  const [search, setSearchState] = useQueryState('q', searchParser)

  // Filter to only valid values (handles invalid URL params gracefully)
  const typedTypes = types.filter(isValidNodeType)
  const typedStatuses = statuses.filter(isValidStatus)

  // Filter state object
  const filters: FilterState = useMemo(
    () => ({
      types: typedTypes,
      tags,
      statuses: typedStatuses,
      search,
    }),
    [typedTypes, tags, typedStatuses, search]
  )

  // Type actions
  const setTypes = useCallback(
    (newTypes: NodeType[]) => {
      void setTypesState(newTypes.length > 0 ? newTypes : null)
    },
    [setTypesState]
  )

  const toggleType = useCallback(
    (type: NodeType) => {
      const newTypes = typedTypes.includes(type)
        ? typedTypes.filter((t) => t !== type)
        : [...typedTypes, type]
      void setTypesState(newTypes.length > 0 ? newTypes : null)
    },
    [typedTypes, setTypesState]
  )

  // Tag actions
  const setTags = useCallback(
    (newTags: string[]) => {
      void setTagsState(newTags.length > 0 ? newTags : null)
    },
    [setTagsState]
  )

  const addTag = useCallback(
    (tag: string) => {
      if (!tags.includes(tag)) {
        void setTagsState([...tags, tag])
      }
    },
    [tags, setTagsState]
  )

  const removeTag = useCallback(
    (tag: string) => {
      const newTags = tags.filter((t) => t !== tag)
      void setTagsState(newTags.length > 0 ? newTags : null)
    },
    [tags, setTagsState]
  )

  const toggleTag = useCallback(
    (tag: string) => {
      if (tags.includes(tag)) {
        removeTag(tag)
      } else {
        addTag(tag)
      }
    },
    [tags, addTag, removeTag]
  )

  // Status actions
  const setStatuses = useCallback(
    (newStatuses: NodeStatus[]) => {
      void setStatusesState(newStatuses.length > 0 ? newStatuses : null)
    },
    [setStatusesState]
  )

  const toggleStatus = useCallback(
    (status: NodeStatus) => {
      const newStatuses = typedStatuses.includes(status)
        ? typedStatuses.filter((s) => s !== status)
        : [...typedStatuses, status]
      void setStatusesState(newStatuses.length > 0 ? newStatuses : null)
    },
    [typedStatuses, setStatusesState]
  )

  // Search action
  const setSearch = useCallback(
    (newSearch: string) => {
      void setSearchState(newSearch || null)
    },
    [setSearchState]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    void setTypesState(null)
    void setTagsState(null)
    void setStatusesState(null)
    void setSearchState(null)
  }, [setTypesState, setTagsState, setStatusesState, setSearchState])

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () =>
      typedTypes.length > 0 ||
      tags.length > 0 ||
      typedStatuses.length > 0 ||
      search.length > 0,
    [typedTypes, tags, typedStatuses, search]
  )

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (typedTypes.length > 0) count += typedTypes.length
    if (tags.length > 0) count += tags.length
    if (typedStatuses.length > 0) count += typedStatuses.length
    if (search.length > 0) count += 1
    return count
  }, [typedTypes, tags, typedStatuses, search])

  // Filter nodes function
  const filterNodes = useCallback(
    (nodes: Map<string, ForgeNode>): ForgeNode[] => {
      const allNodes = Array.from(nodes.values())

      return allNodes.filter((node) => {
        // Type filter (OR logic - show if matches ANY selected type)
        if (typedTypes.length > 0 && !typedTypes.includes(node.type)) {
          return false
        }

        // Tag filter (AND logic - must have ALL selected tags)
        if (tags.length > 0) {
          const hasAllTags = tags.every((tag) => node.tags.includes(tag))
          if (!hasAllTags) return false
        }

        // Status filter (OR logic - show if matches ANY selected status)
        if (typedStatuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (
            !nodeStatus ||
            !typedStatuses.includes(nodeStatus as NodeStatus)
          ) {
            return false
          }
        }

        // Search filter (case-insensitive title match)
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) {
            return false
          }
        }

        return true
      })
    },
    [typedTypes, tags, typedStatuses, search]
  )

  return {
    filters,
    setTypes,
    toggleType,
    setTags,
    addTag,
    removeTag,
    toggleTag,
    setStatuses,
    toggleStatus,
    setSearch,
    clearFilters,
    hasActiveFilters,
    filterNodes,
    activeFilterCount,
  }
}
