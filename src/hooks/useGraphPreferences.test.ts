import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useGraphPreferences,
  type GraphPreferences,
} from './useGraphPreferences'

describe('useGraphPreferences', () => {
  const STORAGE_KEY = 'forge:graph-preferences'

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('returns default preferences when localStorage is empty', () => {
      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences).toEqual({
        showMinimap: true,
        showBackground: true,
      })
    })

    it('loads preferences from localStorage', () => {
      const stored: GraphPreferences = {
        showMinimap: false,
        showBackground: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences).toEqual(stored)
    })

    it('handles partial stored preferences', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ showMinimap: false }))

      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences.showMinimap).toBe(false)
      expect(result.current.preferences.showBackground).toBe(true)
    })

    it('handles invalid JSON in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'not valid json')

      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences).toEqual({
        showMinimap: true,
        showBackground: true,
      })
    })

    it('handles invalid values in stored preferences', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ showMinimap: 'yes', showBackground: 123 })
      )

      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences).toEqual({
        showMinimap: true,
        showBackground: true,
      })
    })
  })

  describe('toggleMinimap', () => {
    it('toggles minimap visibility from true to false', () => {
      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences.showMinimap).toBe(true)

      act(() => {
        result.current.toggleMinimap()
      })

      expect(result.current.preferences.showMinimap).toBe(false)
    })

    it('toggles minimap visibility from false to true', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ showMinimap: false, showBackground: true })
      )

      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences.showMinimap).toBe(false)

      act(() => {
        result.current.toggleMinimap()
      })

      expect(result.current.preferences.showMinimap).toBe(true)
    })

    it('persists change to localStorage', () => {
      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.toggleMinimap()
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(stored.showMinimap).toBe(false)
    })
  })

  describe('toggleBackground', () => {
    it('toggles background visibility', () => {
      const { result } = renderHook(() => useGraphPreferences())

      expect(result.current.preferences.showBackground).toBe(true)

      act(() => {
        result.current.toggleBackground()
      })

      expect(result.current.preferences.showBackground).toBe(false)
    })
  })

  describe('setShowMinimap', () => {
    it('sets minimap visibility to specific value', () => {
      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.setShowMinimap(false)
      })

      expect(result.current.preferences.showMinimap).toBe(false)

      act(() => {
        result.current.setShowMinimap(true)
      })

      expect(result.current.preferences.showMinimap).toBe(true)
    })
  })

  describe('setShowBackground', () => {
    it('sets background visibility to specific value', () => {
      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.setShowBackground(false)
      })

      expect(result.current.preferences.showBackground).toBe(false)
    })
  })

  describe('resetPreferences', () => {
    it('resets to default preferences', () => {
      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.toggleMinimap()
        result.current.toggleBackground()
      })

      expect(result.current.preferences.showMinimap).toBe(false)
      expect(result.current.preferences.showBackground).toBe(false)

      act(() => {
        result.current.resetPreferences()
      })

      expect(result.current.preferences).toEqual({
        showMinimap: true,
        showBackground: true,
      })
    })

    it('persists reset to localStorage', () => {
      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.toggleMinimap()
      })

      act(() => {
        result.current.resetPreferences()
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(stored.showMinimap).toBe(true)
      expect(stored.showBackground).toBe(true)
    })
  })

  describe('persistence', () => {
    it('preserves other preferences when toggling one', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ showMinimap: true, showBackground: false })
      )

      const { result } = renderHook(() => useGraphPreferences())

      act(() => {
        result.current.toggleMinimap()
      })

      expect(result.current.preferences).toEqual({
        showMinimap: false,
        showBackground: false,
      })
    })
  })
})
