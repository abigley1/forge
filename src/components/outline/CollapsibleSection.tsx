/**
 * CollapsibleSection Component
 *
 * A collapsible section with animated height transitions.
 * - Enter/Space toggles expanded state
 * - Respects prefers-reduced-motion
 * - Announces state changes to screen readers
 */

import { useRef, useEffect, useState, useId, useCallback } from 'react'
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
// Hook: useReducedMotion
// ============================================================================

/**
 * Hook to detect user's motion preference
 */
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

// ============================================================================
// Component
// ============================================================================

/**
 * Collapsible section with animated height transition.
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(expanded ? 'auto' : 0)
  const contentId = useId()
  const prefersReducedMotion = useReducedMotion()

  // Measure content height for animation
  useEffect(() => {
    if (!contentRef.current) return

    if (expanded) {
      // Measure the actual height
      const contentHeight = contentRef.current.scrollHeight
      setHeight(contentHeight)

      // After animation completes, set to auto for dynamic content
      const timer = setTimeout(() => {
        setHeight('auto')
      }, 200) // Match animation duration

      return () => clearTimeout(timer)
    } else {
      // When collapsing, first set explicit height, then 0
      if (height === 'auto') {
        const contentHeight = contentRef.current.scrollHeight
        setHeight(contentHeight)
        // Force a reflow before setting to 0
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setHeight(0)
          })
        })
      } else {
        setHeight(0)
      }
    }
  }, [expanded]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Animated content container */}
      <div
        id={contentId}
        ref={contentRef}
        style={{
          height: prefersReducedMotion ? (expanded ? 'auto' : 0) : height,
          overflow: 'hidden',
        }}
        className={cn(
          !prefersReducedMotion &&
            'transition-[height] duration-200 ease-in-out'
        )}
        aria-hidden={!expanded}
      >
        <div className="px-4 pb-3">{children}</div>
      </div>
    </div>
  )
}

export default CollapsibleSection
