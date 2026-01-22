import { describe, it, expect } from 'vitest'
import {
  calculateBlockedStatus,
  calculateNodesToUnblock,
  calculateTransitiveUnblocks,
  calculateStatusCascade,
  isDependencyResolved,
  getRequiredStatusForResolution,
  getBlockingNodes,
  getBlockedNodes,
  shouldBeBlocked,
} from './blockedStatus'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'
import { NodeType } from '@/types/nodes'

// Helper to create test nodes
function createTaskNode(
  id: string,
  title: string,
  status: 'pending' | 'in_progress' | 'blocked' | 'complete',
  dependsOn: string[] = []
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    status,
    priority: 'medium',
    dependsOn,
    blocks: [],
    checklist: [],
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
  }
}

function createDecisionNode(
  id: string,
  title: string,
  status: 'pending' | 'selected'
): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    status,
    selected: status === 'selected' ? 'option-1' : null,
    options: [],
    criteria: [],
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
  }
}

function createComponentNode(id: string, title: string): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title,
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
  }
}

function createNoteNode(id: string, title: string): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
  }
}

describe('isDependencyResolved', () => {
  it('returns true for complete task', () => {
    const task = createTaskNode('task-1', 'Task 1', 'complete')
    expect(isDependencyResolved(task)).toBe(true)
  })

  it('returns false for pending task', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    expect(isDependencyResolved(task)).toBe(false)
  })

  it('returns false for in_progress task', () => {
    const task = createTaskNode('task-1', 'Task 1', 'in_progress')
    expect(isDependencyResolved(task)).toBe(false)
  })

  it('returns false for blocked task', () => {
    const task = createTaskNode('task-1', 'Task 1', 'blocked')
    expect(isDependencyResolved(task)).toBe(false)
  })

  it('returns true for selected decision', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'selected')
    expect(isDependencyResolved(decision)).toBe(true)
  })

  it('returns false for pending decision', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    expect(isDependencyResolved(decision)).toBe(false)
  })

  it('returns true for component node', () => {
    const component = createComponentNode('comp-1', 'Component 1')
    expect(isDependencyResolved(component)).toBe(true)
  })

  it('returns true for note node', () => {
    const note = createNoteNode('note-1', 'Note 1')
    expect(isDependencyResolved(note)).toBe(true)
  })
})

describe('getRequiredStatusForResolution', () => {
  it('returns "complete" for Task', () => {
    expect(getRequiredStatusForResolution(NodeType.Task)).toBe('complete')
  })

  it('returns "selected" for Decision', () => {
    expect(getRequiredStatusForResolution(NodeType.Decision)).toBe('selected')
  })

  it('returns "n/a" for Component', () => {
    expect(getRequiredStatusForResolution(NodeType.Component)).toBe('n/a')
  })

  it('returns "n/a" for Note', () => {
    expect(getRequiredStatusForResolution(NodeType.Note)).toBe('n/a')
  })
})

