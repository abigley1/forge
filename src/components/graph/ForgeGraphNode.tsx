/**
 * Custom graph node component for React Flow
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import type { GraphNodeData } from '@/lib/graph'
import { NodeType } from '@/types/nodes'
import {
  Lightbulb,
  Package,
  CheckSquare,
  FileText,
  AlertTriangle,
  Layers,
  Boxes,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'

/**
 * Node type to color mapping for graph nodes
 */
const NODE_TYPE_COLORS: Record<
  NodeType,
  { bg: string; border: string; text: string }
> = {
  [NodeType.Decision]: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-600 dark:text-blue-400',
  },
  [NodeType.Component]: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-600 dark:text-green-400',
  },
  [NodeType.Task]: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-600 dark:text-orange-400',
  },
  [NodeType.Note]: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
  },
  [NodeType.Subsystem]: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-600 dark:text-purple-400',
  },
  [NodeType.Assembly]: {
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-600 dark:text-cyan-400',
  },
  [NodeType.Module]: {
    bg: 'bg-rose-50 dark:bg-rose-950',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-600 dark:text-rose-400',
  },
}

/**
 * Node type to icon mapping
 */
const NODE_TYPE_ICONS: Record<NodeType, LucideIcon> = {
  [NodeType.Decision]: Lightbulb,
  [NodeType.Component]: Package,
  [NodeType.Task]: CheckSquare,
  [NodeType.Note]: FileText,
  [NodeType.Subsystem]: Layers,
  [NodeType.Assembly]: Boxes,
  [NodeType.Module]: LayoutGrid,
}

/**
 * Status badge colors
 */
const STATUS_COLORS: Record<string, string> = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  selected: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  considering:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  // Container statuses
  planning:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  on_hold: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

/**
 * Custom graph node component for Forge nodes
 */
function ForgeGraphNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  const colors = NODE_TYPE_COLORS[data.nodeType]
  const Icon = NODE_TYPE_ICONS[data.nodeType]
  const statusColor = data.status ? STATUS_COLORS[data.status] : undefined
  const isOnCriticalPath = data.isOnCriticalPath ?? false
  const isContainer = data.isContainer ?? false

  return (
    <>
      {/* Input handle for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          '!size-2',
          isOnCriticalPath ? '!bg-amber-500' : '!bg-gray-400 dark:!bg-gray-500'
        )}
      />

      <div
        data-container={isContainer ? 'true' : undefined}
        data-node-type={data.nodeType}
        className={cn(
          // Ensure 44x44px minimum touch target for accessibility (WCAG 2.1)
          'min-h-[44px] rounded-lg border-2 p-3 shadow-sm transition-shadow',
          // Container nodes are larger with different styling
          isContainer
            ? 'max-w-[240px] min-w-[180px] border-[3px] border-dashed'
            : 'max-w-[200px] min-w-[140px]',
          // Use amber styling when on critical path, otherwise use type colors
          isOnCriticalPath
            ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950'
            : cn(colors.bg, colors.border),
          selected &&
            'shadow-md ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
        )}
      >
        {/* Critical path indicator */}
        {isOnCriticalPath && (
          <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          </div>
        )}

        {/* Header with icon and type indicator */}
        <div className="mb-1 flex items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4 flex-shrink-0',
              isOnCriticalPath
                ? 'text-amber-600 dark:text-amber-400'
                : colors.text
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              'text-xs font-medium tracking-wide uppercase',
              isOnCriticalPath
                ? 'text-amber-600 dark:text-amber-400'
                : colors.text
            )}
          >
            {data.nodeType}
          </span>
          {isOnCriticalPath && data.criticalPathPosition !== undefined && (
            <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              #{data.criticalPathPosition + 1}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {data.label}
        </h3>

        {/* Status badge */}
        {data.status && statusColor && (
          <div className="mt-2">
            <span
              className={cn(
                'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor
              )}
            >
              {data.status.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Output handle for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          '!size-2',
          isOnCriticalPath ? '!bg-amber-500' : '!bg-gray-400 dark:!bg-gray-500'
        )}
      />
    </>
  )
}

/**
 * Memoized graph node component
 */
export const ForgeGraphNode = memo(ForgeGraphNodeComponent)
