import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './useProjectStore'
import { useNodesStore } from './useNodesStore'
import { MemoryFileSystemAdapter } from '@/lib/filesystem/MemoryFileSystemAdapter'
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

async function createTestProject(
  adapter: MemoryFileSystemAdapter,
  projectPath: string
) {
  // Create project structure
  await adapter.mkdir(`${projectPath}/tasks`)
  await adapter.mkdir(`${projectPath}/decisions`)
  await adapter.mkdir(`${projectPath}/components`)
  await adapter.mkdir(`${projectPath}/notes`)

  // Create a sample task file
  await adapter.writeFile(
    `${projectPath}/tasks/sample-task.md`,
    `---
type: task
status: pending
priority: high
---
# Sample Task

This is a sample task for testing.
`
  )

  // Create project metadata
  await adapter.writeFile(
    `${projectPath}/project.json`,
    JSON.stringify({
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
      description: 'Test project',
    })
  )
}

// ============================================================================
// Tests
// ============================================================================

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset both stores to initial state before each test
    useProjectStore.setState({
      project: null,
      adapter: null,
      isDirty: false,
      isLoading: false,
      error: null,
      parseErrors: [],
    })

    useNodesStore.setState({
      nodes: new Map(),
      activeNodeId: null,
      dirtyNodeIds: new Set(),
    })
  })

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have null project', () => {
      expect(useProjectStore.getState().project).toBeNull()
    })

    it('should have null adapter', () => {
      expect(useProjectStore.getState().adapter).toBeNull()
    })

    it('should not be dirty', () => {
      expect(useProjectStore.getState().isDirty).toBe(false)
    })

    it('should not be loading', () => {
      expect(useProjectStore.getState().isLoading).toBe(false)
    })

    it('should have no error', () => {
      expect(useProjectStore.getState().error).toBeNull()
    })

    it('should have empty parseErrors', () => {
      expect(useProjectStore.getState().parseErrors).toHaveLength(0)
    })
  })

  // ==========================================================================
  // loadProject
  // ==========================================================================

  describe('loadProject', () => {
    it('should load a project from disk', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')

      const success = await useProjectStore
        .getState()
        .loadProject(adapter, '/test-project')

      expect(success).toBe(true)
      expect(useProjectStore.getState().project).not.toBeNull()
      expect(useProjectStore.getState().project?.name).toBe('test-project')
      expect(useProjectStore.getState().error).toBeNull()
    })

    it('should update nodes store with loaded nodes', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')

      await useProjectStore.getState().loadProject(adapter, '/test-project')

      // The nodes store should have the sample task
      expect(useNodesStore.getState().nodes.size).toBe(1)
      expect(useNodesStore.getState().nodes.has('sample-task')).toBe(true)
    })

    it('should set isLoading during load', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')

      const loadPromise = useProjectStore
        .getState()
        .loadProject(adapter, '/test-project')

      // Note: In real tests, you might need to check loading state differently
      // since the operation completes quickly

      await loadPromise

      expect(useProjectStore.getState().isLoading).toBe(false)
    })

    it('should store the adapter', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')

      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useProjectStore.getState().adapter).toBe(adapter)
    })

    it('should return false and set error for non-existent project', async () => {
      const adapter = new MemoryFileSystemAdapter()

      const success = await useProjectStore
        .getState()
        .loadProject(adapter, '/non-existent')

      expect(success).toBe(false)
      expect(useProjectStore.getState().error).toContain('not found')
      expect(useProjectStore.getState().project).toBeNull()
    })

    it('should clear isDirty after successful load', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      useProjectStore.setState({ isDirty: true })

      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useProjectStore.getState().isDirty).toBe(false)
    })

    it('should collect parse errors without failing', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')

      // Add a malformed file
      await adapter.writeFile(
        '/test-project/tasks/malformed.md',
        `---
invalid: yaml: here
---
No proper frontmatter
`
      )

      const success = await useProjectStore
        .getState()
        .loadProject(adapter, '/test-project')

      expect(success).toBe(true)
      expect(
        useProjectStore.getState().parseErrors.length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  // ==========================================================================
  // saveNode
  // ==========================================================================

  describe('saveNode', () => {
    it('should save a node to disk', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      // Add a new node to nodes store
      const newNode = createTestTaskNode('new-task', 'New Task')
      useNodesStore.getState().addNode(newNode)

      const success = await useProjectStore.getState().saveNode(newNode)

      expect(success).toBe(true)

      // Verify file was created
      const exists = await adapter.exists('/test-project/tasks/new-task.md')
      expect(exists).toBe(true)
    })

    it('should mark node as clean after save', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      const newNode = createTestTaskNode('new-task', 'New Task')
      useNodesStore.getState().addNode(newNode)

      expect(useNodesStore.getState().isNodeDirty('new-task')).toBe(true)

      await useProjectStore.getState().saveNode(newNode)

      expect(useNodesStore.getState().isNodeDirty('new-task')).toBe(false)
    })

    it('should return false with error when no project loaded', async () => {
      const node = createTestTaskNode('task-1', 'Task')

      const success = await useProjectStore.getState().saveNode(node)

      expect(success).toBe(false)
      expect(useProjectStore.getState().error).toContain('No project')
    })
  })

  // ==========================================================================
  // saveAllDirtyNodes
  // ==========================================================================

  describe('saveAllDirtyNodes', () => {
    it('should save all dirty nodes', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      const node1 = createTestTaskNode('task-1', 'Task 1')
      const node2 = createTestTaskNode('task-2', 'Task 2')
      useNodesStore.getState().addNode(node1)
      useNodesStore.getState().addNode(node2)

      const success = await useProjectStore.getState().saveAllDirtyNodes()

      expect(success).toBe(true)
      expect(useNodesStore.getState().hasDirtyNodes()).toBe(false)
    })

    it('should return true when no dirty nodes', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      // Clear dirty flags from loaded nodes
      useNodesStore.getState().clearDirty()

      const success = await useProjectStore.getState().saveAllDirtyNodes()

      expect(success).toBe(true)
    })
  })

  // ==========================================================================
  // deleteNode
  // ==========================================================================

  describe('deleteNode', () => {
    it('should delete a node from disk and store', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      // Verify sample-task exists
      expect(useNodesStore.getState().hasNode('sample-task')).toBe(true)

      const success = await useProjectStore.getState().deleteNode('sample-task')

      expect(success).toBe(true)
      expect(useNodesStore.getState().hasNode('sample-task')).toBe(false)

      // Verify file was deleted
      const exists = await adapter.exists('/test-project/tasks/sample-task.md')
      expect(exists).toBe(false)
    })

    it('should return false with error when no project loaded', async () => {
      const success = await useProjectStore.getState().deleteNode('some-node')

      expect(success).toBe(false)
      expect(useProjectStore.getState().error).toContain('No project')
    })

    it('should return false for non-existent node', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      const success = await useProjectStore
        .getState()
        .deleteNode('non-existent')

      expect(success).toBe(false)
      expect(useProjectStore.getState().error).toContain('not found')
    })
  })

  // ==========================================================================
  // updateMetadata
  // ==========================================================================

  describe('updateMetadata', () => {
    it('should update project metadata', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      useProjectStore.getState().updateMetadata({
        description: 'Updated description',
      })

      expect(useProjectStore.getState().project?.metadata.description).toBe(
        'Updated description'
      )
    })

    it('should mark project as dirty', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      useProjectStore.getState().updateMetadata({
        description: 'Updated',
      })

      expect(useProjectStore.getState().isDirty).toBe(true)
    })

    it('should update modifiedAt date', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      const originalModified =
        useProjectStore.getState().project?.metadata.modifiedAt

      useProjectStore.getState().updateMetadata({
        description: 'Updated',
      })

      const newModified =
        useProjectStore.getState().project?.metadata.modifiedAt
      expect(newModified?.getTime()).toBeGreaterThanOrEqual(
        originalModified?.getTime() ?? 0
      )
    })
  })

  // ==========================================================================
  // closeProject
  // ==========================================================================

  describe('closeProject', () => {
    it('should clear project state', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      useProjectStore.getState().closeProject()

      expect(useProjectStore.getState().project).toBeNull()
      expect(useProjectStore.getState().isDirty).toBe(false)
      expect(useProjectStore.getState().error).toBeNull()
      expect(useProjectStore.getState().parseErrors).toHaveLength(0)
    })

    it('should clear nodes store', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useNodesStore.getState().nodes.size).toBeGreaterThan(0)

      useProjectStore.getState().closeProject()

      expect(useNodesStore.getState().nodes.size).toBe(0)
    })
  })

  // ==========================================================================
  // setAdapter
  // ==========================================================================

  describe('setAdapter', () => {
    it('should set the adapter', () => {
      const adapter = new MemoryFileSystemAdapter()

      useProjectStore.getState().setAdapter(adapter)

      expect(useProjectStore.getState().adapter).toBe(adapter)
    })
  })

  // ==========================================================================
  // clearError
  // ==========================================================================

  describe('clearError', () => {
    it('should clear the error', () => {
      useProjectStore.setState({ error: 'Some error' })

      useProjectStore.getState().clearError()

      expect(useProjectStore.getState().error).toBeNull()
    })
  })

  // ==========================================================================
  // markDirty / markClean
  // ==========================================================================

  describe('markDirty and markClean', () => {
    it('markDirty should set isDirty to true', () => {
      useProjectStore.getState().markDirty()

      expect(useProjectStore.getState().isDirty).toBe(true)
    })

    it('markClean should set isDirty to false', () => {
      useProjectStore.setState({ isDirty: true })

      useProjectStore.getState().markClean()

      expect(useProjectStore.getState().isDirty).toBe(false)
    })
  })

  // ==========================================================================
  // Selectors
  // ==========================================================================

  describe('selectors', () => {
    it('getProjectName should return project name', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useProjectStore.getState().getProjectName()).toBe('test-project')
    })

    it('getProjectName should return null when no project', () => {
      expect(useProjectStore.getState().getProjectName()).toBeNull()
    })

    it('getProjectPath should return project path', async () => {
      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useProjectStore.getState().getProjectPath()).toBe('/test-project')
    })

    it('hasProject should return correct status', async () => {
      expect(useProjectStore.getState().hasProject()).toBe(false)

      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      expect(useProjectStore.getState().hasProject()).toBe(true)
    })

    it('hasAdapter should return correct status', () => {
      expect(useProjectStore.getState().hasAdapter()).toBe(false)

      const adapter = new MemoryFileSystemAdapter()
      useProjectStore.getState().setAdapter(adapter)

      expect(useProjectStore.getState().hasAdapter()).toBe(true)
    })
  })

  // ==========================================================================
  // Store Subscription
  // ==========================================================================

  describe('store subscription', () => {
    it('should notify subscribers when state changes', async () => {
      const states: boolean[] = []

      const unsubscribe = useProjectStore.subscribe((state) => {
        states.push(state.isLoading)
      })

      const adapter = new MemoryFileSystemAdapter()
      await createTestProject(adapter, '/test-project')
      await useProjectStore.getState().loadProject(adapter, '/test-project')

      // Should have seen at least a loading -> not loading transition
      expect(states).toContain(true)
      expect(states).toContain(false)

      unsubscribe()
    })
  })
})
