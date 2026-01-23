/**
 * MilestoneOutlineView - Task outline grouped by milestone
 *
 * Displays tasks organized by milestone with:
 * - Collapsible milestone sections
 * - Progress indicators showing completion status
 * - Keyboard navigation
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Milestone, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  groupTasksByMilestone,
  getPersistedMilestoneCollapseState,
  persistMilestoneCollapseState,
  type MilestoneGroup,
  type MilestoneCollapseState,
  type MilestoneProgress,
} from '@/lib/outline'
import type { ForgeNode, TaskNode, TaskStatus } from '@/types'
import { NodeTypeIcon, StatusBadge } from '@/components/nodes'

// ============================================================================
// Progress Indicator
// ============================================================================

interface ProgressIndicatorProps {
  progress: MilestoneProgress
  className?: string
}

function ProgressIndicator({ progress, className }: ProgressIndicatorProps) {
  const { total, completed, percentage } = progress

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress bar - uses scaleX transform for animation (not width) per CLAUDE.md */}
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full origin-left transition-transform duration-200',
            percentage === 100
              ? 'bg-green-500'
              : percentage > 0
                ? 'bg-blue-500'
                : 'bg-gray-300 dark:bg-gray-600'
          )}
          style={{ transform: `scaleX(${percentage / 100})` }}
        />
      </div>
      {/* Count */}
      <span
        className={cn(
          'text-xs tabular-nums',
          percentage === 100
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {completed}/{total}
      </span>
    </div>
  )
}

// ============================================================================
// Milestone Item
// ============================================================================

interface MilestoneItemProps {
  task: TaskNode
  isActive: boolean
  onClick: () => void
  onStatusToggle?: (nodeId: string, newStatus: TaskStatus) => void
  tabIndex?: number
  id: string
}

/** Status cycle for quick toggle */
const TASK_STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'complete',
  complete: 'pending',
  blocked: 'pending', // Blocked tasks go to pending when toggled
}

function MilestoneItem({
  task,
  isActive,
  onClick,
  onStatusToggle,
  tabIndex = 0,
  id,
}: MilestoneItemProps) {
  const handleStatusClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onStatusToggle) {
        onStatusToggle(task.id, TASK_STATUS_CYCLE[task.status])
      }
    },
    [task.id, task.status, onStatusToggle]
  )

  const handleStatusKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (onStatusToggle) {
          onStatusToggle(task.id, TASK_STATUS_CYCLE[task.status])
        }
      }
    },
    [task.id, task.status, onStatusToggle]
  )

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- keyboard support via tabIndex and onKeyDown
    <div
      id={id}
      aria-current={isActive ? 'true' : undefined}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none focus-visible:ring-inset',
        'dark:focus-visible:ring-gray-300',
        isActive
          ? 'bg-gray-100 ring-2 ring-gray-300 ring-inset dark:bg-gray-800 dark:ring-gray-600'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <NodeTypeIcon type={task.type} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
        {task.title}
      </span>
      <button
        type="button"
        onClick={handleStatusClick}
        onKeyDown={handleStatusKeyDown}
        className={cn(
          'rounded-sm p-2', // min 44x44px touch target
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none'
        )}
        aria-label={`Toggle status of ${task.title}`}
      >
        <StatusBadge status={task.status} size="sm" />
      </button>
    </div>
  )
}

// ============================================================================
// Milestone Section
// ============================================================================

interface MilestoneSectionProps {
  group: MilestoneGroup
  expanded: boolean
  onToggle: () => void
  activeNodeId?: string
  onNodeSelect: (nodeId: string) => void
  onTaskStatusToggle?: (nodeId: string, newStatus: TaskStatus) => void
}

