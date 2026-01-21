import { Link2, ArrowRight, FileEdit } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from '@/components/nodes'
import type { NodeType } from '@/types/nodes'

export type ReferencingNodeInfo = {
  /** The ID of the node that references the renamed node */
  id: string
  /** The title of the referencing node */
  title: string
  /** The type of the referencing node */
  type: NodeType
  /** Number of references in this node */
  referenceCount: number
}

export type LinkRenamingDialogProps = {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** The old title of the renamed node */
  oldTitle: string
  /** The new title of the renamed node */
  newTitle: string
  /** Nodes that reference the renamed node */
  referencingNodes: ReferencingNodeInfo[]
  /** Callback when user chooses to update all references */
  onUpdateReferences: () => void
  /** Callback when user chooses to skip updating */
  onSkip: () => void
  /** Whether update is in progress */
  isUpdating?: boolean
}

/**
 * Dialog that appears when a node title changes, offering to update
 * all wiki-link references to the renamed node.
 *
 * Part of Sprint 4 Task 4.5: Link Validation
 */
export function LinkRenamingDialog({
  open,
  onOpenChange,
  oldTitle,
  newTitle,
  referencingNodes,
  onUpdateReferences,
  onSkip,
  isUpdating = false,
}: LinkRenamingDialogProps) {
  const totalReferences = referencingNodes.reduce(
    (sum, node) => sum + node.referenceCount,
    0
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="max-w-md">
          <div className="mb-4 flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
              )}
            >
              <FileEdit className="h-5 w-5" aria-hidden="true" />
            </div>
            <Dialog.Title>Update References?</Dialog.Title>
          </div>

          <Dialog.Description>
            You renamed a node. Would you like to update all wiki-links that
            reference it?
          </Dialog.Description>

          {/* Title change preview */}
          <div
            className={cn(
              'mt-4 rounded-md border border-gray-200 bg-gray-50 p-3',
              'dark:border-gray-700 dark:bg-gray-800'
            )}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-gray-500 dark:text-gray-400">
                [[{oldTitle}]]
              </span>
              <ArrowRight
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                [[{newTitle}]]
              </span>
            </div>
          </div>

          {/* Affected nodes list */}
          {referencingNodes.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                <Link2 className="h-3 w-3" aria-hidden="true" />
                {totalReferences} reference{totalReferences === 1 ? '' : 's'} in{' '}
                {referencingNodes.length} node
                {referencingNodes.length === 1 ? '' : 's'}
              </h4>
              <ul
                className={cn(
                  'max-h-[150px] space-y-1 overflow-y-auto',
                  'rounded-md border border-gray-200 bg-white p-2',
                  'dark:border-gray-700 dark:bg-gray-900'
                )}
              >
                {referencingNodes.slice(0, 10).map((node) => (
                  <li
                    key={node.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm"
                  >
                    <NodeTypeIcon type={node.type} size="sm" />
                    <span className="flex-1 truncate">{node.title}</span>
                    {node.referenceCount > 1 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({node.referenceCount})
                      </span>
                    )}
                  </li>
                ))}
                {referencingNodes.length > 10 && (
                  <li className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    and {referencingNodes.length - 10} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          <Dialog.Footer>
            <button
              type="button"
              onClick={onSkip}
              disabled={isUpdating}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-4 py-2',
                'border border-gray-300 bg-white text-gray-700',
                'hover:bg-gray-50',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                'disabled:pointer-events-none disabled:opacity-50',
                'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                'dark:hover:bg-gray-700'
              )}
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onUpdateReferences}
              disabled={isUpdating || referencingNodes.length === 0}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-4 py-2',
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              {isUpdating ? (
                <>
                  <span
                    className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  Updating...
                </>
              ) : (
                'Update All'
              )}
            </button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
