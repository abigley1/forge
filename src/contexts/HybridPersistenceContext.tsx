/**
 * Hybrid Persistence Context
 *
 * Provides access to hybrid persistence state and actions throughout the app.
 * This context is separate from the hook to avoid circular dependencies.
 */

import { createContext, useContext } from 'react'
import type { UseHybridPersistenceReturn } from '@/hooks/useHybridPersistence'

/**
 * Context for hybrid persistence state and actions
 */
export const HybridPersistenceContext =
  createContext<UseHybridPersistenceReturn | null>(null)

/**
 * Hook to access hybrid persistence context
 *
 * @throws {Error} If used outside of HybridPersistenceProvider
 */
export function useHybridPersistenceContext(): UseHybridPersistenceReturn {
  const context = useContext(HybridPersistenceContext)
  if (!context) {
    throw new Error(
      'useHybridPersistenceContext must be used within HybridPersistenceProvider'
    )
  }
  return context
}

/**
 * Optional version that returns null if not in provider
 * Useful for components that can work with or without persistence
 */
export function useOptionalHybridPersistence(): UseHybridPersistenceReturn | null {
  return useContext(HybridPersistenceContext)
}
