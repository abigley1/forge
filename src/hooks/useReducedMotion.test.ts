import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion, prefersReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>
  let listeners: Map<string, Set<(event: MediaQueryListEvent) => void>>

  beforeEach(() => {
    listeners = new Map()

    mockMatchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(
        (_event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (!listeners.has(query)) {
            listeners.set(query, new Set())
          }
          listeners.get(query)!.add(handler)
        }
      ),
      removeEventListener: vi.fn(
        (_event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.get(query)?.delete(handler)
        }
      ),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))

    vi.stubGlobal('matchMedia', mockMatchMedia)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initial value', () => {
    it('returns false when prefers-reduced-motion is not set', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))

      const { result } = renderHook(() => useReducedMotion())

      expect(result.current).toBe(false)
    })

    it('returns true when prefers-reduced-motion is set to reduce', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))

      const { result } = renderHook(() => useReducedMotion())

      expect(result.current).toBe(true)
    })
  })

  describe('change detection', () => {
    it('updates when preference changes from false to true', () => {
      let currentMatches = false

      mockMatchMedia.mockImplementation((query: string) => {
        const mediaQueryList = {
          matches:
            query === '(prefers-reduced-motion: reduce)'
              ? currentMatches
              : false,
          media: query,
          addEventListener: vi.fn(
            (_event: string, handler: (e: MediaQueryListEvent) => void) => {
              if (!listeners.has(query)) {
                listeners.set(query, new Set())
              }
              listeners.get(query)!.add(handler)
            }
          ),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }
        return mediaQueryList
      })

      const { result } = renderHook(() => useReducedMotion())

      expect(result.current).toBe(false)

      // Simulate preference change
      act(() => {
        currentMatches = true
        const query = '(prefers-reduced-motion: reduce)'
        listeners.get(query)?.forEach((handler) => {
          handler({ matches: true } as MediaQueryListEvent)
        })
      })

      expect(result.current).toBe(true)
    })

    it('updates when preference changes from true to false', () => {
      let currentMatches = true

      mockMatchMedia.mockImplementation((query: string) => ({
        matches:
          query === '(prefers-reduced-motion: reduce)' ? currentMatches : false,
        media: query,
        addEventListener: vi.fn(
          (_event: string, handler: (e: MediaQueryListEvent) => void) => {
            if (!listeners.has(query)) {
              listeners.set(query, new Set())
            }
            listeners.get(query)!.add(handler)
          }
        ),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))

      const { result } = renderHook(() => useReducedMotion())

      expect(result.current).toBe(true)

      act(() => {
        currentMatches = false
        const query = '(prefers-reduced-motion: reduce)'
        listeners.get(query)?.forEach((handler) => {
          handler({ matches: false } as MediaQueryListEvent)
        })
      })

      expect(result.current).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListener = vi.fn()

      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))

      const { unmount } = renderHook(() => useReducedMotion())

      unmount()

      expect(removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )
    })
  })
})

describe('prefersReducedMotion', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
      }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when prefers-reduced-motion is not set', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
      }))
    )

    expect(prefersReducedMotion()).toBe(false)
  })

  it('returns true when prefers-reduced-motion is set to reduce', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
      }))
    )

    expect(prefersReducedMotion()).toBe(true)
  })
})