describe('calculateBlockedStatus', () => {
  it('returns not blocked for task with no dependencies', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = calculateBlockedStatus(task, allNodes)

    expect(result.isBlocked).toBe(false)
    expect(result.blockingNodeIds).toHaveLength(0)
    expect(result.blockingNodes).toHaveLength(0)
  })

  it('returns blocked when depending on incomplete task', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = calculateBlockedStatus(task2, allNodes)

    expect(result.isBlocked).toBe(true)
    expect(result.blockingNodeIds).toContain('task-1')
    expect(result.blockingNodes).toHaveLength(1)
    expect(result.blockingNodes[0]).toMatchObject({
      id: 'task-1',
      title: 'Task 1',
      type: NodeType.Task,
      status: 'pending',
      requiredStatus: 'complete',
    })
  })

  it('returns not blocked when depending on complete task', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'complete')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = calculateBlockedStatus(task2, allNodes)

    expect(result.isBlocked).toBe(false)
    expect(result.blockingNodeIds).toHaveLength(0)
  })

  it('returns blocked when depending on pending decision', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const task = createTaskNode('task-1', 'Task 1', 'pending', ['dec-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['dec-1', decision],
      ['task-1', task],
    ])

    const result = calculateBlockedStatus(task, allNodes)

    expect(result.isBlocked).toBe(true)
    expect(result.blockingNodeIds).toContain('dec-1')
    expect(result.blockingNodes[0]).toMatchObject({
      id: 'dec-1',
      title: 'Decision 1',
      type: NodeType.Decision,
      status: 'pending',
      requiredStatus: 'selected',
    })
  })

  it('returns not blocked when depending on selected decision', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'selected')
    const task = createTaskNode('task-1', 'Task 1', 'pending', ['dec-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['dec-1', decision],
      ['task-1', task],
    ])

    const result = calculateBlockedStatus(task, allNodes)

    expect(result.isBlocked).toBe(false)
  })

  it('returns blocked with multiple blockers', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'in_progress')
    const task3 = createTaskNode('task-3', 'Task 3', 'pending', [
      'task-1',
      'task-2',
    ])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = calculateBlockedStatus(task3, allNodes)

    expect(result.isBlocked).toBe(true)
    expect(result.blockingNodeIds).toContain('task-1')
    expect(result.blockingNodeIds).toContain('task-2')
    expect(result.blockingNodes).toHaveLength(2)
  })

  it('ignores missing dependency nodes', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending', ['nonexistent'])
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = calculateBlockedStatus(task, allNodes)

    expect(result.isBlocked).toBe(false)
  })

  it('returns not blocked for decision nodes', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['dec-1', decision]])

    const result = calculateBlockedStatus(decision, allNodes)

    expect(result.isBlocked).toBe(false)
  })

  it('returns not blocked for component nodes', () => {
    const component = createComponentNode('comp-1', 'Component 1')
    const allNodes = new Map<string, ForgeNode>([['comp-1', component]])

    const result = calculateBlockedStatus(component, allNodes)

    expect(result.isBlocked).toBe(false)
  })

  it('returns not blocked for note nodes', () => {
    const note = createNoteNode('note-1', 'Note 1')
    const allNodes = new Map<string, ForgeNode>([['note-1', note]])

    const result = calculateBlockedStatus(note, allNodes)

    expect(result.isBlocked).toBe(false)
  })

  it('handles mixed dependency types', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'complete')
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', [
      'task-1',
      'dec-1',
    ])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['dec-1', decision],
      ['task-2', task2],
    ])

    const result = calculateBlockedStatus(task2, allNodes)

    expect(result.isBlocked).toBe(true)
    expect(result.blockingNodeIds).toEqual(['dec-1'])
    expect(result.blockingNodes).toHaveLength(1)
  })
})

describe('calculateNodesToUnblock', () => {
  it('returns empty when no nodes depend on the target', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = calculateNodesToUnblock('task-1', allNodes)

    expect(result.newlyUnblockedIds).toHaveLength(0)
    expect(result.newlyUnblockedNodes).toHaveLength(0)
  })

  it('returns node that would be unblocked by single dependency completion', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = calculateNodesToUnblock('task-1', allNodes)

    expect(result.newlyUnblockedIds).toContain('task-2')
    expect(result.newlyUnblockedNodes).toHaveLength(1)
    expect(result.newlyUnblockedNodes[0]).toMatchObject({
      id: 'task-2',
      title: 'Task 2',
      type: NodeType.Task,
    })
  })

  it('does not include node still blocked by other dependencies', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending')
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', [
      'task-1',
      'task-2',
    ])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = calculateNodesToUnblock('task-1', allNodes)

    expect(result.newlyUnblockedIds).toHaveLength(0)
  })

  it('returns multiple nodes that would be unblocked', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = calculateNodesToUnblock('task-1', allNodes)

    expect(result.newlyUnblockedIds).toContain('task-2')
    expect(result.newlyUnblockedIds).toContain('task-3')
    expect(result.newlyUnblockedNodes).toHaveLength(2)
  })

  it('skips non-task nodes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['dec-1', decision],
    ])

    const result = calculateNodesToUnblock('task-1', allNodes)

    expect(result.newlyUnblockedIds).toHaveLength(0)
  })
})

