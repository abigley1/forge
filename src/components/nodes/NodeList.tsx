/**
 * NodeList Component
 *
 * Displays a list of nodes with keyboard navigation support.
 * - Arrow Up/Down: Navigate between items
 * - Enter: Select/activate the focused item
 * - Home/End: Jump to first/last item
 */

import { useRef, useCallback, useMemo } from 'react'
import { FolderPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { NodeListItem } from './NodeListItem'
import { EmptyState } from './EmptyState'

// ============================================================================
// Types
// ============================================================================

interface NodeListProps {
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
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a list of nodes with keyboard navigation.
 *
 * Keyboard shortcuts:
 * - Arrow Up: Focus previous item
 * - Arrow Down: Focus next item
 * - Home: Focus first item
 * - End: Focus last item
 * - Enter: Select the focused item
 *
 * @example
 * <NodeList
 *   nodes={allNodes}
 *   activeNodeId={activeNodeId}
 *   onNodeSelect={handleNodeSelect}
 *   onCreateNode={handleCreateNode}
 * />
 */
export function NodeList({
  nodes,
  activeNodeId,
  onNodeSelect,
  onCreateNode,
  className,
  'aria-label': ariaLabel = 'Node list',
}: NodeListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Store ref for each item
  const setItemRef = useCallback(
    (id: string, element: HTMLButtonElement | null) => {
      if (element) {
        itemRefs.current.set(id, element)
      } else {
        itemRefs.current.delete(id)
      }
    },
    []
  )

  // Get current focused index
  const getFocusedIndex = useCallback((): number => {
    const focused = document.activeElement
    return nodes.findIndex((node) => itemRefs.current.get(node.id) === focused)
  }, [nodes])

  // Focus item at index
  const focusItemAtIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < nodes.length) {
        const node = nodes[index]
        const element = itemRefs.current.get(node.id)
        element?.focus()
      }
    },
    [nodes]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = getFocusedIndex()

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
    [nodes, getFocusedIndex, focusItemAtIndex, onNodeSelect]
  )

  // Memoize the node items to avoid unnecessary re-renders
  const nodeItems = useMemo(
    () =>
      nodes.map((node, index) => (
        <NodeListItem
          key={node.id}
          id={node.id}
          ref={(el) => setItemRef(node.id, el)}
          node={node}
          isActive={node.id === activeNodeId}
          onClick={() => onNodeSelect(node.id)}
          tabIndex={index === 0 ? 0 : -1}
        />
      )),
    [nodes, activeNodeId, onNodeSelect, setItemRef]
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
      ref={listRef}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-activedescendant={activeNodeId ?? undefined}
      onKeyDown={handleKeyDown}
      className={cn('space-y-1 focus:outline-none', className)}
    >
      {nodeItems}
    </div>
  )
}
