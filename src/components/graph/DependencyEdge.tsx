/**
 * Custom edge component for dependency relationships
 * Renders as a solid blue line with an arrow marker
 */

import { type EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow'
import type { GraphEdgeData } from '@/lib/graph'

/**
 * DependencyEdge - Custom edge for task dependencies
 *
 * Visual characteristics:
 * - Solid line (not dashed)
 * - Blue color (#3b82f6 / blue-500)
 * - Arrow marker at target end
 * - 2px stroke width for visual prominence
 *
 * Dependency edges represent "blocks" relationships where
 * the source node must be completed before the target.
 */
export function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
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

  // Blue color for dependencies (solid, prominent)
  const strokeColor = selected ? '#1d4ed8' : '#3b82f6' // blue-700 when selected, blue-500 otherwise

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
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
            Dependency edge from {data?.linkType || 'dependency'}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export type DependencyEdgeProps = EdgeProps<GraphEdgeData>
