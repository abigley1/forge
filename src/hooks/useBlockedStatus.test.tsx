import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useBlockedStatus,
  useUnblockPreview,
  useNodeBlockedStatus,
} from './useBlockedStatus'
import { useNodesStore } from '@/store/useNodesStore'
import type { TaskNode, DecisionNode, ForgeNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

// Mock the toast hook
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    undo: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
}))

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
    parent: null,
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
    rationale: null,
    selectedDate: null,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
    parent: null,
  }
}

describe('useBlockedStatus', () => {
  beforeEach(() => {
    // Reset the store before each test
    useNodesStore.getState().clearNodes()
  })

  describe('blockedStatus', () => {
    it('returns null when no nodeId provided', () => {
      const { result } = renderHook(() => useBlockedStatus())
      expect(result.current.blockedStatus).toBeNull()
    })

    it('returns null for non-existent node', () => {
      const { result } = renderHook(() =>
        useBlockedStatus({ nodeId: 'nonexistent' })
      )
      expect(result.current.blockedStatus).toBeNull()
    })

    it('returns not blocked for task with no dependencies', () => {
      const task = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task)

      const { result } = renderHook(() =>
        useBlockedStatus({ nodeId: 'task-1' })
      )

      expect(result.current.blockedStatus?.isBlocked).toBe(false)
    })

    it('returns blocked for task with unresolved dependency', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() =>
        useBlockedStatus({ nodeId: 'task-2' })
      )

      expect(result.current.blockedStatus?.isBlocked).toBe(true)
      expect(result.current.blockedStatus?.blockingNodeIds).toContain('task-1')
    })

    it('returns not blocked when dependency is complete', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'complete')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() =>
        useBlockedStatus({ nodeId: 'task-2' })
      )

      expect(result.current.blockedStatus?.isBlocked).toBe(false)
    })
  })

  describe('getBlockedStatusForNode', () => {
    it('returns blocked status for any node', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      const status = result.current.getBlockedStatusForNode('task-2')
      expect(status?.isBlocked).toBe(true)
    })

    it('returns null for non-existent node', () => {
      const { result } = renderHook(() => useBlockedStatus())
      expect(result.current.getBlockedStatusForNode('nonexistent')).toBeNull()
    })
  })

  describe('getNodesToUnblock', () => {
    it('returns nodes that would be unblocked', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      const unblockResult = result.current.getNodesToUnblock('task-1')
      expect(unblockResult.newlyUnblockedIds).toContain('task-2')
    })

    it('returns empty when no nodes would be unblocked', () => {
      const task = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task)

      const { result } = renderHook(() => useBlockedStatus())

      const unblockResult = result.current.getNodesToUnblock('task-1')
      expect(unblockResult.newlyUnblockedIds).toHaveLength(0)
    })
  })

  describe('blockedNodeIds', () => {
    it('returns all blocked node IDs', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
      const task3 = createTaskNode('task-3', 'Task 3', 'blocked', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
          ['task-3', task3],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      expect(result.current.blockedNodeIds).toContain('task-2')
      expect(result.current.blockedNodeIds).toContain('task-3')
      expect(result.current.blockedNodeIds).not.toContain('task-1')
    })
  })

  describe('blockingNodeIds', () => {
    it('returns all blocking node IDs', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      expect(result.current.blockingNodeIds).toContain('task-1')
      expect(result.current.blockingNodeIds).not.toContain('task-2')
    })
  })

  describe('checkShouldBeBlocked', () => {
    it('returns true for task with unresolved dependencies', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'pending')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      expect(result.current.checkShouldBeBlocked('task-2')).toBe(true)
    })

    it('returns false for task with resolved dependencies', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'complete')
      const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      expect(result.current.checkShouldBeBlocked('task-2')).toBe(false)
    })

    it('returns false for non-existent node', () => {
      const { result } = renderHook(() => useBlockedStatus())
      expect(result.current.checkShouldBeBlocked('nonexistent')).toBe(false)
    })
  })

  describe('updateStatusWithCascade', () => {
    it('updates node status', () => {
      const task = createTaskNode('task-1', 'Task 1', 'pending')
      useNodesStore.getState().addNode(task)

      const { result } = renderHook(() => useBlockedStatus())

      act(() => {
        result.current.updateStatusWithCascade('task-1', 'complete')
      })

      const updatedNode = useNodesStore
        .getState()
        .getNodeById('task-1') as TaskNode
      expect(updatedNode.status).toBe('complete')
    })

    it('returns unblocked nodes when completing blocker', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'in_progress')
      const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      let updateResult: { success: boolean; unblocked: string[] }
      act(() => {
        updateResult = result.current.updateStatusWithCascade(
          'task-1',
          'complete'
        )
      })

      expect(updateResult!.success).toBe(true)
      expect(updateResult!.unblocked).toContain('task-2')
    })

    it('updates blocked nodes to pending when unblocked', () => {
      const task1 = createTaskNode('task-1', 'Task 1', 'in_progress')
      const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
      useNodesStore.getState().setNodes(
        new Map([
          ['task-1', task1],
          ['task-2', task2],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      act(() => {
        result.current.updateStatusWithCascade('task-1', 'complete')
      })

      const updatedTask2 = useNodesStore
        .getState()
        .getNodeById('task-2') as TaskNode
      expect(updatedTask2.status).toBe('pending')
    })

    it('returns failure for non-existent node', () => {
      const { result } = renderHook(() => useBlockedStatus())

      let updateResult: { success: boolean; unblocked: string[] }
      act(() => {
        updateResult = result.current.updateStatusWithCascade(
          'nonexistent',
          'complete'
        )
      })

      expect(updateResult!.success).toBe(false)
      expect(updateResult!.unblocked).toHaveLength(0)
    })

    it('handles decision status changes', () => {
      const decision = createDecisionNode('dec-1', 'Decision 1', 'pending')
      const task = createTaskNode('task-1', 'Task 1', 'blocked', ['dec-1'])
      useNodesStore.getState().setNodes(
        new Map<string, ForgeNode>([
          ['dec-1', decision],
          ['task-1', task],
        ])
      )

      const { result } = renderHook(() => useBlockedStatus())

      let updateResult: { success: boolean; unblocked: string[] }
      act(() => {
        updateResult = result.current.updateStatusWithCascade(
          'dec-1',
          'selected'
        )
      })

      expect(updateResult!.unblocked).toContain('task-1')
    })
  })
})

