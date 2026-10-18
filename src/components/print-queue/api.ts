import { getDefaultBaseUrl } from '@/lib/api/client'
import type { PrintQueue } from '../../../server/src/print-queue-model'
export async function queueRequest(
  method = 'GET',
  path = '',
  body?: unknown
): Promise<PrintQueue> {
  const response = await fetch(`${getDefaultBaseUrl()}/print-queue${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = await response.json()
  if (!response.ok || !result.success)
    throw new Error(result.error || 'Could not save queue.')
  return result.data
}
