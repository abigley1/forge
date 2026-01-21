/**
 * Hook for Wiki-Link Autocomplete
 *
 * Integrates the wiki-link autocomplete feature with the nodes store,
 * providing node suggestions and accessibility announcements.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNodesStore } from '@/store'
import { nodeToSuggestion, type NodeSuggestion } from '@/components/editor'

/**
 * Return type for the useWikiLinkAutocomplete hook
 */
export interface UseWikiLinkAutocompleteReturn {
  /** Node suggestions for autocomplete */
  nodes: NodeSuggestion[]
  /** Callback when a link is inserted */
  onLinkInserted: (nodeId: string, nodeTitle: string) => void
  /** Callback for autocomplete navigation (updates aria-live) */
  onAutocompleteNavigate: (
    suggestion: NodeSuggestion | null,
    totalCount: number
  ) => void
  /** Callback when result count changes (updates aria-live) */
  onAutocompleteResultCountChange: (count: number) => void
  /** Current announcement for aria-live region */
  announcement: string
  /** ID of the last inserted link (useful for tracking) */
  lastInsertedLinkId: string | null
}

/**
 * Options for the useWikiLinkAutocomplete hook
 */
export interface UseWikiLinkAutocompleteOptions {
  /** Callback when a link is inserted (in addition to internal tracking) */
  onLinkInserted?: (nodeId: string, nodeTitle: string) => void
  /** ID of the current node being edited (to exclude from suggestions) */
  currentNodeId?: string
}

/**
 * Hook to integrate wiki-link autocomplete with the nodes store
 *
 * Provides:
 * - Node suggestions from the store
 * - Accessibility announcements for screen readers
 * - Link insertion tracking
 *
 * @example
 * ```tsx
 * function NodeEditor({ nodeId }: { nodeId: string }) {
 *   const {
 *     nodes,
 *     onLinkInserted,
 *     onAutocompleteNavigate,
 *     onAutocompleteResultCountChange,
 *     announcement,
 *   } = useWikiLinkAutocomplete({ currentNodeId: nodeId })
 *
 *   return (
 *     <>
 *       <MarkdownEditor
 *         value={content}
 *         onChange={setContent}
 *         enableWikiLinks
 *         nodes={nodes}
 *         onLinkInserted={onLinkInserted}
 *         onAutocompleteNavigate={onAutocompleteNavigate}
 *         onAutocompleteResultCountChange={onAutocompleteResultCountChange}
 *       />
 *       <WikiLinkAnnouncer announcement={announcement} />
 *     </>
 *   )
 * }
 * ```
 */
export function useWikiLinkAutocomplete(
  options: UseWikiLinkAutocompleteOptions = {}
): UseWikiLinkAutocompleteReturn {
  const { onLinkInserted: externalOnLinkInserted, currentNodeId } = options

  // Get nodes from store
  const allNodes = useNodesStore((state) => state.nodes)

  // Convert to suggestions, excluding current node
  const nodes = useMemo(() => {
    const suggestions: NodeSuggestion[] = []
    for (const node of allNodes.values()) {
      // Exclude the current node from suggestions (can't link to self)
      if (currentNodeId && node.id === currentNodeId) continue
      suggestions.push(nodeToSuggestion(node))
    }
    return suggestions
  }, [allNodes, currentNodeId])

  // Track announcements for aria-live
  const [announcement, setAnnouncement] = useState('')
  const [lastInsertedLinkId, setLastInsertedLinkId] = useState<string | null>(
    null
  )

  // Handle link insertion
  const onLinkInserted = useCallback(
    (nodeId: string, nodeTitle: string) => {
      setLastInsertedLinkId(nodeId)
      setAnnouncement(`Link inserted to ${nodeTitle}`)

      // Clear announcement after a delay so it can be re-announced if needed
      setTimeout(() => setAnnouncement(''), 1000)

      // Call external callback if provided
      externalOnLinkInserted?.(nodeId, nodeTitle)
    },
    [externalOnLinkInserted]
  )

  // Handle autocomplete navigation
  const onAutocompleteNavigate = useCallback(
    (suggestion: NodeSuggestion | null, totalCount: number) => {
      if (suggestion) {
        setAnnouncement(
          `${suggestion.title}, ${suggestion.type}, ${totalCount} results`
        )
      } else if (totalCount > 0) {
        setAnnouncement(`${totalCount} suggestions available`)
      }
    },
    []
  )

  // Handle result count changes
  const onAutocompleteResultCountChange = useCallback((count: number) => {
    if (count === 0) {
      setAnnouncement('No matching nodes found')
    } else {
      setAnnouncement(
        `${count} ${count === 1 ? 'suggestion' : 'suggestions'} available`
      )
    }
  }, [])

  return {
    nodes,
    onLinkInserted,
    onAutocompleteNavigate,
    onAutocompleteResultCountChange,
    announcement,
    lastInsertedLinkId,
  }
}
