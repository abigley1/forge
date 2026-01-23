import { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * Context for the live announcer
 */
interface LiveAnnouncerContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | null>(
  null
)

/**
 * Props for the LiveAnnouncerProvider
 */
interface LiveAnnouncerProviderProps {
  children: React.ReactNode
}

/**
 * Provider for global screen reader announcements.
 *
 * Renders two aria-live regions (polite and assertive) and provides
 * an announce function via context that can be used anywhere in the app.
 *
 * @example
 * ```tsx
 * // In your app root
 * <LiveAnnouncerProvider>
 *   <App />
 * </LiveAnnouncerProvider>
 *
 * // In any component
 * const { announce } = useLiveAnnouncer()
 * announce('Item saved successfully')
 * ```
 */
export function LiveAnnouncerProvider({
  children,
}: LiveAnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set the message
      if (priority === 'assertive') {
        setAssertiveMessage(message)
        // Clear after a delay to allow re-announcement of the same message
        timeoutRef.current = setTimeout(() => setAssertiveMessage(''), 1000)
      } else {
        setPoliteMessage(message)
        timeoutRef.current = setTimeout(() => setPoliteMessage(''), 1000)
      }
    },
    []
  )

  return (
    <LiveAnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Polite region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-announcer-polite"
      >
        {politeMessage}
      </div>
      {/* Assertive region - for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-announcer-assertive"
      >
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  )
}

/**
 * Hook to access the live announcer
 *
 * @returns Object with announce function
 * @throws Error if used outside LiveAnnouncerProvider
 *
 * @example
 * ```tsx
 * const { announce } = useLiveAnnouncer()
 * announce('File saved')
 * announce('Error occurred', 'assertive')
 * ```
 */
export function useLiveAnnouncer() {
  const context = useContext(LiveAnnouncerContext)
  if (!context) {
    throw new Error(
      'useLiveAnnouncer must be used within a LiveAnnouncerProvider'
    )
  }
  return context
}
