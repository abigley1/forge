import { describe, it, expect, beforeEach } from 'vitest'
import { useNodesStore } from './useNodesStore'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  SubsystemNode,
  AssemblyNode,
  ModuleNode,
} from '@/types/nodes'
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

function createTestDecisionNode(id: string, title: string): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    content: `# ${title}\n\nDecision content`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    parent: null,
  }
}

function createTestComponentNode(id: string, title: string): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title,
    content: `# ${title}\n\nComponent content`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    parent: null,
  }
}

function createTestNoteNode(id: string, title: string): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    content: `# ${title}\n\nNote content`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    parent: null,
  }
}

function createTestSubsystemNode(id: string, title: string): SubsystemNode {
  return {
    id,
    type: NodeType.Subsystem,
    title,
    content: `# ${title}\n\nSubsystem description`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'planning',
    requirements: [],
  }
}

function createTestAssemblyNode(id: string, title: string): AssemblyNode {
  return {
    id,
    type: NodeType.Assembly,
    title,
    content: `# ${title}\n\nAssembly description`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'planning',
    requirements: [],
    parent: null,
  }
}

function createTestModuleNode(id: string, title: string): ModuleNode {
  return {
    id,
    type: NodeType.Module,
    title,
    content: `# ${title}\n\nModule description`,
    tags: ['test'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'planning',
    requirements: [],
    parent: null,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('useNodesStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useNodesStore.setState({
      nodes: new Map(),
      activeNodeId: null,
      dirtyNodeIds: new Set(),
      linkIndex: { outgoing: new Map(), incoming: new Map() },
    })
  })

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have empty nodes map', () => {
      expect(useNodesStore.getState().nodes.size).toBe(0)
    })

    it('should have null activeNodeId', () => {
      expect(useNodesStore.getState().activeNodeId).toBeNull()
    })

    it('should have empty dirtyNodeIds set', () => {
      expect(useNodesStore.getState().dirtyNodeIds.size).toBe(0)
    })
  })

  // ==========================================================================
  // addNode
  // ==========================================================================

  describe('addNode', () => {
    it('should add a node to the store', () => {
      const node = createTestTaskNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      expect(useNodesStore.getState().nodes.size).toBe(1)
      expect(useNodesStore.getState().nodes.get('task-1')).toEqual(node)
    })

    it('should mark the node as dirty', () => {
      const node = createTestTaskNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(true)
    })

    it('should add multiple nodes', () => {
      const task = createTestTaskNode('task-1', 'Task')
      const decision = createTestDecisionNode('decision-1', 'Decision')
      const component = createTestComponentNode('component-1', 'Component')

      useNodesStore.getState().addNode(task)
      useNodesStore.getState().addNode(decision)
      useNodesStore.getState().addNode(component)

      expect(useNodesStore.getState().nodes.size).toBe(3)
    })

    it('should overwrite existing node with same id', () => {
      const node1 = createTestTaskNode('task-1', 'Original')
      const node2 = createTestTaskNode('task-1', 'Updated')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      expect(useNodesStore.getState().nodes.size).toBe(1)
      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated'
      )
    })
  })

  // ==========================================================================
  // updateNode
  // ==========================================================================

  describe('updateNode', () => {
    it('should update an existing node', () => {
      const node = createTestTaskNode('task-1', 'Original')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().markClean('task-1')

      useNodesStore.getState().updateNode('task-1', { title: 'Updated' })

      expect(useNodesStore.getState().nodes.get('task-1')?.title).toBe(
        'Updated'
      )
    })

    it('should mark the node as dirty after update', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().markClean('task-1')

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(false)

      useNodesStore.getState().updateNode('task-1', { title: 'Updated' })

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(true)
    })

    it('should update the modified date', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      const originalModified = useNodesStore.getState().nodes.get('task-1')
        ?.dates.modified

      // Small delay to ensure time difference
      useNodesStore.getState().updateNode('task-1', { title: 'Updated' })

      const newModified = useNodesStore.getState().nodes.get('task-1')
        ?.dates.modified
      expect(newModified?.getTime()).toBeGreaterThanOrEqual(
        originalModified?.getTime() ?? 0
      )
    })

    it('should preserve id and type even if provided in updates', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      // Try to change id and type (should be ignored)
      useNodesStore.getState().updateNode('task-1', {
        id: 'hacked-id',
        type: NodeType.Decision,
        title: 'Updated',
      } as Partial<ForgeNode>)

      const updated = useNodesStore.getState().nodes.get('task-1')
      expect(updated?.id).toBe('task-1')
      expect(updated?.type).toBe(NodeType.Task)
    })

    it('should not update non-existent node', () => {
      useNodesStore.getState().updateNode('non-existent', { title: 'Updated' })

      expect(useNodesStore.getState().nodes.size).toBe(0)
    })
  })

  // ==========================================================================
  // deleteNode
  // ==========================================================================

  describe('deleteNode', () => {
    it('should delete an existing node', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      useNodesStore.getState().deleteNode('task-1')

      expect(useNodesStore.getState().nodes.size).toBe(0)
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)
    })

    it('should remove node from dirty set', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(true)

      useNodesStore.getState().deleteNode('task-1')

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(false)
    })

    it('should clear activeNodeId if deleted node was active', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().setActiveNode('task-1')

      expect(useNodesStore.getState().activeNodeId).toBe('task-1')

      useNodesStore.getState().deleteNode('task-1')

      expect(useNodesStore.getState().activeNodeId).toBeNull()
    })

    it('should not affect activeNodeId if different node was deleted', () => {
      const node1 = createTestTaskNode('task-1', 'Test 1')
      const node2 = createTestTaskNode('task-2', 'Test 2')
      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)
      useNodesStore.getState().setActiveNode('task-1')

      useNodesStore.getState().deleteNode('task-2')

      expect(useNodesStore.getState().activeNodeId).toBe('task-1')
    })

    it('should not throw for non-existent node', () => {
      expect(() => {
        useNodesStore.getState().deleteNode('non-existent')
      }).not.toThrow()
    })
  })

  // ==========================================================================
  // setActiveNode
  // ==========================================================================

  describe('setActiveNode', () => {
    it('should set the active node', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      useNodesStore.getState().setActiveNode('task-1')

      expect(useNodesStore.getState().activeNodeId).toBe('task-1')
    })

    it('should allow setting to null', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().setActiveNode('task-1')

      useNodesStore.getState().setActiveNode(null)

      expect(useNodesStore.getState().activeNodeId).toBeNull()
    })

    it('should not set active to non-existent node', () => {
      useNodesStore.getState().setActiveNode('non-existent')

      expect(useNodesStore.getState().activeNodeId).toBeNull()
    })
  })

  // ==========================================================================
  // setNodes
  // ==========================================================================

  describe('setNodes', () => {
    it('should replace all nodes', () => {
      const node1 = createTestTaskNode('task-1', 'Test 1')
      useNodesStore.getState().addNode(node1)

      const newNodes = new Map<string, ForgeNode>()
      newNodes.set('task-2', createTestTaskNode('task-2', 'Test 2'))
      newNodes.set('task-3', createTestTaskNode('task-3', 'Test 3'))

      useNodesStore.getState().setNodes(newNodes)

      expect(useNodesStore.getState().nodes.size).toBe(2)
      expect(useNodesStore.getState().nodes.has('task-1')).toBe(false)
      expect(useNodesStore.getState().nodes.has('task-2')).toBe(true)
      expect(useNodesStore.getState().nodes.has('task-3')).toBe(true)
    })

    it('should clear activeNodeId', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().setActiveNode('task-1')

      useNodesStore.getState().setNodes(new Map())

      expect(useNodesStore.getState().activeNodeId).toBeNull()
    })

    it('should clear dirty flags', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      expect(useNodesStore.getState().dirtyNodeIds.size).toBe(1)

      useNodesStore.getState().setNodes(new Map())

      expect(useNodesStore.getState().dirtyNodeIds.size).toBe(0)
    })
  })

  // ==========================================================================
  // clearNodes
  // ==========================================================================

  describe('clearNodes', () => {
    it('should clear all nodes', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      useNodesStore.getState().clearNodes()

      expect(useNodesStore.getState().nodes.size).toBe(0)
      expect(useNodesStore.getState().activeNodeId).toBeNull()
      expect(useNodesStore.getState().dirtyNodeIds.size).toBe(0)
    })
  })

  // ==========================================================================
  // Dirty State Management
  // ==========================================================================

  describe('dirty state management', () => {
    it('markDirty should add node to dirty set', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().markClean('task-1')

      useNodesStore.getState().markDirty('task-1')

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(true)
    })

    it('markClean should remove node from dirty set', () => {
      const node = createTestTaskNode('task-1', 'Test')
      useNodesStore.getState().addNode(node)

      useNodesStore.getState().markClean('task-1')

      expect(useNodesStore.getState().dirtyNodeIds.has('task-1')).toBe(false)
    })

    it('clearDirty should clear all dirty flags', () => {
      const node1 = createTestTaskNode('task-1', 'Test 1')
      const node2 = createTestTaskNode('task-2', 'Test 2')
      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      useNodesStore.getState().clearDirty()

      expect(useNodesStore.getState().dirtyNodeIds.size).toBe(0)
    })
  })

  // ==========================================================================
  // Selectors
  // ==========================================================================

  describe('selectors', () => {
    describe('getNodeById', () => {
      it('should return the node with the given id', () => {
        const node = createTestTaskNode('task-1', 'Test')
        useNodesStore.getState().addNode(node)

        const result = useNodesStore.getState().getNodeById('task-1')

        expect(result).toEqual(node)
      })

      it('should return undefined for non-existent id', () => {
        const result = useNodesStore.getState().getNodeById('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getNodesByType', () => {
      it('should return all nodes of the given type', () => {
        const task1 = createTestTaskNode('task-1', 'Task 1')
        const task2 = createTestTaskNode('task-2', 'Task 2')
        const decision = createTestDecisionNode('decision-1', 'Decision')

        useNodesStore.getState().addNode(task1)
        useNodesStore.getState().addNode(task2)
        useNodesStore.getState().addNode(decision)

        const tasks = useNodesStore.getState().getNodesByType(NodeType.Task)

        expect(tasks).toHaveLength(2)
        expect(tasks.map((n) => n.id).sort()).toEqual(['task-1', 'task-2'])
      })

      it('should return empty array when no nodes of type exist', () => {
        const task = createTestTaskNode('task-1', 'Task')
        useNodesStore.getState().addNode(task)

        const decisions = useNodesStore
          .getState()
          .getNodesByType(NodeType.Decision)

        expect(decisions).toHaveLength(0)
      })
    })

    describe('getAllNodes', () => {
      it('should return all nodes as array', () => {
        const task = createTestTaskNode('task-1', 'Task')
        const decision = createTestDecisionNode('decision-1', 'Decision')

        useNodesStore.getState().addNode(task)
        useNodesStore.getState().addNode(decision)

        const allNodes = useNodesStore.getState().getAllNodes()

        expect(allNodes).toHaveLength(2)
      })

      it('should return empty array when no nodes', () => {
        const allNodes = useNodesStore.getState().getAllNodes()

        expect(allNodes).toHaveLength(0)
      })
    })

    describe('hasNode', () => {
      it('should return true for existing node', () => {
        const node = createTestTaskNode('task-1', 'Test')
        useNodesStore.getState().addNode(node)

        expect(useNodesStore.getState().hasNode('task-1')).toBe(true)
      })

      it('should return false for non-existent node', () => {
        expect(useNodesStore.getState().hasNode('non-existent')).toBe(false)
      })
    })

    describe('getNodeCountsByType', () => {
      it('should return counts for all node types', () => {
        useNodesStore.getState().addNode(createTestTaskNode('task-1', 'Task'))
        useNodesStore.getState().addNode(createTestTaskNode('task-2', 'Task 2'))
        useNodesStore
          .getState()
          .addNode(createTestDecisionNode('dec-1', 'Decision'))
        useNodesStore
          .getState()
          .addNode(createTestComponentNode('comp-1', 'Component'))
        useNodesStore.getState().addNode(createTestNoteNode('note-1', 'Note'))

        const counts = useNodesStore.getState().getNodeCountsByType()

        expect(counts.task).toBe(2)
        expect(counts.decision).toBe(1)
        expect(counts.component).toBe(1)
        expect(counts.note).toBe(1)
      })

      it('should return zero counts for empty store', () => {
        const counts = useNodesStore.getState().getNodeCountsByType()

        expect(counts.task).toBe(0)
        expect(counts.decision).toBe(0)
        expect(counts.component).toBe(0)
        expect(counts.note).toBe(0)
      })
    })

    describe('dirty selectors', () => {
      it('isNodeDirty should return correct status', () => {
        const node = createTestTaskNode('task-1', 'Test')
        useNodesStore.getState().addNode(node)

        expect(useNodesStore.getState().isNodeDirty('task-1')).toBe(true)

        useNodesStore.getState().markClean('task-1')

        expect(useNodesStore.getState().isNodeDirty('task-1')).toBe(false)
      })

      it('hasDirtyNodes should return correct status', () => {
        expect(useNodesStore.getState().hasDirtyNodes()).toBe(false)

        const node = createTestTaskNode('task-1', 'Test')
        useNodesStore.getState().addNode(node)

        expect(useNodesStore.getState().hasDirtyNodes()).toBe(true)

        useNodesStore.getState().markClean('task-1')

        expect(useNodesStore.getState().hasDirtyNodes()).toBe(false)
      })

      it('getDirtyNodeIds should return array of dirty ids', () => {
        const node1 = createTestTaskNode('task-1', 'Test 1')
        const node2 = createTestTaskNode('task-2', 'Test 2')
        useNodesStore.getState().addNode(node1)
        useNodesStore.getState().addNode(node2)

        const dirtyIds = useNodesStore.getState().getDirtyNodeIds()

        expect(dirtyIds.sort()).toEqual(['task-1', 'task-2'])
      })
    })
  })

  // ==========================================================================
  // Link Index
  // ==========================================================================

  describe('linkIndex', () => {
    it('should have empty linkIndex initially', () => {
      const { linkIndex } = useNodesStore.getState()

      expect(linkIndex.outgoing.size).toBe(0)
      expect(linkIndex.incoming.size).toBe(0)
    })

    it('addNode should rebuild linkIndex', () => {
      const node1: TaskNode = {
        ...createTestTaskNode('task-1', 'Task 1'),
        content: 'Links to [[task-2]]',
      }
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      const { linkIndex } = useNodesStore.getState()

      expect(linkIndex.outgoing.get('task-1')).toEqual(new Set(['task-2']))
      expect(linkIndex.incoming.get('task-2')).toEqual(new Set(['task-1']))
    })

    it('updateNode should rebuild linkIndex when content changes', () => {
      const node1 = createTestTaskNode('task-1', 'Task 1')
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      // Initially no links
      expect(useNodesStore.getState().linkIndex.outgoing.get('task-1')).toEqual(
        new Set()
      )

      // Update content to add a link
      useNodesStore.getState().updateNode('task-1', {
        content: 'Now links to [[task-2]]',
      })

      // Link index should be updated
      expect(useNodesStore.getState().linkIndex.outgoing.get('task-1')).toEqual(
        new Set(['task-2'])
      )
      expect(useNodesStore.getState().linkIndex.incoming.get('task-2')).toEqual(
        new Set(['task-1'])
      )
    })

    it('updateNode should not rebuild linkIndex when content unchanged', () => {
      const node: TaskNode = {
        ...createTestTaskNode('task-1', 'Task 1'),
        content: 'Links to [[task-2]]',
      }
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useNodesStore.getState().addNode(node)
      useNodesStore.getState().addNode(node2)

      const indexBefore = useNodesStore.getState().linkIndex

      // Update title only (not content)
      useNodesStore.getState().updateNode('task-1', { title: 'New Title' })

      const indexAfter = useNodesStore.getState().linkIndex

      // Should be same reference since content didn't change
      expect(indexAfter).toBe(indexBefore)
    })

    it('deleteNode should rebuild linkIndex', () => {
      const node1: TaskNode = {
        ...createTestTaskNode('task-1', 'Task 1'),
        content: 'Links to [[task-2]]',
      }
      const node2 = createTestTaskNode('task-2', 'Task 2')

      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      // Delete the linked node
      useNodesStore.getState().deleteNode('task-2')

      const { linkIndex } = useNodesStore.getState()

      // task-1's outgoing link should now be empty (broken link not included)
      expect(linkIndex.outgoing.get('task-1')).toEqual(new Set())
      // task-2 should no longer be in the index
      expect(linkIndex.outgoing.has('task-2')).toBe(false)
      expect(linkIndex.incoming.has('task-2')).toBe(false)
    })

    it('setNodes should build linkIndex', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          {
            ...createTestTaskNode('task-1', 'Task 1'),
            content: 'Links to [[task-2]] and [[task-3]]',
          },
        ],
        ['task-2', createTestTaskNode('task-2', 'Task 2')],
        [
          'task-3',
          {
            ...createTestTaskNode('task-3', 'Task 3'),
            content: 'Links back to [[task-1]]',
          },
        ],
      ])

      useNodesStore.getState().setNodes(nodes)

      const { linkIndex } = useNodesStore.getState()

      expect(linkIndex.outgoing.get('task-1')).toEqual(
        new Set(['task-2', 'task-3'])
      )
      expect(linkIndex.outgoing.get('task-3')).toEqual(new Set(['task-1']))
      expect(linkIndex.incoming.get('task-1')).toEqual(new Set(['task-3']))
      expect(linkIndex.incoming.get('task-2')).toEqual(new Set(['task-1']))
      expect(linkIndex.incoming.get('task-3')).toEqual(new Set(['task-1']))
    })

    it('clearNodes should reset linkIndex', () => {
      const node: TaskNode = {
        ...createTestTaskNode('task-1', 'Task 1'),
        content: 'Links to [[task-2]]',
      }
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().addNode(createTestTaskNode('task-2', 'Task 2'))

      useNodesStore.getState().clearNodes()

      const { linkIndex } = useNodesStore.getState()

      expect(linkIndex.outgoing.size).toBe(0)
      expect(linkIndex.incoming.size).toBe(0)
    })

    it('rebuildLinkIndex should manually rebuild', () => {
      const node: TaskNode = {
        ...createTestTaskNode('task-1', 'Task 1'),
        content: 'Links to [[task-2]]',
      }
      useNodesStore.getState().addNode(node)
      useNodesStore.getState().addNode(createTestTaskNode('task-2', 'Task 2'))

      // Manually clear and rebuild
      useNodesStore.setState({
        linkIndex: { outgoing: new Map(), incoming: new Map() },
      })

      expect(useNodesStore.getState().linkIndex.outgoing.size).toBe(0)

      useNodesStore.getState().rebuildLinkIndex()

      expect(useNodesStore.getState().linkIndex.outgoing.get('task-1')).toEqual(
        new Set(['task-2'])
      )
    })

    describe('link selectors', () => {
      it('getOutgoingLinks should return outgoing links', () => {
        const node1: TaskNode = {
          ...createTestTaskNode('task-1', 'Task 1'),
          content: 'Links to [[task-2]] and [[task-3]]',
        }
        useNodesStore.getState().addNode(node1)
        useNodesStore.getState().addNode(createTestTaskNode('task-2', 'Task 2'))
        useNodesStore.getState().addNode(createTestTaskNode('task-3', 'Task 3'))

        const links = useNodesStore.getState().getOutgoingLinks('task-1')

        expect(links).toHaveLength(2)
        expect(links).toContain('task-2')
        expect(links).toContain('task-3')
      })

      it('getIncomingLinks should return backlinks', () => {
        const node1: TaskNode = {
          ...createTestTaskNode('task-1', 'Task 1'),
          content: 'Links to [[task-3]]',
        }
        const node2: TaskNode = {
          ...createTestTaskNode('task-2', 'Task 2'),
          content: 'Also links to [[task-3]]',
        }
        useNodesStore.getState().addNode(node1)
        useNodesStore.getState().addNode(node2)
        useNodesStore.getState().addNode(createTestTaskNode('task-3', 'Task 3'))

        const backlinks = useNodesStore.getState().getIncomingLinks('task-3')

        expect(backlinks).toHaveLength(2)
        expect(backlinks).toContain('task-1')
        expect(backlinks).toContain('task-2')
      })

      it('getOutgoingLinks should return empty for node with no links', () => {
        useNodesStore.getState().addNode(createTestTaskNode('task-1', 'Task 1'))

        expect(useNodesStore.getState().getOutgoingLinks('task-1')).toEqual([])
      })

      it('getIncomingLinks should return empty for node with no backlinks', () => {
        useNodesStore.getState().addNode(createTestTaskNode('task-1', 'Task 1'))

        expect(useNodesStore.getState().getIncomingLinks('task-1')).toEqual([])
      })
    })
  })

  // ==========================================================================
  // Store Subscription
  // ==========================================================================

  describe('store subscription', () => {
    it('should notify subscribers when nodes change', () => {
      const sizes: number[] = []

      const unsubscribe = useNodesStore.subscribe((state) => {
        sizes.push(state.nodes.size)
      })

      useNodesStore.getState().addNode(createTestTaskNode('task-1', 'Task 1'))
      useNodesStore.getState().addNode(createTestTaskNode('task-2', 'Task 2'))
      useNodesStore.getState().deleteNode('task-1')

      expect(sizes).toEqual([1, 2, 1])

      unsubscribe()
    })
  })

  // ==========================================================================
  // Container Node Support (Task 13.4)
  // ==========================================================================

  describe('container node support', () => {
    describe('getNodesByType for container types', () => {
      it('should return all subsystem nodes', () => {
        const subsystem1 = createTestSubsystemNode('sub-1', 'Subsystem 1')
        const subsystem2 = createTestSubsystemNode('sub-2', 'Subsystem 2')
        const task = createTestTaskNode('task-1', 'Task 1')

        useNodesStore.getState().addNode(subsystem1)
        useNodesStore.getState().addNode(subsystem2)
        useNodesStore.getState().addNode(task)

        const subsystems = useNodesStore
          .getState()
          .getNodesByType(NodeType.Subsystem)

        expect(subsystems).toHaveLength(2)
        expect(subsystems.map((n) => n.id).sort()).toEqual(['sub-1', 'sub-2'])
      })

      it('should return all assembly nodes', () => {
        const assembly1 = createTestAssemblyNode('asm-1', 'Assembly 1')
        const assembly2 = createTestAssemblyNode('asm-2', 'Assembly 2')

        useNodesStore.getState().addNode(assembly1)
        useNodesStore.getState().addNode(assembly2)

        const assemblies = useNodesStore
          .getState()
          .getNodesByType(NodeType.Assembly)

        expect(assemblies).toHaveLength(2)
        expect(assemblies.map((n) => n.id).sort()).toEqual(['asm-1', 'asm-2'])
      })

      it('should return all module nodes', () => {
        const module1 = createTestModuleNode('mod-1', 'Module 1')
        const module2 = createTestModuleNode('mod-2', 'Module 2')

        useNodesStore.getState().addNode(module1)
        useNodesStore.getState().addNode(module2)

        const modules = useNodesStore.getState().getNodesByType(NodeType.Module)

        expect(modules).toHaveLength(2)
        expect(modules.map((n) => n.id).sort()).toEqual(['mod-1', 'mod-2'])
      })

      it('should include container types in getNodeCountsByType', () => {
        useNodesStore
          .getState()
          .addNode(createTestSubsystemNode('sub-1', 'Subsystem'))
        useNodesStore
          .getState()
          .addNode(createTestAssemblyNode('asm-1', 'Assembly'))
        useNodesStore
          .getState()
          .addNode(createTestModuleNode('mod-1', 'Module'))
        useNodesStore.getState().addNode(createTestTaskNode('task-1', 'Task'))

        const counts = useNodesStore.getState().getNodeCountsByType()

        expect(counts.subsystem).toBe(1)
        expect(counts.assembly).toBe(1)
        expect(counts.module).toBe(1)
        expect(counts.task).toBe(1)
      })
    })

    describe('getChildNodes', () => {
      it('should return all nodes with matching parent field', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Motion System')
        const task1 = {
          ...createTestTaskNode('task-1', 'Task 1'),
          parent: 'sub-1',
        }
        const task2 = {
          ...createTestTaskNode('task-2', 'Task 2'),
          parent: 'sub-1',
        }
        const task3 = createTestTaskNode('task-3', 'Task 3') // No parent

        useNodesStore.getState().addNode(subsystem)
        useNodesStore.getState().addNode(task1)
        useNodesStore.getState().addNode(task2)
        useNodesStore.getState().addNode(task3)

        const children = useNodesStore.getState().getChildNodes('sub-1')

        expect(children).toHaveLength(2)
        expect(children.map((n) => n.id).sort()).toEqual(['task-1', 'task-2'])
      })

      it('should return empty array when no children exist', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Empty Subsystem')
        const task = createTestTaskNode('task-1', 'Task 1')

        useNodesStore.getState().addNode(subsystem)
        useNodesStore.getState().addNode(task)

        const children = useNodesStore.getState().getChildNodes('sub-1')

        expect(children).toHaveLength(0)
      })

      it('should return empty array for non-existent parent', () => {
        const children = useNodesStore
          .getState()
          .getChildNodes('non-existent-parent')

        expect(children).toHaveLength(0)
      })

      it('should include all node types with parent field', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Main Subsystem')
        const task = {
          ...createTestTaskNode('task-1', 'Child Task'),
          parent: 'sub-1',
        }
        const component = {
          ...createTestComponentNode('comp-1', 'Child Component'),
          parent: 'sub-1',
        }
        const decision = {
          ...createTestDecisionNode('dec-1', 'Child Decision'),
          parent: 'sub-1',
        }
        const note = {
          ...createTestNoteNode('note-1', 'Child Note'),
          parent: 'sub-1',
        }

        useNodesStore.getState().addNode(subsystem)
        useNodesStore.getState().addNode(task)
        useNodesStore.getState().addNode(component)
        useNodesStore.getState().addNode(decision)
        useNodesStore.getState().addNode(note)

        const children = useNodesStore.getState().getChildNodes('sub-1')

        expect(children).toHaveLength(4)
        expect(children.map((n) => n.type).sort()).toEqual([
          'component',
          'decision',
          'note',
          'task',
        ])
      })

      it('should support assemblies and modules as parents', () => {
        const assembly = createTestAssemblyNode('asm-1', 'Test Assembly')
        const module = createTestModuleNode('mod-1', 'Test Module')
        const task1 = {
          ...createTestTaskNode('task-1', 'Task under Assembly'),
          parent: 'asm-1',
        }
        const task2 = {
          ...createTestTaskNode('task-2', 'Task under Module'),
          parent: 'mod-1',
        }

        useNodesStore.getState().addNode(assembly)
        useNodesStore.getState().addNode(module)
        useNodesStore.getState().addNode(task1)
        useNodesStore.getState().addNode(task2)

        const assemblyChildren = useNodesStore.getState().getChildNodes('asm-1')
        const moduleChildren = useNodesStore.getState().getChildNodes('mod-1')

        expect(assemblyChildren).toHaveLength(1)
        expect(assemblyChildren[0].id).toBe('task-1')

        expect(moduleChildren).toHaveLength(1)
        expect(moduleChildren[0].id).toBe('task-2')
      })
    })

    describe('container node CRUD operations', () => {
      it('should add container nodes correctly', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Test Subsystem')
        const assembly = createTestAssemblyNode('asm-1', 'Test Assembly')
        const module = createTestModuleNode('mod-1', 'Test Module')

        useNodesStore.getState().addNode(subsystem)
        useNodesStore.getState().addNode(assembly)
        useNodesStore.getState().addNode(module)

        expect(useNodesStore.getState().getNodeById('sub-1')).toEqual(subsystem)
        expect(useNodesStore.getState().getNodeById('asm-1')).toEqual(assembly)
        expect(useNodesStore.getState().getNodeById('mod-1')).toEqual(module)
      })

      it('should update container node status', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Test Subsystem')
        useNodesStore.getState().addNode(subsystem)

        useNodesStore.getState().updateNode('sub-1', {
          status: 'in_progress',
        })

        const updated = useNodesStore.getState().getNodeById('sub-1')
        expect((updated as SubsystemNode).status).toBe('in_progress')
      })

      it('should delete container nodes', () => {
        const subsystem = createTestSubsystemNode('sub-1', 'Test Subsystem')
        useNodesStore.getState().addNode(subsystem)

        expect(useNodesStore.getState().hasNode('sub-1')).toBe(true)

        useNodesStore.getState().deleteNode('sub-1')

        expect(useNodesStore.getState().hasNode('sub-1')).toBe(false)
      })
    })
  })
})
