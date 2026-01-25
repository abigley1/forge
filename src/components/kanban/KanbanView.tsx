/**
 * KanbanView Component
 *
 * A visual board view organizing tasks by status columns with drag-and-drop.
 * Features:
 * - Columns for each task status: Pending, In Progress, Blocked, Complete
 * - Drag and drop cards between columns to change status
 * - Task cards show title, priority, blocked indicator, tags
 * - Click card to open detail panel
 * - Keyboard navigation support
 * - Quick actions on hover
 * - Column collapse option
 * - Respects prefers-reduced-motion
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  Check,
  Clock,
  Loader2,
  AlertTriangle,
  GripVertical,
  ChevronUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNodesStore } from '@/store'
import { isTaskNode, type TaskNode, type TaskStatus } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface KanbanViewProps {
  /** Map of filtered nodes to display */
  nodes?: Map<string, import('@/types/nodes').ForgeNode>
  /** Called when a task card is selected */
  onNodeSelect?: (nodeId: string | null) => void
  /** Currently selected node ID */
  activeNodeId?: string | null
  /** Additional CSS classes */
  className?: string
}

interface KanbanColumn {
  id: TaskStatus
  label: string
  icon: typeof Clock
  color: string
}

interface DragState {
  draggedId: string | null
  overColumn: TaskStatus | null
  overCardId: string | null
}

// ============================================================================
// Constants
// ============================================================================

