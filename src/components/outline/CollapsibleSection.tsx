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
import type { NodeType } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

/** Node-type color mapping for left border + icon tint */
const NODE_TYPE_BORDER_COLORS: Record<NodeType, string> = {
  task: 'border-l-forge-node-task-border dark:border-l-forge-node-task-border-dark',
  decision:
    'border-l-forge-node-decision-border dark:border-l-forge-node-decision-border-dark',
  component:
    'border-l-forge-node-component-border dark:border-l-forge-node-component-border-dark',
  note: 'border-l-forge-node-note-border dark:border-l-forge-node-note-border-dark',
  subsystem:
    'border-l-forge-node-subsystem-border dark:border-l-forge-node-subsystem-border-dark',
  assembly:
    'border-l-forge-node-assembly-border dark:border-l-forge-node-assembly-border-dark',
  module:
    'border-l-forge-node-module-border dark:border-l-forge-node-module-border-dark',
}

const NODE_TYPE_ICON_COLORS: Record<NodeType, string> = {
  task: 'text-forge-node-task-text dark:text-forge-node-task-text-dark',
  decision:
    'text-forge-node-decision-text dark:text-forge-node-decision-text-dark',
  component:
    'text-forge-node-component-text dark:text-forge-node-component-text-dark',
  note: 'text-forge-node-note-text dark:text-forge-node-note-text-dark',
  subsystem:
    'text-forge-node-subsystem-text dark:text-forge-node-subsystem-text-dark',
  assembly:
    'text-forge-node-assembly-text dark:text-forge-node-assembly-text-dark',
  module: 'text-forge-node-module-text dark:text-forge-node-module-text-dark',
}

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
  /** Node type for colored left border and icon tinting */
  nodeType?: NodeType
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
  nodeType,
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
      className={cn(
        'border-forge-border dark:border-forge-border-dark border-b',
        nodeType && 'border-l-2',
        nodeType && NODE_TYPE_BORDER_COLORS[nodeType],
        className
      )}
      id={id}
    >
      {/* Header button */}
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3',
          'font-mono text-xs tracking-[0.1em] uppercase',
          'text-forge-text-secondary dark:text-forge-text-secondary-dark',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
          'dark:focus-visible:ring-forge-accent-dark',
          'transition-colors duration-150'
        )}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {/* Chevron icon */}
        {expanded ? (
          <ChevronDown
            className="text-forge-muted dark:text-forge-muted-dark h-4 w-4 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="text-forge-muted dark:text-forge-muted-dark h-4 w-4 shrink-0"
            aria-hidden="true"
          />
        )}

        {/* Custom icon — tinted to node type color when provided */}
        {icon && (
          <span
            className={cn(
              'shrink-0',
              nodeType
                ? NODE_TYPE_ICON_COLORS[nodeType]
                : 'text-forge-muted dark:text-forge-muted-dark'
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* Title */}
        <span className="flex-1 truncate text-left">{title}</span>

        {/* Item count — plain monospace number */}
        {typeof itemCount === 'number' && (
          <span
            className="text-forge-muted dark:text-forge-muted-dark ml-auto font-mono text-xs tabular-nums"
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
