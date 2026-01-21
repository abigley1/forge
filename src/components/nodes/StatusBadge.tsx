/**
 * StatusBadge Component
 *
 * Displays a status badge with color AND text (not color-only for accessibility).
 * Supports all node status types: Decision, Component, Task.
 */

import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type NodeStatus } from './config'

// ============================================================================
// Types
// ============================================================================

interface StatusBadgeProps {
  /** The status to display */
  status: NodeStatus
  /** Additional CSS classes */
  className?: string
  /** Size variant (default: 'md') */
  size?: 'sm' | 'md'
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Size classes for the badge
 */
const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
} as const

const DOT_SIZE_CLASSES = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
} as const

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a status badge with color indicator and text label.
 * Uses both color and text for accessibility (not color-only).
 *
 * @example
 * <StatusBadge status="pending" />
 * <StatusBadge status="in_progress" size="sm" />
 */
export function StatusBadge({
  status,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  if (!config) {
    // Fallback for unknown status
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          SIZE_CLASSES[size],
          className
        )}
      >
        <span
          className={cn('rounded-full bg-gray-500', DOT_SIZE_CLASSES[size])}
          aria-hidden="true"
        />
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        SIZE_CLASSES[size],
        className
      )}
    >
      <span
        className={cn('rounded-full', config.dotColor, DOT_SIZE_CLASSES[size])}
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}
