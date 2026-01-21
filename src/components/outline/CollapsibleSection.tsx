/**
 * CollapsibleSection Component
 *
 * A collapsible section with accessible expand/collapse behavior.
 * - Enter/Space toggles expanded state
 * - Respects prefers-reduced-motion
 * - Announces state changes to screen readers
 */

import { useId, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string
  /** Icon to display before the title */
  icon?: React.ReactNode
  /** Whether the section is expanded */
  expanded: boolean
  /** Called when the expanded state should change */
  onToggle: () => void
  /** Number of items in the section (for display) */
  itemCount?: number
  /** Section content */
  children: React.ReactNode
  /** Additional CSS classes for the container */
  className?: string
  /** ID for the section (used for keyboard navigation) */
  id?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Collapsible section with accessible expand/collapse behavior.
 *
 * @example
 * <CollapsibleSection
 *   title="Tasks"
 *   icon={<CheckSquare className="h-4 w-4" />}
 *   expanded={isExpanded}
 *   onToggle={() => setIsExpanded(!isExpanded)}
 *   itemCount={5}
 * >
 *   <ul>...</ul>
 * </CollapsibleSection>
 */
export function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  itemCount,
  children,
  className,
  id,
}: CollapsibleSectionProps) {
  const contentId = useId()

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onToggle()
      }
    },
    [onToggle]
  )

  return (
    <div
      className={cn('border-b border-gray-200 dark:border-gray-800', className)}
      id={id}
    >
      {/* Header button */}
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:ring-gray-300',
          'transition-colors duration-150'
        )}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {/* Chevron icon */}
        {expanded ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        )}

        {/* Custom icon */}
        {icon && (
          <span className="shrink-0 text-gray-500" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Title */}
        <span className="flex-1 truncate text-left">{title}</span>

        {/* Item count badge */}
        {typeof itemCount === 'number' && (
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5',
              'text-xs font-medium tabular-nums',
              itemCount > 0
                ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            )}
            aria-label={`${itemCount} items`}
          >
            {itemCount}
          </span>
        )}
      </button>

      {/* Content container - instant show/hide complies with animation constraints */}
      <div
        id={contentId}
        className={cn('overflow-hidden', expanded ? 'block' : 'hidden')}
        aria-hidden={!expanded}
      >
        <div className="px-4 pb-3">{children}</div>
      </div>
    </div>
  )
}

export default CollapsibleSection
