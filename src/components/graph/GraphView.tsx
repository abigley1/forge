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
import { LayoutGrid, Loader2, Map, EyeOff, Group } from 'lucide-react'

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
  calculateHierarchicalLayout,
  type ForgeGraphNode,
  type NodePositions,
  type ClusterExpandedState,
} from '@/lib/graph'
import { forgeNodeTypes } from './nodeTypes'
import { forgeEdgeTypes } from './edgeTypes'
import { NodeContextMenu } from './NodeContextMenu'
import { GraphAnnouncer } from './GraphAnnouncer'
import { useGraphAnnouncer } from './useGraphAnnouncer'
import { GroupBackgrounds } from './GroupBackgrounds'

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
  /** Show group backgrounds for container relationships (uses preferences by default) */
  showGroupBackgrounds?: boolean
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  nodeId: string
  nodeTitle: string
  isContainer: boolean
}

/**
 * MiniMap node color function
 */
function getMinimapNodeColor(node: RFNode): string {
  // Handle cluster nodes
  if (node.type === 'tagCluster') {
    return '#9a7b4f' // warm gold (cluster)
  }

  const nodeType = node.data?.nodeType
  switch (nodeType) {
    case 'decision':
      return '#e8a84c' // warm amber-gold
    case 'component':
      return '#8b7355' // warm brown
    case 'task':
      return '#c87941' // copper
    case 'note':
      return '#a09890' // warm taupe
    default:
      return '#9a7b4f' // warm gold
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
  showGroupBackgrounds: showGroupBackgroundsProp,
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
  const { filterNodes, hasActiveFilters, setContainer } = useFilters()

  // Graph preferences (minimap, background visibility with persistence)
  const { preferences, toggleMinimap, toggleGroupBackgrounds } =
    useGraphPreferences()

  // Determine actual visibility (props override preferences)
  const showMinimap = showMinimapProp ?? preferences.showMinimap
  const showBackground = showBackgroundProp ?? preferences.showBackground
  const showGroupBackgrounds =
    showGroupBackgroundsProp ?? preferences.showGroupBackgrounds

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
    isContainer: false,
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

  // Track nodes that were manually dragged (excluded from auto-layout this session)
  const manuallyPositionedNodesRef = useRef<Set<string>>(new Set())

  // Track previous node/edge counts for detecting structural changes
  const prevStructuralKeyRef = useRef<string>('')

  // Debounce timer for auto-layout
  const autoLayoutTimerRef = useRef<number | null>(null)

  // Sync graph data changes to React Flow (only when content actually changes)
  useEffect(() => {
    // Create key strings for comparison (cheaper than deep equality)
    // Include both IDs and key data properties that should trigger re-renders
    const nodeKey = allNodes
      .map((n) => `${n.id}:${n.data?.status ?? ''}:${n.data?.label ?? ''}`)
      .sort()
      .join(',')
    const edgeIds = graphData.edges
      .map((e) => e.id)
      .sort()
      .join(',')

    // Update if node IDs or data changed (avoids infinite loop from array reference changes)
    if (nodeKey !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = nodeKey
      setRfNodes(allNodes)
    }
    if (edgeIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = edgeIds
      setRfEdges(graphData.edges)
    }
  }, [allNodes, graphData.edges, setRfNodes, setRfEdges])

  // Auto-layout when structural changes occur (nodes added/removed, edges added/removed)
  useEffect(() => {
    // Create a structural key that only includes node and edge IDs
    // This detects when nodes/edges are added or removed, not just data changes
    const nodeIds = allNodes
      .map((n) => n.id)
      .sort()
      .join(',')
    const edgeIds = graphData.edges
      .map((e) => e.id)
      .sort()
      .join(',')
    const structuralKey = `${nodeIds}|${edgeIds}`

    // Skip if no structural change
    if (structuralKey === prevStructuralKeyRef.current) return

    // Skip initial render (when prev is empty)
    const isInitialRender = prevStructuralKeyRef.current === ''
    prevStructuralKeyRef.current = structuralKey

    if (isInitialRender) return

    // Clear any pending auto-layout timer
    if (autoLayoutTimerRef.current) {
      window.clearTimeout(autoLayoutTimerRef.current)
    }

    // Debounce auto-layout (500ms quiet period)
    autoLayoutTimerRef.current = window.setTimeout(async () => {
      if (isLayouting || rfNodes.length === 0) return

      // Clean up manually positioned nodes that no longer exist
      const currentNodeIds = new Set(rfNodes.map((n) => n.id))
      manuallyPositionedNodesRef.current.forEach((nodeId) => {
        if (!currentNodeIds.has(nodeId)) {
          manuallyPositionedNodesRef.current.delete(nodeId)
        }
      })

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

        // Calculate hierarchical layout (children cluster near parents)
        const newPositions = await calculateHierarchicalLayout(
          forgeNodes,
          relevantEdges
        )

        // Apply new positions, preserving manually positioned nodes
        setRfNodes((currentNodes) =>
          currentNodes.map((node) => {
            // Skip if this node was manually dragged
            if (manuallyPositionedNodesRef.current.has(node.id)) {
              return node
            }
            const newPos = newPositions[node.id]
            if (newPos) {
              return { ...node, position: newPos }
            }
            return node
          })
        )

        // Merge new positions with manually positioned ones for persistence
        const allPositions = { ...newPositions }
        manuallyPositionedNodesRef.current.forEach((nodeId) => {
          const node = rfNodes.find((n) => n.id === nodeId)
          if (node) {
            allPositions[nodeId] = node.position
          }
        })

        // Persist positions to project metadata
        if (project) {
          updateMetadata({ nodePositions: allPositions })
        }

        onPositionsChange?.(allPositions)

        // Fit view to show all nodes after layout
        setTimeout(() => {
          reactFlowInstance?.fitView({
            padding: 0.2,
            duration: reducedMotion ? 0 : 200,
          })
        }, 50)
      } catch (error) {
        console.error('Auto-layout failed:', error)
      } finally {
        setIsLayouting(false)
      }
    }, 500) // 500ms debounce

    return () => {
      if (autoLayoutTimerRef.current) {
        window.clearTimeout(autoLayoutTimerRef.current)
      }
    }
  }, [
    allNodes,
    graphData.edges,
    isLayouting,
    rfNodes,
    rfEdges,
    setRfNodes,
    project,
    updateMetadata,
    onPositionsChange,
    reactFlowInstance,
    reducedMotion,
  ])

  // One-shot auto-layout for initial render when no positions are stored.
  // The structural-change effect above skips initial render, so nodes with no
  // stored positions would stay in the meaningless default grid. This effect
  // detects that case and immediately runs hierarchical layout once.
  const initialLayoutDoneRef = useRef(false)
  useEffect(() => {
    if (initialLayoutDoneRef.current) return
    if (rfNodes.length === 0) return
    if (isLayouting) return

    // Check if most nodes lack stored positions
    const forgeNodes = rfNodes.filter(
      (n) => n.type === 'forgeNode'
    ) as ForgeGraphNode[]
    if (forgeNodes.length === 0) return

    const nodesWithPositions = forgeNodes.filter(
      (n) => storedPositions?.[n.id] != null
    ).length
    const coverageRatio = nodesWithPositions / forgeNodes.length

    // If >50% of nodes already have stored positions, skip
    if (coverageRatio > 0.5) {
      initialLayoutDoneRef.current = true
      return
    }

    // Run layout immediately (no debounce for initial render)
    initialLayoutDoneRef.current = true
    setIsLayouting(true)

    const relevantEdges = rfEdges.filter(
      (e) =>
        forgeNodes.some((n) => n.id === e.source) &&
        forgeNodes.some((n) => n.id === e.target)
    )

    calculateHierarchicalLayout(forgeNodes, relevantEdges)
      .then((newPositions) => {
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

        // Fit view after layout
        setTimeout(() => {
          reactFlowInstance?.fitView({
            padding: 0.2,
            duration: reducedMotion ? 0 : 200,
          })
        }, 50)
      })
      .catch((error) => {
        console.error('Initial auto-layout failed:', error)
      })
      .finally(() => {
        setIsLayouting(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes.length, rfEdges.length, storedPositions])

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
  const handleNodeDragStop = useCallback<NodeMouseHandler>(
    (_event, node) => {
      // Mark this node as manually positioned (excluded from auto-layout)
      manuallyPositionedNodesRef.current.add(node.id)

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
    },
    [rfNodes, project, updateMetadata, onPositionsChange]
  )

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
      isContainer: node.data?.isContainer ?? false,
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

  // Handle show children only (for container nodes)
  const handleContextMenuShowChildrenOnly = useCallback(
    (nodeId: string) => {
      // Set the container filter to show only children of this container
      setContainer(nodeId)
    },
    [setContainer]
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

      // Calculate hierarchical layout (children cluster near parents)
      const newPositions = await calculateHierarchicalLayout(
        forgeNodes,
        relevantEdges
      )

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
        {/* Group backgrounds for container relationships */}
        {showGroupBackgrounds && (
          <GroupBackgrounds nodes={processedNodes} edges={processedEdges} />
        )}

        {/* Controls for zoom/pan */}
        <Controls
          className="!border-forge-border !bg-forge-surface dark:!border-forge-border-dark dark:!bg-forge-surface-dark !rounded-md !shadow-sm"
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

          {/* Toggle Group Backgrounds button */}
          <ControlButton
            onClick={toggleGroupBackgrounds}
            title={
              showGroupBackgrounds
                ? 'Hide Group Backgrounds'
                : 'Show Group Backgrounds'
            }
            aria-label={
              showGroupBackgrounds
                ? 'Hide group backgrounds'
                : 'Show group backgrounds'
            }
            aria-pressed={showGroupBackgrounds}
          >
            <Group
              className={cn('h-4 w-4', !showGroupBackgrounds && 'opacity-50')}
              aria-hidden="true"
            />
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
            maskColor="rgba(44, 40, 37, 0.08)"
            className="!border-forge-border !bg-forge-surface dark:!border-forge-border-dark dark:!bg-forge-surface-dark"
            pannable
            zoomable
            aria-label="Graph minimap showing overview of all nodes"
          />
        )}

        {/* Engineering grid background */}
        {showBackground && (
          <div className="forge-engineering-grid absolute inset-0 -z-10" />
        )}
      </ReactFlow>

      {/* Context menu */}
      {contextMenu.isOpen && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeTitle={contextMenu.nodeTitle}
          isContainer={contextMenu.isContainer}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onView={handleContextMenuView}
          onAddLink={handleContextMenuAddLink}
          onShowChildrenOnly={handleContextMenuShowChildrenOnly}
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
