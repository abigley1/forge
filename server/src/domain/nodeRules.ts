/**
 * Node business rules shared by the server, frontend, and (via API) MCP.
 *
 * Dependency-free on purpose: the frontend imports this file directly and the
 * Dockerfile copies only server/src/domain/ into the frontend build stage.
 */

export type ForgeNodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

const CONTAINER_STATUSES = [
  'planning',
  'in_progress',
  'complete',
  'on_hold',
] as const

export const STATUS_BY_TYPE: Record<ForgeNodeType, readonly string[]> = {
  task: ['pending', 'in_progress', 'blocked', 'complete'],
  decision: ['pending', 'selected'],
  component: ['selected', 'considering', 'rejected'],
  note: [],
  subsystem: CONTAINER_STATUSES,
  assembly: CONTAINER_STATUSES,
  module: CONTAINER_STATUSES,
}

/** Values written by earlier agents/imports; mapped on write and by migration 5. */
export const LEGACY_STATUS_ALIASES: Partial<
  Record<ForgeNodeType, Readonly<Record<string, string>>>
> = {
  decision: { open: 'pending', decided: 'selected' },
  component: { evaluating: 'considering', specified: 'selected' },
}

export type NormalizeStatusResult =
  | { ok: true; status: string | undefined }
  | { ok: false; error: string }

export function normalizeStatus(
  type: ForgeNodeType,
  status: unknown
): NormalizeStatusResult {
  if (status === undefined || status === null)
    return { ok: true, status: undefined }
  if (typeof status !== 'string')
    return { ok: false, error: 'Status must be a string' }

  const allowed = STATUS_BY_TYPE[type]
  if (allowed.length === 0)
    return { ok: false, error: `${type} nodes have no status` }
  if (allowed.includes(status)) return { ok: true, status }

  const alias = LEGACY_STATUS_ALIASES[type]?.[status]
  if (alias) return { ok: true, status: alias }

  return {
    ok: false,
    error: `Invalid status "${status}" for ${type}. Must be one of: ${allowed.join(', ')}`,
  }
}

/** A dependency stops blocking its dependents once this returns true. */
export function isDependencyResolved(
  type: ForgeNodeType,
  status: string | null | undefined
): boolean {
  if (type === 'task') return status === 'complete'
  if (type === 'decision') return status === 'selected'
  return true
}
