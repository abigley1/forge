/**
 * Graph utilities for converting Forge nodes to React Flow format
 */

import { MarkerType, type Node as RFNode, type Edge as RFEdge } from 'reactflow'
import type { ForgeNode } from '@/types/nodes'
import { isTaskNode, isContainerNode } from '@/types/nodes'
import type { LinkIndex } from '@/lib/links'
import ELK, {
  type ElkNode,
  type ElkExtendedEdge,
} from 'elkjs/lib/elk.bundled.js'

/**
 * Position for a graph node
 */
export interface NodePosition {
  x: number
  y: number
}

/**
 * Stored positions for all nodes
 */
export type NodePositions = Record<string, NodePosition>

/**
 * Data attached to graph nodes
 */
export interface GraphNodeData {
  label: string
  nodeType: ForgeNode['type']
  status?: string
  tags: string[]
  forgeNode: ForgeNode
  /** Whether this node is on the critical path */
  isOnCriticalPath?: boolean
  /** Position on the critical path (0-indexed, -1 if not on path) */
  criticalPathPosition?: number
  /** Whether this node is a container (subsystem/assembly/module) */
  isContainer?: boolean
  /** The parent container ID if this node has a parent */
  parentId?: string | null
}

/**
 * Data attached to graph edges
 */
export interface GraphEdgeData {
  linkType: 'reference' | 'dependency' | 'containment'
  /** Whether this edge is on the critical path */
  isOnCriticalPath?: boolean
}

/**
 * React Flow node with Forge-specific data
 */
export type ForgeGraphNode = RFNode<GraphNodeData>

/**
 * React Flow edge with Forge-specific data
 */
export type ForgeGraphEdge = RFEdge<GraphEdgeData>

/**
 * Result of converting nodes to graph data
 */
export interface GraphData {
  nodes: ForgeGraphNode[]
  edges: ForgeGraphEdge[]
}

/**
 * Default grid layout configuration
 */
const GRID_CONFIG = {
  startX: 100,
  startY: 100,
  nodeWidth: 180,
  nodeHeight: 80,
  horizontalGap: 80,
  verticalGap: 60,
  nodesPerRow: 4,
}

/**
 * Calculate default position for a node based on index
 */
function calculateDefaultPosition(index: number): NodePosition {
  const row = Math.floor(index / GRID_CONFIG.nodesPerRow)
  const col = index % GRID_CONFIG.nodesPerRow
  return {
    x:
      GRID_CONFIG.startX +
      col * (GRID_CONFIG.nodeWidth + GRID_CONFIG.horizontalGap),
    y:
      GRID_CONFIG.startY +
      row * (GRID_CONFIG.nodeHeight + GRID_CONFIG.verticalGap),
  }
}

/**
 * Get node status if available
 */
function getNodeStatus(node: ForgeNode): string | undefined {
  if ('status' in node) {
    return node.status
  }
  return undefined
}

/**
 * Convert a ForgeNode to a React Flow node
 */
function forgeNodeToGraphNode(
  node: ForgeNode,
  position: NodePosition,
  isSelected: boolean
): ForgeGraphNode {
  // Check if node is a container type
  const isContainer = isContainerNode(node)
  // Get parent ID if the node has one
  const parentId = 'parent' in node ? node.parent : null

  return {
    id: node.id,
    type: 'forgeNode', // Custom node type we'll define
    position,
    data: {
      label: node.title,
      nodeType: node.type,
      status: getNodeStatus(node),
      tags: node.tags,
      forgeNode: node,
      isContainer,
      parentId,
    },
    selected: isSelected,
  }
}

/**
 * Create a unique edge ID from source and target
 */
