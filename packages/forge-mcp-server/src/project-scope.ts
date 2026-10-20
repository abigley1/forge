/**
 * Per-call project scoping. Each tool call may pass project_id; concurrent
 * calls never see each other's project. switch_project only sets a fallback,
 * and over HTTP that fallback belongs to the MCP session (one per client), so
 * one client's switch_project never changes another client's default.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export interface CallScope {
  /** project_id passed to this tool call. */
  projectId?: string
  /** MCP session (HTTP only); owns the switch_project default. */
  sessionId?: string
}

const scope = new AsyncLocalStorage<CallScope>()
// Process-wide default: FORGE_PROJECT_ID, or switch_project over stdio.
let defaultProjectId: string | null = null
const sessionDefaults = new Map<string, string | null>()

export function setDefaultProjectId(id: string | null): void {
  const sessionId = scope.getStore()?.sessionId
  if (sessionId) sessionDefaults.set(sessionId, id)
  else defaultProjectId = id
}

export function getDefaultProjectId(): string | null {
  const sessionId = scope.getStore()?.sessionId
  if (sessionId && sessionDefaults.has(sessionId)) {
    return sessionDefaults.get(sessionId) ?? null
  }
  return defaultProjectId
}

export function runWithProject<T>(
  callScope: CallScope,
  fn: () => Promise<T>
): Promise<T> {
  return scope.run(callScope, fn)
}

/** Forget a closed HTTP session's switch_project default. */
export function endSession(sessionId: string): void {
  sessionDefaults.delete(sessionId)
}

export function requireProjectId(): string {
  const id = scope.getStore()?.projectId ?? getDefaultProjectId()
  if (!id) {
    throw new Error(
      'No project specified. Pass project_id (from resolve_workspace or list_projects).'
    )
  }
  return id
}

export const PROJECT_SCOPED_TOOLS: ReadonlySet<string> = new Set([
  'create_node',
  'update_node',
  'delete_node',
  'search_nodes',
  'get_node',
  'add_dependency',
  'remove_dependency',
  'get_blocked_tasks',
  'get_critical_path',
  'bulk_update',
  'find_components',
  'get_brief',
  'record_closeout',
])

interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, unknown>
    required?: string[]
  }
}

export function withProjectIdParam<T extends ToolDef>(tool: T): T {
  if (!PROJECT_SCOPED_TOOLS.has(tool.name)) return tool
  return {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        project_id: {
          type: 'string',
          description:
            'Forge project ID. Always pass it; switch_project is only a fallback.',
        },
        ...tool.inputSchema.properties,
      },
    },
  }
}