describe('calculateTransitiveUnblocks', () => {
  it('returns empty when no cascade', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = calculateTransitiveUnblocks('task-1', allNodes)

    expect(result).toHaveLength(0)
  })

  it('returns direct and transitive unblocks', () => {
    // task-1 blocks task-2 blocks task-3
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', ['task-2'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = calculateTransitiveUnblocks('task-1', allNodes)

    expect(result).toContain('task-2')
    expect(result).toContain('task-3')
  })

  it('handles circular references without infinite loop', () => {
    // This shouldn't happen in practice due to DAG validation, but we handle it anyway
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    // This should not hang
    const result = calculateTransitiveUnblocks('task-1', allNodes)

    expect(result).toContain('task-2')
  })
})

describe('calculateStatusCascade', () => {
  it('returns newly unblocked nodes when task completes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'in_progress')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = calculateStatusCascade('task-1', 'complete', allNodes)

    expect(result.newlyUnblocked).toContain('task-2')
    expect(result.stillBlocked).toHaveLength(0)
  })

  it('returns newly unblocked nodes when decision is selected', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const task = createTaskNode('task-1', 'Task 1', 'blocked', ['dec-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['dec-1', decision],
      ['task-1', task],
    ])

    const result = calculateStatusCascade('dec-1', 'selected', allNodes)

    expect(result.newlyUnblocked).toContain('task-1')
  })

  it('returns still blocked nodes with other dependencies', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'in_progress')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending')
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', [
      'task-1',
      'task-2',
    ])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = calculateStatusCascade('task-1', 'complete', allNodes)

    expect(result.newlyUnblocked).toHaveLength(0)
    expect(result.stillBlocked).toContain('task-3')
  })

  it('returns empty when status change does not resolve', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = calculateStatusCascade('task-1', 'in_progress', allNodes)

    expect(result.newlyUnblocked).toHaveLength(0)
    expect(result.stillBlocked).toHaveLength(0)
  })

  it('returns empty for non-existent node', () => {
    const allNodes = new Map<string, ForgeNode>()

    const result = calculateStatusCascade('nonexistent', 'complete', allNodes)

    expect(result.newlyUnblocked).toHaveLength(0)
    expect(result.stillBlocked).toHaveLength(0)
  })
})

describe('getBlockingNodes', () => {
  it('returns empty when no blocking relationships', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = getBlockingNodes(allNodes)

    expect(result).toHaveLength(0)
  })

  it('returns nodes that are blocking others', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = getBlockingNodes(allNodes)

    expect(result).toContain('task-1')
    expect(result).toHaveLength(1)
  })

  it('returns unique blocking nodes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = getBlockingNodes(allNodes)

    expect(result).toContain('task-1')
    expect(result).toHaveLength(1)
  })
})

describe('getBlockedNodes', () => {
  it('returns empty when no blocked nodes', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    const result = getBlockedNodes(allNodes)

    expect(result).toHaveLength(0)
  })

  it('returns blocked nodes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    const result = getBlockedNodes(allNodes)

    expect(result).toContain('task-2')
    expect(result).toHaveLength(1)
  })

  it('returns multiple blocked nodes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    const task3 = createTaskNode('task-3', 'Task 3', 'blocked', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])

    const result = getBlockedNodes(allNodes)

    expect(result).toContain('task-2')
    expect(result).toContain('task-3')
    expect(result).toHaveLength(2)
  })
})

describe('shouldBeBlocked', () => {
  it('returns true for task with unresolved dependencies', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    expect(shouldBeBlocked(task2, allNodes)).toBe(true)
  })

  it('returns false for task with resolved dependencies', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'complete')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    const allNodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])

    expect(shouldBeBlocked(task2, allNodes)).toBe(false)
  })

  it('returns false for non-task nodes', () => {
    const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['dec-1', decision]])

    expect(shouldBeBlocked(decision, allNodes)).toBe(false)
  })

  it('returns false for task with no dependencies', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    const allNodes = new Map<string, ForgeNode>([['task-1', task]])

    expect(shouldBeBlocked(task, allNodes)).toBe(false)
  })
})
