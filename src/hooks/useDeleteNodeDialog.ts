/**
 * useDeleteNodeDialog Hook
 *
 * Hook for controlling the delete node dialog state.
 * Separated from component for fast-refresh compliance.
 */

import { useState, useCallback } from 'react'
import type { ForgeNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface UseDeleteNodeDialogReturn {
  /** Whether the dialog is open */
  isOpen: boolean
  /** The node being deleted (null if dialog is closed) */
  nodeToDelete: ForgeNode | null
  /** Open the dialog for a specific node */
  openForNode: (node: ForgeNode) => void
  /** Close the dialog */
  close: () => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for controlling the delete node dialog state.
 * Allows opening the dialog from anywhere in the app.
 */
export function useDeleteNodeDialog(): UseDeleteNodeDialogReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<ForgeNode | null>(null)

  const openForNode = useCallback((node: ForgeNode) => {
    setNodeToDelete(node)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Clear node after dialog closes to avoid flash of empty state
    setTimeout(() => setNodeToDelete(null), 150)
  }, [])

  return {
    isOpen,
    nodeToDelete,
    openForNode,
    close,
  }
}
