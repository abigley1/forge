/**
 * SortableNodeListItem Component
 *
 * Wraps NodeListItem with drag-and-drop functionality using @dnd-kit/sortable.
 * Provides visual feedback during drag operations.
 */

import { forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { isDecisionNode, isComponentNode, isTaskNode } from '@/types/nodes'
import { NodeTypeIcon } from './NodeTypeIcon'
import { StatusBadge } from './StatusBadge'
import type { NodeStatus } from './config'

// ============================================================================
// Types
// ============================================================================

interface SortableNodeListItemProps {
  /** The node to display */
  node: ForgeNode
  /** Whether this node is currently active/selected */
  isActive?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Tab index for keyboard navigation */
  tabIndex?: number
  /** HTML id attribute - used for aria-activedescendant */
  id?: string
  /** Whether drag is disabled */
  disabled?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract status from a node (Note nodes don't have status)
 */
function getNodeStatus(node: ForgeNode): NodeStatus | null {
  if (isDecisionNode(node)) return node.status
  if (isComponentNode(node)) return node.status
  if (isTaskNode(node)) return node.status
  return null // Note nodes don't have status
}

// ============================================================================
// Component
// ============================================================================

/**
 * A sortable version of NodeListItem that can be dragged to reorder.
 * Uses @dnd-kit for drag and drop functionality.
 *
 * @example
 * <SortableNodeListItem
 *   node={taskNode}
 *   isActive={activeNodeId === taskNode.id}
 *   onClick={() => setActiveNode(taskNode.id)}
 * />
 */
export const SortableNodeListItem = forwardRef<
  HTMLDivElement,
  SortableNodeListItemProps
>(function SortableNodeListItem(
  { node, isActive = false, onClick, className, tabIndex = 0, id, disabled },
  ref
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled,
  })

  const status = getNodeStatus(node)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        // Forward ref if provided
        if (typeof ref === 'function') {
          ref(el)
        } else if (ref) {
          ref.current = el
        }
      }}
      style={style}
      className={cn(
        'flex items-center rounded-md',
        'transition-colors duration-150',
        isDragging && [
          'z-50 shadow-lg',
          'bg-white dark:bg-gray-900',
          'ring-2 ring-blue-500',
          'opacity-90',
        ],
        className
      )}
      data-testid={`sortable-node-${node.id}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={cn(
          'flex h-full cursor-grab items-center px-1',
          'text-gray-400 hover:text-gray-600',
          'dark:text-gray-500 dark:hover:text-gray-300',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset',
          'rounded-l-md',
          isDragging && 'cursor-grabbing',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-label={`Drag to reorder ${node.title}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Main clickable content */}
      <button
        id={id}
        type="button"
        onClick={onClick}
        tabIndex={tabIndex}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-r-md px-2 py-2 text-left',
          'transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
          isActive
            ? [
                'bg-gray-100 dark:bg-gray-800',
                'ring-2 ring-gray-900 ring-inset dark:ring-gray-100',
              ]
            : [
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                'focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500',
              ]
        )}
        aria-current={isActive ? 'true' : undefined}
      >
        {/* Node type icon */}
        <NodeTypeIcon type={node.type} size="md" />

        {/* Title - takes remaining space */}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium',
            'text-gray-900 dark:text-gray-100'
          )}
        >
          {node.title}
        </span>

        {/* Status badge (if node has status) */}
        {status && <StatusBadge status={status} size="sm" />}
      </button>
    </div>
  )
})
