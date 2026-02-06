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
import { useReducedMotion } from '@/hooks'
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
  bg: string
  headerBorder: string
  iconColor: string
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
    bg: 'bg-forge-surface dark:bg-forge-surface-dark',
    headerBorder: 'border-l-forge-muted dark:border-l-forge-muted-dark',
    iconColor: 'text-forge-muted dark:text-forge-muted-dark',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: Loader2,
    bg: 'bg-forge-surface dark:bg-forge-surface-dark',
    headerBorder: 'border-l-forge-accent dark:border-l-forge-accent-dark',
    iconColor: 'text-forge-accent dark:text-forge-accent-dark',
  },
  {
    id: 'blocked',
    label: 'Blocked',
    icon: AlertTriangle,
    bg: 'bg-forge-surface dark:bg-forge-surface-dark',
    headerBorder: 'border-l-red-500 dark:border-l-red-500',
    iconColor: 'text-red-500 dark:text-red-500',
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: Check,
    bg: 'bg-forge-surface dark:bg-forge-surface-dark',
    headerBorder:
      'border-l-forge-node-assembly-text dark:border-l-forge-node-assembly-text-dark',
    iconColor:
      'text-forge-node-assembly-text dark:text-forge-node-assembly-text-dark',
  },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-forge-accent-subtle text-forge-accent-hover font-mono text-[10px] tracking-[0.1em] uppercase dark:bg-forge-accent-subtle-dark dark:text-forge-accent-hover-dark',
  medium:
    'bg-forge-border text-forge-text-secondary font-mono text-[10px] tracking-[0.1em] uppercase dark:bg-forge-border-dark dark:text-forge-text-secondary-dark',
  low: 'bg-forge-border-subtle text-forge-muted font-mono text-[10px] tracking-[0.1em] uppercase dark:bg-forge-border-subtle-dark dark:text-forge-muted-dark',
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
  animationDelay?: number
  skipAnimation?: boolean
}

function KanbanCard({
  task,
  isSelected,
  isDragging,
  onSelect,
  onStatusChange,
  onDragStart,
  onDragEnd,
  animationDelay = 0,
  skipAnimation = false,
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
        'group border-forge-border bg-forge-paper relative rounded-md border p-3 shadow-sm',
        'cursor-pointer transition-colors duration-150',
        'dark:border-forge-border-dark dark:bg-forge-paper-dark',
        'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
        'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        'dark:focus-visible:ring-forge-accent-dark',
        'motion-reduce:transition-none',
        isDragging && 'rotate-2 opacity-50',
        isSelected &&
          'ring-forge-accent bg-forge-surface dark:ring-forge-accent-dark dark:bg-forge-surface-dark ring-2 ring-inset',
        !skipAnimation && 'forge-card-enter'
      )}
      style={
        !skipAnimation && animationDelay > 0
          ? { animationDelay: `${animationDelay}ms` }
          : undefined
      }
    >
      {/* Drag handle */}
      <div
        data-drag-handle="true"
        aria-label="Drag to move card"
        className="absolute top-1/2 left-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical
          className="text-forge-muted dark:text-forge-muted-dark h-4 w-4"
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h4 className="text-forge-text dark:text-forge-text-dark min-w-0 truncate pr-2 pl-4 font-medium">
        {task.title}
      </h4>

      {/* Meta info */}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
        {/* Priority badge */}
        <span
          className={cn(
            'rounded px-1.5 py-0.5',
            PRIORITY_COLORS[task.priority]
          )}
        >
          {task.priority}
        </span>

        {/* Blocked indicator */}
        {isBlocked && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-red-500 uppercase dark:text-red-400">
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
              className="bg-forge-border-subtle text-forge-text-secondary dark:bg-forge-border-subtle-dark dark:text-forge-text-secondary-dark rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.05em]"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-forge-muted dark:text-forge-muted-dark font-mono text-[10px]">
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
              'bg-forge-border-subtle hover:bg-forge-border dark:bg-forge-border-subtle-dark dark:hover:bg-forge-border-dark',
              'text-forge-muted hover:text-forge-node-assembly-text dark:text-forge-muted-dark dark:hover:text-forge-node-assembly-text-dark',
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
  reducedMotion: boolean
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
  reducedMotion,
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
        'border-forge-border flex flex-col rounded-md border',
        column.bg,
        'dark:border-forge-border-dark',
        isCollapsed ? 'w-12' : 'max-w-[360px] min-w-[280px] flex-1',
        isDropTarget &&
          'ring-forge-accent dark:ring-forge-accent-dark ring-2 ring-inset',
        'transition-colors duration-200 motion-reduce:transition-none'
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          'border-forge-border flex items-center justify-between border-b p-3',
          'border-l-2',
          column.headerBorder,
          'dark:border-b-forge-border-dark'
        )}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={`Expand ${column.label} column`}
            className="flex w-full items-center justify-center"
          >
            <Icon
              className={cn('h-4 w-4', column.iconColor)}
              aria-hidden="true"
            />
          </button>
        ) : (
          <>
            <h3 className="text-forge-text-secondary dark:text-forge-text-secondary-dark flex items-center gap-2 font-mono text-xs tracking-[0.1em] uppercase">
              <Icon
                className={cn('h-4 w-4', column.iconColor)}
                aria-hidden="true"
              />
              <span>{column.label}</span>
              <span className="text-forge-muted dark:text-forge-muted-dark font-mono text-xs tabular-nums">
                {tasks.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={`Collapse ${column.label} column`}
              className="text-forge-muted hover:bg-forge-border dark:text-forge-muted-dark dark:hover:bg-forge-border-dark rounded p-1"
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
            <div className="border-forge-border dark:border-forge-border-dark flex h-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed">
              <span
                className="bg-forge-muted dark:bg-forge-muted-dark h-1 w-1 rounded-full"
                aria-hidden="true"
              />
              <p className="text-forge-muted dark:text-forge-muted-dark font-mono text-[10px] tracking-[0.1em] uppercase">
                Drop tasks here
              </p>
            </div>
          ) : (
            tasks.map((task, index) => (
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
                animationDelay={index * 30}
                skipAnimation={reducedMotion || index >= 10}
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
  const reducedMotion = useReducedMotion()

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
    <div
      className={cn(
        'bg-forge-paper dark:bg-forge-paper-dark flex h-full gap-4 overflow-x-auto p-4',
        className
      )}
    >
      {COLUMNS.map((column) => (
        <KanbanColumnComponent
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.id]}
          activeNodeId={activeNodeId}
          dragState={dragState}
          isCollapsed={collapsedColumns.has(column.id)}
          reducedMotion={reducedMotion}
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
