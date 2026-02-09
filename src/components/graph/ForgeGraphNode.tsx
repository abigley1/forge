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
    bg: 'bg-forge-node-decision dark:bg-forge-node-decision-dark',
    border:
      'border-forge-node-decision-border dark:border-forge-node-decision-border-dark',
    text: 'text-forge-node-decision-text dark:text-forge-node-decision-text-dark',
  },
  [NodeType.Component]: {
    bg: 'bg-forge-node-component dark:bg-forge-node-component-dark',
    border:
      'border-forge-node-component-border dark:border-forge-node-component-border-dark',
    text: 'text-forge-node-component-text dark:text-forge-node-component-text-dark',
  },
  [NodeType.Task]: {
    bg: 'bg-forge-node-task dark:bg-forge-node-task-dark',
    border:
      'border-forge-node-task-border dark:border-forge-node-task-border-dark',
    text: 'text-forge-node-task-text dark:text-forge-node-task-text-dark',
  },
  [NodeType.Note]: {
    bg: 'bg-forge-node-note dark:bg-forge-node-note-dark',
    border:
      'border-forge-node-note-border dark:border-forge-node-note-border-dark',
    text: 'text-forge-node-note-text dark:text-forge-node-note-text-dark',
  },
  [NodeType.Subsystem]: {
    bg: 'bg-forge-node-subsystem dark:bg-forge-node-subsystem-dark',
    border:
      'border-forge-node-subsystem-border dark:border-forge-node-subsystem-border-dark',
    text: 'text-forge-node-subsystem-text dark:text-forge-node-subsystem-text-dark',
  },
  [NodeType.Assembly]: {
    bg: 'bg-forge-node-assembly dark:bg-forge-node-assembly-dark',
    border:
      'border-forge-node-assembly-border dark:border-forge-node-assembly-border-dark',
    text: 'text-forge-node-assembly-text dark:text-forge-node-assembly-text-dark',
  },
  [NodeType.Module]: {
    bg: 'bg-forge-node-module dark:bg-forge-node-module-dark',
    border:
      'border-forge-node-module-border dark:border-forge-node-module-border-dark',
    text: 'text-forge-node-module-text dark:text-forge-node-module-text-dark',
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
    'bg-forge-accent-subtle text-amber-800 dark:bg-forge-accent-subtle-dark dark:text-amber-200',
  in_progress:
    'bg-forge-accent-subtle text-amber-900 dark:bg-forge-accent-subtle-dark dark:text-amber-100',
  complete:
    'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  selected:
    'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark',
  considering:
    'bg-forge-accent-subtle text-amber-800 dark:bg-forge-accent-subtle-dark dark:text-amber-200',
  rejected:
    'bg-forge-surface text-forge-muted dark:bg-forge-surface-dark dark:text-forge-muted-dark',
  // Container statuses
  planning:
    'bg-forge-accent-subtle text-amber-800 dark:bg-forge-accent-subtle-dark dark:text-amber-200',
  on_hold:
    'bg-forge-surface text-forge-muted dark:bg-forge-surface-dark dark:text-forge-muted-dark',
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

  // Common handle styles
  const handleClass = cn(
    '!size-2',
    isOnCriticalPath
      ? '!bg-amber-500'
      : '!bg-forge-muted dark:!bg-forge-muted-dark'
  )

  return (
    <>
      {/* Target handles - where incoming edges connect */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleClass}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleClass}
      />

      <div
        data-container={isContainer ? 'true' : undefined}
        data-node-type={data.nodeType}
        className={cn(
          // Ensure 44x44px minimum touch target for accessibility (WCAG 2.1)
          'min-h-[44px] rounded-md border p-3 shadow-sm transition-shadow',
          // Container nodes are larger with different styling
          isContainer
            ? 'max-w-[240px] min-w-[180px] border-[3px] border-dashed'
            : 'max-w-[200px] min-w-[140px] border-l-[3px]',
          // Use amber styling when on critical path, otherwise use type colors
          isOnCriticalPath
            ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950'
            : cn(colors.bg, colors.border),
          selected &&
            'ring-forge-accent ring-offset-forge-paper dark:ring-offset-forge-paper-dark shadow-md ring-2 ring-offset-2'
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
              'font-mono text-[10px] font-semibold tracking-[0.12em] uppercase',
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
        <h3 className="text-forge-text dark:text-forge-text-dark truncate text-sm font-medium">
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

      {/* Source handles - where outgoing edges originate */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClass}
      />
    </>
  )
}

/**
 * Memoized graph node component
 */
export const ForgeGraphNode = memo(ForgeGraphNodeComponent)
