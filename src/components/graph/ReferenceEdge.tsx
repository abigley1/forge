/**
 * Custom edge component for reference relationships (wiki-links)
 * Renders as a dashed gray line with a circle marker
 */

import { type EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow'
import type { GraphEdgeData } from '@/lib/graph'

/**
 * Circle marker for reference edges
 * Rendered at the end of the edge path
 */
function CircleMarker({
  x,
  y,
  selected,
}: {
  x: number
  y: number
  selected: boolean
}) {
  const fillColor = selected ? '#4b5563' : '#94a3b8' // gray-600 when selected, gray-400 otherwise
  const strokeColor = selected ? '#374151' : '#64748b' // gray-700 when selected, gray-500 otherwise

  return (
    <circle
      cx={x}
      cy={y}
      r={4}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1}
      className="pointer-events-none"
    />
  )
}

/**
 * ReferenceEdge - Custom edge for wiki-link references
 *
 * Visual characteristics:
 * - Dashed line (stroke-dasharray)
 * - Gray color (#94a3b8 / gray-400)
 * - Circle marker at target end
 * - 1px stroke width (lighter than dependencies)
 *
 * Reference edges represent informational links between nodes
 * created via [[wiki-links]] syntax in markdown content.
 */
export function ReferenceEdge({
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

  // Gray color for references (dashed, subtle)
  const strokeColor = selected ? '#4b5563' : '#94a3b8' // gray-600 when selected, gray-400 otherwise

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 1,
          strokeDasharray: '5 3', // Dashed pattern
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {/* Circle marker at target end */}
      <CircleMarker x={targetX} y={targetY} selected={selected || false} />
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
            Reference link from {data?.linkType || 'reference'}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export type ReferenceEdgeProps = EdgeProps<GraphEdgeData>
