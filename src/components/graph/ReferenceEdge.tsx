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
  const fillColor = selected ? '#706860' : '#a09890' // warm taupe-dark when selected, warm taupe otherwise
  const strokeColor = selected ? '#5a5550' : '#8a8278' // darker taupe when selected, mid taupe otherwise

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

  // Warm taupe for references (dashed, subtle)
  const strokeColor = selected ? '#706860' : '#a09890' // warm taupe-dark when selected, warm taupe otherwise

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
