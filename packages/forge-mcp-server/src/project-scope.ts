/**
 * Per-call project scoping. Each tool call may pass project_id; concurrent
 * calls never see each other's project. switch_project only sets a fallback.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

const scope = new AsyncLocalStorage<string | undefined>()
let defaultProjectId: string | null = null

export function setDefaultProjectId(id: string | null): void {
  defaultProjectId = id
}

export function getDefaultProjectId(): string | null {
  return defaultProjectId
}

export function runWithProject<T>(
  projectId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return scope.run(projectId, fn)
}

export function requireProjectId(): string {
  const id = scope.getStore() ?? defaultProjectId
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
