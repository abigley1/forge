import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'info' | 'undo'

export type Toast = {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  onUndo?: () => void
}

type ToastOptions = Omit<Toast, 'id' | 'variant'>

type ToastState = {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }

type ToastContextValue = {
  toasts: Toast[]
  toast: (variant: ToastVariant, options: ToastOptions) => string
  success: (options: ToastOptions) => string
  error: (options: ToastOptions) => string
  info: (options: ToastOptions) => string
  undo: (options: ToastOptions & { onUndo: () => void }) => string
  dismiss: (id: string) => void
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 5000
const UNDO_DURATION = 8000

const Z_TOAST = 50

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================================================
// Reducer
// ============================================================================

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

// ============================================================================
// Provider
// ============================================================================

type ToastProviderProps = {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] })

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id })
  }, [])

  const addToast = useCallback(
    (variant: ToastVariant, options: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const duration =
        options.duration ??
        (variant === 'undo' ? UNDO_DURATION : DEFAULT_DURATION)

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          id,
          variant,
          duration,
          ...options,
        },
      })

      return id
    },
    []
  )

  const toast = useCallback(
    (variant: ToastVariant, options: ToastOptions) =>
      addToast(variant, options),
    [addToast]
  )

  const success = useCallback(
    (options: ToastOptions) => addToast('success', options),
    [addToast]
  )

  const error = useCallback(
    (options: ToastOptions) => addToast('error', options),
    [addToast]
  )

  const info = useCallback(
    (options: ToastOptions) => addToast('info', options),
    [addToast]
  )

  const undo = useCallback(
    (options: ToastOptions & { onUndo: () => void }) =>
      addToast('undo', options),
    [addToast]
  )

  const value = useMemo(
    () => ({
      toasts: state.toasts,
      toast,
      success,
      error,
      info,
      undo,
      dismiss,
    }),
    [state.toasts, toast, success, error, info, undo, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={state.toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// ============================================================================
// Toast Container
// ============================================================================

type ToastContainerProps = {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4"
      style={{ zIndex: Z_TOAST }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ============================================================================
// Toast Item
// ============================================================================

type ToastItemProps = {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const labelId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return

    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const handleUndo = () => {
    toast.onUndo?.()
    onDismiss(toast.id)
  }

  return (
    <div
      role="alert"
      aria-labelledby={labelId}
      aria-describedby={toast.description ? descriptionId : undefined}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg p-4 shadow-lg',
        'animate-in fade-in slide-in-from-bottom-4 duration-200',
        'motion-reduce:animate-none',
        variantStyles[toast.variant]
      )}
    >
      <ToastIcon variant={toast.variant} />
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-sm font-medium">
          {toast.title}
        </p>
        {toast.description && (
          <p id={descriptionId} className="mt-1 text-sm opacity-90">
            {toast.description}
          </p>
        )}
        {toast.variant === 'undo' && toast.onUndo && (
          <button
            type="button"
            onClick={handleUndo}
            className="focus-visible:ring-offset-forge-text mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Undo
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900',
  undo: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
}

// ============================================================================
// Icons
// ============================================================================

type ToastIconProps = {
  variant: ToastVariant
}

function ToastIcon({ variant }: ToastIconProps) {
  const iconClass = 'h-5 w-5 flex-shrink-0'

  switch (variant) {
    case 'success':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )
    case 'error':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'info':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'undo':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      )
  }
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}
