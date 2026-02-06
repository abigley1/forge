/**
 * BacklinksPanel Component
 *
 * Displays a collapsible panel showing all nodes that link TO the current node.
 * Each backlink shows the source node's type, title, and a context snippet
 * showing where the link appears in the source content.
 */

import { useState, useId, useCallback } from 'react'
import { ChevronDown, ChevronRight, Link2, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { NodeTypeIcon } from '@/components/nodes/NodeTypeIcon'

// ============================================================================
// Types
// ============================================================================

export interface BacklinkItem {
  /** The source node that contains the link */
  node: ForgeNode
  /** Context snippets showing where the link appears */
  contexts: string[]
}

export interface BacklinksPanelProps {
  /** Array of backlink items with context */
  backlinks: BacklinkItem[]
  /** Called when a backlink is clicked */
  onNavigate?: (nodeId: string) => void
  /** Whether the panel starts expanded */
  defaultExpanded?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Subcomponents
// ============================================================================

interface BacklinkItemRowProps {
  item: BacklinkItem
  onNavigate?: (nodeId: string) => void
}

function BacklinkItemRow({ item, onNavigate }: BacklinkItemRowProps) {
  const { node, contexts } = item

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(node.id)}
      aria-label={`Navigate to ${node.title}`}
      className={cn(
        'group w-full text-left',
        'border-forge-border dark:border-forge-border-dark rounded-lg border',
        'bg-forge-paper dark:bg-forge-paper-dark',
        'px-3 py-2.5',
        'transition-colors duration-150',
        'hover:border-forge-border hover:bg-forge-surface',
        'dark:hover:border-forge-border-dark dark:hover:bg-forge-surface-dark',
        'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
        'dark:focus-visible:ring-forge-accent-dark'
      )}
    >
      {/* Header row: icon, title, arrow */}
      <div className="flex items-center gap-2">
        <NodeTypeIcon type={node.type} size="sm" />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium',
            'text-forge-text dark:text-forge-text-dark'
          )}
        >
          {node.title}
        </span>
        <ArrowUpRight
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            'text-forge-muted dark:text-forge-muted-dark',
            'opacity-0 transition-opacity duration-150',
            'group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
          aria-hidden="true"
        />
      </div>

      {/* Context snippets */}
      {contexts.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {contexts.slice(0, 2).map((context, index) => (
            <p
              key={index}
              className={cn(
                'text-xs leading-relaxed',
                'text-forge-muted dark:text-forge-muted-dark',
                'line-clamp-2'
              )}
            >
              <HighlightedContext context={context} />
            </p>
          ))}
          {contexts.length > 2 && (
            <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
              +{contexts.length - 2} more mentions
            </p>
          )}
        </div>
      )}
    </button>
  )
}

/**
 * Highlights [[wiki-links]] within a context string
 */
function HighlightedContext({ context }: { context: string }) {
  // Split on wiki-links and highlight them
  const parts = context.split(/(\[\[[^\]]+\]\])/)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const linkText = part.slice(2, -2)
          return (
            <span
              key={index}
              className={cn(
                'rounded px-1 py-0.5',
                'bg-amber-100/80 text-amber-800',
                'dark:bg-amber-900/30 dark:text-amber-300',
                'font-medium'
              )}
            >
              {linkText}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyBacklinks() {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-8',
        'text-center'
      )}
    >
      <div
        className={cn(
          'mb-3 flex h-10 w-10 items-center justify-center rounded-full',
          'bg-forge-surface dark:bg-forge-surface-dark'
        )}
      >
        <Link2
          className="text-forge-muted dark:text-forge-muted-dark h-5 w-5"
          aria-hidden="true"
        />
      </div>
      <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium">
        No backlinks yet
      </p>
      <p className="text-forge-muted dark:text-forge-muted-dark mt-1 text-xs">
        Other nodes will appear here when they link to this one
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Displays a collapsible panel of backlinks (nodes linking to the current node).
 * Each backlink shows the source node and context snippets.
 *
 * @example
 * <BacklinksPanel
 *   backlinks={backlinkItems}
 *   onNavigate={(id) => navigateToNode(id)}
 * />
 */
export function BacklinksPanel({
  backlinks,
  onNavigate,
  defaultExpanded = true,
  className,
}: BacklinksPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentId = useId()

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleToggle()
      }
    },
    [handleToggle]
  )

  const count = backlinks.length

  return (
    <div
      className={cn(
        'border-forge-border dark:border-forge-border-dark rounded-lg border',
        'bg-forge-surface/50 dark:bg-forge-surface-dark/30',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3',
          'text-sm font-medium',
          'text-forge-text dark:text-forge-text-dark',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
          'dark:focus-visible:ring-forge-accent-dark',
          'transition-colors duration-150'
        )}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {/* Chevron */}
        {expanded ? (
          <ChevronDown
            className="text-forge-muted h-4 w-4 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="text-forge-muted h-4 w-4 shrink-0"
            aria-hidden="true"
          />
        )}

        {/* Icon */}
        <Link2
          className="text-forge-muted h-4 w-4 shrink-0"
          aria-hidden="true"
        />

        {/* Title */}
        <span className="flex-1 text-left">Backlinks</span>

        {/* Count badge */}
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            'text-xs font-medium tabular-nums',
            count > 0
              ? 'bg-forge-border text-forge-text dark:bg-forge-border-dark dark:text-forge-text-dark'
              : 'bg-forge-surface text-forge-muted dark:bg-forge-surface-dark dark:text-forge-muted-dark'
          )}
          aria-label={`${count} backlinks`}
        >
          {count}
        </span>
      </button>

      {/* Content - instant show/hide complies with animation constraints */}
      <div
        id={contentId}
        className={cn(
          'overflow-hidden',
          expanded ? 'block max-h-[500px] overflow-y-auto' : 'hidden'
        )}
        aria-hidden={!expanded}
      >
        <div className="px-3 pb-3">
          {count === 0 ? (
            <EmptyBacklinks />
          ) : (
            <div className="space-y-2">
              {backlinks.map((item) => (
                <BacklinkItemRow
                  key={item.node.id}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BacklinksPanel
