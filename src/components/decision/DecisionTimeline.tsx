import { Calendar, Clock, CheckCircle } from 'lucide-react'
import type { DecisionNode } from '@/types/nodes'
import { cn } from '@/lib/utils'

export interface DecisionTimelineProps {
  node: DecisionNode
  className?: string
}

/**
 * Formats a date for display in the timeline
 */
function formatTimelineDate(date: Date | null | undefined): string {
  if (!date) return '—'

  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return '—'

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    // Handle edge cases where Intl.DateTimeFormat throws (e.g., dates outside valid range)
    return '—'
  }
}

/**
 * Formats a relative time string (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return ''

  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return ''
}

interface TimelineEvent {
  id: string
  label: string
  date: Date | null | undefined
  icon: typeof Calendar
  isActive: boolean
  description?: string
}

/**
 * DecisionTimeline component showing the decision lifecycle
 *
 * Displays:
 * - Created date
 * - Last Updated date
 * - Selected date (when decision is made)
 */
export function DecisionTimeline({ node, className }: DecisionTimelineProps) {
  const events: TimelineEvent[] = [
    {
      id: 'created',
      label: 'Created',
      date: node.dates.created,
      icon: Calendar,
      isActive: true,
      description: 'Decision was created',
    },
    {
      id: 'modified',
      label: 'Last Updated',
      date: node.dates.modified,
      icon: Clock,
      isActive: true,
      description: 'Most recent change',
    },
    {
      id: 'selected',
      label: 'Decision Made',
      date: node.selectedDate,
      icon: CheckCircle,
      isActive: node.status === 'selected' && !!node.selectedDate,
      description:
        node.status === 'selected'
          ? 'Option was selected'
          : 'Pending selection',
    },
  ]

  return (
    <div className={cn('space-y-1', className)}>
      <h4 className="text-forge-muted dark:text-forge-muted-dark text-xs font-medium tracking-wider uppercase">
        Timeline
      </h4>
      <div className="border-forge-border dark:border-forge-border-dark dark:bg-forge-surface-dark rounded-lg border bg-white p-3">
        <div className="relative">
          {/* Vertical line connecting events */}
          <div
            className="bg-forge-border dark:bg-forge-border-dark absolute top-2 left-3 h-[calc(100%-16px)] w-px"
            aria-hidden="true"
          />

          <div className="space-y-4">
            {events.map((event) => {
              const Icon = event.icon
              const dateStr = formatTimelineDate(event.date)
              const relativeStr = formatRelativeTime(event.date)

              return (
                <div
                  key={event.id}
                  className={cn(
                    'relative flex gap-3 pl-1',
                    !event.isActive && 'opacity-50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex h-6 w-6 items-center justify-center rounded-full',
                      event.isActive
                        ? event.id === 'selected'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                          : 'bg-forge-accent-subtle text-forge-accent dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
                        : 'bg-forge-surface text-forge-muted dark:bg-forge-border-dark'
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          event.isActive
                            ? 'text-forge-text dark:text-white'
                            : 'text-forge-muted dark:text-forge-muted-dark'
                        )}
                      >
                        {event.label}
                      </span>
                      {relativeStr && (
                        <span className="text-forge-muted dark:text-forge-muted-dark flex-shrink-0 text-xs">
                          {relativeStr}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-xs',
                        event.isActive
                          ? 'text-forge-text-secondary dark:text-forge-text-secondary-dark'
                          : 'text-forge-muted dark:text-forge-muted-dark'
                      )}
                    >
                      {event.isActive ? dateStr : event.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
