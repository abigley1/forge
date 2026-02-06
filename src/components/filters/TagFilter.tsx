/**
 * Tag Filter Component
 *
 * Multi-select filter for tags with AND logic.
 * Shows selected tags as removable chips and all available tags.
 * State is stored in URL via useFilters hook.
 */

import { X, Tag } from 'lucide-react'
import { useId, useMemo } from 'react'

import { cn } from '@/lib/utils'
import { useNodesStore } from '@/store'

// ============================================================================
// Types
// ============================================================================

interface TagFilterProps {
  /** Currently selected tags */
  selectedTags: string[]
  /** Callback to add a tag */
  onAddTag: (tag: string) => void
  /** Callback to remove a tag */
  onRemoveTag: (tag: string) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Multi-select tag filter with AND logic
 */
export function TagFilter({
  selectedTags,
  onAddTag,
  onRemoveTag,
  className,
}: TagFilterProps) {
  const groupId = useId()
  const nodes = useNodesStore((state) => state.nodes)

  // Extract all unique tags from nodes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    nodes.forEach((node) => {
      node.tags.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
  }, [nodes])

  // Tags that are not currently selected
  const availableTags = useMemo(
    () => allTags.filter((tag) => !selectedTags.includes(tag)),
    [allTags, selectedTags]
  )

  if (allTags.length === 0) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-xs font-medium">
          Tags
        </span>
        <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
          No tags available
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <span
        id={groupId}
        className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-xs font-medium"
      >
        Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
      </span>

      {/* Selected tags (chips) */}
      {selectedTags.length > 0 && (
        <div
          role="group"
          aria-label="Selected tags"
          className="flex flex-wrap gap-1"
        >
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5',
                'text-xs font-medium',
                'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
              )}
            >
              <span className="max-w-[80px] truncate">{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className={cn(
                  'rounded-full p-0.5',
                  'hover:bg-forge-accent/20 dark:hover:bg-forge-accent-dark/20',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                  'flex min-h-[20px] min-w-[20px] items-center justify-center'
                )}
                aria-label={`Remove tag: ${tag}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Available tags */}
      {availableTags.length > 0 && (
        <div
          role="group"
          aria-labelledby={groupId}
          className="flex flex-wrap gap-1"
        >
          {availableTags.slice(0, 8).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onAddTag(tag)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                'text-xs font-medium',
                'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark',
                'hover:bg-forge-border dark:hover:bg-forge-border-dark',
                'transition-colors duration-150',
                'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
                'min-h-[28px]'
              )}
              aria-label={`Add tag filter: ${tag}`}
            >
              <Tag className="h-3 w-3" aria-hidden="true" />
              <span className="max-w-[80px] truncate">{tag}</span>
            </button>
          ))}
          {availableTags.length > 8 && (
            <span className="text-forge-muted dark:text-forge-muted-dark inline-flex items-center px-2 py-1 text-xs">
              +{availableTags.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* AND logic hint */}
      {selectedTags.length > 1 && (
        <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
          Showing nodes with ALL selected tags
        </p>
      )}
    </div>
  )
}
