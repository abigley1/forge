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
 * - Blue color (#3b82f6 / blue-500) - normal
 * - Amber color (#f59e0b / amber-500) - on critical path
 * - Arrow marker at target end
 * - 2px stroke width for visual prominence (3px on critical path)
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

  const isOnCriticalPath = data?.isOnCriticalPath ?? false

  // Amber for critical path, blue for normal dependencies
  let strokeColor: string
  let strokeWidth: number

  if (isOnCriticalPath) {
    strokeColor = selected ? '#d97706' : '#f59e0b' // amber-600 when selected, amber-500 otherwise
    strokeWidth = 3
  } else {
    strokeColor = selected ? '#9a5b2f' : '#b87333' // dark copper when selected, copper otherwise
    strokeWidth = 2
  }

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
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
            {isOnCriticalPath ? 'Critical path d' : 'D'}ependency edge from{' '}
            {data?.linkType || 'dependency'}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export type DependencyEdgeProps = EdgeProps<GraphEdgeData>
