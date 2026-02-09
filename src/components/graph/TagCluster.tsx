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
        className="!bg-forge-muted dark:!bg-forge-muted-dark !size-2"
      />

      <div
        className={cn(
          // Ensure 44x44px minimum touch target for accessibility (WCAG 2.1)
          'min-h-[44px] min-w-[120px] cursor-pointer rounded-md border-2 p-3 shadow-sm transition-colors transition-shadow',
          'bg-forge-accent-subtle dark:bg-forge-accent-subtle-dark',
          'border-forge-node-subsystem-border dark:border-forge-node-subsystem-border-dark',
          'hover:border-forge-accent dark:hover:border-forge-accent-dark hover:shadow-md',
          selected &&
            'ring-forge-accent ring-offset-forge-paper dark:ring-offset-forge-paper-dark shadow-md ring-2 ring-offset-2'
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
              className="text-forge-accent dark:text-forge-accent-dark h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Tag
              className="text-forge-accent dark:text-forge-accent-dark h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="text-forge-text dark:text-forge-text-dark flex-1 truncate font-mono text-sm font-medium">
            {tag}
          </span>
          <ChevronRight
            className={cn(
              'text-forge-accent dark:text-forge-accent-dark h-4 w-4 flex-shrink-0 transition-transform',
              expanded && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </div>

        {/* Node count badge */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-forge-accent dark:text-forge-accent-dark font-mono text-xs">
            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
          </span>
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs font-medium',
              'bg-forge-accent-subtle dark:bg-forge-accent-subtle-dark text-amber-800 dark:text-amber-200'
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
        className="!bg-forge-muted dark:!bg-forge-muted-dark !size-2"
      />
    </>
  )
}

/**
 * Memoized tag cluster component
 */
export const TagCluster = memo(TagClusterComponent)
