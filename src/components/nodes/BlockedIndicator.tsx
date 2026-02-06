/**
 * BlockedIndicator Component
 *
 * Displays a visual indicator when a node is blocked by dependencies,
 * with a tooltip showing which nodes are blocking it.
 */

import { Ban, ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { BlockingNodeInfo } from '@/lib/blockedStatus'
import { NodeTypeIcon } from './NodeTypeIcon'
import type { NodeType } from '@/types/nodes'

export interface BlockedIndicatorProps {
  /** Whether the node is blocked */
  isBlocked: boolean
  /** Information about blocking nodes */
  blockingNodes: BlockingNodeInfo[]
  /** Callback when a blocking node is clicked (for navigation) */
  onBlockingNodeClick?: (nodeId: string) => void
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
 * Visual indicator showing a node is blocked with tooltip details
 */
export function BlockedIndicator({
  isBlocked,
  blockingNodes,
  onBlockingNodeClick,
  size = 'md',
  className,
}: BlockedIndicatorProps) {
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

  if (!isBlocked) {
    return null
  }

  const blockerCount = blockingNodes.length

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
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          'hover:bg-red-200 dark:hover:bg-red-900/50',
          'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none',
          'transition-colors',
          BADGE_SIZE_CLASSES[size]
        )}
        aria-label={`Blocked by ${blockerCount} ${blockerCount === 1 ? 'node' : 'nodes'}`}
        aria-expanded={showTooltip}
        aria-haspopup="true"
      >
        <Ban className={SIZE_CLASSES[size]} aria-hidden="true" />
        <span>Blocked</span>
        {blockerCount > 1 && (
          <span className="font-semibold">({blockerCount})</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute top-full left-0 z-50 mt-1',
            'max-w-[320px] min-w-[200px]',
            'border-forge-border rounded-lg border bg-white shadow-lg',
            'dark:border-forge-border-dark dark:bg-forge-surface-dark'
          )}
        >
          <div className="p-3">
            <h4 className="text-forge-text dark:text-forge-text-dark mb-2 text-sm font-medium">
              Blocked by:
            </h4>
            <ul className="space-y-2">
              {blockingNodes.map((blocker) => (
                <li key={blocker.id}>
                  <BlockingNodeItem
                    blocker={blocker}
                    onClick={
                      onBlockingNodeClick
                        ? () => {
                            onBlockingNodeClick(blocker.id)
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

interface BlockingNodeItemProps {
  blocker: BlockingNodeInfo
  onClick?: () => void
}

function BlockingNodeItem({ blocker, onClick }: BlockingNodeItemProps) {
  const isClickable = !!onClick

  const content = (
    <>
      <div className="flex items-center gap-2">
        <NodeTypeIcon
          type={blocker.type as (typeof NodeType)[keyof typeof NodeType]}
          size="sm"
        />
        <span className="text-forge-text dark:text-forge-text-dark min-w-0 truncate font-medium">
          {blocker.title}
        </span>
      </div>
      <div className="text-forge-muted dark:text-forge-muted-dark mt-1 flex items-center gap-1 text-xs">
        <span className="capitalize">{blocker.status}</span>
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-green-600 capitalize dark:text-green-400">
          {blocker.requiredStatus}
        </span>
      </div>
    </>
  )

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Navigate to ${blocker.title}`}
        className={cn(
          'w-full rounded-md p-2 text-left',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
          'transition-colors'
        )}
      >
        {content}
      </button>
    )
  }

  return <div className="rounded-md p-2">{content}</div>
}

export default BlockedIndicator
