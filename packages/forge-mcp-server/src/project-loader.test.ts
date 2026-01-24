/**
 * Tests for Project Loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  loadProject,
  saveNode,
  deleteNode,
  createNode,
  updateNode,
  searchNodes,
} from './project-loader.js'
import type { TaskNode, ComponentNode } from './types.js'

describe('Project Loader', () => {
  let testDir: string

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-mcp-test-'))

    // Create standard directories
    await fs.mkdir(path.join(testDir, 'tasks'), { recursive: true })
    await fs.mkdir(path.join(testDir, 'decisions'), { recursive: true })
    await fs.mkdir(path.join(testDir, 'components'), { recursive: true })
    await fs.mkdir(path.join(testDir, 'notes'), { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('loadProject', () => {
    it('loads an empty project', async () => {
      const project = await loadProject(testDir)

      expect(project.id).toBe(path.basename(testDir))
      expect(project.nodes.size).toBe(0)
    })

    it('loads project with task nodes', async () => {
      // Create a test task file
      const taskContent = `---
type: task
title: Test Task
status: pending
priority: high
tags:
  - test
depends_on: []
blocks: []
---
# Test Task

This is test content.

- [ ] Checklist item 1
- [x] Checklist item 2
`
      await fs.writeFile(
        path.join(testDir, 'tasks', 'test-task.md'),
        taskContent
      )

      const project = await loadProject(testDir)

      expect(project.nodes.size).toBe(1)
      const task = project.nodes.get('test-task') as TaskNode
      expect(task).toBeDefined()
      expect(task.type).toBe('task')
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe('pending')
      expect(task.priority).toBe('high')
      expect(task.tags).toContain('test')
      expect(task.checklist).toHaveLength(2)
      expect(task.checklist[0].completed).toBe(false)
      expect(task.checklist[1].completed).toBe(true)
    })

    it('loads project with component nodes', async () => {
      const componentContent = `---
type: component
title: Test Component
status: pending
cost: 25.99
supplier: DigiKey
part_number: ABC123
---
# Test Component

A test component.
`
      await fs.writeFile(
        path.join(testDir, 'components', 'test-component.md'),
        componentContent
      )

      const project = await loadProject(testDir)

      expect(project.nodes.size).toBe(1)
      const component = project.nodes.get('test-component') as ComponentNode
      expect(component).toBeDefined()
      expect(component.type).toBe('component')
      expect(component.cost).toBe(25.99)
      expect(component.supplier).toBe('DigiKey')
      expect(component.partNumber).toBe('ABC123')
    })
  })

  describe('createNode', () => {
    it('creates a task node with defaults', () => {
      const node = createNode({
        type: 'task',
        title: 'New Task',
      })

      expect(node.type).toBe('task')
      expect(node.title).toBe('New Task')
      expect((node as TaskNode).status).toBe('pending')
      expect((node as TaskNode).priority).toBe('medium')
      expect((node as TaskNode).dependsOn).toEqual([])
      expect(node.id).toMatch(/^task-new-task-/)
    })

    it('creates a component node with custom values', () => {
      const node = createNode({
        type: 'component',
        title: 'Motor',
        cost: 50,
        supplier: 'Amazon',
        partNumber: 'MTR-001',
      })

      expect(node.type).toBe('component')
      expect(node.title).toBe('Motor')
      const component = node as ComponentNode
      expect(component.cost).toBe(50)
      expect(component.supplier).toBe('Amazon')
      expect(component.partNumber).toBe('MTR-001')
    })
  })

  describe('saveNode and deleteNode', () => {
    it('saves and loads a node', async () => {
      const node = createNode({
        type: 'task',
        title: 'Saved Task',
        content: 'Task content here',
        tags: ['important'],
      }) as TaskNode

      await saveNode(testDir, node)

      // Reload project and verify
      const project = await loadProject(testDir)
      const loaded = project.nodes.get(node.id) as TaskNode

      expect(loaded).toBeDefined()
      expect(loaded.title).toBe('Saved Task')
      expect(loaded.content).toContain('Task content here')
      expect(loaded.tags).toContain('important')
    })

    it('deletes a node', async () => {
      const node = createNode({
        type: 'note',
        title: 'To Delete',
      })

      await saveNode(testDir, node)

      // Verify it exists
      let project = await loadProject(testDir)
      expect(project.nodes.has(node.id)).toBe(true)

      // Delete it
      await deleteNode(testDir, node.id, node.type)

      // Verify it's gone
      project = await loadProject(testDir)
      expect(project.nodes.has(node.id)).toBe(false)
    })
  })

  describe('updateNode', () => {
    it('updates node fields', async () => {
      const original = createNode({
        type: 'task',
        title: 'Original',
        content: 'Original content',
      }) as TaskNode

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = updateNode(original, {
        id: original.id,
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'high',
      }) as TaskNode

      expect(updated.title).toBe('Updated Title')
      expect(updated.status).toBe('in_progress')
      expect(updated.priority).toBe('high')
      expect(updated.content).toBe('Original content') // Unchanged
      // Modified date should be updated (or at least different object reference)
      expect(updated.dates).not.toBe(original.dates)
    })
  })

  describe('searchNodes', () => {
    it('searches by query', () => {
      const nodes = new Map()
      nodes.set('task-1', createNode({ type: 'task', title: 'Build frame' }))
      nodes.set('task-2', createNode({ type: 'task', title: 'Test motor' }))
      nodes.set('note-1', createNode({ type: 'note', title: 'Design notes' }))

      const results = searchNodes(nodes, { query: 'motor' })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Test motor')
    })

    it('filters by type', () => {
      const nodes = new Map()
      nodes.set('task-1', createNode({ type: 'task', title: 'Task 1' }))
      nodes.set('note-1', createNode({ type: 'note', title: 'Note 1' }))
      nodes.set(
        'component-1',
        createNode({ type: 'component', title: 'Component 1' })
      )

      const results = searchNodes(nodes, { type: 'task' })

      expect(results).toHaveLength(1)
      expect(results[0].type).toBe('task')
    })

    it('filters by tags', () => {
      const nodes = new Map()
      const task1 = createNode({
        type: 'task',
        title: 'Task 1',
        tags: ['urgent'],
      })
      const task2 = createNode({
        type: 'task',
        title: 'Task 2',
        tags: ['later'],
      })
      nodes.set(task1.id, task1)
      nodes.set(task2.id, task2)

      const results = searchNodes(nodes, { tags: ['urgent'] })

      expect(results).toHaveLength(1)
      expect(results[0].tags).toContain('urgent')
    })

    it('respects limit', () => {
      const nodes = new Map()
      for (let i = 0; i < 100; i++) {
        const node = createNode({ type: 'task', title: `Task ${i}` })
        nodes.set(node.id, node)
      }

      const results = searchNodes(nodes, { limit: 10 })

      expect(results).toHaveLength(10)
    })
  })
})
