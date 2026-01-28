/**
 * SaveIndicator Component
 *
 * Shows the current save status with appropriate visual feedback.
 * Displays "Saving..." when saving, "Unsaved changes" when dirty,
 * or "Saved" when all changes are persisted.
 */

import { Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

export interface SaveIndicatorProps {
  /** Current save status */
  status: SaveStatus
  /** Optional error message when status is 'error' */
  errorMessage?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to show the indicator (can hide when idle) */
  showWhenIdle?: boolean
}

// ============================================================================
// Status Configurations
// ============================================================================

const STATUS_CONFIG: Record<
  SaveStatus,
  {
    icon: typeof Loader2 | typeof Check | typeof AlertCircle | null
    label: string
    iconClass: string
    textClass: string
    animate?: boolean
  }
> = {
  idle: {
    icon: null,
    label: '',
    iconClass: '',
    textClass: 'text-gray-500 dark:text-gray-400',
  },
  saving: {
    icon: Loader2,
    label: 'Saving...',
    iconClass: 'text-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    animate: true,
  },
  saved: {
    icon: Check,
    label: 'Saved',
    iconClass: 'text-green-500',
    textClass: 'text-green-600 dark:text-green-400',
  },
  unsaved: {
    icon: AlertCircle,
    label: 'Unsaved changes',
    iconClass: 'text-amber-600',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Save failed',
    iconClass: 'text-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
}

// ============================================================================
// SaveIndicator Component
// ============================================================================

export function SaveIndicator({
  status,
  errorMessage,
  className,
  showWhenIdle = false,
}: SaveIndicatorProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  // Hide when idle unless explicitly shown
  if (status === 'idle' && !showWhenIdle) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        config.textClass,
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {Icon && (
        <Icon
          className={cn(
            'h-4 w-4',
            config.iconClass,
            config.animate && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      <span>
        {status === 'error' && errorMessage ? errorMessage : config.label}
      </span>
    </div>
  )
}

// ============================================================================
// Convenience Hook
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'

export interface UseSaveIndicatorOptions {
  /** How long to show "Saved" status before returning to idle (ms) */
  savedDisplayDuration?: number
}

export interface UseSaveIndicatorReturn {
  /** Current save status for the indicator */
  status: SaveStatus
  /** Error message if save failed */
  errorMessage?: string
  /** Whether a save is in progress */
  isSaving: boolean
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Whether saving is possible (project and adapter exist) */
  canSave: boolean
  /** Manually trigger a save */
  saveNow: () => Promise<boolean>
}

/**
 * Hook that combines auto-save functionality with status tracking
 * for the SaveIndicator component.
 *
 * @example
 * ```tsx
 * const { status, saveNow } = useSaveIndicator()
 * return <SaveIndicator status={status} />
 * ```
 */
export function useSaveIndicator(
  options: UseSaveIndicatorOptions = {}
): UseSaveIndicatorReturn {
  const { savedDisplayDuration = 2000 } = options

  const [showSaved, setShowSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [hasError, setHasError] = useState(false)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasDirtyNodes = useNodesStore((state) => state.hasDirtyNodes())
  const storeError = useProjectStore((state) => state.error)
  const hasProject = useProjectStore((state) => state.hasProject())

  const { isSaving, hasUnsavedChanges, saveNow } = useAutoSave({
    onSaveSuccess: () => {
      setHasError(false)
      setErrorMessage(undefined)
      setShowSaved(true)

      // Clear any existing timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }

      // Hide "Saved" after duration
      savedTimeoutRef.current = setTimeout(() => {
        setShowSaved(false)
      }, savedDisplayDuration)
    },
    onSaveError: (error) => {
      setHasError(true)
      setErrorMessage(error)
      setShowSaved(false)
    },
  })

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Determine status based on state
  let status: SaveStatus = 'idle'
  if (hasError || storeError) {
    status = 'error'
  } else if (isSaving) {
    status = 'saving'
  } else if (showSaved && !hasDirtyNodes) {
    status = 'saved'
  } else if (hasUnsavedChanges) {
    status = 'unsaved'
  }

  // Can save if we have a project (server handles persistence)
  const canSave = hasProject

  return {
    status,
    errorMessage: errorMessage || storeError || undefined,
    isSaving,
    hasUnsavedChanges,
    canSave,
    saveNow,
  }
}
