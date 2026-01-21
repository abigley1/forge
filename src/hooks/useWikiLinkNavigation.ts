/**
 * useWikiLinkNavigation Hook
 *
 * Provides wiki-link navigation and preview functionality for the editor.
 * Integrates with the nodes store, navigation, and create dialog.
 *
 * @module useWikiLinkNavigation
 */

import { useState, useCallback, useMemo } from 'react'
import { useNodesStore } from '@/store'
import { useNodeNavigation } from './useNodeNavigation'
import { resolveLinkTarget } from '@/lib/links'
import {
  createContentPreview,
  type LinkInfo,
  type ResolvedLink,
  type WikiLinkDecorationOptions,
} from '@/components/editor/wikiLinkDecorations'

// ============================================================================
// Types
// ============================================================================

export interface WikiLinkNavigationState {
  /** Whether the preview tooltip is visible */
  previewVisible: boolean
  /** Current link info for the preview */
  previewLinkInfo: LinkInfo | null
  /** Anchor rectangle for positioning the preview */
  previewAnchorRect: DOMRect | null
  /** Title for creating a new node (from broken link) */
  createNodeTitle: string | null
  /** Whether the create node dialog should be shown */
  showCreateDialog: boolean
}

export interface UseWikiLinkNavigationOptions {
  /**
   * Current node ID (to exclude from navigation to self)
   */
  currentNodeId?: string
  /**
   * Callback when create node dialog should open
   */
  onCreateNode?: (title: string) => void
}

export interface UseWikiLinkNavigationReturn {
  /** Current state */
  state: WikiLinkNavigationState
  /** Options for createWikiLinkDecorations */
  decorationOptions: WikiLinkDecorationOptions
  /** Handler to dismiss the preview */
  dismissPreview: () => void
  /** Handler when a resolved link is clicked in preview */
  handleNavigate: (linkInfo: ResolvedLink) => void
  /** Handler when create button is clicked in preview */
  handleCreate: (target: string) => void
  /** Clear the create node state */
  clearCreateNodeState: () => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing wiki-link navigation and preview state
 *
 * Features:
 * - Resolves wiki-links to node info
 * - Manages preview tooltip visibility and content
 * - Handles Cmd/Ctrl+Click navigation
 * - Provides "Create Linked Node" action for broken links
 *
 * @param options - Configuration options
 * @returns Navigation state and handlers
 *
 * @example
 * ```tsx
 * const { state, decorationOptions, dismissPreview } = useWikiLinkNavigation({
 *   currentNodeId: activeNodeId,
 *   onCreateNode: (title) => {
 *     setDefaultTitle(title)
 *     setCreateDialogOpen(true)
 *   },
 * })
 *
 * // In MarkdownEditor
 * const extensions = useMemo(() => [
 *   ...createWikiLinkDecorations(decorationOptions),
 * ], [decorationOptions])
 *
 * // Render preview
 * <WikiLinkPreview
 *   linkInfo={state.previewLinkInfo}
 *   anchorRect={state.previewAnchorRect}
 *   isVisible={state.previewVisible}
 *   onDismiss={dismissPreview}
 *   onNavigate={handleNavigate}
 *   onCreate={handleCreate}
 * />
 * ```
 */
export function useWikiLinkNavigation(
  options: UseWikiLinkNavigationOptions = {}
): UseWikiLinkNavigationReturn {
  const { currentNodeId, onCreateNode } = options

  // Get nodes from store
  const nodes = useNodesStore((state) => state.nodes)

  // Get navigation function
  const { navigateToNode } = useNodeNavigation()

  // Preview state
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewLinkInfo, setPreviewLinkInfo] = useState<LinkInfo | null>(null)
  const [previewAnchorRect, setPreviewAnchorRect] = useState<DOMRect | null>(
    null
  )

  // Create node state
  const [createNodeTitle, setCreateNodeTitle] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Resolve a link target to LinkInfo
  const resolveLink = useCallback(
    (target: string): LinkInfo | null => {
      const nodeId = resolveLinkTarget(target, nodes)

      if (nodeId) {
        const node = nodes.get(nodeId)
        if (node) {
          return {
            id: node.id,
            title: node.title,
            type: node.type,
            contentPreview: createContentPreview(node.content),
            exists: true,
          }
        }
      }

      // Broken link
      return {
        target,
        exists: false,
      }
    },
    [nodes]
  )

  // Handle link click (Cmd/Ctrl+Click)
  const handleLinkClick = useCallback(
    (linkInfo: ResolvedLink) => {
      // Don't navigate to self
      if (currentNodeId && linkInfo.id === currentNodeId) {
        return
      }
      navigateToNode(linkInfo.id)
    },
    [currentNodeId, navigateToNode]
  )

  // Handle broken link click
  const handleBrokenLinkClick = useCallback(
    (target: string) => {
      setCreateNodeTitle(target)
      setShowCreateDialog(true)
      onCreateNode?.(target)
    },
    [onCreateNode]
  )

  // Handle link hover
  const handleLinkHover = useCallback((linkInfo: LinkInfo, rect: DOMRect) => {
    setPreviewLinkInfo(linkInfo)
    setPreviewAnchorRect(rect)
    setPreviewVisible(true)
  }, [])

  // Handle hover end
  const handleLinkHoverEnd = useCallback(() => {
    setPreviewVisible(false)
  }, [])

  // Dismiss preview
  const dismissPreview = useCallback(() => {
    setPreviewVisible(false)
    setPreviewLinkInfo(null)
    setPreviewAnchorRect(null)
  }, [])

  // Handle navigate from preview
  const handleNavigate = useCallback(
    (linkInfo: ResolvedLink) => {
      dismissPreview()
      handleLinkClick(linkInfo)
    },
    [dismissPreview, handleLinkClick]
  )

  // Handle create from preview
  const handleCreate = useCallback(
    (target: string) => {
      dismissPreview()
      handleBrokenLinkClick(target)
    },
    [dismissPreview, handleBrokenLinkClick]
  )

  // Clear create node state
  const clearCreateNodeState = useCallback(() => {
    setCreateNodeTitle(null)
    setShowCreateDialog(false)
  }, [])

  // Memoize decoration options for stable reference
  const decorationOptions = useMemo<WikiLinkDecorationOptions>(
    () => ({
      resolveLink,
      onLinkClick: handleLinkClick,
      onBrokenLinkClick: handleBrokenLinkClick,
      onLinkHover: handleLinkHover,
      onLinkHoverEnd: handleLinkHoverEnd,
    }),
    [
      resolveLink,
      handleLinkClick,
      handleBrokenLinkClick,
      handleLinkHover,
      handleLinkHoverEnd,
    ]
  )

  // Memoize state object
  const state = useMemo<WikiLinkNavigationState>(
    () => ({
      previewVisible,
      previewLinkInfo,
      previewAnchorRect,
      createNodeTitle,
      showCreateDialog,
    }),
    [
      previewVisible,
      previewLinkInfo,
      previewAnchorRect,
      createNodeTitle,
      showCreateDialog,
    ]
  )

  return {
    state,
    decorationOptions,
    dismissPreview,
    handleNavigate,
    handleCreate,
    clearCreateNodeState,
  }
}

export default useWikiLinkNavigation
