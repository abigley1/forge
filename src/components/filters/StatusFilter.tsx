/**
 * Status Filter Component
 *
 * Checkbox filter for node statuses.
 * Shows all available statuses organized by category.
 * State is stored in URL via useFilters hook.
 */

import { useId } from 'react'

import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type NodeStatus } from '@/components/nodes/config'

// ============================================================================
// Types
// ============================================================================

interface StatusFilterProps {
  /** Currently selected statuses */
  selectedStatuses: NodeStatus[]
  /** Callback when a status is toggled */
  onToggleStatus: (status: NodeStatus) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

/** Status categories for organization */
const STATUS_CATEGORIES: {
  label: string
  statuses: NodeStatus[]
}[] = [
  {
    label: 'Task',
    statuses: ['pending', 'in_progress', 'blocked', 'complete'],
  },
  {
    label: 'Decision/Component',
    statuses: ['considering', 'selected', 'rejected'],
  },
]

// ============================================================================
// Component
// ============================================================================

/**
 * Checkbox filter for statuses
 */
export function StatusFilter({
  selectedStatuses,
  onToggleStatus,
  className,
}: StatusFilterProps) {
  const groupId = useId()

  return (
    <div className={cn('space-y-2', className)}>
      <span
        id={groupId}
        className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-xs font-medium"
      >
        Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
      </span>

      <div role="group" aria-labelledby={groupId} className="space-y-2">
        {STATUS_CATEGORIES.map((category) => (
          <div key={category.label} className="space-y-1">
            <span className="text-forge-muted dark:text-forge-muted-dark block text-[10px] font-medium tracking-wider uppercase">
              {category.label}
            </span>
            <div className="space-y-0.5">
              {category.statuses.map((status) => {
                const config = STATUS_CONFIG[status]
                const isSelected = selectedStatuses.includes(status)
                const checkboxId = `${groupId}-${status}`

                return (
                  <label
                    key={status}
                    htmlFor={checkboxId}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5',
                      'cursor-pointer',
                      'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                      'transition-colors duration-150',
                      'min-h-[32px]'
                    )}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleStatus(status)}
                      className={cn(
                        'h-4 w-4 rounded',
                        'border-forge-border dark:border-forge-border-dark',
                        'text-forge-text dark:text-forge-text-dark',
                        'focus:ring-forge-accent dark:focus:ring-forge-accent-dark focus:ring-2 focus:ring-offset-0',
                        'cursor-pointer'
                      )}
                    />
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        config.dotColor
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-xs">
                      {config.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
