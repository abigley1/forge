import { useState, useCallback } from 'react'
import { useNodesStore, selectLinkIndex } from '@/store'
import type { ForgeNode, NodeType } from '@/types/nodes'
import { getIncomingLinks } from '@/lib/links'

export type ReferencingNodeInfo = {
  id: string
  title: string
  type: NodeType
  referenceCount: number
}

export type LinkRenamingState = {
  /** Whether the renaming dialog should be shown */
  isOpen: boolean
  /** The old title before renaming */
  oldTitle: string
  /** The new title after renaming */
  newTitle: string
  /** The ID of the renamed node */
  nodeId: string
  /** Nodes that reference the renamed node */
  referencingNodes: ReferencingNodeInfo[]
}

export type UseLinkRenamingOptions = {
  /** The current node being edited */
  node: ForgeNode | null
  /** Callback after references are updated */
  onReferencesUpdated?: (updatedCount: number) => void
}

export type UseLinkRenamingResult = {
  /** Current state of the renaming dialog */
  state: LinkRenamingState | null
  /** Check if title changed and open dialog if needed */
  checkTitleChange: (oldTitle: string, newTitle: string) => void
  /** Update all references to use the new title */
  updateAllReferences: () => Promise<number>
  /** Skip updating references */
  skipUpdate: () => void
  /** Close the dialog */
  closeDialog: () => void
  /** Whether an update is in progress */
  isUpdating: boolean
}

// ============================================================================
// Utility functions (defined before hook to avoid hoisting issues)
// ============================================================================

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Utility function to update references in a node's content.
 * Useful for batch operations outside the hook.
 */
export function updateWikiLinkReferences(
  content: string,
  oldTarget: string,
  newTarget: string
): string {
  const regex = new RegExp(`\\[\\[${escapeRegExp(oldTarget)}\\]\\]`, 'gi')
  return content.replace(regex, `[[${newTarget}]]`)
}

/**
 * Count the number of wiki-link references to a target in content.
 * Unlike extractWikiLinks, this counts all occurrences including duplicates.
 */
export function countWikiLinkReferences(
  content: string,
  target: string
): number {
  // Use regex to count all occurrences (including duplicates)
  const escapedTarget = escapeRegExp(target)
  const regex = new RegExp(`\\[\\[${escapedTarget}\\]\\]`, 'gi')
  const matches = content.match(regex)
  return matches ? matches.length : 0
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to handle wiki-link reference updates when a node is renamed.
 * Detects title changes and offers to update all [[wiki-links]] pointing
 * to the renamed node.
 *
 * Part of Sprint 4 Task 4.5: Link Validation
 */
export function useLinkRenaming({
  node,
  onReferencesUpdated,
}: UseLinkRenamingOptions): UseLinkRenamingResult {
  const [state, setState] = useState<LinkRenamingState | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Store refs
  const nodes = useNodesStore((s) => s.nodes)
  const linkIndex = useNodesStore(selectLinkIndex)
  const updateNode = useNodesStore((s) => s.updateNode)
  const markDirty = useNodesStore((s) => s.markDirty)

  /**
   * Check if the title changed and open the dialog if there are references
   */
  const checkTitleChange = useCallback(
    (oldTitle: string, newTitle: string) => {
      if (
        !node ||
        oldTitle === newTitle ||
        !oldTitle.trim() ||
        !newTitle.trim()
      ) {
        return
      }

      // Find nodes that link to the renamed node
      const incomingNodeIds = getIncomingLinks(linkIndex, node.id)

      if (incomingNodeIds.length === 0) {
        // No references to update
        return
      }

      // Build list of referencing nodes with reference counts
      const referencingNodes: ReferencingNodeInfo[] = []

      for (const refNodeId of incomingNodeIds) {
        const refNode = nodes.get(refNodeId)
        if (!refNode) continue

        // Count how many times this node references the renamed node
        // (counting all occurrences, including duplicates)
        const titleCount = countWikiLinkReferences(refNode.content, oldTitle)
        const idCount =
          node.id.toLowerCase() !== oldTitle.toLowerCase()
            ? countWikiLinkReferences(refNode.content, node.id)
            : 0
        const totalCount = titleCount + idCount

        if (totalCount > 0) {
          referencingNodes.push({
            id: refNode.id,
            title: refNode.title,
            type: refNode.type,
            referenceCount: totalCount,
          })
        }
      }

      if (referencingNodes.length > 0) {
        setState({
          isOpen: true,
          oldTitle,
          newTitle,
          nodeId: node.id,
          referencingNodes,
        })
      }
    },
    [node, linkIndex, nodes]
  )

  /**
   * Update all references to use the new title
   */
  const updateAllReferences = useCallback(async (): Promise<number> => {
    if (!state) return 0

    setIsUpdating(true)

    try {
      let updatedCount = 0
      const { oldTitle, newTitle, nodeId, referencingNodes } = state

      for (const refNode of referencingNodes) {
        const node = nodes.get(refNode.id)
        if (!node) continue

        // Replace both title-based and ID-based links
        let newContent = node.content

        // Replace [[oldTitle]] with [[newTitle]] (case-insensitive)
        const titleRegex = new RegExp(
          `\\[\\[${escapeRegExp(oldTitle)}\\]\\]`,
          'gi'
        )
        newContent = newContent.replace(titleRegex, `[[${newTitle}]]`)

        // Replace [[nodeId]] with [[newTitle]] if different
        if (nodeId.toLowerCase() !== oldTitle.toLowerCase()) {
          const idRegex = new RegExp(
            `\\[\\[${escapeRegExp(nodeId)}\\]\\]`,
            'gi'
          )
          newContent = newContent.replace(idRegex, `[[${newTitle}]]`)
        }

        if (newContent !== node.content) {
          updateNode(refNode.id, { content: newContent })
          markDirty(refNode.id)
          updatedCount++
        }
      }

      // Close dialog
      setState(null)
      setIsUpdating(false)

      // Notify callback
      onReferencesUpdated?.(updatedCount)

      return updatedCount
    } catch (error) {
      setIsUpdating(false)
      throw error
    }
  }, [state, nodes, updateNode, markDirty, onReferencesUpdated])

  /**
   * Skip updating references
   */
  const skipUpdate = useCallback(() => {
    setState(null)
  }, [])

  /**
   * Close the dialog
   */
  const closeDialog = useCallback(() => {
    setState(null)
  }, [])

  return {
    state,
    checkTitleChange,
    updateAllReferences,
    skipUpdate,
    closeDialog,
    isUpdating,
  }
}
