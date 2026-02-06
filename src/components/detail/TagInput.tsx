/**
 * TagInput - Input for managing node tags
 *
 * Features:
 * - Enter to add tag
 * - Backspace on empty input to remove last tag
 * - Autocomplete suggestions from existing tags
 * - Click tag chip to remove
 */

import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TagInputProps {
  /** Current tags */
  value: string[]
  /** Called when tags change */
  onChange: (tags: string[]) => void
  /** Available tags for autocomplete suggestions */
  suggestions?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Optional label */
  label?: string
  /** Optional class name */
  className?: string
  /** ID for accessibility */
  id?: string
  /** Whether the input is disabled */
  disabled?: boolean
}

/**
 * Tag input with chips and autocomplete
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  label = 'Tags',
  className,
  id = 'tag-input',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (tag) =>
      tag.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(tag)
  )

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInputValue('')
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    },
    [value, onChange]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
            addTag(filteredSuggestions[highlightedIndex])
          } else if (inputValue.trim()) {
            addTag(inputValue)
          }
          break

        case 'Backspace':
          if (!inputValue && value.length > 0) {
            removeTag(value[value.length - 1])
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (showSuggestions && filteredSuggestions.length > 0) {
            setHighlightedIndex((prev) =>
              prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (showSuggestions && filteredSuggestions.length > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            )
          }
          break

        case 'Escape':
          setShowSuggestions(false)
          setHighlightedIndex(-1)
          break

        case ',':
          e.preventDefault()
          if (inputValue.trim()) {
            addTag(inputValue)
          }
          break
      }
    },
    [
      inputValue,
      value,
      addTag,
      removeTag,
      showSuggestions,
      filteredSuggestions,
      highlightedIndex,
    ]
  )

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0)
    setHighlightedIndex(-1)
  }

  const handleInputFocus = () => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }, 150)
  }

  const handleSuggestionClick = (tag: string) => {
    addTag(tag)
    inputRef.current?.focus()
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium"
      >
        {label}
      </label>

      <div className="relative">
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5',
            'border-forge-border rounded-md border bg-white px-2 py-1.5',
            'min-h-[42px]',
            'focus-within:ring-forge-accent focus-within:ring-2 focus-within:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50',
            'dark:border-forge-border-dark dark:bg-forge-surface-dark',
            'dark:focus-within:ring-forge-accent-dark'
          )}
        >
          {/* Tag chips */}
          {value.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 rounded-md',
                'bg-forge-surface text-forge-text-secondary px-2 py-0.5 text-sm',
                'dark:bg-forge-surface-dark dark:text-forge-text-dark'
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className={cn(
                  'hover:bg-forge-border rounded-sm p-0.5',
                  'focus-visible:ring-forge-muted focus-visible:ring-1 focus-visible:outline-none',
                  'dark:hover:bg-forge-border-dark'
                )}
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}

          {/* Input */}
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${id}-suggestion-${highlightedIndex}`
                : undefined
            }
            className={cn(
              'flex-1 border-none bg-transparent p-1',
              'text-forge-text min-w-[80px] text-sm',
              'placeholder:text-forge-muted',
              'focus:ring-0 focus:outline-none',
              'dark:text-forge-text-dark dark:placeholder:text-forge-muted-dark'
            )}
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul
            ref={listRef}
            id={`${id}-suggestions`}
            role="listbox"
            className={cn(
              'absolute top-full right-0 left-0 z-10 mt-1',
              'max-h-48 overflow-y-auto',
              'border-forge-border rounded-md border bg-white shadow-lg',
              'dark:border-forge-border-dark dark:bg-forge-surface-dark'
            )}
          >
            {filteredSuggestions.map((tag, index) => (
              <li
                key={tag}
                id={`${id}-suggestion-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSuggestionClick(tag)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSuggestionClick(tag)
                  }
                }}
                tabIndex={-1}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  'text-forge-text dark:text-forge-text-dark',
                  index === highlightedIndex &&
                    'bg-forge-surface dark:bg-forge-surface-dark',
                  index !== highlightedIndex &&
                    'hover:bg-forge-surface dark:hover:bg-forge-surface-dark/50'
                )}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Help text */}
      <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
        Press Enter or comma to add, Backspace to remove
      </p>
    </div>
  )
}
