/**
 * useDeleteNodeDialog Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useDeleteNodeDialog } from './useDeleteNodeDialog'
import { NodeType } from '@/types/nodes'
import type { TaskNode } from '@/types/nodes'

// ============================================================================
// Test Setup
// ============================================================================

function createTestNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'test-node-1',
    type: NodeType.Task,
    title: 'Test Task',
    content: 'Test content',
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    ...overrides,
  }
}

describe('useDeleteNodeDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes with closed state', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())

      expect(result.current.isOpen).toBe(false)
      expect(result.current.nodeToDelete).toBeNull()
    })

    it('provides openForNode function', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())

      expect(typeof result.current.openForNode).toBe('function')
    })

    it('provides close function', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())

      expect(typeof result.current.close).toBe('function')
    })
  })

  describe('openForNode', () => {
    it('opens dialog for specified node', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const testNode = createTestNode()

      act(() => {
        result.current.openForNode(testNode)
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.nodeToDelete).toEqual(testNode)
    })

    it('can open with different nodes', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const node1 = createTestNode({ id: 'node-1', title: 'Node 1' })
      const node2 = createTestNode({ id: 'node-2', title: 'Node 2' })

      act(() => {
        result.current.openForNode(node1)
      })

      expect(result.current.nodeToDelete?.id).toBe('node-1')

      act(() => {
        result.current.openForNode(node2)
      })

      expect(result.current.nodeToDelete?.id).toBe('node-2')
    })

    it('preserves node data correctly', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const testNode = createTestNode({
        id: 'my-task',
        title: 'My Important Task',
        tags: ['urgent', 'work'],
        content: 'This is the content',
      })

      act(() => {
        result.current.openForNode(testNode)
      })

      expect(result.current.nodeToDelete).toEqual(testNode)
      expect(result.current.nodeToDelete?.title).toBe('My Important Task')
      expect(result.current.nodeToDelete?.tags).toEqual(['urgent', 'work'])
    })
  })

  describe('close', () => {
    it('closes the dialog', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const testNode = createTestNode()

      act(() => {
        result.current.openForNode(testNode)
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('clears node after delay', () => {
      vi.useRealTimers()
      const { result } = renderHook(() => useDeleteNodeDialog())
      const testNode = createTestNode()

      act(() => {
        result.current.openForNode(testNode)
      })

      act(() => {
        result.current.close()
      })

      // Node should still be present immediately (for animation)
      expect(result.current.nodeToDelete).toEqual(testNode)

      // Wait for the setTimeout to clear the node
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // After 150ms, node should be null
          expect(result.current.nodeToDelete).toBeNull()
          resolve()
        }, 200)
      })
    })
  })

  describe('state transitions', () => {
    it('can be opened and closed multiple times', () => {
      vi.useRealTimers()
      const { result } = renderHook(() => useDeleteNodeDialog())
      const node1 = createTestNode({ id: 'node-1' })
      const node2 = createTestNode({ id: 'node-2' })

      // First open/close cycle
      act(() => {
        result.current.openForNode(node1)
      })
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })
      expect(result.current.isOpen).toBe(false)

      // Second open/close cycle with different node
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          act(() => {
            result.current.openForNode(node2)
          })
          expect(result.current.isOpen).toBe(true)
          expect(result.current.nodeToDelete?.id).toBe('node-2')

          act(() => {
            result.current.close()
          })
          expect(result.current.isOpen).toBe(false)
          resolve()
        }, 200)
      })
    })

    it('opening new node while already open updates the node', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const node1 = createTestNode({ id: 'node-1', title: 'Node 1' })
      const node2 = createTestNode({ id: 'node-2', title: 'Node 2' })

      act(() => {
        result.current.openForNode(node1)
      })

      expect(result.current.nodeToDelete?.title).toBe('Node 1')

      act(() => {
        result.current.openForNode(node2)
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.nodeToDelete?.title).toBe('Node 2')
    })
  })

  describe('type safety', () => {
    it('preserves node type information', () => {
      const { result } = renderHook(() => useDeleteNodeDialog())
      const taskNode = createTestNode({ type: NodeType.Task })

      act(() => {
        result.current.openForNode(taskNode)
      })

      expect(result.current.nodeToDelete?.type).toBe(NodeType.Task)
    })
  })
})
