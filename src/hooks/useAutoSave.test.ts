/**
 * useAutoSave Hook Tests
 *
 * With server persistence, saves happen automatically via subscription.
 * This hook mainly tracks dirty state and provides a saveNow function
 * that immediately signals success (since nodes are auto-synced).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useAutoSave, DEFAULT_AUTO_SAVE_DELAY } from './useAutoSave'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: vi.fn(),
}))

const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>
const mockUseProjectStore = useProjectStore as unknown as ReturnType<
  typeof vi.fn
>

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => false,
        }
        return selector(state)
      }
    )

    mockUseProjectStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasProject: () => true,
        }
        return selector(state)
      }
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useAutoSave())

      expect(result.current.isSaving).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('exports DEFAULT_AUTO_SAVE_DELAY constant', () => {
      expect(DEFAULT_AUTO_SAVE_DELAY).toBe(2000)
    })

    it('reflects dirty state from store', () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      expect(result.current.hasUnsavedChanges).toBe(true)
    })
  })

  describe('saveNow', () => {
    it('returns true and calls onSaveSuccess when project exists', async () => {
      const onSaveSuccess = vi.fn()

      const { result } = renderHook(() => useAutoSave({ onSaveSuccess }))

      let saveResult: boolean | undefined
      await act(async () => {
        saveResult = await result.current.saveNow()
      })

      expect(saveResult).toBe(true)
      expect(onSaveSuccess).toHaveBeenCalledTimes(1)
    })

    it('returns false and calls onSaveError when no project', async () => {
      const onSaveError = vi.fn()

      mockUseProjectStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasProject: () => false,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveError }))

      let saveResult: boolean | undefined
      await act(async () => {
        saveResult = await result.current.saveNow()
      })

      expect(saveResult).toBe(false)
      expect(onSaveError).toHaveBeenCalledWith(
        'Cannot save: No project is currently open'
      )
    })
  })

  describe('callbacks', () => {
    it('calls onSaveSuccess when save succeeds', async () => {
      const onSaveSuccess = vi.fn()

      const { result } = renderHook(() => useAutoSave({ onSaveSuccess }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveSuccess).toHaveBeenCalled()
    })

    it('calls onSaveError when no project is open', async () => {
      const onSaveError = vi.fn()

      mockUseProjectStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasProject: () => false,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveError }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledWith(
        'Cannot save: No project is currently open'
      )
    })
  })

  describe('isSaving state', () => {
    it('isSaving is always false (server auto-saves)', () => {
      const { result } = renderHook(() => useAutoSave())

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('backwards compatibility', () => {
    it('accepts legacy options without error', () => {
      // These options are kept for backwards compatibility but not used
      const { result } = renderHook(() =>
        useAutoSave({
          enabled: true,
          delay: 5000,
          onSaveStart: vi.fn(),
          onSaveSuccess: vi.fn(),
          onSaveError: vi.fn(),
        })
      )

      expect(result.current.isSaving).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
    })
  })
})
