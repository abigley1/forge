/**
 * SortableNodeList Component
 *
 * A drag-and-drop enabled node list using @dnd-kit.
 * Allows users to reorder nodes by dragging them.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { FolderPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ForgeNode } from '@/types/nodes'
import { SortableNodeListItem } from './SortableNodeListItem'
import { NodeListItem } from './NodeListItem'
import { EmptyState } from './EmptyState'

// ============================================================================
// Types
// ============================================================================

interface SortableNodeListProps {
  /** Array of nodes to display (in order) */
  nodes: ForgeNode[]
  /** ID of the currently active node */
  activeNodeId: string | null
  /** Called when a node is selected */
  onNodeSelect: (nodeId: string) => void
  /** Called when nodes are reordered */
  onReorder: (nodeIds: string[]) => void
  /** Called when user wants to create a new node */
  onCreateNode?: () => void
  /** Additional CSS classes */
  className?: string
  /** ARIA label for the list */
  'aria-label'?: string
  /** Whether drag is disabled */
  disabled?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a sortable list of nodes with drag-and-drop reordering.
 *
 * Features:
 * - Drag handle on left side of each item
 * - Visual feedback during drag (shadow, ring)
 * - Keyboard support (Space/Enter to pick up, arrows to move)
 * - Persists order via onReorder callback
 *
 * @example
 * <SortableNodeList
 *   nodes={orderedNodes}
 *   activeNodeId={activeNodeId}
 *   onNodeSelect={handleNodeSelect}
 *   onReorder={handleReorder}
 * />
 */
export function SortableNodeList({
  nodes,
  activeNodeId,
  onNodeSelect,
  onReorder,
  onCreateNode,
  className,
  'aria-label': ariaLabel = 'Sortable node list',
  disabled = false,
}: SortableNodeListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Get the node being dragged
  const activeDragNode = useMemo(
    () => nodes.find((n) => n.id === activeDragId) ?? null,
    [nodes, activeDragId]
  )

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require pointer to move 5px before activating drag
        // This prevents accidental drags when clicking
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Store ref for each item
  const setItemRef = useCallback(
    (id: string, element: HTMLDivElement | null) => {
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
    // Check if focus is within any of our item refs
    for (const [, element] of itemRefs.current) {
      if (element.contains(focused)) {
        return nodes.findIndex(
          (node) => itemRefs.current.get(node.id) === element
        )
      }
    }
    return -1
  }, [nodes])

  // Focus item at index
  const focusItemAtIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < nodes.length) {
        const node = nodes[index]
        const element = itemRefs.current.get(node.id)
        // Focus the first button within the element
        const button = element?.querySelector('button')
        button?.focus()
      }
    },
    [nodes]
  )

  // Handle keyboard navigation within the list
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = getFocusedIndex()
      if (currentIndex === -1) return

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
      }
    },
    [nodes.length, getFocusedIndex, focusItemAtIndex]
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveDragId(null)

      if (over && active.id !== over.id) {
        // Find old and new indices
        const oldIndex = nodes.findIndex((n) => n.id === active.id)
        const newIndex = nodes.findIndex((n) => n.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // Create new order array
          const newOrder = [...nodes.map((n) => n.id)]
          const [movedId] = newOrder.splice(oldIndex, 1)
          newOrder.splice(newIndex, 0, movedId)

          // Notify parent of reorder
          onReorder(newOrder)
        }
      }
    },
    [nodes, onReorder]
  )

  // Node IDs for sortable context
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes])

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
        <div
          ref={listRef}
          role="listbox"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-activedescendant={activeNodeId ?? undefined}
          onKeyDown={handleKeyDown}
          className={cn('space-y-1 focus:outline-none', className)}
        >
          {nodes.map((node, index) => (
            <SortableNodeListItem
              key={node.id}
              id={node.id}
              ref={(el) => setItemRef(node.id, el)}
              node={node}
              isActive={node.id === activeNodeId}
              onClick={() => onNodeSelect(node.id)}
              tabIndex={index === 0 ? 0 : -1}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay - shows the item being dragged */}
      <DragOverlay>
        {activeDragNode ? (
          <div className="opacity-80">
            <NodeListItem
              node={activeDragNode}
              isActive={activeDragNode.id === activeNodeId}
              className="rounded-md bg-white shadow-lg ring-2 ring-blue-500 dark:bg-gray-900"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
