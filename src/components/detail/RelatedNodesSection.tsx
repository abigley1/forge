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
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    case 'subsystem':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'assembly':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'
    case 'module':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
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
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-1 focus-visible:outline-none',
        'dark:focus-visible:ring-gray-300'
      )}
    >
      {direction === 'outgoing' ? (
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      ) : (
        <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      )}
      <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
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
        <Link2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Related Nodes
        </span>
        <span className="text-xs text-gray-500">
          ({outgoingNodes.length + incomingNodes.length})
        </span>
      </div>

      <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        {/* Outgoing links (this node references) */}
        {outgoingNodes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
