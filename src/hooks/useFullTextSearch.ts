/**
 * Hook for full-text search across nodes
 *
 * Manages the MiniSearch index and provides search functionality
 * with automatic index updates when nodes change.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MiniSearch from 'minisearch'
import { useNodesStore } from '@/store/useNodesStore'
import {
  type FullTextSearchResult,
  type SearchDocument,
  type SearchOptions,
  type SnippetOptions,
  buildSearchIndex,
  searchNodes,
  addNodeToIndex,
  removeNodeFromIndex,
  updateNodeInIndex,
  highlightSnippet,
  type HighlightSegment,
  type ContextSnippet,
} from '@/lib/fullTextSearch'
import type { ForgeNode, NodeType } from '@/types/nodes'

export interface UseFullTextSearchOptions {
  /** Debounce delay for search in ms (default: 150) */
  debounceMs?: number
  /** Default search options */
  searchOptions?: SearchOptions
  /** Default snippet options */
  snippetOptions?: SnippetOptions
}

export interface UseFullTextSearchResult {
  /** Search function - call with query string */
  search: (query: string, options?: SearchOptions) => void
  /** Current search results */
  results: FullTextSearchResult[]
  /** Current search query */
  query: string
  /** Whether search is in progress */
  isSearching: boolean
  /** Clear search results and query */
  clearSearch: () => void
  /** Rebuild the entire index */
  rebuildIndex: () => void
  /** Whether the index is ready */
  isIndexReady: boolean
  /** Highlight a snippet for rendering */
  highlightSnippet: (snippet: ContextSnippet) => HighlightSegment[]
}

const DEFAULT_OPTIONS: Required<UseFullTextSearchOptions> = {
  debounceMs: 150,
  searchOptions: {},
  snippetOptions: {},
}

/**
 * Hook for full-text search across nodes
 *
 * Automatically builds and maintains a search index that stays in sync
 * with the nodes store. Provides debounced search with highlighted results.
 *
 * @example
 * ```tsx
 * const { search, results, query, isSearching, clearSearch } = useFullTextSearch()
 *
 * // Search when input changes
 * const handleChange = (e) => search(e.target.value)
 *
 * // Render results
 * results.map(result => (
 *   <div key={result.id}>
 *     <strong>{result.title}</strong>
 *     {result.snippets.map((snippet, i) => (
 *       <p key={i}>
 *         {highlightSnippet(snippet).map((seg, j) => (
 *           <span key={j} className={seg.isHighlight ? 'bg-yellow-200' : ''}>
 *             {seg.text}
 *           </span>
 *         ))}
 *       </p>
 *     ))}
 *   </div>
 * ))
 * ```
 */
export function useFullTextSearch(
  options: UseFullTextSearchOptions = {}
): UseFullTextSearchResult {
  const {
    debounceMs,
    searchOptions: defaultSearchOptions,
    snippetOptions,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  // Get nodes from store
  const nodes = useNodesStore((state) => state.nodes)

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FullTextSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Track if index has been built (for incremental updates to know when to start)
  const [isIndexReady, setIsIndexReady] = useState(false)

  // Refs for mutable state that shouldn't trigger re-renders
  const indexRef = useRef<MiniSearch<SearchDocument> | null>(null)
  const prevNodesRef = useRef<Map<string, ForgeNode>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build initial index on mount
  useEffect(() => {
    try {
      const index = buildSearchIndex(nodes)
      indexRef.current = index
      prevNodesRef.current = new Map(nodes)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial setup only runs once
      setIsIndexReady(true)
    } catch (error) {
      console.error('Failed to build search index:', error)
      // Set as ready but with empty index to allow graceful degradation
      indexRef.current = null
      setIsIndexReady(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Only run on mount

  // Update index incrementally when nodes change
  useEffect(() => {
    const index = indexRef.current
    if (!index || !isIndexReady) return

    const prevNodes = prevNodesRef.current
    const currentIds = new Set(nodes.keys())
    const prevIds = new Set(prevNodes.keys())

    let hasChanges = false

    // Find added nodes
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        const node = nodes.get(id)
        if (node) {
          try {
            addNodeToIndex(index, node)
            hasChanges = true
          } catch (error) {
            console.error(`Failed to add node ${id} to search index:`, error)
          }
        }
      }
    }

    // Find removed nodes
    for (const id of prevIds) {
      if (!currentIds.has(id)) {
        try {
          removeNodeFromIndex(index, id)
          hasChanges = true
        } catch (error) {
          console.error(`Failed to remove node ${id} from search index:`, error)
        }
      }
    }

    // Find updated nodes
    for (const id of currentIds) {
      if (prevIds.has(id)) {
        const currentNode = nodes.get(id)
        const prevNode = prevNodes.get(id)
        if (
          currentNode &&
          prevNode &&
          (currentNode.title !== prevNode.title ||
            currentNode.content !== prevNode.content ||
            currentNode.tags.join(',') !== prevNode.tags.join(','))
        ) {
          try {
            updateNodeInIndex(index, currentNode)
            hasChanges = true
          } catch (error) {
            console.error(`Failed to update node ${id} in search index:`, error)
          }
        }
      }
    }

    // Update previous nodes reference
    prevNodesRef.current = new Map(nodes)

    // Re-run search if there's an active query and changes occurred
    if (hasChanges && index.documentCount > 0 && query.trim()) {
      const newResults = searchNodes(
        index,
        query,
        nodes,
        defaultSearchOptions,
        snippetOptions
      )
      setResults(newResults)
    }
  }, [nodes, isIndexReady, query, defaultSearchOptions, snippetOptions])

  // Debounced search function
  const search = useCallback(
    (newQuery: string, searchOpts?: SearchOptions) => {
      setQuery(newQuery)

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (!newQuery.trim()) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      // Debounce the actual search
      debounceTimerRef.current = setTimeout(() => {
        if (!indexRef.current) {
          setIsSearching(false)
          return
        }

        const mergedOptions = { ...defaultSearchOptions, ...searchOpts }
        const searchResults = searchNodes(
          indexRef.current,
          newQuery,
          nodes,
          mergedOptions,
          snippetOptions
        )

        setResults(searchResults)
        setIsSearching(false)
      }, debounceMs)
    },
    [nodes, debounceMs, defaultSearchOptions, snippetOptions]
  )

  // Clear search
  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setQuery('')
    setResults([])
    setIsSearching(false)
  }, [])

  // Rebuild entire index (useful after bulk operations)
  const rebuildIndex = useCallback(() => {
    indexRef.current = buildSearchIndex(nodes)
    prevNodesRef.current = new Map(nodes)

    // Re-run search if there's an active query
    if (query.trim() && indexRef.current) {
      const newResults = searchNodes(
        indexRef.current,
        query,
        nodes,
        defaultSearchOptions,
        snippetOptions
      )
      setResults(newResults)
    }
  }, [nodes, query, defaultSearchOptions, snippetOptions])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    search,
    results,
    query,
    isSearching,
    clearSearch,
    rebuildIndex,
    isIndexReady,
    highlightSnippet,
  }
}

/**
 * Hook for filtering search results by node type
 */
export function useFilteredSearchResults(
  results: FullTextSearchResult[],
  filterTypes?: NodeType[]
): FullTextSearchResult[] {
  return useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) {
      return results
    }
    return results.filter((r) => filterTypes.includes(r.type))
  }, [results, filterTypes])
}
