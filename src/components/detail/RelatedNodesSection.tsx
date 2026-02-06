/**
 * RelatedNodesSection - Shows bidirectional wiki-link references
 *
 * Displays both:
 * - Outgoing links: Nodes this node references via [[wiki-links]]
 * - Incoming links: Nodes that reference this node via [[wiki-links]]
 */

import { useMemo } from 'react'
import { ArrowRight, ArrowLeft, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNodesStore } from '@/store'
import type { ForgeNode } from '@/types'

export interface RelatedNodesSectionProps {
  /** The node to show relations for */
  nodeId: string
  /** Called when clicking a node to navigate to it */
  onNavigate?: (nodeId: string) => void
  /** Optional class name */
  className?: string
}

/**
 * Get node type badge color
 */
function getTypeColor(type: ForgeNode['type']): string {
  switch (type) {
    case 'decision':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'component':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    case 'task':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    case 'note':
      return 'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark'
    case 'subsystem':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'assembly':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'
    case 'module':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
    default:
      return 'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark'
  }
}

/**
 * Single related node item
 */
function RelatedNodeItem({
  node,
  direction,
  onNavigate,
}: {
  node: ForgeNode
  direction: 'outgoing' | 'incoming'
  onNavigate?: (nodeId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(node.id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
        'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
        'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
        'dark:focus-visible:ring-forge-accent-dark'
      )}
    >
      {direction === 'outgoing' ? (
        <ArrowRight className="text-forge-muted h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <ArrowLeft className="text-forge-muted h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span className="text-forge-text dark:text-forge-text-dark flex-1 truncate">
        {node.title}
      </span>
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-xs font-medium capitalize',
          getTypeColor(node.type)
        )}
      >
        {node.type}
      </span>
    </button>
  )
}

/**
 * Section showing related nodes via wiki-links
 */
export function RelatedNodesSection({
  nodeId,
  onNavigate,
  className,
}: RelatedNodesSectionProps) {
  const nodes = useNodesStore((state) => state.nodes)
  const getOutgoingLinks = useNodesStore((state) => state.getOutgoingLinks)
  const getIncomingLinks = useNodesStore((state) => state.getIncomingLinks)

  // Get related node IDs (returns string[])
  const outgoingIds = useMemo(
    () => getOutgoingLinks(nodeId),
    [getOutgoingLinks, nodeId]
  )
  const incomingIds = useMemo(
    () => getIncomingLinks(nodeId),
    [getIncomingLinks, nodeId]
  )

  // Resolve to actual nodes
  const outgoingNodes = useMemo(() => {
    return outgoingIds
      .map((id) => nodes.get(id))
      .filter((n): n is ForgeNode => n !== undefined)
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [outgoingIds, nodes])

  const incomingNodes = useMemo(() => {
    return incomingIds
      .map((id) => nodes.get(id))
      .filter((n): n is ForgeNode => n !== undefined)
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [incomingIds, nodes])

  // Don't render if no relations
  if (outgoingNodes.length === 0 && incomingNodes.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Link2 className="text-forge-muted h-4 w-4" />
        <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium">
          Related Nodes
        </span>
        <span className="text-forge-muted text-xs">
          ({outgoingNodes.length + incomingNodes.length})
        </span>
      </div>

      <div className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark/50 space-y-4 rounded-md border p-3">
        {/* Outgoing links (this node references) */}
        {outgoingNodes.length > 0 && (
          <div className="space-y-1">
            <p className="text-forge-muted dark:text-forge-muted-dark text-xs font-medium">
              References ({outgoingNodes.length})
            </p>
            <div className="space-y-0.5">
              {outgoingNodes.map((node) => (
                <RelatedNodeItem
                  key={node.id}
                  node={node}
                  direction="outgoing"
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Incoming links (referenced by) */}
        {incomingNodes.length > 0 && (
          <div className="space-y-1">
            <p className="text-forge-muted dark:text-forge-muted-dark text-xs font-medium">
              Referenced by ({incomingNodes.length})
            </p>
            <div className="space-y-0.5">
              {incomingNodes.map((node) => (
                <RelatedNodeItem
                  key={node.id}
                  node={node}
                  direction="incoming"
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
