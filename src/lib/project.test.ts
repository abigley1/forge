/**
 * Project Loading & Saving Tests
 *
 * Comprehensive tests for project operations including:
 * - slugify and generateNodeId utilities
 * - Directory and path utilities
 * - Node serialization and deserialization
 * - Project loading and saving
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryFileSystemAdapter } from './filesystem/MemoryFileSystemAdapter'
import {
  slugify,
  generateNodeId,
  getDirectoryForNodeType,
  getNodeTypeForDirectory,
  getNodeFilePath,
  getNodeIdFromPath,
  serializeNode,
  loadNode,
  loadProject,
  saveNode,
  deleteNode,
  saveProjectMetadata,
  initializeProject,
} from './project'
import { NodeType, createNodeDates } from '../types/nodes'
import type {
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '../types/nodes'
import { createProjectMetadata } from '../types/project'

// ============================================================================
// Test Helpers
// ============================================================================

function createTestTaskNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'test-task',
    type: NodeType.Task,
    title: 'Test Task',
    tags: ['test'],
    dates: createNodeDates(),
    content: 'Task content',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    ...overrides,
  }
}

function createTestDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'test-decision',
    type: NodeType.Decision,
    title: 'Test Decision',
    tags: [],
    dates: createNodeDates(),
    content: 'Decision content',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    ...overrides,
  }
}

function createTestComponentNode(
  overrides: Partial<ComponentNode> = {}
): ComponentNode {
  return {
    id: 'test-component',
    type: NodeType.Component,
    title: 'Test Component',
    tags: [],
    dates: createNodeDates(),
    content: 'Component content',
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    ...overrides,
  }
}

function createTestNoteNode(overrides: Partial<NoteNode> = {}): NoteNode {
  return {
    id: 'test-note',
    type: NodeType.Note,
    title: 'Test Note',
    tags: [],
    dates: createNodeDates(),
    content: 'Note content',
    ...overrides,
  }
}

// ============================================================================
// slugify Tests
// ============================================================================

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('UPPERCASE')).toBe('uppercase')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
    expect(slugify('multiple   spaces')).toBe('multiple-spaces')
  })

  it('should replace underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world')
    expect(slugify('snake_case_text')).toBe('snake-case-text')
  })

  it('should remove special characters', () => {
    expect(slugify('hello!@#$%world')).toBe('helloworld')
    expect(slugify('test (with) [brackets]')).toBe('test-with-brackets')
  })

  it('should collapse multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world')
    expect(slugify('a - b - c')).toBe('a-b-c')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello')
    expect(slugify('---test---')).toBe('test')
  })

  it('should handle empty strings', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
  })

  it('should handle strings that become empty', () => {
    expect(slugify('!@#$%')).toBe('')
    expect(slugify('...')).toBe('')
  })

  it('should handle unicode characters', () => {
    expect(slugify('café')).toBe('caf')
    expect(slugify('naïve')).toBe('nave')
  })

  it('should handle numbers', () => {
    expect(slugify('test123')).toBe('test123')
    expect(slugify('123test')).toBe('123test')
    expect(slugify('test 123 test')).toBe('test-123-test')
  })
})

// ============================================================================
// generateNodeId Tests
// ============================================================================

describe('generateNodeId', () => {
  it('should generate slug from title', () => {
    const existing = new Set<string>()
    expect(generateNodeId('My Task', existing)).toBe('my-task')
  })

  it('should return untitled for empty title', () => {
    const existing = new Set<string>()
    expect(generateNodeId('', existing)).toBe('untitled')
  })

  it('should append number for duplicates', () => {
    const existing = new Set(['my-task'])
    expect(generateNodeId('My Task', existing)).toBe('my-task-2')
  })

  it('should keep incrementing for multiple duplicates', () => {
    const existing = new Set(['my-task', 'my-task-2', 'my-task-3'])
    expect(generateNodeId('My Task', existing)).toBe('my-task-4')
  })

  it('should not modify if no collision', () => {
    const existing = new Set(['other-task'])
    expect(generateNodeId('My Task', existing)).toBe('my-task')
  })
})

// ============================================================================
// Directory Utility Tests
// ============================================================================

describe('getDirectoryForNodeType', () => {
  it('should return correct directory for each type', () => {
    expect(getDirectoryForNodeType(NodeType.Decision)).toBe('decisions')
    expect(getDirectoryForNodeType(NodeType.Component)).toBe('components')
    expect(getDirectoryForNodeType(NodeType.Task)).toBe('tasks')
    expect(getDirectoryForNodeType(NodeType.Note)).toBe('notes')
  })
})

describe('getNodeTypeForDirectory', () => {
  it('should return correct type for each directory', () => {
    expect(getNodeTypeForDirectory('decisions')).toBe(NodeType.Decision)
    expect(getNodeTypeForDirectory('components')).toBe(NodeType.Component)
    expect(getNodeTypeForDirectory('tasks')).toBe(NodeType.Task)
    expect(getNodeTypeForDirectory('notes')).toBe(NodeType.Note)
  })

  it('should return undefined for unknown directory', () => {
    expect(getNodeTypeForDirectory('unknown')).toBeUndefined()
    expect(getNodeTypeForDirectory('files')).toBeUndefined()
  })
})

// ============================================================================
// Path Utility Tests
// ============================================================================

describe('getNodeFilePath', () => {
  it('should generate correct path for task node', () => {
    const node = createTestTaskNode({ id: 'my-task' })
    expect(getNodeFilePath('/project', node)).toBe('/project/tasks/my-task.md')
  })

  it('should generate correct path for decision node', () => {
    const node = createTestDecisionNode({ id: 'my-decision' })
    expect(getNodeFilePath('/project', node)).toBe(
      '/project/decisions/my-decision.md'
    )
  })

  it('should generate correct path for component node', () => {
    const node = createTestComponentNode({ id: 'my-component' })
    expect(getNodeFilePath('/project', node)).toBe(
      '/project/components/my-component.md'
    )
  })

  it('should generate correct path for note node', () => {
    const node = createTestNoteNode({ id: 'my-note' })
    expect(getNodeFilePath('/project', node)).toBe('/project/notes/my-note.md')
  })
})

describe('getNodeIdFromPath', () => {
  it('should extract ID from file path', () => {
    expect(getNodeIdFromPath('/project/tasks/my-task.md')).toBe('my-task')
    expect(getNodeIdFromPath('/project/decisions/motor-selection.md')).toBe(
      'motor-selection'
    )
  })

  it('should handle paths without directories', () => {
    expect(getNodeIdFromPath('my-task.md')).toBe('my-task')
  })

  it('should handle paths without extension', () => {
    expect(getNodeIdFromPath('/project/tasks/my-task')).toBe('my-task')
  })
})

// ============================================================================
// serializeNode Tests
// ============================================================================

describe('serializeNode', () => {
  it('should serialize task node correctly', () => {
    const node = createTestTaskNode({
      id: 'my-task',
      title: 'My Task',
      content: 'Task description',
      status: 'pending',
      priority: 'high',
      tags: ['important'],
    })

    const content = serializeNode(node)

    expect(content).toContain('---')
    expect(content).toContain('type: task')
    expect(content).toContain('status: pending')
    expect(content).toContain('priority: high')
    expect(content).toContain('tags: ["important"]')
    expect(content).toContain('# My Task')
    expect(content).toContain('Task description')
  })

  it('should serialize task with dependencies', () => {
    const node = createTestTaskNode({
      dependsOn: ['task-a', 'task-b'],
      blocks: ['task-c'],
    })

    const content = serializeNode(node)

    expect(content).toContain('depends_on: ["task-a", "task-b"]')
    expect(content).toContain('blocks: ["task-c"]')
  })

  it('should serialize decision node with options', () => {
    const node = createTestDecisionNode({
      status: 'selected',
      selected: 'opt-1',
      options: [{ id: 'opt-1', name: 'Option 1', values: { cost: 100 } }],
      criteria: [{ id: 'crit-1', name: 'Cost', weight: 8, unit: '$' }],
    })

    const content = serializeNode(node)

    expect(content).toContain('type: decision')
    expect(content).toContain('status: selected')
    expect(content).toContain('selected: opt-1')
    expect(content).toContain('options:')
    expect(content).toContain('criteria:')
  })

  it('should serialize component node with fields', () => {
    const node = createTestComponentNode({
      cost: 49.99,
      supplier: 'Acme Corp',
      partNumber: 'ACME-123',
      customFields: { voltage: 12 },
    })

    const content = serializeNode(node)

    expect(content).toContain('type: component')
    expect(content).toContain('cost: 49.99')
    expect(content).toContain('supplier: Acme Corp')
    expect(content).toContain('partNumber: ACME-123')
    expect(content).toContain('customFields:')
  })

  it('should serialize note node', () => {
    const node = createTestNoteNode({
      title: 'My Note',
      content: 'Note content here',
      tags: ['research'],
    })

    const content = serializeNode(node)

    expect(content).toContain('type: note')
    expect(content).toContain('# My Note')
    expect(content).toContain('Note content here')
  })
})

// ============================================================================
// loadNode Tests
// ============================================================================

describe('loadNode', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should load a valid task node', async () => {
    const content = `---
type: task
status: pending
priority: high
tags: ["important"]
---

# My Task

Task description here.
`
    await fs.writeFile('/project/tasks/my-task.md', content)

    const result = await loadNode(fs, '/project/tasks/my-task.md')

    expect(result.error).toBeNull()
    expect(result.node).not.toBeNull()
    expect(result.node?.type).toBe(NodeType.Task)
    expect(result.node?.id).toBe('my-task')
    expect(result.node?.title).toBe('My Task')
    expect((result.node as TaskNode)?.status).toBe('pending')
    expect((result.node as TaskNode)?.priority).toBe('high')
    expect(result.node?.tags).toEqual(['important'])
  })

  it('should load a valid decision node', async () => {
    const content = `---
type: decision
status: pending
---

# Motor Selection

Deciding on motor.
`
    await fs.writeFile('/project/decisions/motor-selection.md', content)

    const result = await loadNode(fs, '/project/decisions/motor-selection.md')

    expect(result.error).toBeNull()
    expect(result.node?.type).toBe(NodeType.Decision)
    expect(result.node?.id).toBe('motor-selection')
  })

  it('should return error for invalid frontmatter', async () => {
    const content = `---
type: invalid-type
---

# Bad Node
`
    await fs.writeFile('/project/tasks/bad-node.md', content)

    const result = await loadNode(fs, '/project/tasks/bad-node.md')

    expect(result.node).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.message).toContain('Invalid node type')
  })

  it('should return error for malformed YAML', async () => {
    const content = `---
type: task
status: [invalid yaml
---

# Bad YAML
`
    await fs.writeFile('/project/tasks/bad-yaml.md', content)

    const result = await loadNode(fs, '/project/tasks/bad-yaml.md')

    expect(result.node).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.message).toContain('parse')
  })

  it('should return error for non-existent file', async () => {
    const result = await loadNode(fs, '/project/tasks/nonexistent.md')

    expect(result.node).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.path).toBe('/project/tasks/nonexistent.md')
  })

  it('should use filename as ID even if content has different title', async () => {
    const content = `---
type: note
---

# Different Title
`
    await fs.writeFile('/project/notes/file-id.md', content)

    const result = await loadNode(fs, '/project/notes/file-id.md')

    expect(result.node?.id).toBe('file-id')
    expect(result.node?.title).toBe('Different Title')
  })

  it('should handle task with depends_on snake_case', async () => {
    const content = `---
type: task
status: blocked
priority: medium
depends_on: ["task-a", "task-b"]
---

# Dependent Task
`
    await fs.writeFile('/project/tasks/dependent-task.md', content)

    const result = await loadNode(fs, '/project/tasks/dependent-task.md')

    expect(result.node).not.toBeNull()
    expect((result.node as TaskNode)?.dependsOn).toEqual(['task-a', 'task-b'])
  })
})

// ============================================================================
// loadProject Tests
// ============================================================================

describe('loadProject', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should load an empty project', async () => {
    await fs.mkdir('/project')
    await fs.mkdir('/project/decisions')
    await fs.mkdir('/project/components')
    await fs.mkdir('/project/tasks')
    await fs.mkdir('/project/notes')

    const result = await loadProject(fs, '/project')

    expect(result.error).toBeNull()
    expect(result.project).not.toBeNull()
    expect(result.project?.nodes.size).toBe(0)
    expect(result.parseErrors).toHaveLength(0)
  })

  it('should load project with nodes', async () => {
    await fs.mkdir('/project')

    await fs.writeFile(
      '/project/tasks/task-1.md',
      `---
type: task
status: pending
priority: medium
---

# Task 1
`
    )

    await fs.writeFile(
      '/project/notes/note-1.md',
      `---
type: note
---

# Note 1
`
    )

    const result = await loadProject(fs, '/project')

    expect(result.error).toBeNull()
    expect(result.project?.nodes.size).toBe(2)
    expect(result.project?.nodes.get('task-1')?.type).toBe(NodeType.Task)
    expect(result.project?.nodes.get('note-1')?.type).toBe(NodeType.Note)
  })

  it('should collect parse errors without failing', async () => {
    await fs.mkdir('/project')

    // Valid node
    await fs.writeFile(
      '/project/tasks/valid.md',
      `---
type: task
status: pending
priority: medium
---

# Valid Task
`
    )

    // Invalid node
    await fs.writeFile(
      '/project/tasks/invalid.md',
      `---
type: invalid
---

# Invalid
`
    )

    const result = await loadProject(fs, '/project')

    expect(result.error).toBeNull()
    expect(result.project?.nodes.size).toBe(1)
    expect(result.parseErrors.length).toBeGreaterThan(0)
    expect(result.parseErrors[0].path).toContain('invalid.md')
  })

  it('should detect node type mismatch', async () => {
    await fs.mkdir('/project')

    // Task in wrong directory
    await fs.writeFile(
      '/project/decisions/task-in-wrong-dir.md',
      `---
type: task
status: pending
priority: medium
---

# Task in Wrong Directory
`
    )

    const result = await loadProject(fs, '/project')

    expect(
      result.parseErrors.some((e) => e.message.includes('type mismatch'))
    ).toBe(true)
  })

  it('should load project metadata from project.json', async () => {
    await fs.mkdir('/project')
    await fs.writeFile(
      '/project/project.json',
      JSON.stringify({
        createdAt: '2026-01-01T00:00:00Z',
        modifiedAt: '2026-01-15T00:00:00Z',
        description: 'Test project description',
        nodeOrder: ['a', 'b', 'c'],
      })
    )

    const result = await loadProject(fs, '/project')

    expect(result.project?.metadata.description).toBe(
      'Test project description'
    )
    expect(result.project?.metadata.nodeOrder).toEqual(['a', 'b', 'c'])
  })

  it('should return error for non-existent project', async () => {
    const result = await loadProject(fs, '/nonexistent')

    expect(result.project).toBeNull()
    expect(result.error).toContain('not found')
  })

  it('should extract project name from path', async () => {
    await fs.mkdir('/my-awesome-project')

    const result = await loadProject(fs, '/my-awesome-project')

    expect(result.project?.name).toBe('my-awesome-project')
    expect(result.project?.id).toBe('my-awesome-project')
  })

  it('should skip missing node type directories gracefully', async () => {
    await fs.mkdir('/project')
    // Only create tasks directory
    await fs.mkdir('/project/tasks')
    await fs.writeFile(
      '/project/tasks/task-1.md',
      `---
type: task
status: pending
priority: medium
---

# Task 1
`
    )

    const result = await loadProject(fs, '/project')

    expect(result.error).toBeNull()
    expect(result.project?.nodes.size).toBe(1)
  })
})

// ============================================================================
// saveNode Tests
// ============================================================================

describe('saveNode', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should save a task node to the correct directory', async () => {
    await fs.mkdir('/project')

    const node = createTestTaskNode({ id: 'my-task', title: 'My Task' })
    const result = await saveNode(fs, '/project', node)

    expect(result.success).toBe(true)
    expect(result.path).toBe('/project/tasks/my-task.md')
    expect(await fs.exists('/project/tasks/my-task.md')).toBe(true)
  })

  it('should save a decision node to the correct directory', async () => {
    await fs.mkdir('/project')

    const node = createTestDecisionNode({ id: 'motor-choice' })
    const result = await saveNode(fs, '/project', node)

    expect(result.success).toBe(true)
    expect(result.path).toBe('/project/decisions/motor-choice.md')
  })

  it('should create directory if it does not exist', async () => {
    await fs.mkdir('/project')
    // Don't create tasks directory

    const node = createTestTaskNode({ id: 'new-task' })
    const result = await saveNode(fs, '/project', node)

    expect(result.success).toBe(true)
    expect(await fs.exists('/project/tasks')).toBe(true)
  })

  it('should overwrite existing file', async () => {
    await fs.mkdir('/project')

    const node1 = createTestTaskNode({ id: 'my-task', title: 'Original Title' })
    await saveNode(fs, '/project', node1)

    const node2 = createTestTaskNode({ id: 'my-task', title: 'Updated Title' })
    const result = await saveNode(fs, '/project', node2)

    expect(result.success).toBe(true)
    const content = await fs.readFile('/project/tasks/my-task.md')
    expect(content).toContain('Updated Title')
  })

  it('should round-trip a node correctly', async () => {
    await fs.mkdir('/project')

    const originalNode = createTestTaskNode({
      id: 'round-trip',
      title: 'Round Trip Test',
      content: 'Original content',
      status: 'in_progress',
      priority: 'high',
      tags: ['test', 'important'],
      dependsOn: ['dep-1'],
    })

    await saveNode(fs, '/project', originalNode)
    const loadResult = await loadNode(fs, '/project/tasks/round-trip.md')

    expect(loadResult.node?.id).toBe(originalNode.id)
    expect(loadResult.node?.title).toBe(originalNode.title)
    expect((loadResult.node as TaskNode)?.status).toBe(originalNode.status)
    expect((loadResult.node as TaskNode)?.priority).toBe(originalNode.priority)
    expect(loadResult.node?.tags).toEqual(originalNode.tags)
    expect((loadResult.node as TaskNode)?.dependsOn).toEqual(
      originalNode.dependsOn
    )
  })
})

// ============================================================================
// deleteNode Tests
// ============================================================================

describe('deleteNode', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should delete an existing node', async () => {
    await fs.mkdir('/project')
    const node = createTestTaskNode({ id: 'to-delete' })
    await saveNode(fs, '/project', node)

    expect(await fs.exists('/project/tasks/to-delete.md')).toBe(true)

    const result = await deleteNode(fs, '/project', node)

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(await fs.exists('/project/tasks/to-delete.md')).toBe(false)
  })

  it('should return success for already deleted node', async () => {
    await fs.mkdir('/project')
    const node = createTestTaskNode({ id: 'nonexistent' })

    const result = await deleteNode(fs, '/project', node)

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })
})

// ============================================================================
// saveProjectMetadata Tests
// ============================================================================

describe('saveProjectMetadata', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should save project metadata', async () => {
    await fs.mkdir('/project')

    const metadata = createProjectMetadata('Test project')
    metadata.nodeOrder = ['a', 'b', 'c']
    metadata.nodePositions = { a: { x: 100, y: 200 } }

    await saveProjectMetadata(fs, '/project', metadata)

    expect(await fs.exists('/project/project.json')).toBe(true)

    const content = await fs.readFile('/project/project.json')
    const parsed = JSON.parse(content)

    expect(parsed.description).toBe('Test project')
    expect(parsed.nodeOrder).toEqual(['a', 'b', 'c'])
    expect(parsed.nodePositions).toEqual({ a: { x: 100, y: 200 } })
  })
})

// ============================================================================
// initializeProject Tests
// ============================================================================

describe('initializeProject', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should create project directory structure', async () => {
    await initializeProject(
      fs,
      '/new-project',
      'New Project',
      'A new test project'
    )

    expect(await fs.exists('/new-project')).toBe(true)
    expect(await fs.exists('/new-project/decisions')).toBe(true)
    expect(await fs.exists('/new-project/components')).toBe(true)
    expect(await fs.exists('/new-project/tasks')).toBe(true)
    expect(await fs.exists('/new-project/notes')).toBe(true)
    expect(await fs.exists('/new-project/project.json')).toBe(true)
  })

  it('should return correct project object', async () => {
    const project = await initializeProject(
      fs,
      '/my-project',
      'My Project',
      'Description'
    )

    expect(project.id).toBe('my-project')
    expect(project.name).toBe('My Project')
    expect(project.path).toBe('/my-project')
    expect(project.nodes.size).toBe(0)
    expect(project.metadata.description).toBe('Description')
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Full Project Workflow', () => {
  let fs: MemoryFileSystemAdapter

  beforeEach(() => {
    fs = new MemoryFileSystemAdapter()
  })

  afterEach(() => {
    fs.clear()
  })

  it('should create, save, load, and modify nodes', async () => {
    // Initialize project
    await initializeProject(fs, '/test-project', 'Test Project')

    // Create and save nodes
    const task = createTestTaskNode({
      id: 'task-1',
      title: 'First Task',
      dependsOn: [],
    })

    const note = createTestNoteNode({
      id: 'note-1',
      title: 'Project Notes',
      content: 'See [[task-1]] for the first task.',
    })

    await saveNode(fs, '/test-project', task)
    await saveNode(fs, '/test-project', note)

    // Load project
    const loadResult = await loadProject(fs, '/test-project')

    expect(loadResult.error).toBeNull()
    expect(loadResult.project?.nodes.size).toBe(2)
    expect(loadResult.project?.nodes.get('task-1')).toBeDefined()
    expect(loadResult.project?.nodes.get('note-1')).toBeDefined()

    // Modify a node
    const updatedTask = {
      ...task,
      status: 'complete' as const,
      title: 'First Task (Done)',
    }

    await saveNode(fs, '/test-project', updatedTask)

    // Reload and verify
    const reloadResult = await loadProject(fs, '/test-project')
    const reloadedTask = reloadResult.project?.nodes.get('task-1') as TaskNode

    expect(reloadedTask.status).toBe('complete')
    expect(reloadedTask.title).toBe('First Task (Done)')
  })

  it('should handle all four node types', async () => {
    await initializeProject(fs, '/multi-type', 'Multi Type Project')

    const decision = createTestDecisionNode({ id: 'decision-1' })
    const component = createTestComponentNode({ id: 'component-1' })
    const task = createTestTaskNode({ id: 'task-1' })
    const note = createTestNoteNode({ id: 'note-1' })

    await saveNode(fs, '/multi-type', decision)
    await saveNode(fs, '/multi-type', component)
    await saveNode(fs, '/multi-type', task)
    await saveNode(fs, '/multi-type', note)

    const result = await loadProject(fs, '/multi-type')

    expect(result.project?.nodes.size).toBe(4)
    expect(result.project?.nodes.get('decision-1')?.type).toBe(
      NodeType.Decision
    )
    expect(result.project?.nodes.get('component-1')?.type).toBe(
      NodeType.Component
    )
    expect(result.project?.nodes.get('task-1')?.type).toBe(NodeType.Task)
    expect(result.project?.nodes.get('note-1')?.type).toBe(NodeType.Note)
  })
})
