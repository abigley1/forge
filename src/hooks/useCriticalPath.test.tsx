import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useCriticalPath,
  useIsOnCriticalPath,
  useNodeCriticalPathInfo,
} from './useCriticalPath'
import { useNodesStore } from '@/store/useNodesStore'
import type { TaskNode, DecisionNode, ForgeNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

// Helper to create test task nodes
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
    parent: null,
  }
}

// Helper to create test decision nodes
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
    rationale: null,
    selectedDate: null,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
    parent: null,
  }
}

describe('useCriticalPath', () => {
  beforeEach(() => {
    // Reset the store before each test
    useNodesStore.getState().clearNodes()
  })

  describe('basic critical path calculation', () => {
    it('returns empty critical path when no nodes', () => {
      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.hasCriticalPath).toBe(false)
      expect(result.current.pathLength).toBe(0)
      expect(result.current.criticalPathNodeIds).toHaveLength(0)
    })

    it('returns empty critical path when all tasks complete', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'complete')
      const task2 = createTaskNode('task-2', 'Task 2', 'complete', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.hasCriticalPath).toBe(false)
      expect(result.current.pathLength).toBe(0)
    })

    it('returns single-node critical path for single incomplete task', () => {
      const task = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task)

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.hasCriticalPath).toBe(true)
      expect(result.current.pathLength).toBe(1)
      expect(result.current.criticalPathNodeIds).toContain('task-1')
    })

    it('returns correct critical path for linear dependency chain', () => {
      // task-1 <- task-2 <- task-3 (task-3 depends on task-2, which depends on task-1)
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      const task3 = createTaskNode('task-3', 'Task 3', 'pending', ['task-2'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
          ['task-3', task3],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.hasCriticalPath).toBe(true)
      expect(result.current.pathLength).toBe(3)
      expect(result.current.criticalPathNodeIds).toContain('task-1')
      expect(result.current.criticalPathNodeIds).toContain('task-2')
      expect(result.current.criticalPathNodeIds).toContain('task-3')
    })

    it('handles incomplete task depending on complete task', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'complete')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.hasCriticalPath).toBe(true)
      expect(result.current.pathLength).toBe(1)
      expect(result.current.criticalPathNodeIds).toContain('task-2')
      expect(result.current.criticalPathNodeIds).not.toContain('task-1')
    })
  })

  describe('nodeId option', () => {
    it('correctly identifies when node is on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath({ nodeId: 'task-1' }))

      expect(result.current.isNodeOnCriticalPath).toBe(true)
      expect(result.current.nodePosition).toBe(0)
    })

    it('returns false when node is not on critical path', () => {
      // task-1 is on critical path, task-2 is not (parallel)
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'complete')
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath({ nodeId: 'task-2' }))

      expect(result.current.isNodeOnCriticalPath).toBe(false)
      expect(result.current.nodePosition).toBe(-1)
    })

    it('returns false when no nodeId provided', () => {
      const task = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task)

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.isNodeOnCriticalPath).toBe(false)
      expect(result.current.nodePosition).toBe(-1)
    })
  })

  describe('checkIsOnCriticalPath', () => {
    it('correctly checks if any node is on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.checkIsOnCriticalPath('task-1')).toBe(true)
      expect(result.current.checkIsOnCriticalPath('task-2')).toBe(true)
      expect(result.current.checkIsOnCriticalPath('nonexistent')).toBe(false)
    })
  })

  describe('checkIsEdgeOnCriticalPath', () => {
    it('correctly identifies edges on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      // Edge from task-1 to task-2 should be on critical path
      expect(result.current.checkIsEdgeOnCriticalPath('task-1', 'task-2')).toBe(
        true
      )
      // Reverse direction should not be on critical path
      expect(result.current.checkIsEdgeOnCriticalPath('task-2', 'task-1')).toBe(
        false
      )
      // Non-existent edge should not be on critical path
      expect(
        result.current.checkIsEdgeOnCriticalPath('task-1', 'nonexistent')
      ).toBe(false)
    })
  })

  describe('getNodePosition', () => {
    it('returns correct position for nodes on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      const task3 = createTaskNode('task-3', 'Task 3', 'pending', ['task-2'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
          ['task-3', task3],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.getNodePosition('task-1')).toBe(0)
      expect(result.current.getNodePosition('task-2')).toBe(1)
      expect(result.current.getNodePosition('task-3')).toBe(2)
    })

    it('returns -1 for nodes not on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task1)

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.getNodePosition('nonexistent')).toBe(-1)
    })
  })

  describe('nonCriticalIncompleteIds', () => {
    it('returns incomplete nodes not on critical path', () => {
      // Create a branching structure where one branch is longer
      // task-1 <- task-2 <- task-3 (critical path, length 3)
      // task-4 (parallel incomplete task, not on critical path)
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      const task3 = createTaskNode('task-3', 'Task 3', 'pending', ['task-2'])
      const task4 = createTaskNode('task-4', 'Task 4', 'pending')
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
          ['task-3', task3],
          ['task-4', task4],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      // task-4 should not be on critical path (it's parallel and shorter)
      expect(result.current.nonCriticalIncompleteIds).toContain('task-4')
      expect(result.current.nonCriticalIncompleteIds).not.toContain('task-1')
      expect(result.current.nonCriticalIncompleteIds).not.toContain('task-2')
      expect(result.current.nonCriticalIncompleteIds).not.toContain('task-3')
    })
  })

  describe('getSlack', () => {
    it('returns 0 for nodes on critical path', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.getSlack('task-1')).toBe(0)
      expect(result.current.getSlack('task-2')).toBe(0)
    })

    it('returns positive slack for non-critical incomplete nodes', () => {
      // task-1 <- task-2 <- task-3 (critical path)
      // task-4 (not on critical path)
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      const task3 = createTaskNode('task-3', 'Task 3', 'pending', ['task-2'])
      const task4 = createTaskNode('task-4', 'Task 4', 'pending')
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
          ['task-3', task3],
          ['task-4', task4],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.getSlack('task-4')).toBeGreaterThan(0)
    })

    it('returns -1 for non-existent nodes', () => {
      const { result } = renderHook(() => useCriticalPath())
      expect(result.current.getSlack('nonexistent')).toBe(-1)
    })
  })

  describe('decision nodes on critical path', () => {
    it('includes pending decisions in critical path', () => {
      const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
      const task = createTaskNode('task-1', 'Task 1', 'pending', ['dec-1'])
      useNodesStore.getState().setNodes(
        new Map<string, ForgeNode>([
          ['dec-1', decision],
          ['task-1', task],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.criticalPathNodeIds).toContain('dec-1')
      expect(result.current.criticalPathNodeIds).toContain('task-1')
    })

    it('excludes selected decisions from critical path', () => {
      const decision = createDecisionNode('dec-1', 'Decision 1', 'selected')
      const task = createTaskNode('task-1', 'Task 1', 'pending', ['dec-1'])
      useNodesStore.getState().setNodes(
        new Map<string, ForgeNode>([
          ['dec-1', decision],
          ['task-1', task],
        ])
      )

      const { result } = renderHook(() => useCriticalPath())

      expect(result.current.criticalPathNodeIds).not.toContain('dec-1')
      expect(result.current.criticalPathNodeIds).toContain('task-1')
    })
  })
})

