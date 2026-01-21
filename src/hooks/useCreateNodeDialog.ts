/**
 * useCreateNodeDialog Hook
 *
 * Hook to manage CreateNodeDialog state for easier integration.
 */

import { useState, useCallback } from 'react'

import { NodeType } from '@/types/nodes'

/**
 * Hook to manage CreateNodeDialog state
 * Returns open state and handlers for integration with the dialog
 */
export function useCreateNodeDialog() {
  const [open, setOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<NodeType>(NodeType.Note)

  const openDialog = useCallback((type?: NodeType) => {
    if (type) {
      setDefaultType(type)
    }
    setOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setOpen(false)
  }, [])

  return {
    open,
    setOpen,
    defaultType,
    openDialog,
    closeDialog,
  }
}
