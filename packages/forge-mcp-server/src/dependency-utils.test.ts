/**
 * Tests for Dependency and Critical Path Utilities
 */

import { describe, it, expect } from 'vitest'
import {
  buildDependencyGraph,
  wouldCreateCycle,
  getBlockedTasks,
  getCriticalPath,
  getWouldUnblock,
} from './dependency-utils.js'
import type { ForgeNode, TaskNode, DecisionNode } from './types.js'

// Helper to create a task node
function createTask(
  id: string,
  status: 'pending' | 'in_progress' | 'complete',
  dependsOn: string[] = []
): TaskNode {
  return {
    id,
    type: 'task',
    title: `Task ${id}`,
    content: '',
    tags: [],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    status,
    priority: 'medium',
    dependsOn,
    blocks: [],
    checklist: [],
  }
}

// Helper to create a decision node
function createDecision(id: string, status: 'open' | 'selected'): DecisionNode {
  return {
    id,
    type: 'decision',
    title: `Decision ${id}`,
    content: '',
    tags: [],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    status,
    options: [],
  }
}

describe('buildDependencyGraph', () => {
  it('builds an empty graph for empty nodes', () => {
    const nodes = new Map<string, ForgeNode>()
    const graph = buildDependencyGraph(nodes)

    expect(graph.nodes.size).toBe(0)
    expect(graph.edges.size).toBe(0)
  })

  it('builds graph with task nodes', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-2']))

    const graph = buildDependencyGraph(nodes)

    expect(graph.nodes.size).toBe(3)
    expect(graph.edges.get('task-1')?.has('task-2')).toBe(true)
    expect(graph.edges.get('task-2')?.has('task-3')).toBe(true)
  })

  it('ignores non-task nodes', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('decision-1', createDecision('decision-1', 'open'))

    const graph = buildDependencyGraph(nodes)

    expect(graph.nodes.size).toBe(1)
    expect(graph.nodes.has('task-1')).toBe(true)
    expect(graph.nodes.has('decision-1')).toBe(false)
  })
})

describe('wouldCreateCycle', () => {
  it('returns false when no cycle would be created', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))

    const graph = buildDependencyGraph(nodes)

    // Adding task-3 -> task-2 wouldn't create a cycle
    expect(wouldCreateCycle(graph, 'task-3', 'task-2')).toBe(false)
  })

  it('returns true when cycle would be created', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-2']))

    const graph = buildDependencyGraph(nodes)

    // Current graph edges: task-1 -> task-2 -> task-3
    // If task-1 depends on task-3, we'd add edge: task-3 -> task-1
    // This would create cycle: task-1 -> task-2 -> task-3 -> task-1
    expect(wouldCreateCycle(graph, 'task-3', 'task-1')).toBe(true)
  })

  it('handles self-loop detection', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))

    const graph = buildDependencyGraph(nodes)

    // Task depending on itself would be a cycle
    expect(wouldCreateCycle(graph, 'task-1', 'task-1')).toBe(true)
  })
})

describe('getBlockedTasks', () => {
  it('returns empty array when no tasks are blocked', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'complete'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))

    const blocked = getBlockedTasks(nodes)

    expect(blocked).toHaveLength(0)
  })

  it('returns tasks blocked by incomplete dependencies', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-2']))

    const blocked = getBlockedTasks(nodes)

    expect(blocked).toHaveLength(2)
    expect(blocked.map((t) => t.id)).toContain('task-2')
    expect(blocked.map((t) => t.id)).toContain('task-3')
  })

  it('handles decision dependencies', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('decision-1', createDecision('decision-1', 'open'))
    nodes.set('task-1', createTask('task-1', 'pending', ['decision-1']))

    const blocked = getBlockedTasks(nodes)

    expect(blocked).toHaveLength(1)
    expect(blocked[0].id).toBe('task-1')
  })

  it('unblocks task when decision is selected', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('decision-1', createDecision('decision-1', 'selected'))
    nodes.set('task-1', createTask('task-1', 'pending', ['decision-1']))

    const blocked = getBlockedTasks(nodes)

    expect(blocked).toHaveLength(0)
  })
})

describe('getCriticalPath', () => {
  it('returns empty array when no incomplete tasks', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'complete'))
    nodes.set('task-2', createTask('task-2', 'complete', ['task-1']))

    const path = getCriticalPath(nodes)

    expect(path).toHaveLength(0)
  })

  it('returns single task when no dependencies', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))

    const path = getCriticalPath(nodes)

    expect(path).toHaveLength(1)
    expect(path[0].id).toBe('task-1')
  })

  it('returns longest chain of incomplete tasks', () => {
    const nodes = new Map<string, ForgeNode>()
    // Chain: task-1 -> task-2 -> task-3
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-2']))
    // Shorter chain: task-4
    nodes.set('task-4', createTask('task-4', 'pending'))

    const path = getCriticalPath(nodes)

    expect(path).toHaveLength(3)
    expect(path.map((t) => t.id)).toEqual(['task-1', 'task-2', 'task-3'])
  })

  it('ignores completed tasks in the chain', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'complete'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-2']))

    const path = getCriticalPath(nodes)

    expect(path).toHaveLength(2)
    expect(path.map((t) => t.id)).toEqual(['task-2', 'task-3'])
  })
})

describe('getWouldUnblock', () => {
  it('returns tasks that would be unblocked', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending', ['task-1']))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-1']))

    const wouldUnblock = getWouldUnblock(nodes, 'task-1')

    expect(wouldUnblock).toHaveLength(2)
    expect(wouldUnblock.map((t) => t.id)).toContain('task-2')
    expect(wouldUnblock.map((t) => t.id)).toContain('task-3')
  })

  it('returns empty when task has multiple incomplete dependencies', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'pending'))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-1', 'task-2']))

    // Completing task-1 alone won't unblock task-3 (still needs task-2)
    const wouldUnblock = getWouldUnblock(nodes, 'task-1')

    expect(wouldUnblock).toHaveLength(0)
  })

  it('returns task when it would be the last dependency completed', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTask('task-1', 'pending'))
    nodes.set('task-2', createTask('task-2', 'complete'))
    nodes.set('task-3', createTask('task-3', 'pending', ['task-1', 'task-2']))

    // task-2 is complete, so completing task-1 would unblock task-3
    const wouldUnblock = getWouldUnblock(nodes, 'task-1')

    expect(wouldUnblock).toHaveLength(1)
    expect(wouldUnblock[0].id).toBe('task-3')
  })
})
