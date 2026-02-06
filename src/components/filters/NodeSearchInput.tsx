/**
 * Node Search Input Component
 *
 * Search input with 150ms debounce and clear button.
 * State is stored in URL via useFilters hook.
 */

import { Search, X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, useId } from 'react'

import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface NodeSearchInputProps {
  /** Current search value (from URL state) */
  value: string
  /** Callback when search value changes (debounced) */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional class name */
  className?: string
  /** Debounce delay in milliseconds */
  debounceMs?: number
}

// ============================================================================
// Hook: useDebounce
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// Component
// ============================================================================

/**
 * Search input with debounce and clear button
 */
export function NodeSearchInput({
  value,
  onChange,
  placeholder = 'Search nodes...',
  className,
  debounceMs = 150,
}: NodeSearchInputProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Local state for immediate input feedback
  const [localValue, setLocalValue] = useState(value)

  // Debounced value
  const debouncedValue = useDebounce(localValue, debounceMs)

  // Sync local state when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Call onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, value, onChange])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  // Handle clear button
  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && localValue) {
        e.preventDefault()
        handleClear()
      }
    },
    [localValue, handleClear]
  )

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        Search nodes
      </label>
      <Search
        className="text-forge-muted dark:text-forge-muted-dark pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'border-forge-border dark:border-forge-border-dark w-full rounded-md border',
          'dark:bg-forge-paper-dark bg-white',
          'py-2 pr-8 pl-9',
          'text-forge-text dark:text-forge-text-dark text-sm',
          'placeholder:text-forge-muted dark:placeholder:text-forge-muted-dark',
          'focus:border-forge-accent focus:ring-forge-accent dark:focus:border-forge-accent-dark dark:focus:ring-forge-accent-dark focus:ring-1 focus:outline-none',
          'transition-colors duration-150'
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute top-1/2 right-1.5 -translate-y-1/2',
            'rounded p-1',
            'text-forge-muted hover:text-forge-text-secondary dark:hover:text-forge-text-secondary-dark',
            'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
            'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
            'transition-colors duration-150'
          )}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
