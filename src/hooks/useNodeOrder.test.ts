/**
 * Tests for useNodeOrder hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import {
  useNodeOrder,
  applyNodeOrder,
  reconcileNodeOrder,
} from './useNodeOrder'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { ForgeNode, TaskNode, DecisionNode, NoteNode } from '@/types/nodes'
import type { Project } from '@/types/project'

// ============================================================================
// Test Data
// ============================================================================

const createTaskNode = (id: string, title: string): TaskNode => ({
  id,
  type: 'task',
  title,
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  content: '',
  status: 'pending',
  priority: 'medium',
  dependsOn: [],
  blocks: [],
  checklist: [],
})

const createDecisionNode = (id: string, title: string): DecisionNode => ({
  id,
  type: 'decision',
  title,
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  content: '',
  status: 'pending',
  selected: null,
  options: [],
  criteria: [],
  rationale: null,
  selectedDate: null,
})

const createNoteNode = (id: string, title: string): NoteNode => ({
  id,
  type: 'note',
  title,
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  content: '',
})

const createTestProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'test-project',
  name: 'Test Project',
  path: '/test',
  nodes: new Map(),
  metadata: {
    createdAt: new Date(),
    modifiedAt: new Date(),
  },
  ...overrides,
})

// ============================================================================
// Tests
// ============================================================================

describe('useNodeOrder', () => {
  beforeEach(() => {
    // Reset stores before each test
    useNodesStore.getState().clearNodes()
    useProjectStore.getState().closeProject()
  })

  describe('orderedNodes', () => {
    it('returns nodes in default order when no custom order', () => {
      // Add nodes to store
      const node1 = createTaskNode('task-1', 'Task 1')
      const node2 = createDecisionNode('decision-1', 'Decision 1')
      const node3 = createNoteNode('note-1', 'Note 1')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)
      useNodesStore.getState().addNode(node3)

      const { result } = renderHook(() => useNodeOrder())

      expect(result.current.orderedNodes).toHaveLength(3)
      expect(result.current.hasCustomOrder).toBe(false)
    })

    it('returns nodes in custom order when nodeOrder is set', () => {
      // Add nodes to store
      const node1 = createTaskNode('task-1', 'Task 1')
      const node2 = createDecisionNode('decision-1', 'Decision 1')
      const node3 = createNoteNode('note-1', 'Note 1')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)
      useNodesStore.getState().addNode(node3)

      // Set up project with custom order
      const project = createTestProject({
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          nodeOrder: ['note-1', 'task-1', 'decision-1'],
        },
      })

      // Manually set project state (bypassing adapter)
      useProjectStore.setState({ project })

      const { result } = renderHook(() => useNodeOrder())

      expect(result.current.orderedNodes).toHaveLength(3)
      expect(result.current.orderedNodes[0].id).toBe('note-1')
      expect(result.current.orderedNodes[1].id).toBe('task-1')
      expect(result.current.orderedNodes[2].id).toBe('decision-1')
      expect(result.current.hasCustomOrder).toBe(true)
    })

    it('appends new nodes not in stored order', () => {
      // Add nodes to store
      const node1 = createTaskNode('task-1', 'Task 1')
      const node2 = createDecisionNode('decision-1', 'Decision 1')
      const node3 = createNoteNode('note-1', 'Note 1') // New node

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)
      useNodesStore.getState().addNode(node3)

      // Set up project with partial order (missing note-1)
      const project = createTestProject({
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          nodeOrder: ['decision-1', 'task-1'], // note-1 not in order
        },
      })

      useProjectStore.setState({ project })

      const { result } = renderHook(() => useNodeOrder())

      expect(result.current.orderedNodes).toHaveLength(3)
      expect(result.current.orderedNodes[0].id).toBe('decision-1')
      expect(result.current.orderedNodes[1].id).toBe('task-1')
      expect(result.current.orderedNodes[2].id).toBe('note-1') // Appended at end
    })

    it('filters out deleted nodes from stored order', () => {
      // Add only 2 nodes
      const node1 = createTaskNode('task-1', 'Task 1')
      const node2 = createDecisionNode('decision-1', 'Decision 1')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      // Set up project with order that includes deleted node
      const project = createTestProject({
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          nodeOrder: ['deleted-node', 'decision-1', 'task-1'],
        },
      })

      useProjectStore.setState({ project })

      const { result } = renderHook(() => useNodeOrder())

      expect(result.current.orderedNodes).toHaveLength(2)
      expect(result.current.orderedNodes[0].id).toBe('decision-1')
      expect(result.current.orderedNodes[1].id).toBe('task-1')
    })
  })

  describe('reorder', () => {
    it('updates project metadata with new order', async () => {
      // Add nodes to store
      const node1 = createTaskNode('task-1', 'Task 1')
      const node2 = createDecisionNode('decision-1', 'Decision 1')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      // Set up project
      const project = createTestProject()

      useProjectStore.setState({ project })

      // Mock saveMetadata
      const saveMetadataMock = vi.fn().mockResolvedValue(true)
      useProjectStore.setState({ saveMetadata: saveMetadataMock })

      const { result } = renderHook(() => useNodeOrder())

      await act(async () => {
        await result.current.reorder(['decision-1', 'task-1'])
      })

      // Check that updateMetadata was called (via the project state change)
      const updatedProject = useProjectStore.getState().project
      expect(updatedProject?.metadata.nodeOrder).toEqual([
        'decision-1',
        'task-1',
      ])
    })

    it('calls saveMetadata when autoSave is true', async () => {
      const saveMetadataMock = vi.fn().mockResolvedValue(true)

      // Set up project
      const project = createTestProject()

      useProjectStore.setState({
        project,
        saveMetadata: saveMetadataMock,
      })

      const { result } = renderHook(() => useNodeOrder({ autoSave: true }))

      await act(async () => {
        await result.current.reorder(['node-1', 'node-2'])
      })

      expect(saveMetadataMock).toHaveBeenCalled()
    })

    it('does not call saveMetadata when autoSave is false', async () => {
      const saveMetadataMock = vi.fn().mockResolvedValue(true)

      // Set up project
      const project = createTestProject()

      useProjectStore.setState({
        project,
        saveMetadata: saveMetadataMock,
      })

      const { result } = renderHook(() => useNodeOrder({ autoSave: false }))

      await act(async () => {
        await result.current.reorder(['node-1', 'node-2'])
      })

      expect(saveMetadataMock).not.toHaveBeenCalled()
    })
  })

  describe('resetOrder', () => {
    it('clears the stored order', async () => {
      // Set up project with custom order
      const project = createTestProject({
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          nodeOrder: ['node-1', 'node-2', 'node-3'],
        },
      })

      const saveMetadataMock = vi.fn().mockResolvedValue(true)
      useProjectStore.setState({
        project,
        saveMetadata: saveMetadataMock,
      })

      const { result } = renderHook(() => useNodeOrder())

      expect(result.current.hasCustomOrder).toBe(true)

      await act(async () => {
        await result.current.resetOrder()
      })

      // Check that order was cleared
      const updatedProject = useProjectStore.getState().project
      expect(updatedProject?.metadata.nodeOrder).toBeUndefined()
    })
  })

  describe('uses provided nodes option', () => {
    it('orders provided nodes instead of store nodes', () => {
      // Add some nodes to store
      useNodesStore
        .getState()
        .addNode(createTaskNode('store-task', 'Store Task'))

      // Provide different nodes
      const providedNodes = [
        createTaskNode('provided-1', 'Provided 1'),
        createTaskNode('provided-2', 'Provided 2'),
      ]

      // Set up project with order
      const project = createTestProject({
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          nodeOrder: ['provided-2', 'provided-1'],
        },
      })

      useProjectStore.setState({ project })

      const { result } = renderHook(() =>
        useNodeOrder({ nodes: providedNodes })
      )

      expect(result.current.orderedNodes).toHaveLength(2)
      expect(result.current.orderedNodes[0].id).toBe('provided-2')
      expect(result.current.orderedNodes[1].id).toBe('provided-1')
    })
  })
})

describe('applyNodeOrder', () => {
  const nodes: ForgeNode[] = [
    createTaskNode('task-1', 'Task 1'),
    createDecisionNode('decision-1', 'Decision 1'),
    createNoteNode('note-1', 'Note 1'),
  ]

  it('returns nodes unchanged when order is empty', () => {
    const result = applyNodeOrder(nodes, [])
    expect(result).toEqual(nodes)
  })

  it('sorts nodes according to provided order', () => {
    const order = ['note-1', 'task-1', 'decision-1']
    const result = applyNodeOrder(nodes, order)

    expect(result[0].id).toBe('note-1')
    expect(result[1].id).toBe('task-1')
    expect(result[2].id).toBe('decision-1')
  })

  it('puts unordered nodes at the end', () => {
    const order = ['decision-1'] // Only one node in order
    const result = applyNodeOrder(nodes, order)

    expect(result[0].id).toBe('decision-1')
    // Other nodes at end in original order
    expect(result.slice(1).map((n) => n.id)).toContain('task-1')
    expect(result.slice(1).map((n) => n.id)).toContain('note-1')
  })

  it('ignores order entries for missing nodes', () => {
    const order = ['missing-node', 'note-1', 'task-1']
    const result = applyNodeOrder(nodes, order)

    expect(result[0].id).toBe('note-1')
    expect(result[1].id).toBe('task-1')
    expect(result[2].id).toBe('decision-1') // Not in order, at end
  })

  it('does not mutate original array', () => {
    const original = [...nodes]
    applyNodeOrder(nodes, ['note-1', 'task-1', 'decision-1'])
    expect(nodes).toEqual(original)
  })
})

describe('reconcileNodeOrder', () => {
  const nodes: ForgeNode[] = [
    createTaskNode('task-1', 'Task 1'),
    createDecisionNode('decision-1', 'Decision 1'),
    createNoteNode('note-1', 'Note 1'),
  ]

  it('removes deleted node IDs from stored order', () => {
    const storedOrder = ['deleted-node', 'task-1', 'decision-1']
    const result = reconcileNodeOrder(nodes, storedOrder)

    expect(result).not.toContain('deleted-node')
    expect(result).toContain('task-1')
    expect(result).toContain('decision-1')
  })

  it('appends new node IDs not in stored order', () => {
    const storedOrder = ['task-1'] // Only one node
    const result = reconcileNodeOrder(nodes, storedOrder)

    expect(result[0]).toBe('task-1')
    expect(result).toContain('decision-1')
    expect(result).toContain('note-1')
  })

  it('preserves order of existing nodes', () => {
    const storedOrder = ['decision-1', 'task-1']
    const result = reconcileNodeOrder(nodes, storedOrder)

    expect(result[0]).toBe('decision-1')
    expect(result[1]).toBe('task-1')
  })

  it('returns all node IDs when stored order is empty', () => {
    const result = reconcileNodeOrder(nodes, [])

    expect(result).toHaveLength(3)
    nodes.forEach((node) => {
      expect(result).toContain(node.id)
    })
  })

  it('handles empty nodes array', () => {
    const result = reconcileNodeOrder([], ['task-1', 'decision-1'])
    expect(result).toEqual([])
  })
})