describe('useUnblockPreview', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
  })

  it('returns empty when no nodeId', () => {
    const { result } = renderHook(() => useUnblockPreview(undefined))
    expect(result.current.nodesToUnblock).toHaveLength(0)
    expect(result.current.count).toBe(0)
  })

  it('returns nodes that would be unblocked', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'blocked', ['task-1'])
    useNodesStore.getState().setNodes(
      new Map([
        ['task-1', task1],
        ['task-2', task2],
      ])
    )

    const { result } = renderHook(() => useUnblockPreview('task-1'))

    expect(result.current.count).toBe(1)
    expect(result.current.nodesToUnblock[0]).toMatchObject({
      id: 'task-2',
      title: 'Task 2',
    })
  })

  it('returns empty when no dependent nodes', () => {
    const task = createTaskNode('task-1', 'Task 1', 'pending')
    useNodesStore.getState().addNode(task)

    const { result } = renderHook(() => useUnblockPreview('task-1'))

    expect(result.current.count).toBe(0)
  })
})

describe('useNodeBlockedStatus', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
  })

  it('returns null when no nodeId', () => {
    const { result } = renderHook(() => useNodeBlockedStatus(undefined))
    expect(result.current).toBeNull()
  })

  it('returns null for non-existent node', () => {
    const { result } = renderHook(() => useNodeBlockedStatus('nonexistent'))
    expect(result.current).toBeNull()
  })

  it('returns blocked status for existing node', () => {
    const task1 = createTaskNode('task-1', 'Task 1', 'pending')
    const task2 = createTaskNode('task-2', 'Task 2', 'pending', ['task-1'])
    useNodesStore.getState().setNodes(
      new Map([
        ['task-1', task1],
        ['task-2', task2],
      ])
    )

    const { result } = renderHook(() => useNodeBlockedStatus('task-2'))

    expect(result.current?.isBlocked).toBe(true)
    expect(result.current?.blockingNodeIds).toContain('task-1')
  })
})
