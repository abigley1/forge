/**
 * useNodeNavigation Hook Tests
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'

import { useNodesStore } from '@/store/useNodesStore'
import { useNodeNavigation } from './useNodeNavigation'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>

// ============================================================================
// Test Setup
// ============================================================================

const wrapper = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
)

const defaultStoreMock = {
  activeNodeId: null as string | null,
  setActiveNode: vi.fn(),
  hasNode: vi.fn().mockReturnValue(true),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseNodesStore.mockImplementation(
    (selector: (state: typeof defaultStoreMock) => unknown) => {
      return selector(defaultStoreMock)
    }
  )
})

// ============================================================================
// Tests
// ============================================================================

describe('useNodeNavigation', () => {
  describe('initial state', () => {
    it('returns null activeNodeId when URL has no node param', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      expect(result.current.activeNodeId).toBeNull()
    })

    it('provides navigation functions', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      expect(typeof result.current.navigateToNode).toBe('function')
      expect(typeof result.current.goBack).toBe('function')
      expect(typeof result.current.goForward).toBe('function')
    })

    it('provides canGoBack boolean', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      expect(typeof result.current.canGoBack).toBe('boolean')
    })

    it('provides canGoForward boolean', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      expect(typeof result.current.canGoForward).toBe('boolean')
    })
  })

  describe('navigateToNode', () => {
    it('updates activeNodeId when navigating to valid node', () => {
      const mockSetActiveNode = vi.fn()
      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            setActiveNode: mockSetActiveNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode('test-node-id')
      })

      expect(mockSetActiveNode).toHaveBeenCalledWith('test-node-id')
    })

    it('clears activeNodeId when navigating to null', () => {
      const mockSetActiveNode = vi.fn()
      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            activeNodeId: 'current-node',
            setActiveNode: mockSetActiveNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode(null)
      })

      expect(mockSetActiveNode).toHaveBeenCalledWith(null)
    })

    it('warns and does not navigate to non-existent node', () => {
      const mockSetActiveNode = vi.fn()
      const mockHasNode = vi.fn().mockReturnValue(false)
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            setActiveNode: mockSetActiveNode,
            hasNode: mockHasNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode('non-existent-node')
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot navigate to non-existent node: non-existent-node'
      )
      expect(mockSetActiveNode).not.toHaveBeenCalled()

      consoleWarn.mockRestore()
    })

    it('allows navigating to null even when hasNode would fail', () => {
      const mockSetActiveNode = vi.fn()
      const mockHasNode = vi.fn().mockReturnValue(false)

      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            setActiveNode: mockSetActiveNode,
            hasNode: mockHasNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode(null)
      })

      // Should call setActiveNode(null) - hasNode check is skipped for null
      expect(mockSetActiveNode).toHaveBeenCalledWith(null)
    })
  })

  describe('URL sync', () => {
    it('navigating to a node updates activeNodeId', () => {
      const mockSetActiveNode = vi.fn()
      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            setActiveNode: mockSetActiveNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode('test-node')
      })

      // Store should be updated
      expect(mockSetActiveNode).toHaveBeenCalledWith('test-node')
    })

    it('activeNodeId starts as null when no URL param', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      // Initially null (no node in URL)
      expect(result.current.activeNodeId).toBeNull()
    })

    it('navigateToNode updates both store and URL state', () => {
      const mockSetActiveNode = vi.fn()
      mockUseNodesStore.mockImplementation(
        (selector: (state: typeof defaultStoreMock) => unknown) => {
          return selector({
            ...defaultStoreMock,
            setActiveNode: mockSetActiveNode,
          })
        }
      )

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.navigateToNode('nav-node')
      })

      // Store should be updated (URL update is handled by nuqs)
      expect(mockSetActiveNode).toHaveBeenCalledWith('nav-node')
    })
  })

  describe('goBack', () => {
    it('calls window.history.back when history exists', () => {
      // Mock history.length to be > 1
      const originalLength = window.history.length
      Object.defineProperty(window.history, 'length', {
        value: 3,
        writable: true,
      })
      const historyBack = vi
        .spyOn(window.history, 'back')
        .mockImplementation(() => {})

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.goBack()
      })

      expect(historyBack).toHaveBeenCalled()

      historyBack.mockRestore()
      Object.defineProperty(window.history, 'length', {
        value: originalLength,
        writable: true,
      })
    })

    it('is callable even when no history', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      // Should not throw
      expect(() => {
        act(() => {
          result.current.goBack()
        })
      }).not.toThrow()
    })
  })

  describe('goForward', () => {
    it('calls window.history.forward', () => {
      const historyForward = vi
        .spyOn(window.history, 'forward')
        .mockImplementation(() => {})

      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      act(() => {
        result.current.goForward()
      })

      expect(historyForward).toHaveBeenCalled()

      historyForward.mockRestore()
    })
  })

  describe('canGoBack', () => {
    it('reflects history.length > 1', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      // In jsdom, history.length starts at 1, so canGoBack should be false
      // This tests the actual behavior - if history.length is 1, canGoBack is false
      expect(result.current.canGoBack).toBe(window.history.length > 1)
    })
  })

  describe('canGoForward', () => {
    it('is false (cannot reliably detect)', () => {
      const { result } = renderHook(() => useNodeNavigation(), { wrapper })

      expect(result.current.canGoForward).toBe(false)
    })
  })
})
