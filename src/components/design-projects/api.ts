import { getDefaultBaseUrl } from '@/lib/api/client'

export async function designRequest<T>(
  method = 'GET',
  path = '',
  body?: unknown
): Promise<T> {
  const response = await fetch(
    `${getDefaultBaseUrl()}/design-projects${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  )
  const result = await response.json()
  if (!response.ok || !result.success)
    throw new Error(result.error || `Request failed (HTTP ${response.status}).`)
  return result.data as T
}
