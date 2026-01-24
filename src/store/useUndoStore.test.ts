import { describe, it, expect, beforeEach } from 'vitest'
import { useUndoStore } from './useUndoStore'
import type {
  AddNodeAction,
  UpdateNodeAction,
  DeleteNodeAction,
} from './useUndoStore'
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

describe('useUndoStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      maxHistorySize: 50,
      isUndoRedoInProgress: false,
    })
  })

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have empty undo stack', () => {
      expect(useUndoStore.getState().undoStack).toHaveLength(0)
    })

    it('should have empty redo stack', () => {
      expect(useUndoStore.getState().redoStack).toHaveLength(0)
    })

    it('should have default max history size', () => {
      expect(useUndoStore.getState().maxHistorySize).toBe(50)
    })

    it('should not be in undo/redo progress', () => {
      expect(useUndoStore.getState().isUndoRedoInProgress).toBe(false)
    })
  })

  // ==========================================================================
  // recordAction
  // ==========================================================================

  describe('recordAction', () => {
    it('should add action to undo stack', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      expect(useUndoStore.getState().undoStack).toHaveLength(1)
      expect(useUndoStore.getState().undoStack[0].type).toBe('addNode')
    })

    it('should add timestamp to action', () => {
      const node = createTestTaskNode('task-1', 'Test Task')
      const before = Date.now()

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const after = Date.now()
      const action = useUndoStore.getState().undoStack[0]

      expect(action.timestamp).toBeGreaterThanOrEqual(before)
      expect(action.timestamp).toBeLessThanOrEqual(after)
    })

    it('should clear redo stack when recording new action', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      // Record an action
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      // Undo it (moves to redo stack)
      useUndoStore.getState().undo()
      expect(useUndoStore.getState().redoStack).toHaveLength(1)

      // Record a new action
      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-2',
        node: createTestTaskNode('task-2', 'Task 2'),
      })

      // Redo stack should be cleared
      expect(useUndoStore.getState().redoStack).toHaveLength(0)
    })

    it('should not record action when undo/redo is in progress', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().setUndoRedoInProgress(true)

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      expect(useUndoStore.getState().undoStack).toHaveLength(0)
    })

    it('should trim history when max size exceeded', () => {
      useUndoStore.setState({ maxHistorySize: 3 })

      for (let i = 0; i < 5; i++) {
        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: `task-${i}`,
          node: createTestTaskNode(`task-${i}`, `Task ${i}`),
        })
      }

      expect(useUndoStore.getState().undoStack).toHaveLength(3)
      // Should keep the most recent actions
      expect(useUndoStore.getState().undoStack[0].nodeId).toBe('task-2')
      expect(useUndoStore.getState().undoStack[2].nodeId).toBe('task-4')
    })
  })

  // ==========================================================================
  // undo
  // ==========================================================================

  describe('undo', () => {
    it('should return null when stack is empty', () => {
      const result = useUndoStore.getState().undo()

      expect(result).toBeNull()
    })

    it('should return and remove the last action from undo stack', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const action = useUndoStore.getState().undo()

      expect(action).not.toBeNull()
      expect(action?.type).toBe('addNode')
      expect(useUndoStore.getState().undoStack).toHaveLength(0)
    })

    it('should add action to redo stack', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      useUndoStore.getState().undo()

      expect(useUndoStore.getState().redoStack).toHaveLength(1)
      expect(useUndoStore.getState().redoStack[0].type).toBe('addNode')
    })

    it('should handle multiple undos', () => {
      const node1 = createTestTaskNode('task-1', 'Task 1')
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node: node1,
      })

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-2',
        node: node2,
      })

      // Undo twice
      const action2 = useUndoStore.getState().undo()
      const action1 = useUndoStore.getState().undo()

      expect(action2?.nodeId).toBe('task-2')
      expect(action1?.nodeId).toBe('task-1')
      expect(useUndoStore.getState().undoStack).toHaveLength(0)
      expect(useUndoStore.getState().redoStack).toHaveLength(2)
    })
  })

  // ==========================================================================
  // redo
  // ==========================================================================

  describe('redo', () => {
    it('should return null when stack is empty', () => {
      const result = useUndoStore.getState().redo()

      expect(result).toBeNull()
    })

    it('should return and remove the last action from redo stack', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      useUndoStore.getState().undo()
      const action = useUndoStore.getState().redo()

      expect(action).not.toBeNull()
      expect(action?.type).toBe('addNode')
      expect(useUndoStore.getState().redoStack).toHaveLength(0)
    })

    it('should add action back to undo stack', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      useUndoStore.getState().undo()
      useUndoStore.getState().redo()

      expect(useUndoStore.getState().undoStack).toHaveLength(1)
      expect(useUndoStore.getState().redoStack).toHaveLength(0)
    })
  })

  // ==========================================================================
  // clearHistory
  // ==========================================================================

  describe('clearHistory', () => {
    it('should clear both stacks', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      useUndoStore.getState().undo()

      expect(useUndoStore.getState().undoStack).toHaveLength(0)
      expect(useUndoStore.getState().redoStack).toHaveLength(1)

      useUndoStore.getState().clearHistory()

      expect(useUndoStore.getState().undoStack).toHaveLength(0)
      expect(useUndoStore.getState().redoStack).toHaveLength(0)
    })
  })

  // ==========================================================================
  // setUndoRedoInProgress
  // ==========================================================================

  describe('setUndoRedoInProgress', () => {
    it('should set the flag', () => {
      useUndoStore.getState().setUndoRedoInProgress(true)
      expect(useUndoStore.getState().isUndoRedoInProgress).toBe(true)

      useUndoStore.getState().setUndoRedoInProgress(false)
      expect(useUndoStore.getState().isUndoRedoInProgress).toBe(false)
    })
  })

  // ==========================================================================
  // Selectors
  // ==========================================================================

  describe('selectors', () => {
    describe('canUndo', () => {
      it('should return false when stack is empty', () => {
        expect(useUndoStore.getState().canUndo()).toBe(false)
      })

      it('should return true when stack has items', () => {
        const node = createTestTaskNode('task-1', 'Test Task')

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-1',
          node,
        })

        expect(useUndoStore.getState().canUndo()).toBe(true)
      })
    })

    describe('canRedo', () => {
      it('should return false when stack is empty', () => {
        expect(useUndoStore.getState().canRedo()).toBe(false)
      })

      it('should return true when stack has items', () => {
        const node = createTestTaskNode('task-1', 'Test Task')

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-1',
          node,
        })

        useUndoStore.getState().undo()

        expect(useUndoStore.getState().canRedo()).toBe(true)
      })
    })

    describe('undoCount and redoCount', () => {
      it('should return correct counts', () => {
        const node1 = createTestTaskNode('task-1', 'Task 1')
        const node2 = createTestTaskNode('task-2', 'Task 2')

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-1',
          node: node1,
        })

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-2',
          node: node2,
        })

        expect(useUndoStore.getState().undoCount()).toBe(2)
        expect(useUndoStore.getState().redoCount()).toBe(0)

        useUndoStore.getState().undo()

        expect(useUndoStore.getState().undoCount()).toBe(1)
        expect(useUndoStore.getState().redoCount()).toBe(1)
      })
    })

    describe('getUndoDescription', () => {
      it('should return null when stack is empty', () => {
        expect(useUndoStore.getState().getUndoDescription()).toBeNull()
      })

      it('should return description of add action', () => {
        const node = createTestTaskNode('task-1', 'My Task')

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-1',
          node,
        })

        expect(useUndoStore.getState().getUndoDescription()).toBe(
          'Add "My Task"'
        )
      })

      it('should return description of update action', () => {
        const prevNode = createTestTaskNode('task-1', 'Original Title')
        const newNode = createTestTaskNode('task-1', 'New Title')

        useUndoStore.getState().recordAction({
          type: 'updateNode',
          nodeId: 'task-1',
          previousState: prevNode,
          newState: newNode,
        })

        expect(useUndoStore.getState().getUndoDescription()).toBe(
          'Edit "Original Title"'
        )
      })

      it('should return description of delete action', () => {
        const node = createTestTaskNode('task-1', 'Deleted Task')

        useUndoStore.getState().recordAction({
          type: 'deleteNode',
          nodeId: 'task-1',
          node,
        })

        expect(useUndoStore.getState().getUndoDescription()).toBe(
          'Delete "Deleted Task"'
        )
      })
    })

    describe('getRedoDescription', () => {
      it('should return null when stack is empty', () => {
        expect(useUndoStore.getState().getRedoDescription()).toBeNull()
      })

      it('should return description after undo', () => {
        const node = createTestTaskNode('task-1', 'My Task')

        useUndoStore.getState().recordAction({
          type: 'addNode',
          nodeId: 'task-1',
          node,
        })

        useUndoStore.getState().undo()

        expect(useUndoStore.getState().getRedoDescription()).toBe(
          'Add "My Task"'
        )
      })
    })
  })

  // ==========================================================================
  // Action Types
  // ==========================================================================

  describe('action types', () => {
    it('should record addNode actions correctly', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      const action = useUndoStore.getState().undoStack[0] as AddNodeAction
      expect(action.type).toBe('addNode')
      expect(action.nodeId).toBe('task-1')
      expect(action.node).toEqual(node)
    })

    it('should record updateNode actions correctly', () => {
      const prevNode = createTestTaskNode('task-1', 'Original')
      const newNode = createTestTaskNode('task-1', 'Updated')

      useUndoStore.getState().recordAction({
        type: 'updateNode',
        nodeId: 'task-1',
        previousState: prevNode,
        newState: newNode,
      })

      const action = useUndoStore.getState().undoStack[0] as UpdateNodeAction
      expect(action.type).toBe('updateNode')
      expect(action.nodeId).toBe('task-1')
      expect(action.previousState).toEqual(prevNode)
      expect(action.newState).toEqual(newNode)
    })

    it('should record deleteNode actions correctly', () => {
      const node = createTestTaskNode('task-1', 'Test Task')

      useUndoStore.getState().recordAction({
        type: 'deleteNode',
        nodeId: 'task-1',
        node,
      })

      const action = useUndoStore.getState().undoStack[0] as DeleteNodeAction
      expect(action.type).toBe('deleteNode')
      expect(action.nodeId).toBe('task-1')
      expect(action.node).toEqual(node)
    })
  })

  // ==========================================================================
  // Store Subscription
  // ==========================================================================

  describe('store subscription', () => {
    it('should notify subscribers when state changes', () => {
      const counts: number[] = []

      const unsubscribe = useUndoStore.subscribe((state) => {
        counts.push(state.undoStack.length)
      })

      const node = createTestTaskNode('task-1', 'Test')

      useUndoStore.getState().recordAction({
        type: 'addNode',
        nodeId: 'task-1',
        node,
      })

      useUndoStore.getState().undo()

      expect(counts).toEqual([1, 0])

      unsubscribe()
    })
  })
})
