/**
 * DeleteNodeDialog Component
 *
 * Alert dialog for confirming node deletion.
 * Shows the node title, type, and warns about broken links.
 * Provides undo capability via toast after deletion.
 */

import { useMemo, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'

import { AlertDialog } from '@/components/ui/AlertDialog'
import { useToast } from '@/components/ui/Toast'
import { NodeTypeIcon } from './NodeTypeIcon'
import { NODE_TYPE_ICON_CONFIG } from './config'

import { useNodesStore } from '@/store/useNodesStore'
import { useUndoableDeleteNode } from '@/hooks/useUndoRedo'
import { extractWikiLinks } from '@/lib/frontmatter'
import type { ForgeNode } from '@/types/nodes'
import { isContainerNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface DeleteNodeDialogProps {
  /** The node to delete */
  node: ForgeNode | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback after successful deletion */
  onDeleted?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find all nodes that have wiki-links pointing to the given node ID.
 * These links would become broken after deletion.
 */
function findLinkingNodes(
  nodeId: string,
  allNodes: Map<string, ForgeNode>
): ForgeNode[] {
  const linkingNodes: ForgeNode[] = []

  allNodes.forEach((node) => {
    if (node.id === nodeId) return

    const links = extractWikiLinks(node.content)
    if (links.includes(nodeId)) {
      linkingNodes.push(node)
    }
  })

  return linkingNodes
}

// ============================================================================
// DeleteNodeDialog Component
// ============================================================================

export function DeleteNodeDialog({
  node,
  open,
  onOpenChange,
  onDeleted,
}: DeleteNodeDialogProps) {
  const nodes = useNodesStore((state) => state.nodes)
  const addNode = useNodesStore((state) => state.addNode)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)
  const getChildNodes = useNodesStore((state) => state.getChildNodes)
  const deleteNode = useUndoableDeleteNode()
  const { undo: showUndoToast, error: showError } = useToast()

  // Find nodes that link to this node (would have broken links after deletion)
  const linkingNodes = useMemo(() => {
    if (!node) return []
    return findLinkingNodes(node.id, nodes)
  }, [node, nodes])

  // Find child nodes that would become orphaned (for container nodes)
  const childNodes = useMemo(() => {
    if (!node || !isContainerNode(node)) return []
    return getChildNodes(node.id)
  }, [node, getChildNodes])

  const handleDelete = useCallback(() => {
    if (!node) return

    // Store node data for undo
    const deletedNode = node

    // Perform deletion - check for success
    const success = deleteNode(node.id)

    if (!success) {
      // Show error toast - don't close dialog so user knows it failed
      showError({
        title: 'Failed to delete node',
        description: `Could not delete "${node.title}". The node may have already been removed.`,
      })
      return
    }

    // Close the dialog
    onOpenChange(false)

    // Clear active node if it was the deleted one
    setActiveNode(null)

    // Show undo toast
    showUndoToast({
      title: `Deleted "${deletedNode.title}"`,
      description: 'Click undo to restore the node.',
      onUndo: () => {
        // Restore the node
        addNode(deletedNode)
        setActiveNode(deletedNode.id)
      },
    })

    // Call onDeleted callback
    onDeleted?.()
  }, [
    node,
    deleteNode,
    onOpenChange,
    setActiveNode,
    showUndoToast,
    showError,
    addNode,
    onDeleted,
  ])

  if (!node) return null

  const typeConfig = NODE_TYPE_ICON_CONFIG[node.type]
  const hasLinkingNodes = linkingNodes.length > 0
  const hasChildNodes = childNodes.length > 0

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
        >
          <AlertDialog.Title id="delete-dialog-title">
            Delete {typeConfig.label}?
          </AlertDialog.Title>

          <AlertDialog.Description>
            <div className="space-y-3">
              {/* Node being deleted */}
              <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <NodeTypeIcon type={node.type} size="md" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {node.title}
                </span>
              </div>

              {/* Orphaned children warning (for container nodes) */}
              {hasChildNodes && (
                <div
                  className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950"
                  role="alert"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-500"
                    aria-hidden="true"
                  />
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <p className="font-medium">
                      {childNodes.length}{' '}
                      {childNodes.length === 1
                        ? 'child node will become orphaned'
                        : 'child nodes will become orphaned'}
                      :
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {childNodes.slice(0, 3).map((childNode) => (
                        <li key={childNode.id} className="truncate">
                          {childNode.title}
                        </li>
                      ))}
                      {childNodes.length > 3 && (
                        <li>and {childNodes.length - 3} more...</li>
                      )}
                    </ul>
                    <p className="mt-2 text-xs">
                      These nodes will remain but lose their parent link.
                    </p>
                  </div>
                </div>
              )}

              {/* Broken links warning */}
              {hasLinkingNodes && (
                <div
                  className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
                  role="alert"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500"
                    aria-hidden="true"
                  />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">
                      This will break {linkingNodes.length}{' '}
                      {linkingNodes.length === 1 ? 'link' : 'links'}:
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {linkingNodes.slice(0, 3).map((linkingNode) => (
                        <li key={linkingNode.id} className="truncate">
                          {linkingNode.title}
                        </li>
                      ))}
                      {linkingNodes.length > 3 && (
                        <li>and {linkingNodes.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400">
                This action can be undone.
              </p>
            </div>
          </AlertDialog.Description>

          <AlertDialog.Footer>
            <AlertDialog.Close variant="cancel">Cancel</AlertDialog.Close>
            <AlertDialog.Close
              variant="destructive"
              onClick={handleDelete}
              aria-label={`Delete ${node.title}`}
            >
              Delete
            </AlertDialog.Close>
          </AlertDialog.Footer>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