describe('useIsOnCriticalPath', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
  })

  it('returns false when no nodeId', () => {
    const { result } = renderHook(() => useIsOnCriticalPath(undefined))
    expect(result.current).toBe(false)
  })

  it('returns true for node on critical path', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    useNodesStore.getState().addNode(task)

    const { result } = renderHook(() => useIsOnCriticalPath('task-1'))
    expect(result.current).toBe(true)
  })

  it('returns false for completed node', () => {
    const task = createTaskNode('task-1', 'Task 1', 'complete')
    useNodesStore.getState().addNode(task)

    const { result } = renderHook(() => useIsOnCriticalPath('task-1'))
    expect(result.current).toBe(false)
  })
})

describe('useNodeCriticalPathInfo', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
  })

  it('returns default values when no nodeId', () => {
    const { result } = renderHook(() => useNodeCriticalPathInfo(undefined))

    expect(result.current.isOnCriticalPath).toBe(false)
    expect(result.current.position).toBe(-1)
    expect(result.current.pathLength).toBe(0)
    expect(result.current.criticalPath).toBeNull()
  })

  it('returns full info for node on critical path', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    useNodesStore.getState().setNodes(
      new Map([
        ['task-1', task1],
        ['task-2', task2],
      ])
    )

    const { result } = renderHook(() => useNodeCriticalPathInfo('task-1'))

    expect(result.current.isOnCriticalPath).toBe(true)
    expect(result.current.position).toBe(0)
    expect(result.current.pathLength).toBe(2)
    expect(result.current.criticalPath).not.toBeNull()
    expect(result.current.criticalPath?.nodes).toHaveLength(2)
  })

  it('returns not on path for completed node', () => {
    const task = createTaskNode('task-1', 'Task 1', 'complete')
    useNodesStore.getState().addNode(task)

    const { result } = renderHook(() => useNodeCriticalPathInfo('task-1'))

    expect(result.current.isOnCriticalPath).toBe(false)
    expect(result.current.position).toBe(-1)
  })
})
