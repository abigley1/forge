/**
 * GroupBackgrounds Component
 *
 * Renders semi-transparent bubble backgrounds behind groups of nodes
 * that share the same parent container (subsystem/assembly/module).
 * Uses React Flow's viewport transform to position correctly.
 */

import { memo, useMemo } from 'react'
import { useViewport, type Node as RFNode } from 'reactflow'
import type { GraphNodeData } from '@/lib/graph'
import { NodeType } from '@/types/nodes'

interface GroupBackgroundsProps {
  nodes: RFNode<GraphNodeData>[]
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

/**
 * Color mapping for parent container types
 */
const GROUP_COLORS: Record<string, { fill: string; stroke: string }> = {
  [NodeType.Subsystem]: {
    fill: 'rgba(168, 85, 247, 0.08)', // purple
    stroke: 'rgba(168, 85, 247, 0.25)',
  },
  [NodeType.Assembly]: {
    fill: 'rgba(6, 182, 212, 0.08)', // cyan
    stroke: 'rgba(6, 182, 212, 0.25)',
  },
  [NodeType.Module]: {
    fill: 'rgba(244, 63, 94, 0.08)', // rose
    stroke: 'rgba(244, 63, 94, 0.25)',
  },
}

// Padding around group bounds
const GROUP_PADDING = 30
// Estimated node dimensions for bounds calculation
const NODE_WIDTH = 180
const NODE_HEIGHT = 80

/**
 * Calculate bounding boxes for each parent group
 */
function calculateGroupBounds(
  nodes: RFNode<GraphNodeData>[]
): Map<string, GroupBounds> {
  const groups = new Map<string, GroupBounds>()

  // First pass: collect parent containers
  const parentNodes = new Map<string, RFNode<GraphNodeData>>()
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
  for (const [parentId, bounds] of groups) {
    const parentNode = parentNodes.get(parentId)
    if (parentNode) {
      bounds.minX = Math.min(bounds.minX, parentNode.position.x)
      bounds.minY = Math.min(bounds.minY, parentNode.position.y)
      bounds.maxX = Math.max(bounds.maxX, parentNode.position.x + NODE_WIDTH)
      bounds.maxY = Math.max(bounds.maxY, parentNode.position.y + NODE_HEIGHT)
    }
  }

  return groups
}

/**
 * Renders bubble backgrounds for node groups
 */
function GroupBackgroundsComponent({ nodes }: GroupBackgroundsProps) {
  const { x, y, zoom } = useViewport()

  const groupBounds = useMemo(() => calculateGroupBounds(nodes), [nodes])

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
          const colors = GROUP_COLORS[bounds.parentType] || {
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
                strokeDasharray="6 4"
              />
              {/* Group label */}
              <text
                x={bounds.minX - GROUP_PADDING + 12}
                y={bounds.minY - GROUP_PADDING + 20}
                fontSize={11}
                fontWeight={500}
                fill={colors.stroke.replace('0.25', '0.7')}
                className="select-none"
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
