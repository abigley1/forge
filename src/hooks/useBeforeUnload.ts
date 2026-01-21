/**
 * useBeforeUnload Hook
 *
 * Warns users before navigating away when there are unsaved changes.
 * Shows the browser's native "Leave site?" dialog.
 */

import { useEffect, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface UseBeforeUnloadOptions {
  /** Whether to show the warning (typically based on dirty state) */
  enabled: boolean
  /** Custom message (note: most browsers ignore this and show their own message) */
  message?: string
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that shows a browser warning when attempting to leave with unsaved changes.
 *
 * Note: Modern browsers typically ignore custom messages and show their own
 * generic "Leave site?" warning for security reasons.
 *
 * @example
 * ```tsx
 * const hasDirtyNodes = useNodesStore((state) => state.hasDirtyNodes())
 * useBeforeUnload({ enabled: hasDirtyNodes })
 * ```
 */
export function useBeforeUnload(options: UseBeforeUnloadOptions): void {
  const {
    enabled,
    message = 'You have unsaved changes. Are you sure you want to leave?',
  } = options

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!enabled) return

      // Standard way to trigger the browser's "Leave site?" dialog
      event.preventDefault()

      // For older browsers, set returnValue
      // Note: The actual message is usually ignored by modern browsers
      event.returnValue = message

      return message
    },
    [enabled, message]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [enabled, handleBeforeUnload])
}

// ============================================================================
// Convenience Hook with Nodes Store
// ============================================================================

import { useNodesStore } from '@/store/useNodesStore'

/**
 * Convenience hook that automatically uses dirty state from nodes store.
 *
 * @example
 * ```tsx
 * // In App.tsx or a top-level component
 * useUnsavedChangesWarning()
 * ```
 */
export function useUnsavedChangesWarning(): void {
  const hasDirtyNodes = useNodesStore((state) => state.hasDirtyNodes())
  useBeforeUnload({ enabled: hasDirtyNodes })
}
