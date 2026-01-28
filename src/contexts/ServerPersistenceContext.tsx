/**
 * Server Persistence Context
 *
 * Provides access to server persistence state and actions throughout the app.
 * This context is separate from the hook to avoid circular dependencies.
 */

import { createContext, useContext } from 'react'
import type { UseServerPersistenceReturn } from '@/hooks/useServerPersistence'

/**
 * Extended interface that provides compatibility with HybridPersistence
 */
export interface PersistenceContextValue extends UseServerPersistenceReturn {
  /** Alias for isConnected - for compatibility with hybrid persistence */
  isInitialized: boolean
}

/**
 * Context for server persistence state and actions
 */
export const ServerPersistenceContext =
  createContext<PersistenceContextValue | null>(null)

/**
 * Hook to access server persistence context
 *
 * @throws {Error} If used outside of ServerPersistenceProvider
 */
export function useServerPersistenceContext(): PersistenceContextValue {
  const context = useContext(ServerPersistenceContext)
  if (!context) {
    throw new Error(
      'useServerPersistenceContext must be used within ServerPersistenceProvider'
    )
  }
  return context
}

/**
 * Optional version that returns null if not in provider
 * Useful for components that can work with or without persistence
 */
export function useOptionalServerPersistence(): PersistenceContextValue | null {
  return useContext(ServerPersistenceContext)
}
