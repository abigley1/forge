/**
 * Context menu for graph nodes
 */

import { useCallback, useEffect, useRef } from 'react'
import { Edit2, Trash2, Eye, Link2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NodeContextMenuProps {
  /** X position of the menu */
  x: number
  /** Y position of the menu */
  y: number
  /** ID of the node the menu is for */
  nodeId: string
  /** Node title for display */
  nodeTitle: string
  /** Whether this node is a container (subsystem/assembly/module) */
  isContainer?: boolean
  /** Called when Edit is clicked */
  onEdit: (nodeId: string) => void
  /** Called when Delete is clicked */
  onDelete: (nodeId: string) => void
  /** Called when View is clicked */
  onView: (nodeId: string) => void
  /** Called when Add Link is clicked */
  onAddLink: (nodeId: string) => void
  /** Called when Show Children Only is clicked (for containers) */
  onShowChildrenOnly?: (nodeId: string) => void
  /** Called when menu should close */
  onClose: () => void
}

interface MenuItemProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs tracking-wide',
        'hover:bg-forge-paper dark:hover:bg-forge-paper-dark',
        'focus-visible:bg-forge-paper focus-visible:ring-forge-accent dark:focus-visible:bg-forge-paper-dark focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        variant === 'danger' &&
          'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

/**
 * Context menu component for graph nodes
 */
export function NodeContextMenu({
  x,
  y,
  nodeId,
  nodeTitle,
  isContainer = false,
  onEdit,
  onDelete,
  onView,
  onAddLink,
  onShowChildrenOnly,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use timeout to avoid immediate close from the right-click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onClose])

  // Focus the menu when it opens
  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  const handleEdit = useCallback(() => {
    onEdit(nodeId)
    onClose()
  }, [nodeId, onEdit, onClose])

  const handleDelete = useCallback(() => {
    onDelete(nodeId)
    onClose()
  }, [nodeId, onDelete, onClose])

  const handleView = useCallback(() => {
    onView(nodeId)
    onClose()
  }, [nodeId, onView, onClose])

  const handleAddLink = useCallback(() => {
    onAddLink(nodeId)
    onClose()
  }, [nodeId, onAddLink, onClose])

  const handleShowChildrenOnly = useCallback(() => {
    onShowChildrenOnly?.(nodeId)
    onClose()
  }, [nodeId, onShowChildrenOnly, onClose])

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${nodeTitle}`}
      tabIndex={-1}
      className={cn(
        'bg-forge-surface dark:bg-forge-surface-dark fixed z-50 min-w-[160px] rounded-md border',
        'border-forge-border dark:border-forge-border-dark shadow-lg',
        'py-1 focus:outline-none'
      )}
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="border-forge-border-subtle dark:border-forge-border-subtle-dark border-b px-3 py-2">
        <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark max-w-[200px] truncate font-mono text-[10px] font-semibold tracking-[0.1em] uppercase">
          {nodeTitle}
        </p>
      </div>
      <div role="group">
        <MenuItem icon={Eye} label="View" onClick={handleView} />
        <MenuItem icon={Edit2} label="Edit" onClick={handleEdit} />
        <MenuItem icon={Link2} label="Add Link" onClick={handleAddLink} />
        {isContainer && onShowChildrenOnly && (
          <MenuItem
            icon={Filter}
            label="Show Children Only"
            onClick={handleShowChildrenOnly}
          />
        )}
        <div className="border-forge-border-subtle dark:border-forge-border-subtle-dark my-1 border-t" />
        <MenuItem
          icon={Trash2}
          label="Delete"
          onClick={handleDelete}
          variant="danger"
        />
      </div>
    </div>
  )
}
