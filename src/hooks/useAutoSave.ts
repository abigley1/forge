/**
 * useAutoSave Hook
 *
 * Provides debounced auto-save functionality for dirty nodes.
 * Monitors dirty state and automatically saves after a configurable delay.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

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
  const {
    enabled = true,
    delay = DEFAULT_AUTO_SAVE_DELAY,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options

  const [isSaving, setIsSaving] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get state from stores
  const hasDirtyNodes = useNodesStore((state) => state.hasDirtyNodes())
  const hasAdapter = useProjectStore((state) => state.hasAdapter())
  const hasProject = useProjectStore((state) => state.hasProject())
  const saveAllDirtyNodes = useProjectStore((state) => state.saveAllDirtyNodes)

  // Manual save function
  const saveNow = useCallback(async (): Promise<boolean> => {
    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!hasAdapter || !hasProject) {
      onSaveError?.('Cannot save: No project is currently open')
      return false
    }

    setIsSaving(true)
    onSaveStart?.()

    try {
      const success = await saveAllDirtyNodes()
      setIsSaving(false)

      if (success) {
        onSaveSuccess?.()
      } else {
        onSaveError?.('Failed to save some nodes')
      }

      return success
    } catch (err) {
      setIsSaving(false)
      const message = err instanceof Error ? err.message : 'Unknown error'
      onSaveError?.(message)
      return false
    }
  }, [
    hasAdapter,
    hasProject,
    saveAllDirtyNodes,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  ])

  // Set up debounced auto-save
  useEffect(() => {
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Don't set up auto-save if conditions not met
    if (!enabled || !hasDirtyNodes || !hasAdapter || !hasProject || isSaving) {
      return
    }

    // Set up new timeout
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      saveNow()
    }, delay)

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [enabled, hasDirtyNodes, hasAdapter, hasProject, delay, isSaving, saveNow])

  return {
    isSaving,
    hasUnsavedChanges: hasDirtyNodes,
    saveNow,
  }
}
