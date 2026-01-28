/**
 * useAutoSave Hook
 *
 * Provides save functionality for dirty nodes.
 * With server persistence, saves happen automatically via subscription
 * in useServerPersistence, so this hook mainly tracks save state.
 */

import { useState, useCallback } from 'react'

import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'

// ============================================================================
// Constants
// ============================================================================

/** Default auto-save delay in milliseconds */
export const DEFAULT_AUTO_SAVE_DELAY = 2000

// ============================================================================
// Types
// ============================================================================

export interface UseAutoSaveOptions {
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Delay in milliseconds before saving (default: 2000ms) */
  delay?: number
  /** Callback when save starts */
  onSaveStart?: () => void
  /** Callback when save completes successfully */
  onSaveSuccess?: () => void
  /** Callback when save fails */
  onSaveError?: (error: string) => void
}

export interface UseAutoSaveReturn {
  /** Whether a save is currently in progress */
  isSaving: boolean
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Manually trigger a save immediately */
  saveNow: () => Promise<boolean>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for automatic debounced saving of dirty nodes.
 *
 * @example
 * ```tsx
 * const { isSaving, hasUnsavedChanges } = useAutoSave({
 *   delay: 2000,
 *   onSaveError: (err) => toast.error({ title: 'Save failed', description: err })
 * })
 * ```
 */
export function useAutoSave(
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { onSaveSuccess, onSaveError } = options
  // Note: enabled, delay, and onSaveStart are kept in the interface for backwards
  // compatibility but are not used since server persistence auto-saves

  const [isSaving] = useState(false)

  // Get state from stores
  const hasDirtyNodes = useNodesStore((state) => state.hasDirtyNodes())
  const hasProject = useProjectStore((state) => state.hasProject())

  // Manual save function
  // With server persistence, saves happen automatically via subscription.
  // This function just signals success since nodes are already synced.
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!hasProject) {
      onSaveError?.('Cannot save: No project is currently open')
      return false
    }
    // Nodes are automatically saved to server, just report success
    onSaveSuccess?.()
    return true
  }, [hasProject, onSaveSuccess, onSaveError])

  return {
    isSaving,
    hasUnsavedChanges: hasDirtyNodes,
    saveNow,
  }
}
