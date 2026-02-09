/**
 * OutlineView Component
 *
 * Hierarchical outline view of nodes grouped by type with:
 * - Collapsible sections by node type
 * - Collapse state persisted in localStorage
 * - Full keyboard navigation (Arrow up/down, Home/End, Enter, type-ahead)
 * - Quick status toggle for task nodes
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import {
  Lightbulb,
  Package,
  CheckSquare,
  FileText,
  Circle,
  CircleDot,
  CheckCircle2,
  Layers,
  Boxes,
  LayoutGrid,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { NodeType, isTaskNode } from '@/types/nodes'
import type { ForgeNode, TaskStatus } from '@/types/nodes'
import { useReducedMotion } from '@/hooks'
import {
  groupNodesByType,
  getPersistedCollapseState,
  persistCollapseState,
  type CollapseState,
} from '@/lib/outline'
import { NodeTypeIcon, StatusBadge, type NodeStatus } from '@/components/nodes'
import { CollapsibleSection } from './CollapsibleSection'

// ============================================================================
// Types
// ============================================================================

export interface OutlineViewProps {
  /** Map or array of nodes to display */
  nodes: Map<string, ForgeNode> | ForgeNode[]
  /** Currently active/selected node ID */
  activeNodeId: string | null
  /** Called when a node is selected */
  onNodeSelect: (nodeId: string) => void
  /** Called when a task's status should be toggled */
  onTaskStatusToggle?: (nodeId: string, newStatus: TaskStatus) => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Icons for each node type section
 */
const SECTION_ICONS: Record<NodeType, React.ReactNode> = {
  [NodeType.Task]: <CheckSquare className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Decision]: <Lightbulb className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Component]: <Package className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Note]: <FileText className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Subsystem]: <Layers className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Assembly]: <Boxes className="h-4 w-4" aria-hidden="true" />,
  [NodeType.Module]: <LayoutGrid className="h-4 w-4" aria-hidden="true" />,
}

/**
 * Task status cycle for quick toggle
 */
const TASK_STATUS_CYCLE: TaskStatus[] = ['pending', 'in_progress', 'complete']

/**
 * Get next status in the cycle
 */
function getNextTaskStatus(current: TaskStatus): TaskStatus {
  const currentIndex = TASK_STATUS_CYCLE.indexOf(current)
  const nextIndex = (currentIndex + 1) % TASK_STATUS_CYCLE.length
  return TASK_STATUS_CYCLE[nextIndex]
}

/**
 * Icons for task status toggle button — forge palette
 * pending=muted (dormant), in_progress=amber (active), complete=olive-green (done), blocked=red (fault)
 */
const TASK_STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pending: (
    <Circle
      className="text-forge-muted dark:text-forge-muted-dark h-4 w-4"
      aria-hidden="true"
    />
  ),
  in_progress: (
    <CircleDot
      className="text-forge-accent dark:text-forge-accent-dark h-4 w-4"
      aria-hidden="true"
    />
  ),
  complete: (
    <CheckCircle2
      className="text-forge-node-assembly-text dark:text-forge-node-assembly-text-dark h-4 w-4"
      aria-hidden="true"
    />
  ),
  blocked: <Circle className="h-4 w-4 text-red-500" aria-hidden="true" />,
}

// ============================================================================
// OutlineItem Component
// ============================================================================

interface OutlineItemProps {
  node: ForgeNode
  isActive: boolean
  onClick: () => void
  onStatusToggle?: () => void
  tabIndex?: number
  id: string
  /** Animation delay in ms for staggered entry */
  animationDelay?: number
  /** Whether to skip entry animation */
  skipAnimation?: boolean
}

/**
 * Individual item in the outline with optional status toggle for tasks
 */
