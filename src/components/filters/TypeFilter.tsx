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
        className="block text-xs font-medium text-gray-700 dark:text-gray-300"
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
                'min-h-[36px]', // Accessible touch target
                'transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300',
                isSelected
                  ? [
                      'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
                      'hover:bg-gray-800 dark:hover:bg-gray-200',
                    ]
                  : [
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                      'hover:bg-gray-200 dark:hover:bg-gray-700',
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
