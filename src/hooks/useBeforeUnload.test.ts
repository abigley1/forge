/**
 * useBeforeUnload Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useBeforeUnload, useUnsavedChangesWarning } from './useBeforeUnload'
import { useNodesStore } from '@/store/useNodesStore'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>

describe('useBeforeUnload', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  describe('event listener management', () => {
    it('adds beforeunload listener when enabled', () => {
      renderHook(() => useBeforeUnload({ enabled: true }))

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('does not add listener when disabled', () => {
      renderHook(() => useBeforeUnload({ enabled: false }))

      expect(addEventListenerSpy).not.toHaveBeenCalled()
    })

    it('removes listener on unmount', () => {
      const { unmount } = renderHook(() => useBeforeUnload({ enabled: true }))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('removes listener when disabled changes from true to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useBeforeUnload({ enabled }),
        { initialProps: { enabled: true } }
      )

      rerender({ enabled: false })

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('adds listener when enabled changes from false to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useBeforeUnload({ enabled }),
        { initialProps: { enabled: false } }
      )

      addEventListenerSpy.mockClear()

      rerender({ enabled: true })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })
  })

  describe('beforeunload handler behavior', () => {
    it('calls preventDefault and sets returnValue when enabled', () => {
      renderHook(() => useBeforeUnload({ enabled: true }))

      // Get the handler that was registered
      const handler = addEventListenerSpy.mock.calls[0][1] as (
        event: BeforeUnloadEvent
      ) => void

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent

      handler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.returnValue).toBe(
        'You have unsaved changes. Are you sure you want to leave?'
      )
    })

    it('uses custom message when provided', () => {
      const customMessage = 'Custom warning message'
      renderHook(() =>
        useBeforeUnload({ enabled: true, message: customMessage })
      )

      const handler = addEventListenerSpy.mock.calls[0][1] as (
        event: BeforeUnloadEvent
      ) => void

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent

      handler(mockEvent)

      expect(mockEvent.returnValue).toBe(customMessage)
    })

    it('does not prevent default when disabled', () => {
      renderHook(() => useBeforeUnload({ enabled: false }))

      // No handler should be registered
      expect(addEventListenerSpy).not.toHaveBeenCalled()
    })
  })
})

describe('useUnsavedChangesWarning', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
  })

  it('enables warning when there are dirty nodes', () => {
    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => true,
        }
        return selector(state)
      }
    )

    renderHook(() => useUnsavedChangesWarning())

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
  })

  it('disables warning when no dirty nodes', () => {
    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => false,
        }
        return selector(state)
      }
    )

    renderHook(() => useUnsavedChangesWarning())

    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('responds to dirty state changes', () => {
    let hasDirty = false
    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => hasDirty,
        }
        return selector(state)
      }
    )

    const { rerender } = renderHook(() => useUnsavedChangesWarning())

    expect(addEventListenerSpy).not.toHaveBeenCalled()

    // Change to dirty
    hasDirty = true
    rerender()

    expect(addEventListenerSpy).toHaveBeenCalled()
  })
})
