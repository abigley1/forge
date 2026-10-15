import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useStudioAssets } from './studio-api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('removes stale file previews on polling even when queue version is unchanged', async () => {
  vi.useFakeTimers()
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { items: { leg: { binding: 'old' } } } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { items: {} } }),
    })
  vi.stubGlobal('fetch', fetchMock)
  const { result, unmount } = renderHook(() => useStudioAssets(87))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(result.current.leg.binding).toBe('old')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000)
  })
  expect(result.current).toEqual({})
  unmount()
  await vi.advanceTimersByTimeAsync(15_000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
