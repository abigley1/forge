/**
 * Custom edge component for containment relationships (parent-child)
 * Renders as a dashed emerald line to show hierarchical grouping
 */

import { type EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow'
import type { GraphEdgeData } from '@/lib/graph'

/**
 * ContainmentEdge - Custom edge for parent-child container relationships
 *
 * Visual characteristics:
 * - Dashed line (stroke-dasharray)
 * - Emerald color (#10b981 / emerald-500)
 * - No marker (grouping relationship, not directional)
 * - 2px stroke width (more visible than references)
 *
 * Containment edges represent hierarchical relationships where
 * a container node (subsystem/assembly/module) contains child nodes.
 */
export function ContainmentEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  // Emerald color for containment (hierarchical grouping)
  const strokeColor = selected ? '#059669' : '#10b981' // emerald-600 when selected, emerald-500 otherwise

  return (
    <>
      <path
        id={id}
        data-edge-type="containment"
        className="react-flow__edge-path containment-edge"
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: '6 4', // Dashed pattern for containment
        }}
        d={edgePath}
      />
      {/* Optional: edge label for accessibility */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Hidden label for screen readers */}
          <span className="sr-only">
            Containment link ({data?.linkType || 'containment'})
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export type ContainmentEdgeProps = EdgeProps<GraphEdgeData>
