/**
 * Compact node shape returned to agents by MCP tools
 */

import type { ApiNode } from './api-client.js'

/**
 * Format an API node for LLM output
 */
export function formatApiNodeForLLM(node: ApiNode): Record<string, unknown> {
  return {
    id: node.id,
    version: node.version,
    type: node.type,
    title: node.title,
    tags: node.tags,
    created: node.created_at,
    modified: node.modified_at,
    content:
      (node.content ?? '').substring(0, 500) +
      ((node.content?.length ?? 0) > 500 ? '...' : ''),
    parent: node.parent_id,
    ...(node.type === 'task' && {
      status: node.status,
      priority: node.priority,
      dependsOn: node.depends_on,
    }),
    ...(node.type === 'decision' && {
      status: node.status,
      selected: node.selected_option,
    }),
    ...(node.type === 'component' && {
      status: node.status,
      cost: node.cost,
      supplier: node.supplier,
      partNumber: node.part_number,
    }),
    ...(['subsystem', 'assembly', 'module'].includes(node.type) && {
      status: node.status,
    }),
  }
}
