import { Component, type ReactNode, type ErrorInfo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional custom fallback UI. If not provided, default fallback is shown. */
  fallback?: ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Section name for error context in logs */
  section?: string
  /** Additional CSS classes for the fallback container */
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors in child component tree,
 * logs them, and displays a fallback UI instead of crashing the whole app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary section="sidebar">
 *   <Sidebar />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { section, onError } = this.props

    // Log error with full stack trace
    console.error(
      `[ErrorBoundary${section ? `:${section}` : ''}] Caught error:`,
      error
    )
    console.error('Component stack:', errorInfo.componentStack)

    // Call optional error callback
    onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, section, className } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-6 text-center',
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
              {section && (
                <span className="text-gray-500 dark:text-gray-400">
                  {' '}
                  in {section}
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>

          <Button onClick={this.handleReset} aria-label="Try again">
            Try again
          </Button>
        </div>
      )
    }

    return children
  }
}
