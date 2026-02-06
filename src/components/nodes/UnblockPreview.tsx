/**
 * UnblockPreview Component
 *
 * Shows a tooltip/preview of nodes that will be unblocked when a node is completed.
 * Used to provide context before marking a task complete or selecting a decision.
 */

import { Unlock, ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from './NodeTypeIcon'
import type { NodeType } from '@/types/nodes'

export interface UnblockableNode {
  id: string
  title: string
  type: (typeof NodeType)[keyof typeof NodeType]
}

export interface UnblockPreviewProps {
  /** Nodes that will be unblocked */
  nodesToUnblock: UnblockableNode[]
  /** Callback when an unblockable node is clicked */
  onNodeClick?: (nodeId: string) => void
  /** The action that will cause the unblock (e.g., "completing this task") */
  action?: string
  /** Whether to show as a compact inline badge or full tooltip */
  variant?: 'badge' | 'tooltip'
  /** Additional CSS classes */
  className?: string
  /** Children to wrap (for tooltip variant) */
  children?: React.ReactNode
}

/**
 * Shows which nodes will be unblocked by an action
 */
export function UnblockPreview({
  nodesToUnblock,
  onNodeClick,
  action = 'completing this',
  variant = 'badge',
  className,
  children,
}: UnblockPreviewProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    if (!showTooltip) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowTooltip(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showTooltip])

  if (nodesToUnblock.length === 0) {
    // If variant is tooltip, still render children
    if (variant === 'tooltip' && children) {
      return <>{children}</>
    }
    return null
  }

  const count = nodesToUnblock.length

  if (variant === 'badge') {
    return (
      <div
        ref={triggerRef}
        className={cn('relative inline-flex', className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          )}
          aria-label={`Will unblock ${count} ${count === 1 ? 'node' : 'nodes'}`}
        >
          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Unblocks {count} {count === 1 ? 'node' : 'nodes'}
          </span>
        </span>

        {showTooltip && (
          <UnblockTooltip
            ref={tooltipRef}
            nodesToUnblock={nodesToUnblock}
            action={action}
            onNodeClick={onNodeClick}
          />
        )}
      </div>
    )
  }

  // Tooltip variant - wraps children
  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {showTooltip && (
        <UnblockTooltip
          ref={tooltipRef}
          nodesToUnblock={nodesToUnblock}
          action={action}
          onNodeClick={(id) => {
            onNodeClick?.(id)
            setShowTooltip(false)
          }}
        />
      )}
    </div>
  )
}

interface UnblockTooltipProps {
  nodesToUnblock: UnblockableNode[]
  action: string
  onNodeClick?: (nodeId: string) => void
}

const UnblockTooltip = ({
  nodesToUnblock,
  action,
  onNodeClick,
  ref,
}: UnblockTooltipProps & { ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        'absolute top-full left-0 z-50 mt-1',
        'max-w-[320px] min-w-[220px]',
        'border-forge-border rounded-lg border bg-white shadow-lg',
        'dark:border-forge-border-dark dark:bg-forge-surface-dark'
      )}
    >
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <Unlock className="h-4 w-4" aria-hidden="true" />
          <span>Will unblock by {action}:</span>
        </div>
        <ul className="space-y-1.5">
          {nodesToUnblock.map((node) => (
            <li key={node.id}>
              <UnblockableNodeItem node={node} onClick={onNodeClick} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface UnblockableNodeItemProps {
  node: UnblockableNode
  onClick?: (nodeId: string) => void
}

function UnblockableNodeItem({ node, onClick }: UnblockableNodeItemProps) {
  const isClickable = !!onClick

  const content = (
    <div className="flex items-center gap-2">
      <ArrowRight
        className="h-3 w-3 flex-shrink-0 text-green-500"
        aria-hidden="true"
      />
      <NodeTypeIcon type={node.type} size="sm" />
      <span className="text-forge-text dark:text-forge-text-dark min-w-0 truncate text-sm">
        {node.title}
      </span>
    </div>
  )

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={() => onClick(node.id)}
        aria-label={`Navigate to ${node.title}`}
        className={cn(
          'w-full rounded p-1.5 text-left',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none',
          'transition-colors'
        )}
      >
        {content}
      </button>
    )
  }

  return <div className="p-1.5">{content}</div>
}

export default UnblockPreview