function OutlineItem({
  node,
  isActive,
  onClick,
  onStatusToggle,
  tabIndex = -1,
  id,
  animationDelay = 0,
  skipAnimation = false,
}: OutlineItemProps) {
  const isTask = isTaskNode(node)
  const [ticking, setTicking] = useState(false)

  const handleStatusClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      setTicking(true)
      onStatusToggle?.()
    },
    [onStatusToggle]
  )

  const handleStatusKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation()
        event.preventDefault()
        setTicking(true)
        onStatusToggle?.()
      }
    },
    [onStatusToggle]
  )

  // Clear tick animation after it completes
  useEffect(() => {
    if (!ticking) return
    const timer = setTimeout(() => setTicking(false), 200)
    return () => clearTimeout(timer)
  }, [ticking])

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- keyboard support via tabIndex and onKeyDown
    <div
      id={id}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5',
        'cursor-pointer transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        isActive
          ? [
              'bg-forge-surface dark:bg-forge-surface-dark',
              'ring-forge-accent dark:ring-forge-accent-dark ring-2 ring-inset',
            ]
          : [
              'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
              'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark',
            ],
        !skipAnimation && 'forge-card-enter'
      )}
      style={
        !skipAnimation && animationDelay > 0
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Quick status toggle for tasks */}
      {isTask && onStatusToggle ? (
        <button
          type="button"
          onClick={handleStatusClick}
          onKeyDown={handleStatusKeyDown}
          className={cn(
            'shrink-0 rounded p-0.5',
            'hover:bg-forge-border dark:hover:bg-forge-border-dark',
            'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
            'dark:focus-visible:ring-forge-accent-dark',
            ticking && 'forge-status-tick'
          )}
          aria-label={`Toggle status from ${node.status} to ${getNextTaskStatus(node.status)}`}
          title={`Click to mark as ${getNextTaskStatus(node.status)}`}
        >
          {TASK_STATUS_ICONS[node.status] || TASK_STATUS_ICONS.pending}
        </button>
      ) : (
        <NodeTypeIcon type={node.type} size="sm" />
      )}

      {/* Title */}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          'text-forge-text dark:text-forge-text-dark'
        )}
      >
        {node.title}
      </span>

      {/* Status badge for non-task nodes */}
      {!isTask && 'status' in node && node.status && (
        <StatusBadge status={node.status as NodeStatus} size="sm" />
      )}
    </div>
  )
}

// ============================================================================
// OutlineView Component
// ============================================================================

/**
 * Hierarchical outline view with collapsible sections.
 *
 * @example
 * <OutlineView
 *   nodes={nodesMap}
 *   activeNodeId={activeId}
 *   onNodeSelect={handleSelect}
 *   onTaskStatusToggle={handleStatusToggle}
 * />
 */
