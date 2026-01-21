/**
 * PrioritySelector - Segmented control for task priority
 *
 * Features:
 * - Three-button segmented control (High/Medium/Low)
 * - Keyboard navigation with arrow keys
 * - Visual feedback for selected state
 */

import { useRef, useCallback, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

export interface PrioritySelectorProps {
  /** Current priority value */
  value: TaskPriority
  /** Called when priority changes */
  onChange: (value: TaskPriority) => void
  /** Optional label */
  label?: string
  /** Optional class name */
  className?: string
  /** Whether the selector is disabled */
  disabled?: boolean
  /** ID for accessibility */
  id?: string
}

interface PriorityOption {
  value: TaskPriority
  label: string
  color: string
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'high',
    label: 'High',
    color: 'text-red-600 dark:text-red-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    value: 'low',
    label: 'Low',
    color: 'text-green-600 dark:text-green-400',
  },
]

/**
 * Segmented control for task priority selection
 */
export function PrioritySelector({
  value,
  onChange,
  label = 'Priority',
  className,
  disabled = false,
  id = 'priority-selector',
}: PrioritySelectorProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = PRIORITY_OPTIONS.findIndex(
        (opt) => opt.value === value
      )

      let newIndex = currentIndex

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : PRIORITY_OPTIONS.length - 1
          break

        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex =
            currentIndex < PRIORITY_OPTIONS.length - 1 ? currentIndex + 1 : 0
          break

        case 'Home':
          e.preventDefault()
          newIndex = 0
          break

        case 'End':
          e.preventDefault()
          newIndex = PRIORITY_OPTIONS.length - 1
          break

        default:
          return
      }

      if (newIndex !== currentIndex) {
        onChange(PRIORITY_OPTIONS[newIndex].value)
        // Focus the newly selected button
        const buttons = groupRef.current?.querySelectorAll('button')
        buttons?.[newIndex]?.focus()
      }
    },
    [value, onChange]
  )

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        id={`${id}-label`}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className={cn(
          'inline-flex rounded-lg border border-gray-200 p-1',
          'bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
          disabled && 'opacity-50'
        )}
      >
        {PRIORITY_OPTIONS.map((option, index) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => !disabled && onChange(option.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 text-sm font-medium',
                'rounded-md transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:outline-none',
                'focus-visible:ring-gray-950 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-gray-300',
                // Selected state
                isSelected && [
                  'bg-white shadow-sm',
                  'dark:bg-gray-700',
                  option.color,
                ],
                // Unselected state
                !isSelected && [
                  'text-gray-600 hover:text-gray-900',
                  'dark:text-gray-400 dark:hover:text-gray-200',
                ],
                // First item
                index === 0 && 'rounded-l-md',
                // Last item
                index === PRIORITY_OPTIONS.length - 1 && 'rounded-r-md',
                // Disabled
                disabled && 'cursor-not-allowed'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
