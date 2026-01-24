import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndoRedo, useUndoableNodeOperations } from './useUndoRedo'
import { useNodesStore } from '@/store/useNodesStore'
import { useUndoStore } from '@/store/useUndoStore'
import type { TaskNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestTaskNode(id: string, title: string): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    content: `# ${title}\n\nTask content`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('useUndoRedo', () => {
  beforeEach(() => {
    // Reset stores before each test
    useNodesStore.setState({
      nodes: new Map(),
      activeNodeId: null,
      dirtyNodeIds: new Set(),
    })

    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      maxHistorySize: 50,
      isUndoRedoInProgress: false,
    })
  })

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.undoCount).toBe(0)
      expect(result.current.redoCount).toBe(0)
      expect(result.current.undoDescription).toBeNull()
      expect(result.current.redoDescription).toBeNull()
    })
  })

  describe('undo/redo for addNode', () => {
    it('should undo addNode by deleting the node', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      // Add node and record action
      useNodesStore.getState().addNode(node)
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(result.current.canUndo).toBe(true)

      // Undo
      act(() => {
        result.current.undo()
      })

      // Node should be deleted
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('should redo addNode by re-adding the node', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      // Add node and record action
      useNodesStore.getState().addNode(node)
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      // Undo first
      act(() => {
        result.current.undo()
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)

      // Now redo
      act(() => {
        result.current.redo()
      })

      // Node should be back
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)
      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Test Task'
      )
    })
  })

  describe('undo/redo for updateNode', () => {
    it('should undo updateNode by restoring previous state', () => {
      const originalNode = createTestTaskNode('task-1', 'Original Title')
      const updatedNode = { ...originalNode, title: 'Updated Title' }

      // Add original node
      useNodesStore.getState().addNode(originalNode)

      // Update node and record action
      useNodesStore.getState().updateNode('task-1', { title: 'Updated Title' })
      useUndoStore.getState().recordAction({
        type: 'updateNode',
        nodeId: 'task-1',
        previousState: originalNode,
        newState: updatedNode,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated Title'
      )

      // Undo
      act(() => {
        result.current.undo()
      })

      // Should restore original title
      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Original Title'
      )
    })

    it('should redo updateNode by applying new state', () => {
      const originalNode = createTestTaskNode('task-1', 'Original Title')
      const updatedNode = { ...originalNode, title: 'Updated Title' }

      useNodesStore.getState().addNode(originalNode)
      useNodesStore.getState().updateNode('task-1', { title: 'Updated Title' })
      useUndoStore.getState().recordAction({
        type: 'updateNode',
        nodeId: 'task-1',
        previousState: originalNode,
        newState: updatedNode,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      // Undo first
      act(() => {
        result.current.undo()
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Original Title'
      )

      // Now redo
      act(() => {
        result.current.redo()
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated Title'
      )
    })
  })

  describe('undo/redo for deleteNode', () => {
    it('should undo deleteNode by restoring the node', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      // Add then delete node
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().deleteNode('task-1')
      useUndoStore.getState().recordAction({
        type: 'deleteNode',
        nodeId: 'task-1',
        node,
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      // Undo
      act(() => {
        result.current.undo()
      })

      // Node should be restored
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)
      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Test Task'
      )
    })

    it('should redo deleteNode by deleting again', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useNodesStore.getState().addNode(node)
      useNodesStore.getState().deleteNode('task-1')
      useUndoStore.getState().recordAction({
        type: 'deleteNode',
        nodeId: 'task-1',
        node,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      // Undo first
      act(() => {
        result.current.undo()
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)

      // Now redo
      act(() => {
        result.current.redo()
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)
    })
  })

  describe('clearHistory', () => {
    it('should clear all undo/redo history', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useNodesStore.getState().addNode(node)
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(result.current.canUndo).toBe(true)

      act(() => {
        result.current.clearHistory()
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('descriptions', () => {
    it('should return correct undo description', () => {
      const node = createTestTaskNode('task-1', 'My Task')

      useNodesStore.getState().addNode(node)
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(result.current.undoDescription).toBe('Add "My Task"')
    })

    it('should return correct redo description', () => {
      const node = createTestTaskNode('task-1', 'My Task')

      useNodesStore.getState().addNode(node)
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      act(() => {
        result.current.undo()
      })

      expect(result.current.redoDescription).toBe('Add "My Task"')
    })
  })

  describe('multiple undo/redo operations', () => {
    it('should handle multiple sequential undos', () => {
      const node1 = createTestTaskNode('task-1', 'Task 1')
      const node2 = createTestTaskNode('task-2', 'Task 2')
      const node3 = createTestTaskNode('task-3', 'Task 3')

      // Add three nodes
      useNodesStore.getState().addNode(node1)
      useUndoStore
        .getState()
        .recordAction({ type: 'addNode', nodeId: 'task-1', node: node1 })

      useNodesStore.getState().addNode(node2)
      useUndoStore
        .getState()
        .recordAction({ type: 'addNode', nodeId: 'task-2', node: node2 })

      useNodesStore.getState().addNode(node3)
      useUndoStore
        .getState()
        .recordAction({ type: 'addNode', nodeId: 'task-3', node: node3 })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      expect(useNodesStore.getState().nodes.size).toBe(3)
      expect(result.current.undoCount).toBe(3)

      // Undo all three
      act(() => {
        result.current.undo()
      })
      expect(useNodesStore.getState().nodes.size).toBe(2)
      expect(useNodesStore.getState().nodes.has('task-3')).toBe(false)

      act(() => {
        result.current.undo()
      })
      expect(useNodesStore.getState().nodes.size).toBe(1)
      expect(useNodesStore.getState().nodes.has('task-2')).toBe(false)

      act(() => {
        result.current.undo()
      })
      expect(useNodesStore.getState().nodes.size).toBe(0)

      expect(result.current.canUndo).toBe(false)
      expect(result.current.redoCount).toBe(3)
    })

    it('should handle mixed undo/redo operations', () => {
      const node1 = createTestTaskNode('task-1', 'Task 1')
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useNodesStore.getState().addNode(node1)
      useUndoStore
        .getState()
        .recordAction({ type: 'addNode', nodeId: 'task-1', node: node1 })

      useNodesStore.getState().addNode(node2)
      useUndoStore
        .getState()
        .recordAction({ type: 'addNode', nodeId: 'task-2', node: node2 })

      const { result } = renderHook(() => useUndoRedo({ enableHotkeys: false }))

      // Undo once
      act(() => {
        result.current.undo()
      })
      expect(useNodesStore.getState().nodes.has('task-2')).toBe(false)
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)

      // Redo
      act(() => {
        result.current.redo()
      })
      expect(useNodesStore.getState().nodes.has('task-2')).toBe(true)

      // Undo twice
      act(() => {
        result.current.undo()
        result.current.undo()
      })
      expect(useNodesStore.getState().nodes.size).toBe(0)

      // Redo both
      act(() => {
        result.current.redo()
        result.current.redo()
      })
      expect(useNodesStore.getState().nodes.size).toBe(2)
    })
  })
})

describe('useUndoableNodeOperations', () => {
  beforeEach(() => {
    useNodesStore.setState({
      nodes: new Map(),
      activeNodeId: null,
      dirtyNodeIds: new Set(),
    })

    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      maxHistorySize: 50,
      isUndoRedoInProgress: false,
    })
  })

  describe('addNode', () => {
    it('should add node and record action', () => {
      const { result } = renderHook(() => useUndoableNodeOperations())

      const node = createTestTaskNode('task-1', 'Test Task')

      act(() => {
        result.current.addNode(node)
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)
      expect(useUndoStore.getState().undoStack).toHaveLength(1)
      expect(useUndoStore.getState().undoStack[0].type).toBe('addNode')
    })
  })

  describe('updateNode', () => {
    it('should update node and record action', () => {
      const node = createTestTaskNode('task-1', 'Original')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useUndoableNodeOperations())

      act(() => {
        result.current.updateNode('task-1', { title: 'Updated' })
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated'
      )
      expect(useUndoStore.getState().undoStack).toHaveLength(1)
      expect(useUndoStore.getState().undoStack[0].type).toBe('updateNode')
    })

    it('should not record action for non-existent node', () => {
      const { result } = renderHook(() => useUndoableNodeOperations())

      act(() => {
        result.current.updateNode('non-existent', { title: 'Updated' })
      })

      expect(useUndoStore.getState().undoStack).toHaveLength(0)
    })
  })

  describe('deleteNode', () => {
    it('should delete node and record action', () => {
      const node = createTestTaskNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useUndoableNodeOperations())

      act(() => {
        result.current.deleteNode('task-1')
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)
      expect(useUndoStore.getState().undoStack).toHaveLength(1)
      expect(useUndoStore.getState().undoStack[0].type).toBe('deleteNode')
    })

    it('should not record action for non-existent node', () => {
      const { result } = renderHook(() => useUndoableNodeOperations())

      act(() => {
        result.current.deleteNode('non-existent')
      })

      expect(useUndoStore.getState().undoStack).toHaveLength(0)
    })
  })

  describe('integration with useUndoRedo', () => {
    it('should work together for full undo/redo cycle', () => {
      const { result: operations } = renderHook(() =>
        useUndoableNodeOperations()
      )
      const { result: undoRedo } = renderHook(() =>
        useUndoRedo({ enableHotkeys: false })
      )

      const node = createTestTaskNode('task-1', 'Test Task')

      // Add node using undoable operation
      act(() => {
        operations.current.addNode(node)
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(true)
      expect(undoRedo.current.canUndo).toBe(true)

      // Update node
      act(() => {
        operations.current.updateNode('task-1', { title: 'Updated' })
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated'
      )
      expect(undoRedo.current.undoCount).toBe(2)

      // Undo update
      act(() => {
        undoRedo.current.undo()
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Test Task'
      )

      // Undo add
      act(() => {
        undoRedo.current.undo()
      })

      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)

      // Redo both
      act(() => {
        undoRedo.current.redo()
        undoRedo.current.redo()
      })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated'
      )
    })
  })
})
