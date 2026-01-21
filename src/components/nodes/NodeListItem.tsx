/**
 * NodeListItem Component
 *
 * Displays a single node in a list with type icon, title, and status badge.
 * Supports active state styling and keyboard interaction.
 */

import { forwardRef } from 'react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { isDecisionNode, isComponentNode, isTaskNode } from '@/types/nodes'
import { NodeTypeIcon } from './NodeTypeIcon'
import { StatusBadge } from './StatusBadge'
import type { NodeStatus } from './config'

// ============================================================================
// Types
// ============================================================================

interface NodeListItemProps {
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
 * Displays a node list item with icon, title, and status badge.
 * Active state is visually distinct with ring and background color.
 *
 * @example
 * <NodeListItem
 *   node={taskNode}
 *   isActive={activeNodeId === taskNode.id}
 *   onClick={() => setActiveNode(taskNode.id)}
 * />
 */
export const NodeListItem = forwardRef<HTMLButtonElement, NodeListItemProps>(
  function NodeListItem(
    { node, isActive = false, onClick, className, tabIndex = 0 },
    ref
  ) {
    const status = getNodeStatus(node)

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        tabIndex={tabIndex}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
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
              ],
          className
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
    )
  }
)
