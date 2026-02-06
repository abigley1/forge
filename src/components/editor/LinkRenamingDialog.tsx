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
                'bg-forge-accent-subtle text-forge-accent dark:bg-forge-accent-subtle dark:text-forge-accent'
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
              'border-forge-border bg-forge-surface mt-4 rounded-md border p-3',
              'dark:border-forge-border-dark dark:bg-forge-surface-dark'
            )}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-forge-muted dark:text-forge-muted-dark font-mono">
                [[{oldTitle}]]
              </span>
              <ArrowRight
                className="text-forge-muted h-4 w-4"
                aria-hidden="true"
              />
              <span className="text-forge-text dark:text-forge-text-dark font-mono font-medium">
                [[{newTitle}]]
              </span>
            </div>
          </div>

          {/* Affected nodes list */}
          {referencingNodes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-2 flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase">
                <Link2 className="h-3 w-3" aria-hidden="true" />
                {totalReferences} reference{totalReferences === 1 ? '' : 's'} in{' '}
                {referencingNodes.length} node
                {referencingNodes.length === 1 ? '' : 's'}
              </h4>
              <ul
                className={cn(
                  'max-h-[150px] space-y-1 overflow-y-auto',
                  'border-forge-border bg-forge-paper rounded-md border p-2',
                  'dark:border-forge-border-dark dark:bg-forge-paper-dark'
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
                      <span className="text-forge-muted dark:text-forge-muted-dark text-xs">
                        ({node.referenceCount})
                      </span>
                    )}
                  </li>
                ))}
                {referencingNodes.length > 10 && (
                  <li className="text-forge-muted dark:text-forge-muted-dark px-2 py-1 text-xs">
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
                'border-forge-border bg-forge-surface text-forge-text border',
                'hover:bg-forge-surface',
                'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                'disabled:pointer-events-none disabled:opacity-50',
                'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
                'dark:hover:bg-forge-surface-dark'
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
                'bg-forge-accent text-white',
                'hover:bg-forge-accent-hover',
                'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
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