function MilestoneSection({
  group,
  expanded,
  onToggle,
  activeNodeId,
  onNodeSelect,
  onTaskStatusToggle,
}: MilestoneSectionProps) {
  const contentId = `milestone-content-${group.milestone || 'none'}`

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none focus-visible:ring-inset',
          'dark:focus-visible:ring-gray-300'
        )}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {/* Chevron */}
        {expanded ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        )}

        {/* Milestone icon */}
        <Milestone
          className="h-4 w-4 shrink-0 text-gray-500"
          aria-hidden="true"
        />

        {/* Label */}
        <span className="flex-1 truncate text-left">{group.label}</span>

        {/* Progress indicator */}
        <ProgressIndicator progress={group.progress} />
      </button>

      {/* Content */}
      <div
        id={contentId}
        className={cn('overflow-hidden', expanded ? 'block' : 'hidden')}
        aria-hidden={!expanded}
      >
        <div className="space-y-1 px-4 pb-3">
          {group.tasks.map((task) => (
            <MilestoneItem
              key={task.id}
              id={`milestone-item-${task.id}`}
              task={task}
              isActive={task.id === activeNodeId}
              onClick={() => onNodeSelect(task.id)}
              onStatusToggle={onTaskStatusToggle}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export interface MilestoneOutlineViewProps {
  /** All nodes (will filter to tasks only) */
  nodes: Map<string, ForgeNode>
  /** Currently active/selected node ID */
  activeNodeId?: string
  /** Called when a node is selected */
  onNodeSelect: (nodeId: string) => void
  /** Called when a task status is toggled */
  onTaskStatusToggle?: (nodeId: string, newStatus: TaskStatus) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * MilestoneOutlineView displays tasks grouped by milestone with progress indicators.
 */
export function MilestoneOutlineView({
  nodes,
  activeNodeId,
  onNodeSelect,
  onTaskStatusToggle,
  className,
}: MilestoneOutlineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Collapse state persisted to localStorage
  const [collapseState, setCollapseState] = useState<MilestoneCollapseState>(
    () => getPersistedMilestoneCollapseState()
  )

  // Persist collapse state on change
  useEffect(() => {
    persistMilestoneCollapseState(collapseState)
  }, [collapseState])

  // Group tasks by milestone
  const groups = useMemo(() => groupTasksByMilestone(nodes), [nodes])

  // Flat list of all visible task IDs for keyboard navigation
  const visibleTaskIds = useMemo(() => {
    const ids: string[] = []
    for (const group of groups) {
      const key = group.milestone || '__none__'
      if (!collapseState[key]) {
        for (const task of group.tasks) {
          ids.push(task.id)
        }
      }
    }
    return ids
  }, [groups, collapseState])

  // Toggle section collapse
  const toggleSection = useCallback((milestone: string) => {
    const key = milestone || '__none__'
    setCollapseState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  // Get focused task index
  const getFocusedIndex = useCallback((): number => {
    const focused = document.activeElement
    if (!focused || !focused.id) return -1
    return visibleTaskIds.indexOf(focused.id.replace('milestone-item-', ''))
  }, [visibleTaskIds])

  // Focus task by index
  const focusTaskAtIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < visibleTaskIds.length) {
        const taskId = visibleTaskIds[index]
        const element = document.getElementById(`milestone-item-${taskId}`)
        element?.focus()
      }
    },
    [visibleTaskIds]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = getFocusedIndex()

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault()
          const newIndex =
            currentIndex > 0 ? currentIndex - 1 : visibleTaskIds.length - 1
          focusTaskAtIndex(newIndex)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          const newIndex =
            currentIndex < visibleTaskIds.length - 1 ? currentIndex + 1 : 0
          focusTaskAtIndex(newIndex)
          break
        }
        case 'Home': {
          event.preventDefault()
          focusTaskAtIndex(0)
          break
        }
        case 'End': {
          event.preventDefault()
          focusTaskAtIndex(visibleTaskIds.length - 1)
          break
        }
        case 'Enter': {
          event.preventDefault()
          if (currentIndex >= 0 && currentIndex < visibleTaskIds.length) {
            onNodeSelect(visibleTaskIds[currentIndex])
          }
          break
        }
      }
    },
    [getFocusedIndex, visibleTaskIds, focusTaskAtIndex, onNodeSelect]
  )

  // Check if there are any tasks
  const hasTasks = groups.some((g) => g.tasks.length > 0)

  if (!hasTasks) {
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
          No tasks yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create tasks and assign milestones to see them here.
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
      aria-label="Tasks by milestone"
      aria-roledescription="navigable outline"
      onKeyDown={handleKeyDown}
    >
      {groups.map((group) => (
        <MilestoneSection
          key={group.milestone || '__none__'}
          group={group}
          expanded={!collapseState[group.milestone || '__none__']}
          onToggle={() => toggleSection(group.milestone)}
          activeNodeId={activeNodeId}
          onNodeSelect={onNodeSelect}
          onTaskStatusToggle={onTaskStatusToggle}
        />
      ))}
    </nav>
  )
}
