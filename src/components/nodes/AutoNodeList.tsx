/**
 * AutoNodeList Component
 *
 * Automatically switches between regular NodeList and VirtualizedNodeList
 * based on the number of items. Uses virtualization for >50 items.
 */

import type { ForgeNode } from '@/types/nodes'
import { NodeList } from './NodeList'
import { VirtualizedNodeList } from './VirtualizedNodeList'

// ============================================================================
// Constants
// ============================================================================

/** Threshold above which virtualization is used */
export const VIRTUALIZATION_THRESHOLD = 50

// ============================================================================
// Types
// ============================================================================

interface AutoNodeListProps {
  /** Array of nodes to display */
  nodes: ForgeNode[]
  /** ID of the currently active node */
  activeNodeId: string | null
  /** Called when a node is selected */
  onNodeSelect: (nodeId: string) => void
  /** Called when user wants to create a new node */
  onCreateNode?: () => void
  /** Additional CSS classes */
  className?: string
  /** ARIA label for the list */
  'aria-label'?: string
  /** Height for virtualized list (default: 100%) */
  height?: string | number
  /** Force virtualization regardless of item count */
  forceVirtualized?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * Smart node list that automatically uses virtualization for large lists.
 *
 * - Uses regular NodeList for ≤50 items (simpler, better for small lists)
 * - Uses VirtualizedNodeList for >50 items (better performance)
 *
 * @example
 * <AutoNodeList
 *   nodes={allNodes}
 *   activeNodeId={activeNodeId}
 *   onNodeSelect={handleNodeSelect}
 * />
 */
export function AutoNodeList({
  nodes,
  activeNodeId,
  onNodeSelect,
  onCreateNode,
  className,
  'aria-label': ariaLabel = 'Node list',
  height = '100%',
  forceVirtualized = false,
}: AutoNodeListProps) {
  const shouldVirtualize =
    forceVirtualized || nodes.length > VIRTUALIZATION_THRESHOLD

  if (shouldVirtualize) {
    return (
      <VirtualizedNodeList
        nodes={nodes}
        activeNodeId={activeNodeId}
        onNodeSelect={onNodeSelect}
        onCreateNode={onCreateNode}
        className={className}
        aria-label={ariaLabel}
        height={height}
      />
    )
  }

  return (
    <NodeList
      nodes={nodes}
      activeNodeId={activeNodeId}
      onNodeSelect={onNodeSelect}
      onCreateNode={onCreateNode}
      className={className}
      aria-label={ariaLabel}
    />
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { AutoNodeListProps }
