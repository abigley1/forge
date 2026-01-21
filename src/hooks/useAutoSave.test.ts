/**
 * useAutoSave Hook Tests
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
  let mockSaveAllDirtyNodes: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockSaveAllDirtyNodes = vi.fn().mockResolvedValue(true)

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
          hasAdapter: () => true,
          hasProject: () => true,
          saveAllDirtyNodes: mockSaveAllDirtyNodes,
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
  })

  describe('auto-save behavior', () => {
    it('does not trigger save when no dirty nodes', () => {
      renderHook(() => useAutoSave())

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()
    })

    it('triggers save after delay when dirty nodes exist', async () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      renderHook(() => useAutoSave())

      // Wait for debounce delay
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_AUTO_SAVE_DELAY + 100)
        await Promise.resolve() // Flush promises
      })

      expect(mockSaveAllDirtyNodes).toHaveBeenCalledTimes(1)
    })

    it('uses custom delay when provided', async () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const customDelay = 5000
      renderHook(() => useAutoSave({ delay: customDelay }))

      // Should not save before custom delay
      act(() => {
        vi.advanceTimersByTime(customDelay - 100)
      })

      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()

      // Should save after custom delay
      await act(async () => {
        vi.advanceTimersByTime(200)
        await Promise.resolve() // Flush promises
      })

      expect(mockSaveAllDirtyNodes).toHaveBeenCalled()
    })

    it('does not trigger save when disabled', () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      renderHook(() => useAutoSave({ enabled: false }))

      act(() => {
        vi.advanceTimersByTime(DEFAULT_AUTO_SAVE_DELAY + 100)
      })

      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()
    })

    it('does not trigger save when no adapter', () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      mockUseProjectStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasAdapter: () => false,
            hasProject: () => true,
            saveAllDirtyNodes: mockSaveAllDirtyNodes,
          }
          return selector(state)
        }
      )

      renderHook(() => useAutoSave())

      act(() => {
        vi.advanceTimersByTime(DEFAULT_AUTO_SAVE_DELAY + 100)
      })

      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()
    })

    it('does not trigger save when no project', () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      mockUseProjectStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasAdapter: () => true,
            hasProject: () => false,
            saveAllDirtyNodes: mockSaveAllDirtyNodes,
          }
          return selector(state)
        }
      )

      renderHook(() => useAutoSave())

      act(() => {
        vi.advanceTimersByTime(DEFAULT_AUTO_SAVE_DELAY + 100)
      })

      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()
    })
  })

  describe('saveNow', () => {
    it('immediately saves without waiting for delay', async () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      // Call saveNow immediately
      let saveResult: boolean | undefined
      await act(async () => {
        saveResult = await result.current.saveNow()
      })

      expect(mockSaveAllDirtyNodes).toHaveBeenCalledTimes(1)
      expect(saveResult).toBe(true)
    })

    it('returns false when no adapter', async () => {
      mockUseProjectStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasAdapter: () => false,
            hasProject: () => true,
            saveAllDirtyNodes: mockSaveAllDirtyNodes,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      let saveResult: boolean | undefined
      await act(async () => {
        saveResult = await result.current.saveNow()
      })

      expect(saveResult).toBe(false)
      expect(mockSaveAllDirtyNodes).not.toHaveBeenCalled()
    })
  })

  describe('callbacks', () => {
    it('calls onSaveStart when save begins', async () => {
      const onSaveStart = vi.fn()

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveStart }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveStart).toHaveBeenCalled()
    })

    it('calls onSaveSuccess when save succeeds', async () => {
      const onSaveSuccess = vi.fn()

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveSuccess }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveSuccess).toHaveBeenCalled()
    })

    it('calls onSaveError when save fails', async () => {
      const onSaveError = vi.fn()
      mockSaveAllDirtyNodes.mockResolvedValue(false)

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveError }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledWith('Failed to save some nodes')
    })

    it('calls onSaveError with error message on exception', async () => {
      const onSaveError = vi.fn()
      mockSaveAllDirtyNodes.mockRejectedValue(new Error('Network error'))

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave({ onSaveError }))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledWith('Network error')
    })
  })

  describe('isSaving state', () => {
    it('sets isSaving to true during save', async () => {
      let resolveSave: (value: boolean) => void
      mockSaveAllDirtyNodes.mockImplementation(() => {
        return new Promise<boolean>((resolve) => {
          resolveSave = resolve
        })
      })

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      expect(result.current.isSaving).toBe(false)

      // Start save
      let savePromise: Promise<boolean>
      act(() => {
        savePromise = result.current.saveNow()
      })

      expect(result.current.isSaving).toBe(true)

      // Complete save
      await act(async () => {
        resolveSave!(true)
        await savePromise
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('does not save multiple times when save is already in progress', async () => {
      let resolveSave: (value: boolean) => void
      mockSaveAllDirtyNodes.mockImplementation(() => {
        return new Promise<boolean>((resolve) => {
          resolveSave = resolve
        })
      })

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      // Start first save
      let firstSavePromise: Promise<boolean>
      act(() => {
        firstSavePromise = result.current.saveNow()
      })

      expect(result.current.isSaving).toBe(true)
      expect(mockSaveAllDirtyNodes).toHaveBeenCalledTimes(1)

      // Complete first save
      await act(async () => {
        resolveSave!(true)
        await firstSavePromise
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('error recovery', () => {
    it('allows retry after save failure', async () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      // First save fails, second succeeds
      mockSaveAllDirtyNodes
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const onSaveError = vi.fn()
      const onSaveSuccess = vi.fn()
      const { result } = renderHook(() =>
        useAutoSave({ onSaveError, onSaveSuccess })
      )

      // First attempt - fails
      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledTimes(1)
      expect(onSaveSuccess).not.toHaveBeenCalled()
      expect(result.current.isSaving).toBe(false)

      // Second attempt - succeeds
      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveSuccess).toHaveBeenCalledTimes(1)
    })

    it('recovers from exception and allows retry', async () => {
      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      // First save throws exception, second succeeds
      mockSaveAllDirtyNodes
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true)

      const onSaveError = vi.fn()
      const { result } = renderHook(() => useAutoSave({ onSaveError }))

      // First attempt - throws
      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledWith('Network error')
      expect(result.current.isSaving).toBe(false)

      // Second attempt - succeeds
      await act(async () => {
        await result.current.saveNow()
      })

      expect(mockSaveAllDirtyNodes).toHaveBeenCalledTimes(2)
    })

    it('resets isSaving state after exception', async () => {
      mockSaveAllDirtyNodes.mockRejectedValueOnce(new Error('Save failed'))

      mockUseNodesStore.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          const state = {
            hasDirtyNodes: () => true,
          }
          return selector(state)
        }
      )

      const { result } = renderHook(() => useAutoSave())

      await act(async () => {
        await result.current.saveNow()
      })

      // isSaving should be false after exception
      expect(result.current.isSaving).toBe(false)
    })
  })
})
