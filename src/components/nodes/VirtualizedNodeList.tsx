/**
 * VirtualizedNodeList Component
 *
 * A virtualized version of NodeList for efficiently rendering large lists of nodes.
 * Uses @tanstack/react-virtual for windowing to only render visible items.
 *
 * Automatically used when list has >50 items for optimal performance.
 */

// Skip React Compiler - TanStack Virtual returns functions that can't be memoized safely
'use no memo'

import { useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FolderPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { NodeListItem } from './NodeListItem'
import { EmptyState } from './EmptyState'

// ============================================================================
// Constants
// ============================================================================

/** Estimated height of each node list item in pixels (py-2 = 8px * 2 + content) */
const ESTIMATED_ITEM_HEIGHT = 44

/** Number of items to render outside the visible area (overscan) */
const OVERSCAN_COUNT = 5

// ============================================================================
// Types
// ============================================================================

interface VirtualizedNodeListProps {
  /** Array of nodes to display */
  nodes: ForgeNode[]
  /** ID of the currently active node */
  activeNodeId: string | null
  /** Called when a node is selected */
  onNodeSelect: (nodeId: string) => void
  /** Called when user wants to create a new node */
  onCreateNode?: () => void
  /** Additional CSS classes */
  className?: string
  /** ARIA label for the list */
  'aria-label'?: string
  /** Height of the list container (default: 100%) */
  height?: string | number
}

// ============================================================================
// Component
// ============================================================================

/**
 * Virtualized node list for efficient rendering of large lists.
 *
 * Features:
 * - Only renders visible items plus overscan buffer
 * - Keyboard navigation (Arrow Up/Down, Home/End, Enter)
 * - Active node is scrolled into view when changed
 * - Maintains focus state across virtual renders
 *
 * @example
 * <VirtualizedNodeList
 *   nodes={allNodes}
 *   activeNodeId={activeNodeId}
 *   onNodeSelect={handleNodeSelect}
 *   height={400}
 * />
 */
export function VirtualizedNodeList({
  nodes,
  activeNodeId,
  onNodeSelect,
  onCreateNode,
  className,
  'aria-label': ariaLabel = 'Node list',
  height = '100%',
}: VirtualizedNodeListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const focusedIndexRef = useRef<number>(-1)

  // Set up the virtualizer
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: OVERSCAN_COUNT,
    // Unique key for each item
    getItemKey: (index) => nodes[index].id,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Scroll active node into view when it changes
  useEffect(() => {
    if (activeNodeId) {
      const activeIndex = nodes.findIndex((node) => node.id === activeNodeId)
      if (activeIndex >= 0) {
        virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
      }
    }
  }, [activeNodeId, nodes, virtualizer])

  // Focus item at index
  const focusItemAtIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < nodes.length) {
        // First, scroll the item into view
        virtualizer.scrollToIndex(index, { align: 'auto' })
        focusedIndexRef.current = index

        // Then focus the element after a short delay for DOM update
        requestAnimationFrame(() => {
          const nodeId = nodes[index].id
          const element = parentRef.current?.querySelector(
            `[data-node-id="${nodeId}"]`
          ) as HTMLButtonElement | null
          element?.focus()
        })
      }
    },
    [nodes, virtualizer]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Get the currently focused index from the focused element
      const focused = document.activeElement
      const focusedNodeId = focused?.getAttribute('data-node-id')
      const currentIndex = focusedNodeId
        ? nodes.findIndex((node) => node.id === focusedNodeId)
        : focusedIndexRef.current

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault()
          const newIndex =
            currentIndex > 0 ? currentIndex - 1 : nodes.length - 1
          focusItemAtIndex(newIndex)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          const newIndex =
            currentIndex < nodes.length - 1 ? currentIndex + 1 : 0
          focusItemAtIndex(newIndex)
          break
        }
        case 'Home': {
          event.preventDefault()
          focusItemAtIndex(0)
          break
        }
        case 'End': {
          event.preventDefault()
          focusItemAtIndex(nodes.length - 1)
          break
        }
        case 'Enter': {
          event.preventDefault()
          if (currentIndex >= 0 && currentIndex < nodes.length) {
            onNodeSelect(nodes[currentIndex].id)
          }
          break
        }
      }
    },
    [nodes, focusItemAtIndex, onNodeSelect]
  )

  // Empty state
  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={
          <FolderPlus
            className="h-8 w-8 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
        }
        title="No nodes yet"
        description="Create your first node to start organizing your project."
        actionLabel={onCreateNode ? 'Create Node' : undefined}
        onAction={onCreateNode}
        className={className}
      />
    )
  }

  return (
    <div
      ref={parentRef}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-activedescendant={activeNodeId ?? undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'overflow-auto focus:outline-none',
        'overscroll-behavior-contain',
        className
      )}
      style={{
        height,
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const node = nodes[virtualItem.index]
          const isActive = node.id === activeNodeId
          const isFirst = virtualItem.index === 0

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <NodeListItem
                id={node.id}
                data-node-id={node.id}
                node={node}
                isActive={isActive}
                onClick={() => onNodeSelect(node.id)}
                tabIndex={isFirst ? 0 : -1}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { VirtualizedNodeListProps }
