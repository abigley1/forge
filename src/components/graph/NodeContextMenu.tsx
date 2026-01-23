/**
 * Context menu for graph nodes
 */

import { useCallback, useEffect, useRef } from 'react'
import { Edit2, Trash2, Eye, Link2 } from 'lucide-react'
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
  /** Called when Edit is clicked */
  onEdit: (nodeId: string) => void
  /** Called when Delete is clicked */
  onDelete: (nodeId: string) => void
  /** Called when View is clicked */
  onView: (nodeId: string) => void
  /** Called when Add Link is clicked */
  onAddLink: (nodeId: string) => void
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
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:bg-gray-700',
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
  onEdit,
  onDelete,
  onView,
  onAddLink,
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

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${nodeTitle}`}
      tabIndex={-1}
      className={cn(
        'fixed z-50 min-w-[160px] rounded-lg border bg-white dark:bg-gray-800',
        'border-gray-200 shadow-lg dark:border-gray-700',
        'py-1 focus:outline-none'
      )}
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="max-w-[200px] truncate text-xs font-medium text-gray-500 dark:text-gray-400">
          {nodeTitle}
        </p>
      </div>
      <div role="group">
        <MenuItem icon={Eye} label="View" onClick={handleView} />
        <MenuItem icon={Edit2} label="Edit" onClick={handleEdit} />
        <MenuItem icon={Link2} label="Add Link" onClick={handleAddLink} />
        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
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
