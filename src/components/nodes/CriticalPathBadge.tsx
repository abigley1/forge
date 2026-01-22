/**
 * CriticalPathBadge Component
 *
 * Displays a visual indicator when a node is on the critical path,
 * with a tooltip showing position and path information.
 */

import { AlertTriangle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { CriticalPathResult, CriticalPathNode } from '@/lib/criticalPath'
import { NodeTypeIcon } from './NodeTypeIcon'
import type { NodeType } from '@/types/nodes'

export interface CriticalPathBadgeProps {
  /** Whether the node is on the critical path */
  isOnCriticalPath: boolean
  /** Position in the critical path (0-indexed) */
  position?: number
  /** Total length of the critical path */
  pathLength?: number
  /** Full critical path result (optional, for showing path in tooltip) */
  criticalPath?: CriticalPathResult
  /** Callback when a path node is clicked (for navigation) */
  onPathNodeClick?: (nodeId: string) => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

const BADGE_SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1',
} as const

/**
 * Visual indicator showing a node is on the critical path
 */
export function CriticalPathBadge({
  isOnCriticalPath,
  position,
  pathLength,
  criticalPath,
  onPathNodeClick,
  size = 'md',
  className,
}: CriticalPathBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Handle click outside to close tooltip
  useEffect(() => {
    if (!showTooltip) return

    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTooltip])

  // Handle escape key
  useEffect(() => {
    if (!showTooltip) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowTooltip(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showTooltip])

  if (!isOnCriticalPath) {
    return null
  }

  const hasPathInfo = criticalPath && criticalPath.nodes.length > 0
  const positionLabel =
    position !== undefined && pathLength !== undefined
      ? `${position + 1} of ${pathLength}`
      : undefined

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md',
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          'hover:bg-amber-200 dark:hover:bg-amber-900/50',
          'focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none',
          'transition-colors',
          BADGE_SIZE_CLASSES[size]
        )}
        aria-label={
          positionLabel
            ? `Critical path step ${positionLabel}`
            : 'On critical path'
        }
        aria-expanded={showTooltip}
        aria-haspopup="true"
      >
        <AlertTriangle className={SIZE_CLASSES[size]} aria-hidden="true" />
        <span>Critical</span>
        {positionLabel && (
          <span className="font-semibold">({positionLabel})</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && hasPathInfo && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute top-full left-0 z-50 mt-1',
            'max-w-[320px] min-w-[220px]',
            'rounded-lg border border-gray-200 bg-white shadow-lg',
            'dark:border-gray-700 dark:bg-gray-800'
          )}
        >
          <div className="p-3">
            <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              Critical Path ({criticalPath.length} steps)
            </h4>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Delaying any step delays the project.
            </p>
            <ul className="space-y-1">
              {criticalPath.nodes.map((pathNode, index) => (
                <li key={pathNode.id}>
                  <CriticalPathNodeItem
                    node={pathNode}
                    index={index}
                    isCurrentNode={pathNode.distance === position}
                    onClick={
                      onPathNodeClick
                        ? () => {
                            onPathNodeClick(pathNode.id)
                            setShowTooltip(false)
                          }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

interface CriticalPathNodeItemProps {
  node: CriticalPathNode
  index: number
  isCurrentNode: boolean
  onClick?: () => void
}

function CriticalPathNodeItem({
  node,
  index,
  isCurrentNode,
  onClick,
}: CriticalPathNodeItemProps) {
  const isClickable = !!onClick && !isCurrentNode

  const content = (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
          isCurrentNode
            ? 'bg-amber-500 text-white'
            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        )}
      >
        {index + 1}
      </span>
      <NodeTypeIcon
        type={node.type as (typeof NodeType)[keyof typeof NodeType]}
        size="sm"
      />
      <span
        className={cn(
          'min-w-0 truncate text-sm',
          isCurrentNode
            ? 'font-medium text-amber-700 dark:text-amber-400'
            : 'text-gray-700 dark:text-gray-300'
        )}
      >
        {node.title}
      </span>
    </div>
  )

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Navigate to ${node.title}`}
        className={cn(
          'w-full rounded-md p-1.5 text-left',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none',
          'transition-colors'
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-md p-1.5',
        isCurrentNode && 'bg-amber-50 dark:bg-amber-900/20'
      )}
    >
      {content}
    </div>
  )
}

export default CriticalPathBadge
