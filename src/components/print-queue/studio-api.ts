import { useEffect, useState } from 'react'
import { getDefaultBaseUrl } from '@/lib/api/client'

export interface StudioAsset {
  binding: string
  preview: boolean
  previewKind: string
  canOpen: boolean
  reason: string
}
export const studioBase = () => `${getDefaultBaseUrl()}/print-queue-studio`
export function useStudioAssets(version: number | undefined) {
  const [state, setState] = useState<{
    version?: number
    items: Record<string, StudioAsset>
  }>({ items: {} })
  useEffect(() => {
    if (version === undefined) return
    const controller = new AbortController()
    let pending = false
    const refresh = () => {
      if (pending || document.hidden) return
      pending = true
      void fetch(`${studioBase()}/assets`, { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) return { items: {} }
          const result = await r.json()
          return result.data
        })
        .then((data) => setState({ version, items: data.items }))
        .catch(() => {
          /* The queue remains usable without a Mac handoff service. */
        })
        .finally(() => {
          pending = false
        })
    }
    refresh()
    // Source files can change without a queue mutation. Re-check their hashes.
    const timer = window.setInterval(refresh, 15_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [version])
  return state.version === version ? state.items : {}
}
