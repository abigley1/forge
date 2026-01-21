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
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { NodeType, isTaskNode } from '@/types/nodes'
import type { ForgeNode, TaskStatus } from '@/types/nodes'
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
 * Icons for task status toggle button
 */
const TASK_STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-yellow-500" aria-hidden="true" />,
  in_progress: (
    <CircleDot className="h-4 w-4 text-blue-500" aria-hidden="true" />
  ),
  complete: (
    <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
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
}: OutlineItemProps) {
  const isTask = isTaskNode(node)

  const handleStatusClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      onStatusToggle?.()
    },
    [onStatusToggle]
  )

  const handleStatusKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation()
        event.preventDefault()
        onStatusToggle?.()
      }
    },
    [onStatusToggle]
  )

  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5',
        'cursor-pointer transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        isActive
          ? [
              'bg-gray-100 dark:bg-gray-800',
              'ring-2 ring-gray-900 ring-inset dark:ring-gray-100',
            ]
          : [
              'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              'focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500',
            ]
      )}
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
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none'
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
          'text-gray-900 dark:text-gray-100'
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
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <FileText
          className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
          aria-hidden="true"
        />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          No nodes yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create your first node to see it here.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col focus:outline-none', className)}
      role="listbox"
      tabIndex={0}
      aria-label="Project outline"
      aria-activedescendant={
        activeNodeId ? `outline-item-${activeNodeId}` : undefined
      }
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
                />
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
              No {group.label.toLowerCase()} yet
            </p>
          )}
        </CollapsibleSection>
      ))}
    </div>
  )
}

export default OutlineView
