/**
 * Graph view container component
 * Displays nodes and their connections using React Flow
 * Includes keyboard navigation and screen reader support
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import ReactFlow, {
  Controls,
  ControlButton,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node as RFNode,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  type OnSelectionChangeFunc,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { LayoutGrid, Loader2, Map, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNodesStore, useProjectStore } from '@/store'
import {
  useFilters,
  useGraphPreferences,
  useReducedMotion,
  useGraphKeyboardNavigation,
  useCriticalPath,
} from '@/hooks'
import {
  nodesToGraphData,
  nodesToGraphDataWithClusters,
  extractNodePositions,
  filterGraphData,
  calculateLayout,
  type ForgeGraphNode,
  type NodePositions,
  type ClusterExpandedState,
} from '@/lib/graph'
import { forgeNodeTypes } from './nodeTypes'
import { forgeEdgeTypes } from './edgeTypes'
import { NodeContextMenu } from './NodeContextMenu'
import { GraphAnnouncer } from './GraphAnnouncer'
import { useGraphAnnouncer } from './useGraphAnnouncer'

export interface GraphViewProps {
  /** Called when a node is selected */
  onNodeSelect?: (nodeId: string | null) => void
  /** Called when node positions change (for persistence) */
  onPositionsChange?: (positions: NodePositions) => void
  /** Called when Edit action is triggered from context menu */
  onNodeEdit?: (nodeId: string) => void
  /** Called when Delete action is triggered from context menu */
  onNodeDelete?: (nodeId: string) => void
  /** Called when View action is triggered from context menu */
  onNodeView?: (nodeId: string) => void
  /** Called when Add Link action is triggered from context menu */
  onNodeAddLink?: (nodeId: string) => void
  /** Additional CSS classes */
  className?: string
  /** Override minimap visibility (uses preferences by default) */
  showMinimap?: boolean
  /** Override background visibility (uses preferences by default) */
  showBackground?: boolean
  /** Enable node clustering by tag (optional feature) */
  enableClustering?: boolean
  /** Called when a cluster is expanded/collapsed */
  onClusterToggle?: (tag: string, expanded: boolean) => void
  /** Enable keyboard navigation (default: true) */
  enableKeyboardNavigation?: boolean
  /** Show critical path highlighting (default: true) */
  showCriticalPath?: boolean
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  nodeId: string
  nodeTitle: string
}

/**
 * MiniMap node color function
 */
function getMinimapNodeColor(node: RFNode): string {
  // Handle cluster nodes
  if (node.type === 'tagCluster') {
    return '#a855f7' // purple-500
  }

  const nodeType = node.data?.nodeType
  switch (nodeType) {
    case 'decision':
      return '#3b82f6' // blue-500
    case 'component':
      return '#22c55e' // green-500
    case 'task':
      return '#f97316' // orange-500
    case 'note':
      return '#6b7280' // gray-500
    default:
      return '#9ca3af' // gray-400
  }
}

/**
 * Internal component that needs ReactFlowProvider context
 */
