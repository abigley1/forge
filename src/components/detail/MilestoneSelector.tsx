import { useState, useRef, useCallback, useId } from 'react'
import type { KeyboardEvent, ChangeEvent } from 'react'
import { Milestone, X, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MilestoneSelectorProps {
  /** Currently selected milestone */
  value?: string
  /** Callback when milestone changes */
  onChange: (milestone: string | undefined) => void
  /** Available milestones for autocomplete */
  suggestions?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Field label */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Input ID for label association */
  id?: string
  /** Whether the input is disabled */
  disabled?: boolean
}

/**
 * MilestoneSelector component with autocomplete and create-new-inline functionality.
 * Allows selecting an existing milestone from suggestions or creating a new one.
 */
export function MilestoneSelector({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Select or create milestone...',
  label = 'Milestone',
  className,
  id,
  disabled = false,
}: MilestoneSelectorProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const listboxId = `${inputId}-listbox`

  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (milestone) =>
      milestone.toLowerCase().includes(inputValue.toLowerCase()) &&
      milestone !== value
  )

  // Check if the input would create a new milestone
  const isNewMilestone =
    inputValue.trim() !== '' &&
    !suggestions.some(
      (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
    )

  // Total options: filtered suggestions + "Create new" option if applicable
  const totalOptions = filteredSuggestions.length + (isNewMilestone ? 1 : 0)

  const selectMilestone = useCallback(
    (milestone: string) => {
      onChange(milestone.trim())
      setInputValue('')
      setIsOpen(false)
      setHighlightedIndex(-1)
    },
    [onChange]
  )

  const clearMilestone = useCallback(() => {
    onChange(undefined)
    setInputValue('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0) {
            // Selected a suggestion
            if (highlightedIndex < filteredSuggestions.length) {
              selectMilestone(filteredSuggestions[highlightedIndex])
            } else if (isNewMilestone) {
              // Selected "Create new" option
              selectMilestone(inputValue.trim())
            }
          } else if (inputValue.trim()) {
            // No highlight, but has input - create/select the value
            selectMilestone(inputValue.trim())
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen && totalOptions > 0) {
            setIsOpen(true)
          }
          if (isOpen && totalOptions > 0) {
            setHighlightedIndex((prev) =>
              prev < totalOptions - 1 ? prev + 1 : 0
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (isOpen && totalOptions > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : totalOptions - 1
            )
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          setInputValue('')
          break

        case 'Tab':
          // Allow tab to work normally, just close dropdown
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [
      inputValue,
      isOpen,
      highlightedIndex,
      filteredSuggestions,
      totalOptions,
      isNewMilestone,
      selectMilestone,
    ]
  )

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleInputFocus = () => {
    if (!value) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setIsOpen(false)
      setHighlightedIndex(-1)
      setInputValue('')
    }, 150)
  }

  const handleSuggestionClick = (milestone: string) => {
    selectMilestone(milestone)
    inputRef.current?.focus()
  }

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      selectMilestone(inputValue.trim())
      inputRef.current?.focus()
    }
  }

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <div ref={containerRef} className="relative">
        {/* Selected milestone display or input */}
        {value && !isOpen ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              'rounded-md border border-gray-300 bg-white px-3 py-2',
              'min-h-[42px]',
              disabled && 'cursor-not-allowed opacity-50',
              'dark:border-gray-600 dark:bg-gray-800'
            )}
            onClick={handleContainerClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleContainerClick()
                setIsOpen(true)
              }
            }}
          >
            <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
              <Milestone className="h-4 w-4 text-gray-500" aria-hidden="true" />
              {value}
            </span>
            <div className="flex items-center gap-1">
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearMilestone()
                  }}
                  className={cn(
                    'rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                    'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
                    'dark:hover:bg-gray-700 dark:hover:text-gray-300'
                  )}
                  aria-label="Clear milestone"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <ChevronDown
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2',
              'rounded-md border border-gray-300 bg-white px-3 py-2',
              'min-h-[42px]',
              'focus-within:ring-2 focus-within:ring-gray-950 focus-within:ring-offset-2',
              disabled && 'cursor-not-allowed opacity-50',
              'dark:border-gray-600 dark:bg-gray-800',
              'dark:focus-within:ring-gray-300'
            )}
          >
            <Milestone
              className="h-4 w-4 shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              id={inputId}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'flex-1 border-0 bg-transparent p-0 text-sm',
                'text-gray-900 placeholder:text-gray-400',
                'focus:ring-0 focus:outline-none',
                'dark:text-gray-100 dark:placeholder:text-gray-500'
              )}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `${inputId}-option-${highlightedIndex}`
                  : undefined
              }
              autoComplete="off"
            />
            <ChevronDown
              className="h-4 w-4 shrink-0 text-gray-400"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Dropdown suggestions */}
        {isOpen && totalOptions > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Milestone suggestions"
            className={cn(
              'absolute z-10 mt-1 w-full overflow-auto rounded-md',
              'max-h-60 bg-white py-1 shadow-lg',
              'border border-gray-200',
              'dark:border-gray-700 dark:bg-gray-800'
            )}
          >
            {/* Existing milestones */}
            {filteredSuggestions.map((milestone, index) => (
              <li
                key={milestone}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={highlightedIndex === index}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  highlightedIndex === index
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                onClick={() => handleSuggestionClick(milestone)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSuggestionClick(milestone)
                  }
                }}
              >
                <Milestone
                  className="h-4 w-4 text-gray-500"
                  aria-hidden="true"
                />
                {milestone}
              </li>
            ))}

            {/* Create new option */}
            {isNewMilestone && (
              <li
                id={`${inputId}-option-${filteredSuggestions.length}`}
                role="option"
                aria-selected={highlightedIndex === filteredSuggestions.length}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                  highlightedIndex === filteredSuggestions.length
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'border-t border-gray-200 dark:border-gray-700'
                )}
                onClick={handleCreateNew}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCreateNew()
                  }
                }}
              >
                <Plus className="h-4 w-4 text-green-600" aria-hidden="true" />
                <span>
                  Create &ldquo;
                  <span className="font-medium">{inputValue.trim()}</span>
                  &rdquo;
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Extract all unique milestones from an array of task nodes.
 * Returns sorted list of milestone strings.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function extractMilestones(
  nodes: Array<{ milestone?: string }>
): string[] {
  const milestones = new Set<string>()
  for (const node of nodes) {
    if (node.milestone) {
      milestones.add(node.milestone)
    }
  }
  return Array.from(milestones).sort((a, b) => a.localeCompare(b))
}
