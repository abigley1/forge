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
          className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className="cursor-pointer appearance-none rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-8 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="h-4 w-4 text-gray-400"
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
        className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label={`Sort direction: ${directionLabel}. Click to toggle.`}
        title={`Sort ${directionLabel.toLowerCase()}`}
      >
        <DirectionIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
