/**
 * Hook for managing graph view preferences with localStorage persistence
 */

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'forge:graph-preferences'

export interface GraphPreferences {
  /** Whether the minimap is visible */
  showMinimap: boolean
  /** Whether the background grid is visible */
  showBackground: boolean
}

const DEFAULT_PREFERENCES: GraphPreferences = {
  showMinimap: true,
  showBackground: true,
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(): GraphPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        showMinimap:
          typeof parsed.showMinimap === 'boolean'
            ? parsed.showMinimap
            : DEFAULT_PREFERENCES.showMinimap,
        showBackground:
          typeof parsed.showBackground === 'boolean'
            ? parsed.showBackground
            : DEFAULT_PREFERENCES.showBackground,
      }
    }
  } catch (error) {
    console.warn('Failed to load graph preferences from localStorage:', error)
  }

  return DEFAULT_PREFERENCES
}

/**
 * Save preferences to localStorage
 */
function savePreferences(preferences: GraphPreferences): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to save graph preferences to localStorage:', error)
  }
}

export interface UseGraphPreferencesReturn {
  /** Current preferences */
  preferences: GraphPreferences
  /** Toggle minimap visibility */
  toggleMinimap: () => void
  /** Toggle background visibility */
  toggleBackground: () => void
  /** Set minimap visibility */
  setShowMinimap: (show: boolean) => void
  /** Set background visibility */
  setShowBackground: (show: boolean) => void
  /** Reset to defaults */
  resetPreferences: () => void
}

/**
 * Hook for managing graph view preferences
 *
 * @returns Preferences state and control functions
 *
 * @example
 * ```tsx
 * const { preferences, toggleMinimap } = useGraphPreferences()
 *
 * return (
 *   <GraphView showMinimap={preferences.showMinimap} />
 *   <button onClick={toggleMinimap}>Toggle Minimap</button>
 * )
 * ```
 */
export function useGraphPreferences(): UseGraphPreferencesReturn {
  const [preferences, setPreferences] =
    useState<GraphPreferences>(loadPreferences)

  // Persist changes to localStorage
  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  const toggleMinimap = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      showMinimap: !prev.showMinimap,
    }))
  }, [])

  const toggleBackground = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      showBackground: !prev.showBackground,
    }))
  }, [])

  const setShowMinimap = useCallback((show: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      showMinimap: show,
    }))
  }, [])

  const setShowBackground = useCallback((show: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      showBackground: show,
    }))
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  return {
    preferences,
    toggleMinimap,
    toggleBackground,
    setShowMinimap,
    setShowBackground,
    resetPreferences,
  }
}