function GraphViewInner({
  onNodeSelect,
  onPositionsChange,
  onNodeEdit,
  onNodeDelete,
  onNodeView,
  onNodeAddLink,
  className,
  showMinimap: showMinimapProp,
  showBackground: showBackgroundProp,
  enableClustering = false,
  onClusterToggle,
  enableKeyboardNavigation = true,
  showCriticalPath = true,
}: GraphViewProps) {
  // Get nodes and link index from store
  const nodes = useNodesStore((state) => state.nodes)
  const linkIndex = useNodesStore((state) => state.linkIndex)
  const activeNodeId = useNodesStore((state) => state.activeNodeId)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)

  // Get stored positions from project metadata
  const project = useProjectStore((state) => state.project)
  const updateMetadata = useProjectStore((state) => state.updateMetadata)
  const storedPositions = project?.metadata?.nodePositions

  // Get filter state
  const { filterNodes, hasActiveFilters } = useFilters()

  // Graph preferences (minimap, background visibility with persistence)
  const { preferences, toggleMinimap } = useGraphPreferences()

  // Determine actual visibility (props override preferences)
  const showMinimap = showMinimapProp ?? preferences.showMinimap
  const showBackground = showBackgroundProp ?? preferences.showBackground

  // Reduced motion preference
  const reducedMotion = useReducedMotion()

  // Critical path calculation
  const { criticalPath, checkIsOnCriticalPath, getNodePosition } =
    useCriticalPath()

  // Screen reader announcements
  const {
    announcement,
    announceNodeSelected,
    announceNodeDeselected,
    announceNodeFocused,
    announceLayoutReset,
    announceLayoutError,
    announceMinimapToggled,
  } = useGraphAnnouncer()

  // React Flow instance
  const reactFlowInstance = useReactFlow()

  // Container ref for keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: '',
    nodeTitle: '',
  })

  // Cluster expansion state (for optional clustering feature)
  const [expandedClusters, setExpandedClusters] =
    useState<ClusterExpandedState>({})

  // Auto layout state
  const [isLayouting, setIsLayouting] = useState(false)

  // Handle cluster toggle
  const handleClusterToggle = useCallback(
    (tag: string, expanded: boolean) => {
      setExpandedClusters((prev) => ({
        ...prev,
        [tag]: expanded,
      }))
      onClusterToggle?.(tag, expanded)
    },
    [onClusterToggle]
  )

  // Convert nodes to graph data (with optional clustering)
  const fullGraphData = useMemo(() => {
    if (enableClustering) {
      const data = nodesToGraphDataWithClusters(nodes, linkIndex, {
        enableClustering: true,
        expandedClusters,
        storedPositions,
        selectedNodeId: activeNodeId,
      })
      // Return data with clusters separately
      return data
    }
    // Return standard graph data with empty clusters array
    return {
      ...nodesToGraphData(nodes, linkIndex, storedPositions, activeNodeId),
      clusters: [] as ReturnType<
        typeof nodesToGraphDataWithClusters
      >['clusters'],
    }
  }, [
    nodes,
    linkIndex,
    storedPositions,
    activeNodeId,
    enableClustering,
    expandedClusters,
  ])

  // Apply filters if active - only filter regular nodes, not clusters
  const graphData = useMemo(() => {
    if (!hasActiveFilters) {
      return fullGraphData
    }

    const filteredNodes = filterNodes(nodes)
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredStandardData = filterGraphData(
      { nodes: fullGraphData.nodes, edges: fullGraphData.edges },
      visibleNodeIds
    )
    return {
      ...filteredStandardData,
      clusters: fullGraphData.clusters,
    }
  }, [fullGraphData, hasActiveFilters, filterNodes, nodes])

  // Combine regular nodes with cluster nodes for React Flow
  const allNodes = useMemo(
    () => [...graphData.nodes, ...graphData.clusters] as RFNode[],
    [graphData.nodes, graphData.clusters]
  )

  // React Flow state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(allNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(graphData.edges)

  // Track previous node/edge IDs to avoid infinite update loops
  // (comparing full arrays would trigger on every render due to new references)
  const prevNodeIdsRef = useRef<string>('')
  const prevEdgeIdsRef = useRef<string>('')

  // Sync graph data changes to React Flow (only when content actually changes)
  useEffect(() => {
    // Create ID strings for comparison (cheaper than deep equality)
    const nodeIds = allNodes
      .map((n) => n.id)
      .sort()
      .join(',')
    const edgeIds = graphData.edges
      .map((e) => e.id)
      .sort()
      .join(',')

    // Only update if IDs changed (avoids infinite loop from array reference changes)
    if (nodeIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = nodeIds
      setRfNodes(allNodes)
    }
    if (edgeIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = edgeIds
      setRfEdges(graphData.edges)
    }
  }, [allNodes, graphData.edges, setRfNodes, setRfEdges])

  // Keyboard navigation
  const handleKeyboardSelect = useCallback(
    (nodeId: string | null) => {
      setActiveNode(nodeId)
      onNodeSelect?.(nodeId)

      if (nodeId) {
        // Find node data for announcement
        const node = nodes.get(nodeId)
        if (node) {
          announceNodeSelected(node.title, node.type)
        }

        // Center on the selected node
        const rfNode = rfNodes.find((n) => n.id === nodeId)
        if (rfNode && reactFlowInstance) {
          reactFlowInstance.setCenter(
            rfNode.position.x + 75, // Approximate node center
            rfNode.position.y + 30,
            { duration: reducedMotion ? 0 : 200 }
          )
        }
      } else {
        announceNodeDeselected()
      }
    },
    [
      setActiveNode,
      onNodeSelect,
      nodes,
      rfNodes,
      reactFlowInstance,
      reducedMotion,
      announceNodeSelected,
      announceNodeDeselected,
    ]
  )

  const handleKeyboardFocus = useCallback(
    (nodeId: string, index: number, total: number) => {
      const node = nodes.get(nodeId)
      if (node) {
        announceNodeFocused(node.title, node.type, index, total)
      }

      // Optionally scroll the focused node into view
      const rfNode = rfNodes.find((n) => n.id === nodeId)
      if (rfNode && reactFlowInstance) {
        reactFlowInstance.setCenter(
          rfNode.position.x + 75,
          rfNode.position.y + 30,
          { duration: reducedMotion ? 0 : 150 }
        )
      }
    },
    [nodes, rfNodes, reactFlowInstance, reducedMotion, announceNodeFocused]
  )

  const { focusedNodeId, handleKeyDown, getContainerProps } =
    useGraphKeyboardNavigation({
      nodes: rfNodes,
      selectedNodeId: activeNodeId,
      onSelect: handleKeyboardSelect,
      onFocus: handleKeyboardFocus,
      enabled: enableKeyboardNavigation,
    })

  // Document-level Escape key handler for deselecting nodes
  // This is needed because React Flow captures focus internally after clicking a node
  // and the detail panel may also take focus
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeNodeId) {
        // Check if the graph container is visible (not in a different view)
        const isGraphVisible = containerRef.current?.offsetParent !== null
        if (isGraphVisible) {
          event.preventDefault()
          setActiveNode(null)
          onNodeSelect?.(null)
          announceNodeDeselected()
          // Also clear React Flow's internal selection state
          setRfNodes((nodes) =>
            nodes.map((node) => ({ ...node, selected: false }))
          )
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [
    activeNodeId,
    setActiveNode,
    onNodeSelect,
    announceNodeDeselected,
    setRfNodes,
  ])

  // Handle node position changes for persistence
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)

      // Check if any positions changed
      const positionChanges = changes.filter(
        (change) => change.type === 'position' && change.position
      )

      if (positionChanges.length > 0 && onPositionsChange) {
        // Debounce position updates - this will be called frequently during drag
        // The caller should debounce the actual persistence
      }
    },
    [onNodesChange, onPositionsChange]
  )

  // Handle edges change
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
    },
    [onEdgesChange]
  )

  // Handle node drag end - persist positions
  const handleNodeDragStop = useCallback<NodeMouseHandler>(() => {
    // Extract all current positions and persist (filter out cluster nodes)
    const forgeNodes = rfNodes.filter(
      (n) => n.type === 'forgeNode'
    ) as ForgeGraphNode[]
    const positions = extractNodePositions(forgeNodes)

    // Update project metadata
    if (project) {
      updateMetadata({ nodePositions: positions })
    }

    onPositionsChange?.(positions)
  }, [rfNodes, project, updateMetadata, onPositionsChange])

  // Handle node selection
  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const selectedNode = selectedNodes[0]
      const newSelectedId = selectedNode?.id || null

      if (newSelectedId !== activeNodeId) {
        setActiveNode(newSelectedId)
        onNodeSelect?.(newSelectedId)

        // Announce selection change
        if (newSelectedId) {
          const node = nodes.get(newSelectedId)
          if (node) {
            announceNodeSelected(node.title, node.type)
          }
        } else {
          announceNodeDeselected()
        }
      }
    },
    [
      activeNodeId,
      setActiveNode,
      onNodeSelect,
      nodes,
      announceNodeSelected,
      announceNodeDeselected,
    ]
  )

  // Handle node click - select node or toggle cluster
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      // Check if this is a cluster node
      if (node.type === 'tagCluster') {
        const clusterData = node.data as { tag: string; expanded: boolean }
        handleClusterToggle(clusterData.tag, !clusterData.expanded)
        return
      }

      setActiveNode(node.id)
      onNodeSelect?.(node.id)

      // Announce selection
      const forgeNode = nodes.get(node.id)
      if (forgeNode) {
        announceNodeSelected(forgeNode.title, forgeNode.type)
      }
    },
    [
      setActiveNode,
      onNodeSelect,
      handleClusterToggle,
      nodes,
      announceNodeSelected,
    ]
  )

  // Handle node context menu (right click)
  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeTitle: node.data?.label || node.id,
    })
  }, [])

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Context menu actions
  const handleContextMenuEdit = useCallback(
    (nodeId: string) => {
      onNodeEdit?.(nodeId)
    },
    [onNodeEdit]
  )

  const handleContextMenuDelete = useCallback(
    (nodeId: string) => {
      onNodeDelete?.(nodeId)
    },
    [onNodeDelete]
  )

  const handleContextMenuView = useCallback(
    (nodeId: string) => {
      setActiveNode(nodeId)
      onNodeView?.(nodeId)
    },
    [setActiveNode, onNodeView]
  )

  const handleContextMenuAddLink = useCallback(
    (nodeId: string) => {
      onNodeAddLink?.(nodeId)
    },
    [onNodeAddLink]
  )

  // Handle pane click - deselect
  const handlePaneClick = useCallback(() => {
    setActiveNode(null)
    onNodeSelect?.(null)
    handleCloseContextMenu()
  }, [setActiveNode, onNodeSelect, handleCloseContextMenu])

  // Handle minimap toggle
  const handleToggleMinimap = useCallback(() => {
    toggleMinimap()
    announceMinimapToggled(!showMinimap)
  }, [toggleMinimap, showMinimap, announceMinimapToggled])

  // Handle reset layout - recalculate positions using elkjs
  const handleResetLayout = useCallback(async () => {
    if (isLayouting || rfNodes.length === 0) return

    setIsLayouting(true)
    try {
      // Filter to only forgeNode type nodes (exclude clusters)
      const forgeNodes = rfNodes.filter(
        (n) => n.type === 'forgeNode'
      ) as ForgeGraphNode[]
      // Get edges for these nodes
      const relevantEdges = rfEdges.filter(
        (e) =>
          forgeNodes.some((n) => n.id === e.source) &&
          forgeNodes.some((n) => n.id === e.target)
      )

      // Calculate new layout
      const newPositions = await calculateLayout(forgeNodes, relevantEdges)

      // Apply new positions to React Flow nodes
      setRfNodes((currentNodes) =>
        currentNodes.map((node) => {
          const newPos = newPositions[node.id]
          if (newPos) {
            return { ...node, position: newPos }
          }
          return node
        })
      )

      // Persist positions to project metadata
      if (project) {
        updateMetadata({ nodePositions: newPositions })
      }

      onPositionsChange?.(newPositions)

      // Announce completion
      announceLayoutReset()

      // Fit view to show all nodes
      setTimeout(() => {
        reactFlowInstance?.fitView({
          padding: 0.2,
          duration: reducedMotion ? 0 : 200,
        })
      }, 50)
    } catch (error) {
      console.error('Failed to calculate layout:', error)
      announceLayoutError()
    } finally {
      setIsLayouting(false)
    }
  }, [
    isLayouting,
    rfNodes,
    rfEdges,
    setRfNodes,
    project,
    updateMetadata,
    onPositionsChange,
    announceLayoutReset,
    announceLayoutError,
    reactFlowInstance,
    reducedMotion,
  ])

  // Get container accessibility props
  const containerProps = getContainerProps()

  // Compute nodes with focus and critical path styling
  const processedNodes = useMemo(() => {
    return rfNodes.map((node) => {
      // Only process forgeNode types (skip clusters)
      if (node.type !== 'forgeNode') return node

      const isOnCriticalPath =
        showCriticalPath &&
        criticalPath.hasPath &&
        checkIsOnCriticalPath(node.id)
      const criticalPathPosition = isOnCriticalPath
        ? getNodePosition(node.id)
        : -1
      const isFocused = node.id === focusedNodeId

      // Skip if no modifications needed
      if (!isFocused && !isOnCriticalPath) return node

      return {
        ...node,
        data: {
          ...node.data,
          ...(isFocused && { isFocused: true }),
          ...(isOnCriticalPath && { isOnCriticalPath: true }),
          ...(criticalPathPosition >= 0 && { criticalPathPosition }),
        },
      }
    })
  }, [
    rfNodes,
    focusedNodeId,
    showCriticalPath,
    criticalPath.hasPath,
    checkIsOnCriticalPath,
    getNodePosition,
  ])

  // Compute edges with critical path styling
  const processedEdges = useMemo(() => {
    if (!showCriticalPath || !criticalPath.hasPath) return rfEdges

    return rfEdges.map((edge) => {
      // Check if edge is on critical path using the edgeKeys set
      const edgeKey = `${edge.source}->${edge.target}`
      if (criticalPath.edgeKeys.has(edgeKey)) {
        return {
          ...edge,
          data: {
            ...edge.data,
            isOnCriticalPath: true,
          },
        }
      }
      return edge
    })
  }, [rfEdges, showCriticalPath, criticalPath.hasPath, criticalPath.edgeKeys])

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={containerRef}
      className={cn('h-full w-full', className)}
      {...containerProps}
      onKeyDown={handleKeyDown}
      onClick={handlePaneClick}
    >
      {/* Screen reader announcements */}
      <GraphAnnouncer message={announcement} />

      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={forgeNodeTypes}
        edgeTypes={forgeEdgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
          duration: reducedMotion ? 0 : undefined,
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        proOptions={{
          hideAttribution: true,
        }}
        // Accessibility
        aria-label="Interactive node graph. Use Tab to navigate between nodes, Enter to select, and arrow keys to move between connected nodes."
        // Disable animations when reduced motion is preferred
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        zoomOnScroll
        panOnDrag
        selectionOnDrag={false}
      >
        {/* Controls for zoom/pan */}
        <Controls
          className="!border-gray-200 !bg-white !shadow-md dark:!border-gray-700 dark:!bg-gray-800"
          showInteractive={false}
          showFitView={true}
          fitViewOptions={{
            padding: 0.2,
            duration: reducedMotion ? 0 : 200,
          }}
        >
          {/* Toggle Minimap button */}
          <ControlButton
            onClick={handleToggleMinimap}
            title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            aria-label={showMinimap ? 'Hide minimap' : 'Show minimap'}
            aria-pressed={showMinimap}
          >
            {showMinimap ? (
              <Map className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
          </ControlButton>

          {/* Reset Layout button */}
          <ControlButton
            onClick={handleResetLayout}
            disabled={isLayouting}
            title="Reset Layout"
            aria-label="Reset layout - repositions all nodes using automatic layout algorithm"
          >
            {isLayouting ? (
              <Loader2
                className={cn('h-4 w-4', !reducedMotion && 'animate-spin')}
                aria-hidden="true"
              />
            ) : (
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            )}
          </ControlButton>
        </Controls>

        {/* Minimap (toggleable) */}
        {showMinimap && (
          <MiniMap
            nodeColor={getMinimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!border-gray-200 !bg-white dark:!border-gray-700 dark:!bg-gray-800"
            pannable
            zoomable
            aria-label="Graph minimap showing overview of all nodes"
          />
        )}

        {/* Background grid */}
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#d1d5db"
            className="dark:!bg-gray-900"
          />
        )}
      </ReactFlow>

      {/* Context menu */}
      {contextMenu.isOpen && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeTitle={contextMenu.nodeTitle}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onView={handleContextMenuView}
          onAddLink={handleContextMenuAddLink}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}

/**
 * Graph view component displaying nodes and edges
 * Provides keyboard navigation, screen reader support, and respects reduced motion preferences
 */
export function GraphView(props: GraphViewProps) {
  // The inner component requires ReactFlowProvider context
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  )
}
