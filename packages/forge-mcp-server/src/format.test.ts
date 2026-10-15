import { describe, it, expect } from 'vitest'
import { formatApiNodeForLLM } from './format.js'
import type { ApiNode } from './api-client.js'

describe('formatApiNodeForLLM', () => {
  it('exposes version so agents can send expected_version', () => {
    const node = {
      id: 't1',
      project_id: 'p1',
      version: 4,
      type: 'task',
      title: 'Print brackets',
      content: 'body',
      status: 'pending',
      priority: 'high',
      parent_id: null,
      tags: [],
      depends_on: [],
      created_at: '2026-10-15T00:00:00Z',
      modified_at: '2026-10-15T00:00:00Z',
    } as unknown as ApiNode
    expect(formatApiNodeForLLM(node)).toMatchObject({ id: 't1', version: 4 })
  })
})