function createEdgeId(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`
}

/**
 * Create edges from task dependencies (dependsOn field)
 *
 * Dependency edges are:
 * - Solid blue line (#3b82f6)
 * - Arrow marker at target end
 * - 2px stroke width
 *
 * @param nodes - Map of all nodes to extract dependencies from
 * @returns Array of dependency edges
 */
function createDependencyEdges(
  nodes: Map<string, ForgeNode>
): ForgeGraphEdge[] {
  const edges: ForgeGraphEdge[] = []
  const seenEdges = new Set<string>()

  nodes.forEach((node) => {
    // Only task nodes have dependencies
    if (isTaskNode(node) && node.dependsOn.length > 0) {
      node.dependsOn.forEach((dependencyId) => {
        // Only create edge if the dependency target exists
        if (nodes.has(dependencyId)) {
          // Edge goes from dependency -> task (dependency blocks task)
          const edgeId = `dep-${createEdgeId(dependencyId, node.id)}`
          if (!seenEdges.has(edgeId)) {
            seenEdges.add(edgeId)
            edges.push({
              id: edgeId,
              source: dependencyId,
              target: node.id,
              type: 'dependency', // Custom dependency edge type
              data: {
                linkType: 'dependency',
              },
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#b87333', // copper
              },
            })
          }
        }
      })
    }
  })

  return edges
}

/**
 * Create edges from wiki-link references
 *
 * Reference edges are:
 * - Dashed gray line (#94a3b8)
 * - Circle marker at target end
 * - 1px stroke width
 *
 * @param linkIndex - Bidirectional link index
 * @param dependencyEdgeIds - Set of edge IDs that are already dependency edges
 * @returns Array of reference edges
 */
function createReferenceEdges(
  linkIndex: LinkIndex,
  dependencyEdgeIds: Set<string>
): ForgeGraphEdge[] {
  const edges: ForgeGraphEdge[] = []
  const seenEdges = new Set<string>()

  // Create edges from outgoing links (wiki-link references)
  linkIndex.outgoing.forEach((targets, sourceId) => {
    targets.forEach((targetId) => {
      const edgeId = `ref-${createEdgeId(sourceId, targetId)}`
      // Skip if this is already a dependency edge or we've seen it
      const reverseEdgeId = `dep-${createEdgeId(targetId, sourceId)}`
      const depEdgeId = `dep-${createEdgeId(sourceId, targetId)}`
      if (
        !seenEdges.has(edgeId) &&
        !dependencyEdgeIds.has(depEdgeId) &&
        !dependencyEdgeIds.has(reverseEdgeId)
      ) {
        seenEdges.add(edgeId)
        edges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: 'reference', // Custom reference edge type
          data: {
            linkType: 'reference',
          },
          animated: false,
        })
      }
    })
  })

  return edges
}

/**
 * Create edges for parent-child containment relationships
 *
 * Containment edges are:
 * - Dashed line with distinct color (#10b981 - emerald-500)
 * - No marker (indicates grouping, not direction)
 * - Connects parent container to child nodes
 *
 * @param nodes - Map of all nodes
 * @returns Array of containment edges
 */
function createContainmentEdges(
  nodes: Map<string, ForgeNode>
): ForgeGraphEdge[] {
  const edges: ForgeGraphEdge[] = []
  const seenEdges = new Set<string>()

  nodes.forEach((node) => {
    // Check if node has a parent
    const parentId = 'parent' in node ? node.parent : null
    if (parentId && nodes.has(parentId)) {
      const edgeId = `contain-${createEdgeId(parentId, node.id)}`
      if (!seenEdges.has(edgeId)) {
        seenEdges.add(edgeId)
        edges.push({
          id: edgeId,
          source: parentId,
          target: node.id,
          type: 'containment', // Custom containment edge type
          data: {
            linkType: 'containment',
          },
          animated: false,
          style: {
            strokeDasharray: '5,5',
            stroke: '#10b981', // emerald-500
          },
        })
      }
    }
  })

  return edges
}

/**
 * Convert nodes and link index to React Flow edges
 *
 * Creates three types of edges:
 * 1. Dependency edges (blue, solid) from TaskNode.dependsOn
 * 2. Reference edges (gray, dashed) from wiki-links
 * 3. Containment edges (emerald, dashed) from parent-child relationships
 *
 * @param nodes - Map of all nodes
 * @param linkIndex - Bidirectional link index
 * @returns Combined array of all edges
 */
function nodesToEdges(
  nodes: Map<string, ForgeNode>,
  linkIndex: LinkIndex
): ForgeGraphEdge[] {
  // First create dependency edges
  const dependencyEdges = createDependencyEdges(nodes)
  const dependencyEdgeIds = new Set(dependencyEdges.map((e) => e.id))

  // Then create reference edges (excluding those that duplicate dependencies)
  const referenceEdges = createReferenceEdges(linkIndex, dependencyEdgeIds)

  // Finally create containment edges for parent-child relationships
  const containmentEdges = createContainmentEdges(nodes)

  return [...dependencyEdges, ...referenceEdges, ...containmentEdges]
}

/**
 * Convert Forge nodes and link index to React Flow graph data
 *
 * @param nodes - Map of all Forge nodes
 * @param linkIndex - Bidirectional link index
 * @param storedPositions - Optional stored node positions
 * @param selectedNodeId - Optional currently selected node ID
 * @returns Graph data with nodes and edges for React Flow
 */
export function nodesToGraphData(
  nodes: Map<string, ForgeNode>,
  linkIndex: LinkIndex,
  storedPositions?: NodePositions,
  selectedNodeId?: string | null
): GraphData {
  const graphNodes: ForgeGraphNode[] = []
  let index = 0

  nodes.forEach((node) => {
    // Use stored position or calculate default
    const position =
      storedPositions?.[node.id] ?? calculateDefaultPosition(index)
    const isSelected = node.id === selectedNodeId
    graphNodes.push(forgeNodeToGraphNode(node, position, isSelected))
    index++
  })

  const edges = nodesToEdges(nodes, linkIndex)

  return {
    nodes: graphNodes,
    edges,
  }
}

/**
 * Extract positions from React Flow nodes for persistence
 *
 * @param nodes - React Flow nodes with current positions
 * @returns Record of node positions by ID
 */
export function extractNodePositions(nodes: ForgeGraphNode[]): NodePositions {
  const positions: NodePositions = {}
  nodes.forEach((node) => {
    positions[node.id] = {
      x: node.position.x,
      y: node.position.y,
    }
  })
  return positions
}

/**
 * Merge stored positions with current graph nodes
 *
 * @param graphNodes - Current graph nodes
 * @param storedPositions - Positions from storage
 * @returns Updated graph nodes with stored positions applied
 */
export function applyStoredPositions(
  graphNodes: ForgeGraphNode[],
  storedPositions: NodePositions
): ForgeGraphNode[] {
  return graphNodes.map((node) => {
    const storedPos = storedPositions[node.id]
    if (storedPos) {
      return {
        ...node,
        position: storedPos,
      }
    }
    return node
  })
}

/**
 * Filter graph nodes based on visible node IDs
 *
 * @param graphData - Full graph data
 * @param visibleNodeIds - Set of node IDs that should be visible
 * @returns Filtered graph data with only visible nodes and their edges
 */
export function filterGraphData(
  graphData: GraphData,
  visibleNodeIds: Set<string>
): GraphData {
  // Filter nodes
  const filteredNodes = graphData.nodes.filter((node) =>
    visibleNodeIds.has(node.id)
  )

  // Filter edges - only include edges where both source and target are visible
  const filteredEdges = graphData.edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  )

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  }
}

/**
 * Find nodes connected to a specific node (for highlighting)
 *
 * @param nodeId - The node to find connections for
 * @param linkIndex - Bidirectional link index
 * @returns Set of connected node IDs
 */
export function getConnectedNodeIds(
  nodeId: string,
  linkIndex: LinkIndex
): Set<string> {
  const connected = new Set<string>()

  // Add outgoing connections
  const outgoing = linkIndex.outgoing.get(nodeId)
  if (outgoing) {
    outgoing.forEach((id) => connected.add(id))
  }

  // Add incoming connections
  const incoming = linkIndex.incoming.get(nodeId)
  if (incoming) {
    incoming.forEach((id) => connected.add(id))
  }

  return connected
}

// ============================================================================
// Tag Clustering (Optional feature for Task 5.2)
// ============================================================================

/**
 * Represents a cluster of nodes sharing a common tag
 */
export interface TagCluster {
  /** The tag name for this cluster */
  tag: string
  /** IDs of nodes in this cluster */
  nodeIds: string[]
  /** Whether the cluster is currently expanded */
  expanded: boolean
  /** Position of the cluster in the graph */
  position: NodePosition
}

/**
 * Data for cluster nodes in React Flow
 */
export interface ClusterNodeData {
  tag: string
  nodeCount: number
  expanded: boolean
  nodeIds: string[]
}

/**
 * State for managing cluster expansion
 */
export type ClusterExpandedState = Record<string, boolean>

/**
 * Group nodes by their tags
 *
 * @param nodes - Map of all nodes
 * @returns Map of tag to node IDs
 */
export function groupNodesByTag(
  nodes: Map<string, ForgeNode>
): Map<string, string[]> {
  const tagGroups = new Map<string, string[]>()

  nodes.forEach((node) => {
    if (node.tags.length === 0) {
      // Nodes without tags go to "untagged" group
      const untagged = tagGroups.get('__untagged__') ?? []
      untagged.push(node.id)
      tagGroups.set('__untagged__', untagged)
    } else {
      // Add node to each tag's group (node can be in multiple groups)
      node.tags.forEach((tag) => {
        const group = tagGroups.get(tag) ?? []
        group.push(node.id)
        tagGroups.set(tag, group)
      })
    }
  })

  return tagGroups
}

/**
 * Create cluster nodes for collapsed tag groups
 *
 * @param tagGroups - Map of tag to node IDs
 * @param expandedState - Which clusters are expanded
 * @param storedPositions - Optional stored positions for clusters
 * @returns Array of cluster nodes for React Flow
 */
export function createClusterNodes(
  tagGroups: Map<string, string[]>,
  expandedState: ClusterExpandedState,
  storedPositions?: NodePositions
): RFNode<ClusterNodeData>[] {
  const clusterNodes: RFNode<ClusterNodeData>[] = []
  let clusterIndex = 0

  tagGroups.forEach((nodeIds, tag) => {
    const isExpanded = expandedState[tag] ?? false

    // Only create cluster node if not expanded
    if (!isExpanded) {
      const clusterId = `cluster-${tag}`
      const position =
        storedPositions?.[clusterId] ?? calculateClusterPosition(clusterIndex)

      clusterNodes.push({
        id: clusterId,
        type: 'tagCluster',
        position,
        data: {
          tag: tag === '__untagged__' ? 'Untagged' : tag,
          nodeCount: nodeIds.length,
          expanded: isExpanded,
          nodeIds,
        },
      })

      clusterIndex++
    }
  })

  return clusterNodes
}

/**
 * Calculate default position for a cluster node
 */
function calculateClusterPosition(index: number): NodePosition {
  const nodesPerRow = 3
  const clusterWidth = 160
  const clusterHeight = 60
  const horizontalGap = 100
  const verticalGap = 80
  const startX = 100
  const startY = 100

  const row = Math.floor(index / nodesPerRow)
  const col = index % nodesPerRow

  return {
    x: startX + col * (clusterWidth + horizontalGap),
    y: startY + row * (clusterHeight + verticalGap),
  }
}

/**
 * Convert nodes to graph data with clustering support
 *
 * @param nodes - Map of all Forge nodes
 * @param linkIndex - Bidirectional link index
 * @param options - Options for clustering and positioning
 * @returns Graph data with nodes, edges, and optionally clusters
 */
export function nodesToGraphDataWithClusters(
  nodes: Map<string, ForgeNode>,
  linkIndex: LinkIndex,
  options: {
    enableClustering?: boolean
    expandedClusters?: ClusterExpandedState
    storedPositions?: NodePositions
    selectedNodeId?: string | null
  } = {}
): GraphData & { clusters: RFNode<ClusterNodeData>[] } {
  const {
    enableClustering = false,
    expandedClusters = {},
    storedPositions,
    selectedNodeId,
  } = options

  if (!enableClustering) {
    // No clustering - return standard graph data
    return {
      ...nodesToGraphData(nodes, linkIndex, storedPositions, selectedNodeId),
      clusters: [],
    }
  }

  // Group nodes by tag
  const tagGroups = groupNodesByTag(nodes)

  // Create cluster nodes for collapsed groups
  const clusterNodes = createClusterNodes(
    tagGroups,
    expandedClusters,
    storedPositions
  )

  // Collect IDs of nodes that are hidden (in collapsed clusters)
  const hiddenNodeIds = new Set<string>()
  tagGroups.forEach((nodeIds, tag) => {
    const isExpanded = expandedClusters[tag] ?? false
    if (!isExpanded) {
      nodeIds.forEach((id) => hiddenNodeIds.add(id))
    }
  })

  // Create graph nodes only for visible nodes (not in collapsed clusters)
  const graphNodes: ForgeGraphNode[] = []
  let index = 0

  nodes.forEach((node) => {
    if (!hiddenNodeIds.has(node.id)) {
      const position =
        storedPositions?.[node.id] ?? calculateDefaultPosition(index)
      const isSelected = node.id === selectedNodeId
      graphNodes.push(forgeNodeToGraphNode(node, position, isSelected))
      index++
    }
  })

  // Create edges only between visible nodes
  const visibleNodeIds = new Set(graphNodes.map((n) => n.id))
  const allEdges = nodesToEdges(nodes, linkIndex)
  const visibleEdges = allEdges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  )

  return {
    nodes: graphNodes,
    edges: visibleEdges,
    clusters: clusterNodes,
  }
}

/**
 * Get all tags used across nodes for clustering UI
 *
 * @param nodes - Map of all nodes
 * @returns Array of unique tags sorted alphabetically
 */
export function getAllTagsForClustering(
  nodes: Map<string, ForgeNode>
): string[] {
  const tags = new Set<string>()

  nodes.forEach((node) => {
    node.tags.forEach((tag) => tags.add(tag))
  })

  return Array.from(tags).sort((a, b) => a.localeCompare(b))
}

// ============================================================================
// Auto Layout (Task 5.4 - elkjs-based hierarchical layout)
// ============================================================================

/**
 * ELK layout instance (singleton for performance)
 */
const elk = new ELK()

/**
 * Virtual container ID for orphan nodes in the compound graph.
 * Used during layout only — not rendered as a real node.
 */

/**
 * Index mapping parent IDs to their children
 */
type ParentChildIndex = Map<string, string[]>

/**
 * Layout direction options for the graph
 */
export type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'

/**
 * Layout algorithm options
 */
export interface AutoLayoutOptions {
  /** Direction of the hierarchical layout */
  direction?: LayoutDirection
  /** Spacing between nodes on the same level */
  nodeSpacing?: number
  /** Spacing between different levels */
  levelSpacing?: number
  /** Spacing between edges */
  edgeSpacing?: number
  /** Algorithm variant: 'layered' for DAG, 'force' for general graphs */
  algorithm?: 'layered' | 'force'
}

/**
 * Default layout options for hierarchical DAG layout
 */
const DEFAULT_LAYOUT_OPTIONS: Required<AutoLayoutOptions> = {
  direction: 'DOWN',
  nodeSpacing: 50,
  levelSpacing: 80,
  edgeSpacing: 20,
  algorithm: 'layered',
}

/**
 * Convert React Flow nodes and edges to ELK format
 */
function toElkGraph(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  options: AutoLayoutOptions = {}
): ElkNode {
  const mergedOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options }

  // ELK layout options
  const layoutOptions: Record<string, string> = {
    'elk.algorithm': mergedOptions.algorithm === 'force' ? 'force' : 'layered',
    'elk.direction': mergedOptions.direction,
    'elk.spacing.nodeNode': String(mergedOptions.nodeSpacing),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(
      mergedOptions.levelSpacing
    ),
    'elk.spacing.edgeEdge': String(mergedOptions.edgeSpacing),
    'elk.spacing.componentComponent': '80',
    'elk.aspectRatio': '1.0',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
    'elk.alignment': 'CENTER',
    'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
    'elk.layered.compaction.connectedComponents': 'true',
    'elk.spacing.edgeNode': '25',
    'elk.spacing.edgeNodeBetweenLayers': '25',
  }

  // Convert nodes to ELK format
  const elkNodes: ElkNode[] = nodes.map((node) => ({
    id: node.id,
    width: GRID_CONFIG.nodeWidth,
    height: GRID_CONFIG.nodeHeight,
  }))

  // Convert edges to ELK format
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }))

  return {
    id: 'root',
    layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  }
}

/**
 * Extract positions from ELK layout result
 */
function extractElkPositions(elkGraph: ElkNode): NodePositions {
  const positions: NodePositions = {}

  elkGraph.children?.forEach((node) => {
    if (node.x !== undefined && node.y !== undefined) {
      positions[node.id] = {
        x: node.x,
        y: node.y,
      }
    }
  })

  return positions
}

/**
 * Calculate layout positions for nodes using elkjs
 *
 * Uses the ELK (Eclipse Layout Kernel) algorithm for hierarchical
 * DAG-respecting layout. The 'layered' algorithm is optimized for
 * directed graphs and will position dependent nodes below their
 * dependencies.
 *
 * @param nodes - React Flow nodes to layout
 * @param edges - React Flow edges (defines graph structure)
 * @param options - Layout options
 * @returns Promise resolving to new node positions
 *
 * @example
 * ```ts
 * const positions = await calculateLayout(graphData.nodes, graphData.edges)
 * // Apply positions to React Flow nodes
 * ```
 */
export async function calculateLayout(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  options: AutoLayoutOptions = {}
): Promise<NodePositions> {
  if (nodes.length === 0) {
    return {}
  }

  // Convert to ELK format
  const elkGraph = toElkGraph(nodes, edges, options)

  // Run layout algorithm
  const layoutedGraph = await elk.layout(elkGraph)

  // Extract positions
  return extractElkPositions(layoutedGraph)
}

/**
 * Calculate layout with offset to center in viewport
 *
 * @param nodes - React Flow nodes to layout
 * @param edges - React Flow edges
 * @param viewportWidth - Width of the viewport
 * @param viewportHeight - Height of the viewport
 * @param options - Layout options
 * @returns Promise resolving to centered node positions
 */
export async function calculateCenteredLayout(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  viewportWidth: number,
  viewportHeight: number,
  options: AutoLayoutOptions = {}
): Promise<NodePositions> {
  const positions = await calculateLayout(nodes, edges, options)

  if (Object.keys(positions).length === 0) {
    return positions
  }

  // Calculate bounding box of laid out nodes
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  Object.values(positions).forEach(({ x, y }) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + GRID_CONFIG.nodeWidth)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + GRID_CONFIG.nodeHeight)
  })

  // Calculate layout dimensions
  const layoutWidth = maxX - minX
  const layoutHeight = maxY - minY

  // Calculate offset to center layout in viewport
  const offsetX =
    Math.max(0, (viewportWidth - layoutWidth) / 2) - minX + GRID_CONFIG.startX
  const offsetY =
    Math.max(0, (viewportHeight - layoutHeight) / 2) - minY + GRID_CONFIG.startY

  // Apply offset to all positions
  const centeredPositions: NodePositions = {}
  Object.entries(positions).forEach(([nodeId, pos]) => {
    centeredPositions[nodeId] = {
      x: pos.x + offsetX,
      y: pos.y + offsetY,
    }
  })

  return centeredPositions
}

// ============================================================================
// Hierarchical Layout (Compound Graph for Parent-Child Proximity)
// ============================================================================

/**
 * Build an index of parent -> children relationships from nodes
 */
function buildParentChildIndex(nodes: ForgeGraphNode[]): ParentChildIndex {
  const index: ParentChildIndex = new Map()

  nodes.forEach((node) => {
    const parentId = node.data?.parentId
    if (parentId) {
      const children = index.get(parentId) ?? []
      children.push(node.id)
      index.set(parentId, children)
    }
  })

  return index
}

/**
 * Recursively build ELK node structure with children nested inside parents
 */
function buildElkNodeWithChildren(
  node: ForgeGraphNode,
  parentChildIndex: ParentChildIndex,
  allNodesMap: Map<string, ForgeGraphNode>,
  visitedIds: Set<string>
): ElkNode {
  // Mark as visited to prevent infinite loops
  visitedIds.add(node.id)

  const children = parentChildIndex.get(node.id) ?? []
  const elkChildren: ElkNode[] = []

  // Recursively build children
  children.forEach((childId) => {
    if (!visitedIds.has(childId)) {
      const childNode = allNodesMap.get(childId)
      if (childNode) {
        elkChildren.push(
          buildElkNodeWithChildren(
            childNode,
            parentChildIndex,
            allNodesMap,
            visitedIds
          )
        )
      }
    }
  })

  // Container nodes get extra padding for their children
  const isContainer = elkChildren.length > 0
  const sidePadding = isContainer ? 24 : 0
  // Top padding must exceed nodeHeight so children render well below the parent card
  const topPadding = isContainer ? GRID_CONFIG.nodeHeight + 32 : 0

  // Configure port constraints for cleaner edge routing
  const nodeLayoutOptions: Record<string, string> = {
    'elk.portConstraints': 'FREE',
  }

  if (isContainer) {
    nodeLayoutOptions['elk.padding'] =
      `[top=${topPadding},left=${sidePadding},bottom=${sidePadding},right=${sidePadding}]`
    nodeLayoutOptions['elk.direction'] = 'DOWN'
    // Center children horizontally under the parent card
    nodeLayoutOptions['elk.contentAlignment'] = 'H_CENTER'
  }

  return {
    id: node.id,
    width: GRID_CONFIG.nodeWidth,
    height: GRID_CONFIG.nodeHeight,
    children: elkChildren.length > 0 ? elkChildren : undefined,
    layoutOptions: nodeLayoutOptions,
  }
}

/**
 * Convert React Flow graph to ELK compound graph format
 * Children are nested inside their parent containers for layout calculation
 */
function toCompoundElkGraph(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  options: AutoLayoutOptions = {}
): ElkNode {
  const mergedOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options }

  // Build indices
  const parentChildIndex = buildParentChildIndex(nodes)
  const allNodesMap = new Map(nodes.map((n) => [n.id, n]))
  const visitedIds = new Set<string>()

  // Find root nodes (nodes without parents or with missing parents)
  const rootNodes = nodes.filter((node) => {
    const parentId = node.data?.parentId
    // Root if: no parent, or parent doesn't exist in the graph
    return !parentId || !allNodesMap.has(parentId)
  })

  // Build nested ELK structure from root nodes.
  // Container nodes with children get their own compound ELK structure.
  // Orphan nodes (no children in graph) sit at root level — ELK's
  // componentComponent spacing separates them from container groups,
  // and GroupBackgrounds renders the visual "Unlinked" bubble.
  const elkChildren: ElkNode[] = []
  rootNodes.forEach((rootNode) => {
    if (visitedIds.has(rootNode.id)) return

    const hasChildrenInGraph = (parentChildIndex.get(rootNode.id) ?? []).some(
      (childId) => allNodesMap.has(childId)
    )

    if (hasChildrenInGraph) {
      elkChildren.push(
        buildElkNodeWithChildren(
          rootNode,
          parentChildIndex,
          allNodesMap,
          visitedIds
        )
      )
    } else {
      // Orphan node — add directly at root level
      visitedIds.add(rootNode.id)
      elkChildren.push({
        id: rootNode.id,
        width: GRID_CONFIG.nodeWidth,
        height: GRID_CONFIG.nodeHeight,
      })
    }
  })

  // Convert edges to ELK format, excluding containment edges.
  // Containment is already encoded structurally via nested children above —
  // passing containment edges too creates redundant constraints that spread the layout.
  const elkEdges: ElkExtendedEdge[] = edges
    .filter((edge) => edge.data?.linkType !== 'containment')
    .map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }))

  // ELK layout options for compound graphs with flexible edge routing
  const layoutOptions: Record<string, string> = {
    'elk.algorithm': 'layered',
    'elk.direction': mergedOptions.direction,
    'elk.spacing.nodeNode': String(mergedOptions.nodeSpacing),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(
      mergedOptions.levelSpacing
    ),
    'elk.spacing.edgeEdge': String(mergedOptions.edgeSpacing),
    // Spacing between disconnected subgraphs (container groups).
    // Must exceed 2 × GroupBackgrounds padding (30px each side = 60px)
    // to prevent background bubbles from overlapping.
    'elk.spacing.componentComponent': '80',
    // Target a square-ish aspect ratio so disconnected subgraphs
    // pack into a grid rather than a single wide row.
    'elk.aspectRatio': '1.0',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    // NETWORK_SIMPLEX layering minimizes total edge length,
    // placing nodes at the layer where their edges enter the graph
    // (vs LONGEST_PATH which can push nodes too high).
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
    // Center nodes within their layer instead of left-aligning
    'elk.alignment': 'CENTER',
    // Post-layout compaction to remove wasted whitespace
    'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
    // Pack disconnected subgraphs together
    'elk.layered.compaction.connectedComponents': 'true',
    // Edge routing: allow edges to connect from any side
    'elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
    // Edge-node spacing — enough room for edges to route around nodes
    'elk.spacing.edgeNode': '25',
    'elk.spacing.edgeNodeBetweenLayers': '25',
    // Merge edges going to same target for cleaner look
    'elk.layered.mergeEdges': 'true',
  }

  return {
    id: 'root',
    layoutOptions,
    children: elkChildren,
    edges: elkEdges,
  }
}

/**
 * Recursively extract positions from nested ELK graph, converting to absolute coordinates
 */
function extractNestedPositions(
  elkNode: ElkNode,
  offsetX: number = 0,
  offsetY: number = 0,
  positions: NodePositions = {}
): NodePositions {
  elkNode.children?.forEach((child) => {
    const absoluteX = (child.x ?? 0) + offsetX
    const absoluteY = (child.y ?? 0) + offsetY

    positions[child.id] = {
      x: absoluteX,
      y: absoluteY,
    }

    // Recursively handle nested children
    if (child.children && child.children.length > 0) {
      extractNestedPositions(child, absoluteX, absoluteY, positions)
    }
  })

  return positions
}

/**
 * Calculate hierarchical layout using ELK compound graph
 *
 * This creates a nested graph structure where children are positioned
 * inside their parent containers during layout calculation. The result
 * is then flattened to absolute positions for React Flow rendering.
 *
 * Benefits:
 * - Children cluster spatially near their parents
 * - Reduces edge crossings within hierarchies
 * - Dependencies flow more naturally within container boundaries
 *
 * @param nodes - React Flow nodes to layout
 * @param edges - React Flow edges (all types: dependency, reference, containment)
 * @param options - Layout options
 * @returns Promise resolving to absolute node positions
 */
export async function calculateHierarchicalLayout(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  options: AutoLayoutOptions = {}
): Promise<NodePositions> {
  if (nodes.length === 0) {
    return {}
  }

  // Build compound ELK graph
  const elkGraph = toCompoundElkGraph(nodes, edges, options)

  // Run layout algorithm
  const layoutedGraph = await elk.layout(elkGraph)

  // Extract positions with absolute coordinates
  return extractNestedPositions(layoutedGraph)
}

/**
 * Calculate hierarchical layout with offset to center in viewport
 *
 * @param nodes - React Flow nodes to layout
 * @param edges - React Flow edges
 * @param viewportWidth - Width of the viewport
 * @param viewportHeight - Height of the viewport
 * @param options - Layout options
 * @returns Promise resolving to centered absolute node positions
 */
export async function calculateCenteredHierarchicalLayout(
  nodes: ForgeGraphNode[],
  edges: ForgeGraphEdge[],
  viewportWidth: number,
  viewportHeight: number,
  options: AutoLayoutOptions = {}
): Promise<NodePositions> {
  const positions = await calculateHierarchicalLayout(nodes, edges, options)

  if (Object.keys(positions).length === 0) {
    return positions
  }

  // Calculate bounding box of laid out nodes
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  Object.values(positions).forEach(({ x, y }) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + GRID_CONFIG.nodeWidth)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + GRID_CONFIG.nodeHeight)
  })

  // Calculate layout dimensions
  const layoutWidth = maxX - minX
  const layoutHeight = maxY - minY

  // Calculate offset to center layout in viewport
  const offsetX =
    Math.max(0, (viewportWidth - layoutWidth) / 2) - minX + GRID_CONFIG.startX
  const offsetY =
    Math.max(0, (viewportHeight - layoutHeight) / 2) - minY + GRID_CONFIG.startY

  // Apply offset to all positions
  const centeredPositions: NodePositions = {}
  Object.entries(positions).forEach(([nodeId, pos]) => {
    centeredPositions[nodeId] = {
      x: pos.x + offsetX,
      y: pos.y + offsetY,
    }
  })

  return centeredPositions
}
