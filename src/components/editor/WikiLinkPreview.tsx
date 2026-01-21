/**
 * Wiki-Link Preview Tooltip
 *
 * A hover preview component that shows node information when hovering over wiki-links.
 * Displays node title, type badge with icon, and content preview.
 *
 * @module WikiLinkPreview
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { NODE_TYPE_ICON_CONFIG } from '@/components/nodes/config'
import type { NodeType } from '@/types/nodes'
import type {
  LinkInfo,
  ResolvedLink,
  UnresolvedLink,
} from './wikiLinkDecorations'

// ============================================================================
// Types
// ============================================================================

export interface WikiLinkPreviewProps {
  /**
   * Link information (resolved or unresolved)
   */
  linkInfo: LinkInfo | null
  /**
   * Position rectangle for the link element
   */
  anchorRect: DOMRect | null
  /**
   * Whether the preview is visible
   */
  isVisible: boolean
  /**
   * Callback when the preview is dismissed
   */
  onDismiss?: () => void
  /**
   * Callback to navigate to the linked node
   */
  onNavigate?: (linkInfo: ResolvedLink) => void
  /**
   * Callback to create a new node from broken link
   */
  onCreate?: (target: string) => void
  /**
   * Container element for positioning (defaults to document.body)
   */
  container?: HTMLElement
}

// ============================================================================
// Positioning Utilities
// ============================================================================

interface Position {
  top: number
  left: number
  placement: 'above' | 'below'
}

/**
 * Calculates the best position for the tooltip
 */
function calculatePosition(
  anchorRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  container: HTMLElement = document.body
): Position {
  const containerRect = container.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  const padding = 8

  // Try to position below the anchor first
  let top = anchorRect.bottom + scrollY + padding
  let placement: 'above' | 'below' = 'below'

  // Check if there's enough space below
  const spaceBelow =
    containerRect.bottom - anchorRect.bottom - padding - tooltipHeight
  const spaceAbove =
    anchorRect.top - containerRect.top - padding - tooltipHeight

  if (spaceBelow < 0 && spaceAbove > spaceBelow) {
    // Position above
    top = anchorRect.top + scrollY - tooltipHeight - padding
    placement = 'above'
  }

  // Calculate horizontal position (centered on anchor)
  let left = anchorRect.left + scrollX + anchorRect.width / 2 - tooltipWidth / 2

  // Keep within viewport bounds
  const minLeft = containerRect.left + scrollX + padding
  const maxLeft = containerRect.right + scrollX - tooltipWidth - padding

  left = Math.max(minLeft, Math.min(maxLeft, left))

  return { top, left, placement }
}

// ============================================================================
// Type Badge Component
// ============================================================================

interface TypeBadgeProps {
  type: NodeType
}

function TypeBadge({ type }: TypeBadgeProps) {
  const config = NODE_TYPE_ICON_CONFIG[type]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
        'bg-gray-100 dark:bg-gray-800'
      )}
    >
      <Icon className={cn('h-3 w-3', config.color)} aria-hidden="true" />
      <span className="text-gray-600 dark:text-gray-400">{config.label}</span>
    </span>
  )
}

// ============================================================================
// Resolved Link Preview
// ============================================================================

interface ResolvedPreviewProps {
  linkInfo: ResolvedLink
  onNavigate?: (linkInfo: ResolvedLink) => void
}

function ResolvedPreview({ linkInfo, onNavigate }: ResolvedPreviewProps) {
  const handleClick = useCallback(() => {
    onNavigate?.(linkInfo)
  }, [linkInfo, onNavigate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onNavigate?.(linkInfo)
      }
    },
    [linkInfo, onNavigate]
  )

  return (
    <div
      className="min-h-[44px] cursor-pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${linkInfo.title}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <TypeBadge type={linkInfo.type} />
      </div>
      <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {linkInfo.title}
      </p>
      {linkInfo.contentPreview && (
        <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
          {linkInfo.contentPreview}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
        <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-gray-800">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
        </kbd>
        +Click to navigate
      </p>
    </div>
  )
}

// ============================================================================
// Unresolved Link Preview
// ============================================================================

interface UnresolvedPreviewProps {
  linkInfo: UnresolvedLink
  onCreate?: (target: string) => void
}

function UnresolvedPreview({ linkInfo, onCreate }: UnresolvedPreviewProps) {
  const handleClick = useCallback(() => {
    onCreate?.(linkInfo.target)
  }, [linkInfo.target, onCreate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onCreate?.(linkInfo.target)
      }
    },
    [linkInfo.target, onCreate]
  )

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Broken Link
        </span>
      </div>
      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        "{linkInfo.target}"
      </p>
      <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
        This node doesn't exist yet.
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[44px] rounded-md px-3 py-2 text-xs font-medium',
            'bg-blue-600 text-white',
            'hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none',
            'dark:focus:ring-offset-gray-900'
          )}
        >
          Create Linked Node
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * WikiLinkPreview component
 *
 * Displays a hover preview tooltip for wiki-links showing:
 * - Node title
 * - Type badge with icon
 * - Content preview (first 100 chars)
 * - Navigation hint
 *
 * For broken links, shows a "Create Linked Node" button.
 *
 * @example
 * ```tsx
 * <WikiLinkPreview
 *   linkInfo={hoveredLinkInfo}
 *   anchorRect={linkRect}
 *   isVisible={showPreview}
 *   onDismiss={() => setShowPreview(false)}
 *   onNavigate={(link) => navigateToNode(link.id)}
 *   onCreate={(target) => openCreateDialog(target)}
 * />
 * ```
 */
export function WikiLinkPreview({
  linkInfo,
  anchorRect,
  isVisible,
  onDismiss,
  onNavigate,
  onCreate,
  container,
}: WikiLinkPreviewProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipSize, setTooltipSize] = useState({ width: 256, height: 120 })

  // Update tooltip size when ref is available
  useEffect(() => {
    if (!tooltipRef.current || !isVisible) return

    const tooltip = tooltipRef.current
    const rect = tooltip.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setTooltipSize({ width: rect.width, height: rect.height })
    }
  }, [isVisible, linkInfo])

  // Calculate position synchronously based on current state
  const position: Position | null =
    isVisible && anchorRect
      ? calculatePosition(
          anchorRect,
          tooltipSize.width,
          tooltipSize.height,
          container
        )
      : null

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onDismiss])

  // Don't render if not visible or no link info
  if (!isVisible || !linkInfo) {
    return null
  }

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-hidden={!isVisible}
      className={cn(
        'fixed z-50 w-64 rounded-lg border bg-white p-3 shadow-lg',
        'dark:border-gray-700 dark:bg-gray-900',
        'transition-opacity duration-150',
        position ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      style={
        position
          ? {
              top: position.top,
              left: position.left,
            }
          : { top: 0, left: 0, visibility: 'hidden' }
      }
    >
      {linkInfo.exists ? (
        <ResolvedPreview linkInfo={linkInfo} onNavigate={onNavigate} />
      ) : (
        <UnresolvedPreview linkInfo={linkInfo} onCreate={onCreate} />
      )}
    </div>
  )
}

export default WikiLinkPreview