const COLUMNS: KanbanColumn[] = [
  {
    id: 'pending',
    label: 'Pending',
    icon: Clock,
    color: 'bg-gray-100 dark:bg-gray-800',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: Loader2,
    color: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    id: 'blocked',
    label: 'Blocked',
    icon: AlertTriangle,
    color: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: Check,
    color: 'bg-green-50 dark:bg-green-950',
  },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

// ============================================================================
// KanbanCard Component
// ============================================================================

interface KanbanCardProps {
  task: TaskNode
  isSelected: boolean
  isDragging: boolean
  onSelect: () => void
  onStatusChange: (status: TaskStatus) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
}

function KanbanCard({
  task,
  isSelected,
  isDragging,
  onSelect,
  onStatusChange,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const isBlocked = task.dependsOn.length > 0 && task.status !== 'complete'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSelect()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Find next sibling card and focus it
        const nextCard = cardRef.current?.nextElementSibling as HTMLElement
        nextCard?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Find previous sibling card and focus it
        const prevCard = cardRef.current?.previousElementSibling as HTMLElement
        prevCard?.focus()
      }
    },
    [onSelect]
  )

  const handleMarkComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onStatusChange('complete')
    },
    [onStatusChange]
  )

  return (
    <div
      ref={cardRef}
      data-testid={`kanban-card-${task.id}`}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
      data-blocked={isBlocked}
      className={cn(
        'group relative rounded-lg border bg-white p-3 shadow-sm',
        'cursor-pointer transition-all duration-150',
        'dark:border-gray-700 dark:bg-gray-900',
        'hover:border-gray-300 hover:shadow-md dark:hover:border-gray-600',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
        'motion-reduce:transition-none',
        isDragging && 'rotate-2 opacity-50',
        isSelected && 'border-blue-500 ring-2 ring-blue-500'
      )}
    >
      {/* Drag handle */}
      <div
        data-drag-handle="true"
        aria-label="Drag to move card"
        className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>

      {/* Title */}
      <h4 className="pr-2 pl-4 font-medium text-gray-900 dark:text-gray-100">
        {task.title}
      </h4>

      {/* Meta info */}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
        {/* Priority badge */}
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium',
            PRIORITY_COLORS[task.priority]
          )}
        >
          {task.priority}
        </span>

        {/* Blocked indicator */}
        {isBlocked && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Blocked
          </span>
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-4">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Quick actions */}
      {showQuickActions && task.status !== 'complete' && (
        <div
          data-testid="quick-actions"
          className="absolute top-1 right-1 flex gap-1"
        >
          <button
            type="button"
            onClick={handleMarkComplete}
            aria-label="Mark complete"
            className={cn(
              'rounded-md p-1',
              'bg-gray-100 hover:bg-green-100 dark:bg-gray-800 dark:hover:bg-green-900',
              'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400',
              'transition-colors'
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// KanbanColumn Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn
  tasks: TaskNode[]
  activeNodeId: string | null
  dragState: DragState
  isCollapsed: boolean
  onToggleCollapse: () => void
  onNodeSelect: (nodeId: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

function KanbanColumnComponent({
  column,
  tasks,
  activeNodeId,
  dragState,
  isCollapsed,
  onToggleCollapse,
  onNodeSelect,
  onStatusChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  const Icon = column.icon
  const isDropTarget = dragState.overColumn === column.id

  return (
    <div
      data-testid={`kanban-column-${column.id}`}
      aria-label={`${column.label} column with ${tasks.length} tasks`}
      data-collapsed={isCollapsed}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'flex flex-col rounded-lg',
        column.color,
        isCollapsed ? 'w-12' : 'max-w-[360px] min-w-[280px] flex-1',
        isDropTarget && 'ring-2 ring-blue-400 ring-inset',
        'transition-all duration-200 motion-reduce:transition-none'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
        {isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={`Expand ${column.label} column`}
            className="flex w-full items-center justify-center"
          >
            <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
          </button>
        ) : (
          <>
            <h3 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{column.label}</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {tasks.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={`Collapse ${column.label} column`}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Column content */}
      {!isCollapsed && (
        <div className="flex-1 space-y-2 overflow-auto p-2">
          {tasks.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Drop tasks here
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                isSelected={activeNodeId === task.id}
                isDragging={dragState.draggedId === task.id}
                onSelect={() => onNodeSelect(task.id)}
                onStatusChange={(status) => onStatusChange(task.id, status)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', task.id)
                  onDragStart(task.id)
                }}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// KanbanView Component
// ============================================================================

export function KanbanView({
  nodes: propNodes,
  onNodeSelect,
  activeNodeId = null,
  className,
}: KanbanViewProps) {
  const storeNodes = useNodesStore((state) => state.nodes)
  const updateNode = useNodesStore((state) => state.updateNode)

  // Use prop nodes if provided (for filtering), otherwise use store nodes
  const nodes = propNodes ?? storeNodes

  const [collapsedColumns, setCollapsedColumns] = useState<Set<TaskStatus>>(
    new Set()
  )
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    overColumn: null,
    overCardId: null,
  })

  // Get only task nodes
  const taskNodes = useMemo(() => {
    const tasks: TaskNode[] = []
    nodes.forEach((node) => {
      if (isTaskNode(node)) {
        tasks.push(node)
      }
    })
    return tasks
  }, [nodes])

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskNode[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      complete: [],
    }

    taskNodes.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })

    // Sort each column by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    Object.values(grouped).forEach((tasks) => {
      tasks.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      )
    })

    return grouped
  }, [taskNodes])

  // Handle node selection
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      onNodeSelect?.(nodeId)
    },
    [onNodeSelect]
  )

  // Handle status change
  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      updateNode(taskId, { status })
    },
    [updateNode]
  )

  // Handle column collapse toggle
  const handleToggleCollapse = useCallback((columnId: TaskStatus) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  // Drag handlers
  const handleDragStart = useCallback((taskId: string) => {
    setDragState((prev) => ({ ...prev, draggedId: taskId }))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, overColumn: null, overCardId: null })
  }, [])

  const handleDragOver = useCallback(
    (columnId: TaskStatus) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragState((prev) => ({ ...prev, overColumn: columnId }))
    },
    []
  )

  const handleDrop = useCallback(
    (columnId: TaskStatus) => (e: React.DragEvent) => {
      e.preventDefault()
      const taskId = e.dataTransfer.getData('text/plain')
      if (taskId && dragState.draggedId) {
        handleStatusChange(taskId, columnId)
      }
      handleDragEnd()
    },
    [dragState.draggedId, handleStatusChange, handleDragEnd]
  )

  return (
    <div className={cn('flex h-full gap-4 overflow-x-auto p-4', className)}>
      {COLUMNS.map((column) => (
        <KanbanColumnComponent
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.id]}
          activeNodeId={activeNodeId}
          dragState={dragState}
          isCollapsed={collapsedColumns.has(column.id)}
          onToggleCollapse={() => handleToggleCollapse(column.id)}
          onNodeSelect={handleNodeSelect}
          onStatusChange={handleStatusChange}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(column.id)}
          onDrop={handleDrop(column.id)}
        />
      ))}
    </div>
  )
}

export default KanbanView
