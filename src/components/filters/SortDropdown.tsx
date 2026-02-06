/**
 * SortDropdown Component
 *
 * Dropdown for selecting sort criteria and direction.
 */

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { SORT_OPTIONS, type SortBy, type SortDirection } from '@/lib/sorting'

interface SortDropdownProps {
  /** Currently selected sort criteria */
  sortBy: SortBy
  /** Current sort direction */
  direction: SortDirection
  /** Called when sort criteria changes */
  onSortByChange: (sortBy: SortBy) => void
  /** Called when direction changes */
  onDirectionChange: (direction: SortDirection) => void
  /** Additional CSS classes */
  className?: string
}

export function SortDropdown({
  sortBy,
  direction,
  onSortByChange,
  onDirectionChange,
  className = '',
}: SortDropdownProps) {
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortBy)
  const directionLabel = direction === 'asc' ? 'Ascending' : 'Descending'
  const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown

  const toggleDirection = () => {
    onDirectionChange(direction === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <label htmlFor="sort-select" className="sr-only">
        Sort by
      </label>
      <div className="relative">
        <ArrowUpDown
          className="text-forge-muted dark:text-forge-muted-dark pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className="border-forge-border focus:border-forge-accent focus:ring-forge-accent dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark cursor-pointer appearance-none rounded-md border bg-white py-1.5 pr-8 pl-8 text-sm shadow-sm focus:ring-2 focus:outline-none"
          aria-label={`Sort by ${currentOption?.label || sortBy}`}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            className="text-forge-muted dark:text-forge-muted-dark h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleDirection}
        className="text-forge-text-secondary hover:bg-forge-surface hover:text-forge-text focus:ring-forge-accent dark:text-forge-text-secondary-dark dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark rounded-md p-1.5 transition-colors focus:ring-2 focus:outline-none"
        aria-label={`Sort direction: ${directionLabel}. Click to toggle.`}
        title={`Sort ${directionLabel.toLowerCase()}`}
      >
        <DirectionIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
