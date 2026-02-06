/**
 * ContainerFields - Editable fields for container nodes (Subsystem, Assembly, Module)
 *
 * Provides:
 * - Requirements list (add/remove/reorder)
 */

import {
  useCallback,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ContainerFieldsProps {
  /** Array of requirement strings */
  requirements: string[]
  /** Called when requirements change */
  onChange: (updates: { requirements: string[] }) => void
  /** Whether fields are disabled */
  disabled?: boolean
  /** Optional class name */
  className?: string
}

/**
 * Editable fields for container nodes including requirements list
 */
export function ContainerFields({
  requirements = [],
  onChange,
  disabled = false,
  className,
}: ContainerFieldsProps) {
  const [newRequirement, setNewRequirement] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleAddRequirement = useCallback(() => {
    const trimmed = newRequirement.trim()
    if (trimmed) {
      onChange({ requirements: [...requirements, trimmed] })
      setNewRequirement('')
    }
  }, [newRequirement, requirements, onChange])

  const handleRemoveRequirement = useCallback(
    (index: number) => {
      const newReqs = requirements.filter((_, i) => i !== index)
      onChange({ requirements: newReqs })
    },
    [requirements, onChange]
  )

  const handleRequirementChange = useCallback(
    (index: number, value: string) => {
      const newReqs = [...requirements]
      newReqs[index] = value
      onChange({ requirements: newReqs })
    },
    [requirements, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddRequirement()
      }
    },
    [handleAddRequirement]
  )

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index) return

      const newReqs = [...requirements]
      const draggedItem = newReqs[draggedIndex]
      newReqs.splice(draggedIndex, 1)
      newReqs.splice(index, 0, draggedItem)
      onChange({ requirements: newReqs })
      setDraggedIndex(index)
    },
    [draggedIndex, requirements, onChange]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  const inputClassName = cn(
    'w-full rounded-md border border-forge-border px-3 py-2',
    'text-sm text-forge-text',
    'placeholder:text-forge-muted',
    'focus:outline-none focus:ring-2 focus:ring-forge-accent focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:bg-forge-surface disabled:opacity-50',
    'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
    'dark:placeholder:text-forge-muted-dark dark:focus:ring-forge-accent-dark'
  )

  const labelClassName = cn(
    'block text-sm font-medium text-forge-text-secondary dark:text-forge-text-secondary-dark'
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Requirements Section */}
      <div className="space-y-2">
        <span className={labelClassName}>Requirements</span>

        {/* Requirements List */}
        <ul className="space-y-2" aria-label="Requirements list">
          {requirements.map((req, index) => (
            <li
              key={`req-${index}-${req.substring(0, 10)}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex items-center gap-2',
                draggedIndex === index && 'opacity-50'
              )}
            >
              <button
                type="button"
                className={cn(
                  'text-forge-muted hover:text-forge-text-secondary cursor-grab',
                  'dark:text-forge-muted-dark dark:hover:text-forge-text-secondary-dark',
                  'focus:outline-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                aria-label={`Drag to reorder requirement ${index + 1}`}
                disabled={disabled}
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                type="text"
                value={req}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleRequirementChange(index, e.target.value)
                }
                disabled={disabled}
                className={cn(inputClassName, 'flex-1')}
                aria-label={`Requirement ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveRequirement(index)}
                disabled={disabled}
                className={cn(
                  'text-forge-muted rounded p-1 hover:bg-red-50 hover:text-red-500',
                  'dark:hover:bg-red-900/20 dark:hover:text-red-400',
                  'focus:ring-2 focus:ring-red-500 focus:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
                aria-label={`Remove requirement ${index + 1}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        {/* Add Requirement Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a requirement..."
            disabled={disabled}
            className={cn(inputClassName, 'flex-1')}
            aria-label="New requirement"
          />
          <button
            type="button"
            onClick={handleAddRequirement}
            disabled={disabled || !newRequirement.trim()}
            className={cn(
              'rounded-md p-2',
              'bg-forge-surface text-forge-text-secondary hover:bg-forge-border',
              'dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark dark:hover:bg-forge-border-dark',
              'focus:ring-forge-accent focus:ring-2 focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Add requirement"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {requirements.length === 0 && (
          <p className="text-forge-muted dark:text-forge-muted-dark text-sm italic">
            No requirements yet
          </p>
        )}
      </div>
    </div>
  )
}
