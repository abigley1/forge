/**
 * Tag cluster component for grouping nodes by tag in the graph view
 * Implements Task 5.2: Node clustering by tag with expand/collapse
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { ChevronRight, Tag, FolderOpen } from 'lucide-react'
import type { ClusterNodeData } from '@/lib/graph'

/**
 * Props for the TagCluster component
 */
export interface TagClusterProps extends NodeProps<ClusterNodeData> {
  /** Callback when cluster expand/collapse is toggled */
  onToggle?: (tag: string, expanded: boolean) => void
}

/**
 * Tag cluster component that displays a collapsible group of nodes
 * sharing a common tag
 */
function TagClusterComponent({ data, selected }: TagClusterProps) {
  const { tag, nodeCount, expanded } = data

  return (
    <>
      {/* Input handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-gray-400 dark:!bg-gray-500"
      />

      <div
        className={cn(
          // Ensure 44x44px minimum touch target for accessibility (WCAG 2.1)
          'min-h-[44px] min-w-[120px] cursor-pointer rounded-lg border-2 p-3 shadow-sm transition-all',
          'bg-purple-50 dark:bg-purple-950',
          'border-purple-300 dark:border-purple-700',
          'hover:border-purple-400 hover:shadow-md dark:hover:border-purple-600',
          selected &&
            'shadow-md ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-900'
        )}
        role="button"
        aria-expanded={expanded}
        aria-label={`${tag} cluster with ${nodeCount} nodes, ${expanded ? 'expanded' : 'collapsed'}`}
        tabIndex={0}
      >
        {/* Header with cluster icon and expand indicator */}
        <div className="flex items-center gap-2">
          {expanded ? (
            <FolderOpen
              className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400"
              aria-hidden="true"
            />
          ) : (
            <Tag
              className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400"
              aria-hidden="true"
            />
          )}
          <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {tag}
          </span>
          <ChevronRight
            className={cn(
              'h-4 w-4 flex-shrink-0 text-purple-500 transition-transform dark:text-purple-400',
              expanded && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </div>

        {/* Node count badge */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
          </span>
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
              'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            )}
          >
            {nodeCount}
          </span>
        </div>
      </div>

      {/* Output handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-gray-400 dark:!bg-gray-500"
      />
    </>
  )
}

/**
 * Memoized tag cluster component
 */
export const TagCluster = memo(TagClusterComponent)
