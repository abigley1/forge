/**
 * RelatedNodes Component
 *
 * Displays both outgoing links (links FROM this node) and incoming links
 * (backlinks TO this node) in a grouped, organized view.
 */

import { useState, useCallback, useId } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Link2,
  ExternalLink,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { NodeTypeIcon } from '@/components/nodes/NodeTypeIcon'
import { getNodeTypeLabel } from '@/components/nodes/config'

// ============================================================================
// Types
// ============================================================================

export interface RelatedNodesProps {
  /** Nodes that this node links TO (outgoing) */
  outgoingNodes: ForgeNode[]
  /** Nodes that link TO this node (incoming/backlinks) */
  incomingNodes: ForgeNode[]
  /** Called when a node is clicked */
  onNavigate?: (nodeId: string) => void
  /** Whether outgoing section starts expanded */
  outgoingExpanded?: boolean
  /** Whether incoming section starts expanded */
  incomingExpanded?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Subcomponents
// ============================================================================

interface LinkGroupProps {
  title: string
  icon: React.ReactNode
  nodes: ForgeNode[]
  onNavigate?: (nodeId: string) => void
  defaultExpanded?: boolean
  direction: 'outgoing' | 'incoming'
}

function LinkGroup({
  title,
  icon,
  nodes,
  onNavigate,
  defaultExpanded = true,
  direction,
}: LinkGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentId = useId()

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleToggle()
      }
    },
    [handleToggle]
  )

  const count = nodes.length

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2',
          'text-sm font-medium',
          'text-gray-600 dark:text-gray-400',
          'hover:text-gray-900 dark:hover:text-gray-200',
          'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none',
          'dark:focus-visible:ring-gray-500',
          'transition-colors duration-150',
          'rounded-md'
        )}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {/* Chevron */}
        {expanded ? (
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        )}

        {/* Direction icon */}
        <span className="shrink-0 text-gray-400" aria-hidden="true">
          {icon}
        </span>

        {/* Title */}
        <span className="flex-1 text-left">{title}</span>

        {/* Count */}
        <span
          className={cn(
            'text-xs tabular-nums',
            count > 0
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
          aria-hidden="true"
        >
          {count}
        </span>
      </button>

      {/* Content */}
      <div
        id={contentId}
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out',
          expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!expanded}
      >
        {count === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
            {direction === 'outgoing'
              ? 'No outgoing links'
              : 'No incoming links'}
          </p>
        ) : (
          <ul className="space-y-0.5 px-2 pb-2">
            {nodes.map((node) => (
              <RelatedNodeItem
                key={node.id}
                node={node}
                direction={direction}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface RelatedNodeItemProps {
  node: ForgeNode
  direction: 'outgoing' | 'incoming'
  onNavigate?: (nodeId: string) => void
}

function RelatedNodeItem({
  node,
  direction,
  onNavigate,
}: RelatedNodeItemProps) {
  const typeLabel = getNodeTypeLabel(node.type)

  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate?.(node.id)}
        aria-label={`Navigate to ${node.title}`}
        className={cn(
          'group flex w-full items-center gap-2 px-2 py-1.5',
          'text-left text-sm',
          'rounded-md',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-800/60',
          'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none',
          'dark:focus-visible:ring-gray-500',
          'transition-colors duration-150'
        )}
      >
        {/* Direction indicator for incoming */}
        {direction === 'incoming' && (
          <ArrowRight
            className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        )}

        {/* Node type icon */}
        <NodeTypeIcon type={node.type} size="sm" />

        {/* Title */}
        <span className="min-w-0 flex-1 truncate">{node.title}</span>

        {/* Type label (subtle) */}
        <span
          className={cn(
            'shrink-0 text-xs',
            'text-gray-400 dark:text-gray-500',
            'opacity-0 transition-opacity duration-150',
            'group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
        >
          {typeLabel}
        </span>

        {/* Direction indicator for outgoing */}
        {direction === 'outgoing' && (
          <ArrowRight
            className={cn(
              'h-3 w-3 shrink-0',
              'text-gray-400 dark:text-gray-500',
              'opacity-0 transition-opacity duration-150',
              'group-hover:opacity-100 group-focus-visible:opacity-100'
            )}
            aria-hidden="true"
          />
        )}
      </button>
    </li>
  )
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyRelatedNodes() {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-6',
        'text-center'
      )}
    >
      <div
        className={cn(
          'mb-2 flex h-8 w-8 items-center justify-center rounded-full',
          'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Link2
          className="h-4 w-4 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No related nodes
      </p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
        Use [[wiki-links]] to connect nodes
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Displays related nodes grouped by direction (outgoing and incoming links).
 *
 * @example
 * <RelatedNodes
 *   outgoingNodes={linkedFromHere}
 *   incomingNodes={linkedToHere}
 *   onNavigate={(id) => navigateToNode(id)}
 * />
 */
export function RelatedNodes({
  outgoingNodes,
  incomingNodes,
  onNavigate,
  outgoingExpanded = true,
  incomingExpanded = true,
  className,
}: RelatedNodesProps) {
  const totalCount = outgoingNodes.length + incomingNodes.length

  if (totalCount === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-700/50',
          'bg-gray-50/50 dark:bg-gray-900/30',
          className
        )}
      >
        <EmptyRelatedNodes />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700/50',
        'bg-gray-50/50 dark:bg-gray-900/30',
        'divide-y divide-gray-200 dark:divide-gray-700/50',
        className
      )}
    >
      {/* Outgoing links (links FROM this node) */}
      <LinkGroup
        title="Links from here"
        icon={<ExternalLink className="h-3.5 w-3.5" />}
        nodes={outgoingNodes}
        onNavigate={onNavigate}
        defaultExpanded={outgoingExpanded}
        direction="outgoing"
      />

      {/* Incoming links (backlinks TO this node) */}
      <LinkGroup
        title="Links to here"
        icon={<ArrowLeft className="h-3.5 w-3.5" />}
        nodes={incomingNodes}
        onNavigate={onNavigate}
        defaultExpanded={incomingExpanded}
        direction="incoming"
      />
    </div>
  )
}

export default RelatedNodes
