/**
 * Minimal Forge API access for hooks: every call is bounded and never throws.
 */

export interface ForgeProject {
  id: string
  name: string
  description: string | null
}

export type ResolveResult =
  | { project: ForgeProject; match: { kind: string; value: string } }
  | { project: null; candidates: ForgeProject[] }

export async function forgeFetch<T>(
  apiUrl: string,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs: number }
): Promise<T | null> {
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs),
    })
    if (!res.ok) return null
    return ((await res.json()) as { data: T }).data
  } catch {
    return null
  }
}

/** Bounded liveness probe; false on any error or non-2xx. */
export async function forgeReachable(
  apiUrl: string,
  timeoutMs: number
): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.ok
  } catch {
    return false
  }
}