export function OutlineView({
  nodes,
  activeNodeId,
  onNodeSelect,
  onTaskStatusToggle,
  className,
}: OutlineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  // Collapse state persisted to localStorage
  const [collapseState, setCollapseState] = useState<CollapseState>(() =>
    getPersistedCollapseState()
  )

  // Type-ahead search buffer
  const [typeaheadBuffer, setTypeaheadBuffer] = useState('')
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist collapse state on change
  useEffect(() => {
    persistCollapseState(collapseState)
  }, [collapseState])

  // Group nodes by type
  const groups = useMemo(() => groupNodesByType(nodes, true), [nodes])

  // Flat list of all visible node IDs for keyboard navigation
  const visibleNodeIds = useMemo(() => {
    const ids: string[] = []
    for (const group of groups) {
      // Only include nodes from expanded sections
      if (!collapseState[group.type]) {
        for (const node of group.nodes) {
          ids.push(node.id)
        }
      }
    }
    return ids
  }, [groups, collapseState])

  // Node map for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, ForgeNode>()
    for (const group of groups) {
      for (const node of group.nodes) {
        map.set(node.id, node)
      }
    }
    return map
  }, [groups])

  // Toggle section collapse
  const toggleSection = useCallback((type: NodeType) => {
    setCollapseState((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }, [])

  // Handle task status toggle
  const handleTaskStatusToggle = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId)
      if (node && isTaskNode(node) && onTaskStatusToggle) {
        const nextStatus = getNextTaskStatus(node.status)
        onTaskStatusToggle(nodeId, nextStatus)
      }
    },
    [nodeMap, onTaskStatusToggle]
  )

  // Get focused node index
  const getFocusedIndex = useCallback((): number => {
    const focused = document.activeElement
    if (!focused || !focused.id) return -1
    return visibleNodeIds.indexOf(focused.id.replace('outline-item-', ''))
  }, [visibleNodeIds])

  // Focus item by index
  const focusItemAtIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < visibleNodeIds.length) {
        const nodeId = visibleNodeIds[index]
        const element = document.getElementById(`outline-item-${nodeId}`)
        element?.focus()
      }
    },
    [visibleNodeIds]
  )

  // Type-ahead search
  const handleTypeahead = useCallback(
    (char: string) => {
      // Clear existing timeout
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current)
      }

      const newBuffer = typeaheadBuffer + char.toLowerCase()
      setTypeaheadBuffer(newBuffer)

      // Find first matching node
      const matchIndex = visibleNodeIds.findIndex((id) => {
        const node = nodeMap.get(id)
        return node?.title.toLowerCase().startsWith(newBuffer)
      })

      if (matchIndex >= 0) {
        focusItemAtIndex(matchIndex)
      }

      // Clear buffer after 500ms of inactivity
      typeaheadTimeoutRef.current = setTimeout(() => {
        setTypeaheadBuffer('')
      }, 500)
    },
    [typeaheadBuffer, visibleNodeIds, nodeMap, focusItemAtIndex]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = getFocusedIndex()

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault()
          const newIndex =
            currentIndex > 0 ? currentIndex - 1 : visibleNodeIds.length - 1
          focusItemAtIndex(newIndex)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          const newIndex =
            currentIndex < visibleNodeIds.length - 1 ? currentIndex + 1 : 0
          focusItemAtIndex(newIndex)
          break
        }
        case 'Home': {
          event.preventDefault()
          focusItemAtIndex(0)
          break
        }
        case 'End': {
          event.preventDefault()
          focusItemAtIndex(visibleNodeIds.length - 1)
          break
        }
        case 'Enter': {
          event.preventDefault()
          if (currentIndex >= 0 && currentIndex < visibleNodeIds.length) {
            onNodeSelect(visibleNodeIds[currentIndex])
          }
          break
        }
        default: {
          // Type-ahead for single printable characters
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault()
            handleTypeahead(event.key)
          }
        }
      }
    },
    [
      getFocusedIndex,
      visibleNodeIds,
      focusItemAtIndex,
      onNodeSelect,
      handleTypeahead,
    ]
  )

  // Check if there are any nodes
  const hasNodes = groups.some((g) => g.nodes.length > 0)

  if (!hasNodes) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-12 text-center',
          className
        )}
      >
        <div className="bg-forge-muted dark:bg-forge-muted-dark h-1.5 w-1.5 rounded-full" />
        <h3 className="text-forge-text-secondary dark:text-forge-text-secondary-dark font-mono text-xs font-medium tracking-[0.1em] uppercase">
          No Nodes
        </h3>
        <p className="text-forge-muted dark:text-forge-muted-dark text-sm">
          Create your first node to see it here.
        </p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <nav
      ref={containerRef}
      className={cn('flex flex-col focus:outline-none', className)}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-label="Project outline"
      aria-roledescription="navigable outline"
      onKeyDown={handleKeyDown}
    >
      {groups.map((group) => (
        <CollapsibleSection
          key={group.type}
          id={`outline-section-${group.type}`}
          title={group.label}
          icon={SECTION_ICONS[group.type]}
          expanded={!collapseState[group.type]}
          onToggle={() => toggleSection(group.type)}
          itemCount={group.nodes.length}
          nodeType={group.type}
        >
          {group.nodes.length > 0 ? (
            <div className="space-y-0.5">
              {group.nodes.map((node, index) => (
                <OutlineItem
                  key={node.id}
                  id={`outline-item-${node.id}`}
                  node={node}
                  isActive={node.id === activeNodeId}
                  onClick={() => onNodeSelect(node.id)}
                  onStatusToggle={
                    isTaskNode(node)
                      ? () => handleTaskStatusToggle(node.id)
                      : undefined
                  }
                  tabIndex={index === 0 && !collapseState[group.type] ? 0 : -1}
                  animationDelay={index < 10 ? index * 30 : 0}
                  skipAnimation={reducedMotion || index >= 10}
                />
              ))}
            </div>
          ) : (
            <p className="text-forge-muted dark:text-forge-muted-dark py-2 font-mono text-xs">
              --
            </p>
          )}
        </CollapsibleSection>
      ))}
    </nav>
  )
}

export default OutlineView
