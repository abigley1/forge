/**
 * Type Filter Component
 *
 * Toggle buttons for filtering by node type.
 * State is stored in URL via useFilters hook.
 */

import { useId } from 'react'

import { cn } from '@/lib/utils'
import { NodeType } from '@/types/nodes'
import { NODE_TYPE_ICON_CONFIG } from '@/components/nodes/config'

// ============================================================================
// Types
// ============================================================================

interface TypeFilterProps {
  /** Currently selected types */
  selectedTypes: NodeType[]
  /** Callback when types change */
  onToggleType: (type: NodeType) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

/** All node types in display order */
const ALL_TYPES: NodeType[] = [
  NodeType.Task,
  NodeType.Decision,
  NodeType.Component,
  NodeType.Note,
]

// ============================================================================
// Component
// ============================================================================

/**
 * Toggle buttons for filtering by node type
 */
export function TypeFilter({
  selectedTypes,
  onToggleType,
  className,
}: TypeFilterProps) {
  const groupId = useId()

  return (
    <div className={cn('space-y-1.5', className)}>
      <span
        id={groupId}
        className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-xs font-medium"
      >
        Type
      </span>
      <div
        role="group"
        aria-labelledby={groupId}
        className="flex flex-wrap gap-1"
      >
        {ALL_TYPES.map((type) => {
          const config = NODE_TYPE_ICON_CONFIG[type]
          const Icon = config.icon
          const isSelected = selectedTypes.includes(type)

          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleType(type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5',
                'text-xs font-medium',
                'min-h-[36px]',
                'transition-colors duration-150',
                'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
                isSelected
                  ? [
                      'bg-forge-text dark:bg-forge-text-dark dark:text-forge-text text-white',
                      'hover:bg-forge-text/90 dark:hover:bg-forge-text-dark/90',
                    ]
                  : [
                      'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark',
                      'hover:bg-forge-border dark:hover:bg-forge-border-dark',
                    ]
              )}
              aria-pressed={isSelected}
              aria-label={`Filter by ${config.label}${isSelected ? ' (active)' : ''}`}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  isSelected ? 'text-current' : config.color
                )}
                aria-hidden="true"
              />
              <span>{config.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
