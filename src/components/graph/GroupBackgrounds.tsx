/**
 * GroupBackgrounds Component
 *
 * Renders semi-transparent bubble backgrounds behind groups of nodes
 * that share the same parent container (subsystem/assembly/module).
 * Also renders a background for orphan nodes (no parent, not containers-with-children).
 * Uses React Flow's viewport transform to position correctly.
 */

import { memo, useMemo } from 'react'
import {
  useViewport,
  type Node as RFNode,
  type Edge as RFEdge,
} from 'reactflow'
import type { GraphNodeData } from '@/lib/graph'
import { NodeType } from '@/types/nodes'

interface GroupBackgroundsProps {
  nodes: RFNode<GraphNodeData>[]
  edges: RFEdge[]
}

interface GroupBounds {
  parentId: string
  parentType: NodeType
  parentLabel: string
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Sentinel key for the virtual "Unlinked" group */
const UNLINKED_GROUP_KEY = '__unlinked__'

/**
 * Color mapping for parent container types
 */
const GROUP_COLORS: Record<string, { fill: string; stroke: string }> = {
  [NodeType.Subsystem]: {
    fill: 'rgba(154, 123, 79, 0.06)', // warm gold
    stroke: 'rgba(154, 123, 79, 0.25)',
  },
  [NodeType.Assembly]: {
    fill: 'rgba(122, 128, 112, 0.06)', // sage
    stroke: 'rgba(122, 128, 112, 0.25)',
  },
  [NodeType.Module]: {
    fill: 'rgba(160, 112, 112, 0.06)', // dusty rose-brown
    stroke: 'rgba(160, 112, 112, 0.25)',
  },
  [UNLINKED_GROUP_KEY]: {
    fill: 'rgba(160, 152, 144, 0.05)', // warm taupe
    stroke: 'rgba(160, 152, 144, 0.2)',
  },
}

// Padding around group bounds
const GROUP_PADDING = 30
// Estimated node dimensions for bounds calculation
const NODE_WIDTH = 180
const NODE_HEIGHT = 80

/**
 * Calculate bounding boxes for each parent group,
 * plus an "Unlinked" group for orphan nodes.
 */
function calculateGroupBounds(
  nodes: RFNode<GraphNodeData>[],
  edges: RFEdge[]
): Map<string, GroupBounds> {
  const groups = new Map<string, GroupBounds>()

  // Build set of nodes that have any edges (dependency or reference)
  const connectedNodes = new Set<string>()
  for (const edge of edges) {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  }

  // First pass: collect parent containers that actually have children in the graph
  const parentNodes = new Map<string, RFNode<GraphNodeData>>()
  const nodesWithParent = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'forgeNode' && node.data?.isContainer) {
      parentNodes.set(node.id, node)
    }
  }

  // Second pass: group children by parent
  for (const node of nodes) {
    if (node.type !== 'forgeNode') continue

    const parentId = node.data?.parentId
    if (!parentId) continue

    const parentNode = parentNodes.get(parentId)
    if (!parentNode) continue

    nodesWithParent.add(node.id)

    const existing = groups.get(parentId)
    const nodeX = node.position.x
    const nodeY = node.position.y
    const nodeRight = nodeX + NODE_WIDTH
    const nodeBottom = nodeY + NODE_HEIGHT

    if (existing) {
      existing.minX = Math.min(existing.minX, nodeX)
      existing.minY = Math.min(existing.minY, nodeY)
      existing.maxX = Math.max(existing.maxX, nodeRight)
      existing.maxY = Math.max(existing.maxY, nodeBottom)
    } else {
      groups.set(parentId, {
        parentId,
        parentType: parentNode.data?.nodeType as NodeType,
        parentLabel: parentNode.data?.label || parentId,
        minX: nodeX,
        minY: nodeY,
        maxX: nodeRight,
        maxY: nodeBottom,
      })
    }
  }

  // Include parent node itself in bounds
  const containersWithChildren = new Set<string>()
  for (const [parentId, bounds] of groups) {
    containersWithChildren.add(parentId)
    const parentNode = parentNodes.get(parentId)
    if (parentNode) {
      bounds.minX = Math.min(bounds.minX, parentNode.position.x)
      bounds.minY = Math.min(bounds.minY, parentNode.position.y)
      bounds.maxX = Math.max(bounds.maxX, parentNode.position.x + NODE_WIDTH)
      bounds.maxY = Math.max(bounds.maxY, parentNode.position.y + NODE_HEIGHT)
    }
  }

  // Third pass: collect truly unlinked nodes into an "Unlinked" group.
  // Unlinked = no parent AND not a container-with-children AND no edges.
  const orphanNodes: RFNode<GraphNodeData>[] = []
  for (const node of nodes) {
    if (node.type !== 'forgeNode') continue
    if (nodesWithParent.has(node.id)) continue
    if (containersWithChildren.has(node.id)) continue
    if (connectedNodes.has(node.id)) continue
    orphanNodes.push(node)
  }

  if (orphanNodes.length > 1) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of orphanNodes) {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH)
      maxY = Math.max(maxY, node.position.y + NODE_HEIGHT)
    }
    groups.set(UNLINKED_GROUP_KEY, {
      parentId: UNLINKED_GROUP_KEY,
      parentType: NodeType.Note, // doesn't matter, overridden by color lookup
      parentLabel: 'Unlinked',
      minX,
      minY,
      maxX,
      maxY,
    })
  }

  return groups
}

/**
 * Renders bubble backgrounds for node groups
 */
function GroupBackgroundsComponent({ nodes, edges }: GroupBackgroundsProps) {
  const { x, y, zoom } = useViewport()

  const groupBounds = useMemo(
    () => calculateGroupBounds(nodes, edges),
    [nodes, edges]
  )

  if (groupBounds.size === 0) {
    return null
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ zIndex: -1 }}
    >
      <g
        transform={`translate(${x}, ${y}) scale(${zoom})`}
        style={{ transformOrigin: '0 0' }}
      >
        {Array.from(groupBounds.values()).map((bounds) => {
          // Use the unlinked color for the virtual group, otherwise look up by type
          const colorKey =
            bounds.parentId === UNLINKED_GROUP_KEY
              ? UNLINKED_GROUP_KEY
              : bounds.parentType
          const colors = GROUP_COLORS[colorKey] || {
            fill: 'rgba(156, 163, 175, 0.08)',
            stroke: 'rgba(156, 163, 175, 0.25)',
          }

          const width = bounds.maxX - bounds.minX + GROUP_PADDING * 2
          const height = bounds.maxY - bounds.minY + GROUP_PADDING * 2

          return (
            <g key={bounds.parentId}>
              {/* Background bubble */}
              <rect
                x={bounds.minX - GROUP_PADDING}
                y={bounds.minY - GROUP_PADDING}
                width={width}
                height={height}
                rx={16}
                ry={16}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1.5}
                strokeDasharray="8 4"
              />
              {/* Group label */}
              <text
                x={bounds.minX - GROUP_PADDING + 12}
                y={bounds.minY - GROUP_PADDING + 20}
                fontSize={10}
                fontWeight={600}
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.08em"
                textDecoration="none"
                fill={colors.stroke.replace('0.25', '0.7')}
                className="uppercase select-none"
              >
                {bounds.parentLabel}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export const GroupBackgrounds = memo(GroupBackgroundsComponent)
