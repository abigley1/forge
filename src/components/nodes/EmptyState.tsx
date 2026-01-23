/**
 * EmptyState Component
 *
 * Displays a centered empty state with icon, title, description, and optional CTA.
 * Used when a list has no items to display.
 */

import { FileQuestion } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

// ============================================================================
// Types
// ============================================================================

interface EmptyStateProps {
  /** Icon to display (default: FileQuestion) */
  icon?: ReactNode
  /** Main title */
  title: string
  /** Optional description text */
  description?: string
  /** Call-to-action button text */
  actionLabel?: string
  /** Call-to-action button click handler */
  onAction?: () => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a centered empty state with optional call-to-action.
 *
 * @example
 * <EmptyState
 *   title="No nodes yet"
 *   description="Create your first node to get started"
 *   actionLabel="Create Node"
 *   onAction={handleCreateNode}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
        {icon ?? (
          <FileQuestion
            className="h-8 w-8 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Title */}
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mb-4 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {/* CTA Button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
