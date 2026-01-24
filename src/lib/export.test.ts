/**
 * Export/Import Tests
 *
 * Comprehensive tests for JSON export and import including:
 * - exportToJSON with various options
 * - importFromJSON with validation
 * - Version migration handling
 * - Error handling for invalid data
 */

import { describe, it, expect } from 'vitest'
import {
  exportToJSON,
  importFromJSON,
  exportNodeToMarkdown,
  exportProjectToMarkdown,
  importFromMarkdown,
  generateExportFilename,
  exportComponentsToCSV,
  exportBOM,
  EXPORT_VERSION,
  EXPORT_APP_NAME,
} from './export'
import type { MarkdownFileEntry } from '@/types/export'
import type { Project } from '@/types/project'
import type {
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  ForgeNode,
} from '@/types/nodes'
import { NodeType, createNodeDates } from '@/types/nodes'
import { createProjectMetadata } from '@/types/project'

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
    parent: null,
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
    parent: null,
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
    parent: null,
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
    parent: null,
    ...overrides,
  }
}

function createTestProject(nodes: Map<string, ForgeNode> = new Map()): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    path: '/test/path',
    nodes,
    metadata: createProjectMetadata('A test project'),
  }
}

// ============================================================================
// exportToJSON Tests
// ============================================================================

describe('exportToJSON', () => {
  describe('basic export', () => {
    it('exports an empty project', () => {
      const project = createTestProject()
      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.project.id).toBe('test-project')
      expect(parsed.project.name).toBe('Test Project')
      expect(parsed.nodes).toEqual([])
    })

    it('includes export metadata by default', () => {
      const project = createTestProject()
      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.metadata).toBeDefined()
      expect(parsed.metadata.version).toBe(EXPORT_VERSION)
      expect(parsed.metadata.exportedBy).toBe(EXPORT_APP_NAME)
      expect(parsed.metadata.nodeCount).toBe(0)
      expect(parsed.metadata.exportedAt).toBeDefined()
    })

    it('exports project metadata', () => {
      const project = createTestProject()
      project.metadata.description = 'Project description'
      project.metadata.nodeOrder = ['node-1', 'node-2']
      project.metadata.nodePositions = { 'node-1': { x: 100, y: 200 } }

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.project.description).toBe('Project description')
      expect(parsed.project.nodeOrder).toEqual(['node-1', 'node-2'])
      expect(parsed.project.nodePositions).toEqual({
        'node-1': { x: 100, y: 200 },
      })
    })
  })

  describe('node serialization', () => {
    it('exports task nodes with all fields', () => {
      const task = createTestTaskNode({
        id: 'my-task',
        title: 'My Task',
        status: 'in_progress',
        priority: 'high',
        dependsOn: ['other-task'],
        blocks: ['blocked-task'],
        checklist: [{ id: 'item-1', text: 'Do something', completed: false }],
        milestone: 'Sprint 1',
      })
      const nodes = new Map([['my-task', task]])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.nodes[0].id).toBe('my-task')
      expect(parsed.nodes[0].type).toBe('task')
      expect(parsed.nodes[0].title).toBe('My Task')
      expect(parsed.nodes[0].status).toBe('in_progress')
      expect(parsed.nodes[0].priority).toBe('high')
      expect(parsed.nodes[0].dependsOn).toEqual(['other-task'])
      expect(parsed.nodes[0].blocks).toEqual(['blocked-task'])
      expect(parsed.nodes[0].checklist).toEqual([
        { id: 'item-1', text: 'Do something', completed: false },
      ])
      expect(parsed.nodes[0].milestone).toBe('Sprint 1')
    })

    it('exports decision nodes with all fields', () => {
      const decision = createTestDecisionNode({
        id: 'my-decision',
        title: 'My Decision',
        status: 'selected',
        selected: 'option-1',
        selectedDate: new Date('2024-01-15'),
        rationale: 'Because it was the best option',
        options: [
          { id: 'option-1', name: 'Option A', values: { cost: '100' } },
        ],
        criteria: [{ id: 'crit-1', name: 'Cost', weight: 5, unit: 'USD' }],
        parent: null,
      })
      const nodes = new Map([['my-decision', decision]])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.nodes[0].id).toBe('my-decision')
      expect(parsed.nodes[0].type).toBe('decision')
      expect(parsed.nodes[0].status).toBe('selected')
      expect(parsed.nodes[0].selected).toBe('option-1')
      expect(parsed.nodes[0].selectedDate).toBe('2024-01-15T00:00:00.000Z')
      expect(parsed.nodes[0].rationale).toBe('Because it was the best option')
      expect(parsed.nodes[0].options).toHaveLength(1)
      expect(parsed.nodes[0].criteria).toHaveLength(1)
    })

    it('exports component nodes with all fields', () => {
      const component = createTestComponentNode({
        id: 'my-component',
        title: 'My Component',
        status: 'selected',
        cost: 99.99,
        supplier: 'ACME Corp',
        partNumber: 'ACME-123',
        customFields: { material: 'steel', weight: '5kg' },
        parent: null,
      })
      const nodes = new Map([['my-component', component]])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.nodes[0].id).toBe('my-component')
      expect(parsed.nodes[0].type).toBe('component')
      expect(parsed.nodes[0].cost).toBe(99.99)
      expect(parsed.nodes[0].supplier).toBe('ACME Corp')
      expect(parsed.nodes[0].partNumber).toBe('ACME-123')
      expect(parsed.nodes[0].customFields).toEqual({
        material: 'steel',
        weight: '5kg',
      })
    })

    it('exports note nodes', () => {
      const note = createTestNoteNode({
        id: 'my-note',
        title: 'My Note',
        content: '# Heading\n\nSome content',
        tags: ['important', 'research'],
      })
      const nodes = new Map([['my-note', note]])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.nodes[0].id).toBe('my-note')
      expect(parsed.nodes[0].type).toBe('note')
      expect(parsed.nodes[0].content).toBe('# Heading\n\nSome content')
      expect(parsed.nodes[0].tags).toEqual(['important', 'research'])
    })

    it('converts dates to ISO strings', () => {
      const task = createTestTaskNode({
        dates: {
          created: new Date('2024-01-01T10:00:00Z'),
          modified: new Date('2024-01-02T15:30:00Z'),
        },
      })
      const nodes = new Map([['test-task', task]])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes[0].dates.created).toBe('2024-01-01T10:00:00.000Z')
      expect(parsed.nodes[0].dates.modified).toBe('2024-01-02T15:30:00.000Z')
    })

    it('sorts nodes by type and title', () => {
      const nodes = new Map<string, ForgeNode>([
        ['note-b', createTestNoteNode({ id: 'note-b', title: 'Note B' })],
        ['task-a', createTestTaskNode({ id: 'task-a', title: 'Task A' })],
        ['note-a', createTestNoteNode({ id: 'note-a', title: 'Note A' })],
        ['task-b', createTestTaskNode({ id: 'task-b', title: 'Task B' })],
      ])
      const project = createTestProject(nodes)

      const json = exportToJSON(project)
      const parsed = JSON.parse(json)

      expect(parsed.nodes[0].id).toBe('note-a')
      expect(parsed.nodes[1].id).toBe('note-b')
      expect(parsed.nodes[2].id).toBe('task-a')
      expect(parsed.nodes[3].id).toBe('task-b')
    })
  })

  describe('export options', () => {
    it('respects prettyPrint option', () => {
      const project = createTestProject()

      const prettyJson = exportToJSON(project, { prettyPrint: true })
      const compactJson = exportToJSON(project, { prettyPrint: false })

      expect(prettyJson).toContain('\n')
      expect(compactJson).not.toContain('\n')
    })

    it('respects indentSpaces option', () => {
      const project = createTestProject()

      const indent2 = exportToJSON(project, { indentSpaces: 2 })
      const indent4 = exportToJSON(project, { indentSpaces: 4 })

      expect(indent2).toContain('  "')
      expect(indent4).toContain('    "')
    })

    it('respects includeMetadata option', () => {
      const project = createTestProject()

      const withMeta = exportToJSON(project, { includeMetadata: true })
      const withoutMeta = exportToJSON(project, { includeMetadata: false })

      expect(JSON.parse(withMeta).metadata).toBeDefined()
      expect(JSON.parse(withoutMeta).metadata).toBeUndefined()
    })
  })
})

// ============================================================================
// importFromJSON Tests
// ============================================================================

describe('importFromJSON', () => {
  describe('successful import', () => {
    it('imports an empty project', () => {
      const json = JSON.stringify({
        project: {
          id: 'imported-project',
          name: 'Imported Project',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-02T00:00:00.000Z',
        },
        nodes: [],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('imported-project')
        expect(result.data.name).toBe('Imported Project')
        expect(result.data.nodes.size).toBe(0)
      }
    })

    it('imports project with metadata', () => {
      const json = JSON.stringify({
        metadata: {
          version: EXPORT_VERSION,
          exportedAt: '2024-01-01T00:00:00.000Z',
          exportedBy: EXPORT_APP_NAME,
          nodeCount: 0,
        },
        project: {
          id: 'test',
          name: 'Test',
          description: 'Test description',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-02T00:00:00.000Z',
          nodeOrder: ['node-1', 'node-2'],
          nodePositions: { 'node-1': { x: 50, y: 100 } },
        },
        nodes: [],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata.description).toBe('Test description')
        expect(result.data.metadata.nodeOrder).toEqual(['node-1', 'node-2'])
        expect(result.data.metadata.nodePositions).toEqual({
          'node-1': { x: 50, y: 100 },
        })
      }
    })

    it('imports task nodes', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            title: 'Task 1',
            content: 'Content',
            tags: ['urgent'],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            status: 'pending',
            priority: 'high',
            dependsOn: [],
            blocks: [],
            checklist: [],
            parent: null,
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodes.size).toBe(1)
        const node = result.data.nodes.get('task-1')
        expect(node).toBeDefined()
        expect(node?.type).toBe('task')
        expect(node?.title).toBe('Task 1')
        if (node?.type === 'task') {
          expect(node.status).toBe('pending')
          expect(node.priority).toBe('high')
        }
      }
    })

    it('imports decision nodes', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'decision-1',
            type: 'decision',
            title: 'Decision 1',
            content: 'Content',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            status: 'selected',
            selected: 'option-1',
            selectedDate: '2024-01-15T00:00:00.000Z',
            rationale: 'Best choice',
            options: [{ id: 'option-1', name: 'Option A', values: {} }],
            criteria: [],
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        const node = result.data.nodes.get('decision-1')
        expect(node?.type).toBe('decision')
        if (node?.type === 'decision') {
          expect(node.status).toBe('selected')
          expect(node.selected).toBe('option-1')
          expect(node.selectedDate).toBeInstanceOf(Date)
          expect(node.rationale).toBe('Best choice')
        }
      }
    })

    it('imports component nodes', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'component-1',
            type: 'component',
            title: 'Component 1',
            content: 'Content',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            status: 'selected',
            cost: 50.99,
            supplier: 'Supplier Co',
            partNumber: 'ABC-123',
            customFields: { color: 'red' },
            parent: null,
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        const node = result.data.nodes.get('component-1')
        expect(node?.type).toBe('component')
        if (node?.type === 'component') {
          expect(node.cost).toBe(50.99)
          expect(node.supplier).toBe('Supplier Co')
          expect(node.partNumber).toBe('ABC-123')
          expect(node.customFields).toEqual({ color: 'red' })
        }
      }
    })

    it('imports note nodes', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'note-1',
            type: 'note',
            title: 'Note 1',
            content: '# My Note\n\nContent here',
            tags: ['reference'],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            parent: null,
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        const node = result.data.nodes.get('note-1')
        expect(node?.type).toBe('note')
        expect(node?.content).toBe('# My Note\n\nContent here')
        expect(node?.tags).toEqual(['reference'])
      }
    })

    it('imports multiple nodes of different types', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            title: 'Task',
            content: '',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            status: 'pending',
            priority: 'medium',
            dependsOn: [],
            blocks: [],
            checklist: [],
            parent: null,
          },
          {
            id: 'note-1',
            type: 'note',
            title: 'Note',
            content: '',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            parent: null,
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodes.size).toBe(2)
        expect(result.data.nodes.has('task-1')).toBe(true)
        expect(result.data.nodes.has('note-1')).toBe(true)
      }
    })
  })

  describe('error handling', () => {
    it('rejects invalid JSON', () => {
      const result = importFromJSON('not valid json {')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR')
        expect(result.error.message).toContain('Invalid JSON')
      }
    })

    it('rejects missing project field', () => {
      const json = JSON.stringify({ nodes: [] })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_VALUE')
      }
    })

    it('rejects missing project.id', () => {
      const json = JSON.stringify({
        project: {
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
    })

    it('rejects missing project.name', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
    })

    it('rejects invalid node with missing required fields', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            type: 'task',
            // missing id and title
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toBeDefined()
      }
    })

    it('rejects duplicate node IDs', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'duplicate-id',
            type: 'note',
            title: 'Note 1',
            content: '',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            parent: null,
          },
          {
            id: 'duplicate-id',
            type: 'note',
            title: 'Note 2',
            content: '',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
            parent: null,
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toBeDefined()
        const duplicateIssue = result.error.issues?.find((i) =>
          i.message.includes('Duplicate node ID')
        )
        expect(duplicateIssue).toBeDefined()
      }
    })

    it('rejects invalid node type', () => {
      const json = JSON.stringify({
        project: {
          id: 'test',
          name: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-01T00:00:00.000Z',
        },
        nodes: [
          {
            id: 'invalid-node',
            type: 'invalid_type',
            title: 'Invalid',
            content: '',
            tags: [],
            dates: {
              created: '2024-01-01T00:00:00.000Z',
              modified: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      })

      const result = importFromJSON(json)

      expect(result.success).toBe(false)
    })
  })

  describe('round-trip', () => {
    it('export then import produces equivalent project', () => {
      const task = createTestTaskNode({
        id: 'task-1',
        title: 'Round Trip Task',
        status: 'in_progress',
        priority: 'high',
        tags: ['important'],
      })
      const note = createTestNoteNode({
        id: 'note-1',
        title: 'Round Trip Note',
        content: '# Content\n\nWith markdown',
      })
      const nodes = new Map<string, ForgeNode>([
        ['task-1', task],
        ['note-1', note],
      ])
      const originalProject = createTestProject(nodes)
      originalProject.metadata.description = 'Round trip test'

      // Export
      const json = exportToJSON(originalProject)

      // Import
      const result = importFromJSON(json)

      expect(result.success).toBe(true)
      if (result.success) {
        const imported = result.data
        expect(imported.id).toBe(originalProject.id)
        expect(imported.name).toBe(originalProject.name)
        expect(imported.nodes.size).toBe(2)
        expect(imported.metadata.description).toBe('Round trip test')

        const importedTask = imported.nodes.get('task-1')
        expect(importedTask?.title).toBe('Round Trip Task')
        if (importedTask?.type === 'task') {
          expect(importedTask.status).toBe('in_progress')
          expect(importedTask.priority).toBe('high')
        }

        const importedNote = imported.nodes.get('note-1')
        expect(importedNote?.content).toBe('# Content\n\nWith markdown')
      }
    })
  })
})

// ============================================================================
// Markdown Export Tests
// ============================================================================

describe('exportNodeToMarkdown', () => {
  describe('basic export', () => {
    it('exports a task node to markdown with frontmatter', () => {
      const task = createTestTaskNode({
        id: 'my-task',
        title: 'My Task Title',
        content: 'Task content here',
        status: 'pending',
        priority: 'high',
        tags: ['urgent', 'important'],
      })

      const markdown = exportNodeToMarkdown(task)

      expect(markdown).toContain('---')
      expect(markdown).toContain('type: task')
      expect(markdown).toContain('status: pending')
      expect(markdown).toContain('priority: high')
      expect(markdown).toContain('# My Task Title')
      expect(markdown).toContain('Task content here')
    })

    it('exports a decision node with all fields', () => {
      const decision = createTestDecisionNode({
        id: 'my-decision',
        title: 'Choose Framework',
        content: 'We need to choose a framework',
        status: 'selected',
        selected: 'react',
        selectedDate: new Date('2024-01-15T00:00:00.000Z'),
        rationale: 'Best ecosystem',
        options: [{ id: 'react', name: 'React', values: { popularity: '10' } }],
        criteria: [
          { id: 'crit-1', name: 'Popularity', weight: 8, unit: 'score' },
        ],
      })

      const markdown = exportNodeToMarkdown(decision)

      expect(markdown).toContain('type: decision')
      expect(markdown).toContain('status: selected')
      expect(markdown).toContain('selected: react')
      expect(markdown).toContain('rationale: Best ecosystem')
      expect(markdown).toContain('# Choose Framework')
    })

    it('exports a component node with all fields', () => {
      const component = createTestComponentNode({
        id: 'motor',
        title: 'Stepper Motor',
        content: 'NEMA 17 stepper',
        status: 'selected',
        cost: 25.99,
        supplier: 'ACME',
        partNumber: 'NEMA17-001',
        customFields: { voltage: '12V' },
        parent: null,
      })

      const markdown = exportNodeToMarkdown(component)

      expect(markdown).toContain('type: component')
      expect(markdown).toContain('status: selected')
      expect(markdown).toContain('cost: 25.99')
      expect(markdown).toContain('supplier: ACME')
      expect(markdown).toContain('partNumber: NEMA17-001')
      expect(markdown).toContain('# Stepper Motor')
    })

    it('exports a note node', () => {
      const note = createTestNoteNode({
        id: 'research-note',
        title: 'Research Notes',
        content: '## Findings\n\nImportant findings here.',
        tags: ['research'],
      })

      const markdown = exportNodeToMarkdown(note)

      expect(markdown).toContain('type: note')
      expect(markdown).toContain('# Research Notes')
      expect(markdown).toContain('## Findings')
      expect(markdown).toContain('Important findings here.')
    })

    it('includes date fields in frontmatter', () => {
      const task = createTestTaskNode({
        dates: {
          created: new Date('2024-01-01T10:00:00.000Z'),
          modified: new Date('2024-01-02T15:30:00.000Z'),
        },
      })

      const markdown = exportNodeToMarkdown(task)

      // Dates may be quoted or unquoted in YAML depending on serialization
      expect(markdown).toContain('2024-01-01T10:00:00.000Z')
      expect(markdown).toContain('2024-01-02T15:30:00.000Z')
    })
  })

  describe('options', () => {
    it('omits frontmatter when includeFrontmatter is false', () => {
      const note = createTestNoteNode({
        title: 'Simple Note',
        content: 'Just content',
      })

      const markdown = exportNodeToMarkdown(note, { includeFrontmatter: false })

      expect(markdown).not.toContain('---')
      expect(markdown).toContain('# Simple Note')
      expect(markdown).toContain('Just content')
    })
  })

  describe('task-specific fields', () => {
    it('exports depends_on array', () => {
      const task = createTestTaskNode({
        dependsOn: ['task-a', 'task-b'],
      })

      const markdown = exportNodeToMarkdown(task)

      expect(markdown).toContain('depends_on:')
      expect(markdown).toContain('task-a')
      expect(markdown).toContain('task-b')
    })

    it('exports blocks array', () => {
      const task = createTestTaskNode({
        blocks: ['blocked-task'],
      })

      const markdown = exportNodeToMarkdown(task)

      expect(markdown).toContain('blocks:')
      expect(markdown).toContain('blocked-task')
    })

    it('exports checklist', () => {
      const task = createTestTaskNode({
        checklist: [
          { id: '1', text: 'First item', completed: true },
          { id: '2', text: 'Second item', completed: false },
        ],
        parent: null,
      })

      const markdown = exportNodeToMarkdown(task)

      expect(markdown).toContain('checklist:')
    })

    it('exports milestone', () => {
      const task = createTestTaskNode({
        milestone: 'Sprint 1',
      })

      const markdown = exportNodeToMarkdown(task)

      expect(markdown).toContain('milestone: Sprint 1')
    })
  })
})

describe('exportProjectToMarkdown', () => {
  it('exports an empty project', () => {
    const project = createTestProject()

    const result = exportProjectToMarkdown(project)

    expect(result.files.size).toBe(0)
    expect(result.projectJson).toBeDefined()
    expect(JSON.parse(result.projectJson).name).toBe('Test Project')
  })

  it('exports nodes to correct directories', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTestTaskNode({ id: 'task-1' })],
      ['decision-1', createTestDecisionNode({ id: 'decision-1' })],
      ['component-1', createTestComponentNode({ id: 'component-1' })],
      ['note-1', createTestNoteNode({ id: 'note-1' })],
    ])
    const project = createTestProject(nodes)

    const result = exportProjectToMarkdown(project)

    expect(result.files.size).toBe(4)
    expect(result.files.has('tasks/task-1.md')).toBe(true)
    expect(result.files.has('decisions/decision-1.md')).toBe(true)
    expect(result.files.has('components/component-1.md')).toBe(true)
    expect(result.files.has('notes/note-1.md')).toBe(true)
  })

  it('generates valid markdown for each node', () => {
    const task = createTestTaskNode({
      id: 'my-task',
      title: 'Important Task',
      status: 'in_progress',
    })
    const nodes = new Map([['my-task', task]])
    const project = createTestProject(nodes)

    const result = exportProjectToMarkdown(project)

    const taskContent = result.files.get('tasks/my-task.md')
    expect(taskContent).toBeDefined()
    expect(taskContent).toContain('---')
    expect(taskContent).toContain('type: task')
    expect(taskContent).toContain('# Important Task')
  })

  it('exports project metadata to project.json', () => {
    const project = createTestProject()
    project.metadata.description = 'Test description'
    project.metadata.nodeOrder = ['node-a', 'node-b']
    project.metadata.nodePositions = { 'node-a': { x: 100, y: 200 } }

    const result = exportProjectToMarkdown(project)

    const projectData = JSON.parse(result.projectJson)
    expect(projectData.id).toBe('test-project')
    expect(projectData.name).toBe('Test Project')
    expect(projectData.description).toBe('Test description')
    expect(projectData.nodeOrder).toEqual(['node-a', 'node-b'])
    expect(projectData.nodePositions).toEqual({ 'node-a': { x: 100, y: 200 } })
  })

  it('respects includeFrontmatter option', () => {
    const task = createTestTaskNode({ id: 'task-1' })
    const nodes = new Map([['task-1', task]])
    const project = createTestProject(nodes)

    const result = exportProjectToMarkdown(project, {
      includeFrontmatter: false,
    })

    const taskContent = result.files.get('tasks/task-1.md')
    expect(taskContent).not.toContain('---')
  })
})

// ============================================================================
// Markdown Import Tests
// ============================================================================

describe('importFromMarkdown', () => {
  describe('successful import', () => {
    it('imports a single task node', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/my-task.md',
          content: `---
type: task
status: pending
priority: high
tags:
  - urgent
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-02T00:00:00.000Z
---

# My Task

Task content here`,
        },
      ]

      const result = importFromMarkdown(files, 'Test Project')

      expect(result.success).toBe(true)
      expect(result.project).not.toBeNull()
      expect(result.project?.nodes.size).toBe(1)

      const task = result.project?.nodes.get('my-task')
      expect(task?.type).toBe('task')
      expect(task?.title).toBe('My Task')
      if (task?.type === 'task') {
        expect(task.status).toBe('pending')
        expect(task.priority).toBe('high')
      }
    })

    it('imports a decision node', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'decisions/framework-choice.md',
          content: `---
type: decision
status: pending
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Framework Choice

Which framework to use?`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      const decision = result.project?.nodes.get('framework-choice')
      expect(decision?.type).toBe('decision')
    })

    it('imports a component node', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'components/stepper-motor.md',
          content: `---
type: component
status: considering
cost: 25.99
supplier: ACME
partNumber: NEMA17-001
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Stepper Motor

NEMA 17 stepper motor`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      const component = result.project?.nodes.get('stepper-motor')
      expect(component?.type).toBe('component')
      if (component?.type === 'component') {
        expect(component.cost).toBe(25.99)
        expect(component.supplier).toBe('ACME')
        expect(component.partNumber).toBe('NEMA17-001')
      }
    })

    it('imports a note node', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'notes/research.md',
          content: `---
type: note
tags:
  - research
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Research Notes

Important findings here.`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      const note = result.project?.nodes.get('research')
      expect(note?.type).toBe('note')
      expect(note?.tags).toContain('research')
    })

    it('imports multiple nodes from different directories', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
        {
          path: 'notes/note-1.md',
          content: `---
type: note
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Note 1

Content`,
        },
        {
          path: 'decisions/decision-1.md',
          content: `---
type: decision
status: pending
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Decision 1

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(3)
      expect(result.project?.nodes.has('task-1')).toBe(true)
      expect(result.project?.nodes.has('note-1')).toBe(true)
      expect(result.project?.nodes.has('decision-1')).toBe(true)
    })

    it('loads project metadata from project.json', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'project.json',
          content: JSON.stringify({
            name: 'My Project',
            description: 'A cool project',
            createdAt: '2024-01-01T00:00:00.000Z',
            modifiedAt: '2024-01-02T00:00:00.000Z',
            nodeOrder: ['task-1'],
            nodePositions: { 'task-1': { x: 50, y: 100 } },
          }),
        },
        {
          path: 'tasks/task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.name).toBe('My Project')
      expect(result.project?.metadata.description).toBe('A cool project')
      expect(result.project?.metadata.nodeOrder).toEqual(['task-1'])
      expect(result.project?.metadata.nodePositions).toEqual({
        'task-1': { x: 50, y: 100 },
      })
    })

    it('uses provided project name when no project.json', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
      ]

      const result = importFromMarkdown(files, 'Custom Name')

      expect(result.success).toBe(true)
      expect(result.project?.name).toBe('Custom Name')
    })
  })

  describe('error handling', () => {
    it('skips files not in recognized directories', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'random/file.md',
          content: `---
type: note
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Random

Content`,
        },
        {
          path: 'tasks/valid-task.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Valid Task

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(1)
      expect(result.parseErrors.length).toBeGreaterThan(0)
      expect(result.parseErrors[0].path).toBe('random/file.md')
    })

    it('handles malformed frontmatter', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/malformed.md',
          content: `---
type: task
invalid yaml: [
created: 2024-01-01T00:00:00.000Z
---

# Malformed

Content`,
        },
        {
          path: 'tasks/valid.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Valid

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(1)
      expect(result.parseErrors.some((e) => e.path.includes('malformed'))).toBe(
        true
      )
    })

    it('handles invalid node data', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/invalid.md',
          content: `---
type: task
status: invalid_status
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Invalid

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      // Import fails because no valid nodes were found
      expect(result.success).toBe(false)
      expect(result.parseErrors.length).toBeGreaterThan(0)
    })

    it('warns on node type mismatch with directory', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/mismatched.md',
          content: `---
type: note
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Mismatched

A note in tasks directory`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(
        result.parseErrors.some((e) => e.message.includes('type mismatch'))
      ).toBe(true)
    })

    it('handles duplicate node IDs in merge mode', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/duplicate.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# First

Content`,
        },
        {
          path: 'notes/duplicate.md',
          content: `---
type: note
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Second

Content`,
        },
      ]

      const result = importFromMarkdown(files, 'Test', { mergeMode: true })

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(1)
      expect(
        result.parseErrors.some((e) => e.message.includes('Duplicate node ID'))
      ).toBe(true)
    })

    it('overwrites duplicate node IDs in replace mode', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/duplicate.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# First

Content`,
        },
        {
          path: 'notes/duplicate.md',
          content: `---
type: note
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Second

Content`,
        },
      ]

      const result = importFromMarkdown(files, 'Test', { mergeMode: false })

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(1)
      // The second file should overwrite the first
      const node = result.project?.nodes.get('duplicate')
      expect(node?.type).toBe('note')
    })

    it('returns error when no valid nodes found', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks/invalid.md',
          content: `---
type: task
status: bad_status
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Invalid

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No valid nodes')
    })

    it('handles corrupted project.json', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'project.json',
          content: '{ invalid json',
        },
        {
          path: 'tasks/task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(
        result.parseErrors.some((e) => e.path.includes('project.json'))
      ).toBe(true)
      expect(result.project?.nodes.size).toBe(1)
    })
  })

  describe('path handling', () => {
    it('handles paths with subdirectories', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'my-project/tasks/task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.has('task-1')).toBe(true)
    })

    it('handles Windows-style paths', () => {
      const files: MarkdownFileEntry[] = [
        {
          path: 'tasks\\task-1.md',
          content: `---
type: task
status: pending
priority: medium
created: 2024-01-01T00:00:00.000Z
modified: 2024-01-01T00:00:00.000Z
---

# Task 1

Content`,
        },
      ]

      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.has('task-1')).toBe(true)
    })
  })

  describe('round-trip', () => {
    it('export then import produces equivalent project', () => {
      // Create a project with various nodes
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTestTaskNode({
            id: 'task-1',
            title: 'Round Trip Task',
            content: 'Task content',
            status: 'in_progress',
            priority: 'high',
            tags: ['important'],
          }),
        ],
        [
          'note-1',
          createTestNoteNode({
            id: 'note-1',
            title: 'Round Trip Note',
            content: '## Section\n\nNote content',
          }),
        ],
        [
          'decision-1',
          createTestDecisionNode({
            id: 'decision-1',
            title: 'Round Trip Decision',
            content: 'Decision content',
            status: 'pending',
          }),
        ],
      ])
      const originalProject = createTestProject(nodes)
      originalProject.metadata.description = 'Round trip test'

      // Export to markdown
      const exported = exportProjectToMarkdown(originalProject)

      // Convert to file entries for import
      const files: MarkdownFileEntry[] = []
      for (const [path, content] of exported.files) {
        files.push({ path, content })
      }
      files.push({ path: 'project.json', content: exported.projectJson })

      // Import back
      const result = importFromMarkdown(files)

      expect(result.success).toBe(true)
      expect(result.project?.nodes.size).toBe(3)
      expect(result.project?.metadata.description).toBe('Round trip test')

      // Verify nodes
      const importedTask = result.project?.nodes.get('task-1')
      expect(importedTask?.title).toBe('Round Trip Task')
      if (importedTask?.type === 'task') {
        expect(importedTask.status).toBe('in_progress')
        expect(importedTask.priority).toBe('high')
      }

      const importedNote = result.project?.nodes.get('note-1')
      expect(importedNote?.content).toContain('Note content')
    })
  })
})

// ============================================================================
// generateExportFilename Tests
// ============================================================================

describe('generateExportFilename', () => {
  it('generates JSON filename with sanitized project name', () => {
    const filename = generateExportFilename('My Project Name', 'json')

    expect(filename).toMatch(/^my-project-name-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('generates Markdown zip filename', () => {
    const filename = generateExportFilename('Test', 'markdown')

    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}\.zip$/)
  })

  it('generates CSV filename', () => {
    const filename = generateExportFilename('Test', 'csv')

    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('sanitizes special characters', () => {
    const filename = generateExportFilename('Test@Project#123!', 'json')

    expect(filename).toMatch(/^test-project-123-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('handles leading/trailing special chars', () => {
    const filename = generateExportFilename('---Test---', 'json')

    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

// ============================================================================
// CSV Export Tests
// ============================================================================

describe('exportComponentsToCSV', () => {
  describe('basic export', () => {
    it('exports empty array with header only', () => {
      const result = exportComponentsToCSV([])

      expect(result.success).toBe(true)
      expect(result.componentCount).toBe(0)
      // Should have BOM + header row
      const lines = result.data.split('\r\n')
      expect(lines[0]).toContain('ID')
      expect(lines[0]).toContain('Title')
    })

    it('exports a single component', () => {
      const component = createTestComponentNode({
        id: 'comp-1',
        title: 'Motor',
        status: 'selected',
        cost: 25.99,
        supplier: 'Acme Inc',
        partNumber: 'MOT-001',
      })

      const result = exportComponentsToCSV([component])

      expect(result.success).toBe(true)
      expect(result.componentCount).toBe(1)
      const lines = result.data.split('\r\n')
      expect(lines.length).toBe(2) // Header + 1 row
      expect(lines[1]).toContain('comp-1')
      expect(lines[1]).toContain('Motor')
      expect(lines[1]).toContain('selected')
      expect(lines[1]).toContain('25.99')
      expect(lines[1]).toContain('Acme Inc')
      expect(lines[1]).toContain('MOT-001')
    })

    it('filters non-component nodes from input', () => {
      const component = createTestComponentNode({ id: 'comp-1' })
      const task = createTestTaskNode({ id: 'task-1' })
      const note = createTestNoteNode({ id: 'note-1' })

      const result = exportComponentsToCSV([component, task, note])

      expect(result.componentCount).toBe(1)
    })

    it('accepts Map input', () => {
      const component = createTestComponentNode({ id: 'comp-1' })
      const task = createTestTaskNode({ id: 'task-1' })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', component],
        ['task-1', task],
      ])

      const result = exportComponentsToCSV(nodes)

      expect(result.componentCount).toBe(1)
    })
  })

  describe('CSV escaping', () => {
    it('escapes fields containing commas', () => {
      const component = createTestComponentNode({
        title: 'Motor, Large',
      })

      const result = exportComponentsToCSV([component])

      expect(result.data).toContain('"Motor, Large"')
    })

    it('escapes fields containing quotes', () => {
      const component = createTestComponentNode({
        title: 'Motor "Pro"',
      })

      const result = exportComponentsToCSV([component])

      expect(result.data).toContain('"Motor ""Pro"""')
    })

    it('escapes fields containing newlines', () => {
      const component = createTestComponentNode({
        title: 'Motor\nMultiline',
      })

      const result = exportComponentsToCSV([component])

      expect(result.data).toContain('"Motor\nMultiline"')
    })

    it('handles null cost', () => {
      const component = createTestComponentNode({
        cost: null,
      })

      const result = exportComponentsToCSV([component])

      // Cost field should be empty (not "null")
      const lines = result.data.split('\r\n')
      const costIndex = lines[0].split(',').indexOf('Cost')
      const dataRow = lines[1].split(',')
      expect(dataRow[costIndex]).toBe('')
    })

    it('handles null supplier and partNumber', () => {
      const component = createTestComponentNode({
        supplier: null,
        partNumber: null,
      })

      const result = exportComponentsToCSV([component])

      expect(result.success).toBe(true)
      // Should not contain "null" string
      expect(result.data).not.toContain('null')
    })
  })

  describe('options', () => {
    it('includes BOM by default', () => {
      const result = exportComponentsToCSV([])

      // UTF-8 BOM is \uFEFF
      expect(result.data.charCodeAt(0)).toBe(0xfeff)
    })

    it('excludes BOM when includeBOM is false', () => {
      const result = exportComponentsToCSV([], { includeBOM: false })

      expect(result.data.charCodeAt(0)).not.toBe(0xfeff)
      expect(result.data.startsWith('ID')).toBe(true)
    })

    it('limits fields when specified', () => {
      const component = createTestComponentNode({
        id: 'comp-1',
        title: 'Motor',
        cost: 25.99,
        supplier: 'Acme',
      })

      const result = exportComponentsToCSV([component], {
        fields: ['id', 'title', 'cost'],
      })

      const lines = result.data.split('\r\n')
      const headers = lines[0].replace('\uFEFF', '').split(',')
      expect(headers).toEqual(['ID', 'Title', 'Cost'])
      expect(headers).not.toContain('Supplier')
    })

    it('ignores invalid field names', () => {
      const result = exportComponentsToCSV([], {
        fields: ['id', 'invalid_field', 'title'],
      })

      const lines = result.data.split('\r\n')
      const headers = lines[0].replace('\uFEFF', '').split(',')
      expect(headers).toEqual(['ID', 'Title'])
    })
  })

  describe('custom fields and tags', () => {
    it('formats custom fields as semicolon-separated', () => {
      const component = createTestComponentNode({
        customFields: {
          voltage: '12V',
          torque: 50,
          weight: '100g',
        },
        parent: null,
      })

      const result = exportComponentsToCSV([component])

      // Should contain formatted custom fields
      expect(result.data).toContain('voltage:12V')
      expect(result.data).toContain('torque:50')
      expect(result.data).toContain('weight:100g')
    })

    it('formats tags as semicolon-separated', () => {
      const component = createTestComponentNode({
        tags: ['motor', 'actuator', 'high-torque'],
      })

      const result = exportComponentsToCSV([component])

      expect(result.data).toContain('motor; actuator; high-torque')
    })

    it('handles empty custom fields', () => {
      const component = createTestComponentNode({
        customFields: {},
        parent: null,
      })

      const result = exportComponentsToCSV([component])

      expect(result.success).toBe(true)
    })
  })

  describe('sorting', () => {
    it('sorts components by title', () => {
      const compA = createTestComponentNode({ id: 'a', title: 'Zebra' })
      const compB = createTestComponentNode({ id: 'b', title: 'Apple' })
      const compC = createTestComponentNode({ id: 'c', title: 'Motor' })

      const result = exportComponentsToCSV([compA, compB, compC])

      const lines = result.data.split('\r\n')
      // Should be sorted: Apple, Motor, Zebra
      expect(lines[1]).toContain('Apple')
      expect(lines[2]).toContain('Motor')
      expect(lines[3]).toContain('Zebra')
    })
  })
})

describe('exportBOM', () => {
  describe('basic export', () => {
    it('exports empty project with header only', () => {
      const project = createTestProject()

      const result = exportBOM(project)

      expect(result.success).toBe(true)
      expect(result.lineItemCount).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.unknownCostCount).toBe(0)
      // Should have header row
      expect(result.data).toContain('Part Number')
      expect(result.data).toContain('Description')
      expect(result.data).toContain('Quantity')
    })

    it('exports a single component as single line item', () => {
      const component = createTestComponentNode({
        id: 'comp-1',
        title: 'Stepper Motor',
        cost: 29.99,
        supplier: 'Acme Inc',
        partNumber: 'MOT-123',
      })
      const nodes = new Map<string, ForgeNode>([['comp-1', component]])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.lineItemCount).toBe(1)
      expect(result.totalCost).toBe(29.99)
      expect(result.unknownCostCount).toBe(0)
      expect(result.data).toContain('MOT-123')
      expect(result.data).toContain('Stepper Motor')
      expect(result.data).toContain('Acme Inc')
      expect(result.data).toContain('29.99')
    })

    it('filters non-component nodes', () => {
      const component = createTestComponentNode({ id: 'comp-1', cost: 10 })
      const task = createTestTaskNode({ id: 'task-1' })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', component],
        ['task-1', task],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.lineItemCount).toBe(1)
    })
  })

  describe('quantity aggregation', () => {
    it('groups components with same part number', () => {
      const comp1 = createTestComponentNode({
        id: 'comp-1',
        title: 'Motor A',
        partNumber: 'MOT-001',
        cost: 25,
      })
      const comp2 = createTestComponentNode({
        id: 'comp-2',
        title: 'Motor B',
        partNumber: 'MOT-001',
        cost: 25,
      })
      const comp3 = createTestComponentNode({
        id: 'comp-3',
        title: 'Other Part',
        partNumber: 'OTH-001',
        cost: 10,
      })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', comp1],
        ['comp-2', comp2],
        ['comp-3', comp3],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.lineItemCount).toBe(2)
      // Check quantity of 2 for MOT-001
      const lines = result.data.split('\r\n')
      const mot001Line = lines.find((l) => l.includes('MOT-001'))
      expect(mot001Line).toContain(',2,') // Quantity column
    })

    it('calculates extended cost correctly', () => {
      const comp1 = createTestComponentNode({
        id: 'comp-1',
        partNumber: 'MOT-001',
        cost: 25,
      })
      const comp2 = createTestComponentNode({
        id: 'comp-2',
        partNumber: 'MOT-001',
        cost: 25,
      })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', comp1],
        ['comp-2', comp2],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      // Extended cost should be 25 * 2 = 50
      expect(result.totalCost).toBe(50)
      expect(result.data).toContain('50.00')
    })

    it('handles components without part numbers individually', () => {
      const comp1 = createTestComponentNode({
        id: 'custom-comp-1',
        title: 'Custom Part 1',
        partNumber: null,
        cost: 10,
      })
      const comp2 = createTestComponentNode({
        id: 'custom-comp-2',
        title: 'Custom Part 2',
        partNumber: null,
        cost: 20,
      })
      const nodes = new Map<string, ForgeNode>([
        ['custom-comp-1', comp1],
        ['custom-comp-2', comp2],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      // Each should be its own line item
      expect(result.lineItemCount).toBe(2)
      expect(result.totalCost).toBe(30)
    })
  })

  describe('cost handling', () => {
    it('sums costs correctly', () => {
      const comp1 = createTestComponentNode({
        id: 'comp-1',
        partNumber: 'A',
        cost: 10.5,
      })
      const comp2 = createTestComponentNode({
        id: 'comp-2',
        partNumber: 'B',
        cost: 25.25,
      })
      const comp3 = createTestComponentNode({
        id: 'comp-3',
        partNumber: 'C',
        cost: 100,
      })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', comp1],
        ['comp-2', comp2],
        ['comp-3', comp3],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.totalCost).toBe(135.75)
    })

    it('tracks unknown cost count', () => {
      const comp1 = createTestComponentNode({
        id: 'comp-1',
        partNumber: 'A',
        cost: 10,
      })
      const comp2 = createTestComponentNode({
        id: 'comp-2',
        partNumber: 'B',
        cost: null,
      })
      const comp3 = createTestComponentNode({
        id: 'comp-3',
        partNumber: 'C',
        cost: null,
      })
      const nodes = new Map<string, ForgeNode>([
        ['comp-1', comp1],
        ['comp-2', comp2],
        ['comp-3', comp3],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.totalCost).toBe(10)
      expect(result.unknownCostCount).toBe(2)
      expect(result.data).toContain('Unknown Cost Items:')
    })

    it('includes total row at bottom', () => {
      const comp = createTestComponentNode({
        id: 'comp-1',
        partNumber: 'A',
        cost: 99.99,
      })
      const nodes = new Map<string, ForgeNode>([['comp-1', comp]])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.data).toContain('Total:')
      expect(result.data).toContain('99.99')
    })
  })

  describe('sorting', () => {
    it('sorts by part number then description', () => {
      const compZ = createTestComponentNode({
        id: 'z',
        title: 'Z Part',
        partNumber: 'ZZZ-001',
      })
      const compA = createTestComponentNode({
        id: 'a',
        title: 'A Part',
        partNumber: 'AAA-001',
      })
      const compB = createTestComponentNode({
        id: 'b',
        title: 'B Part',
        partNumber: 'BBB-001',
      })
      const nodes = new Map<string, ForgeNode>([
        ['z', compZ],
        ['a', compA],
        ['b', compB],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      const lines = result.data.split('\r\n').filter((l) => l.includes('-001'))
      expect(lines[0]).toContain('AAA-001')
      expect(lines[1]).toContain('BBB-001')
      expect(lines[2]).toContain('ZZZ-001')
    })

    it('puts items without part numbers last', () => {
      const compWithPN = createTestComponentNode({
        id: 'with-pn',
        title: 'With PN',
        partNumber: 'AAA-001',
      })
      const compWithoutPN = createTestComponentNode({
        id: 'without-pn',
        title: 'Without PN',
        partNumber: null,
      })
      const nodes = new Map<string, ForgeNode>([
        ['with-pn', compWithPN],
        ['without-pn', compWithoutPN],
      ])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      const lines = result.data.split('\r\n')
      const dataLines = lines.slice(1).filter((l) => l.includes(','))
      // First data line should have part number, second should not
      expect(dataLines[0]).toContain('AAA-001')
      expect(dataLines[1]).toContain('Without PN')
    })
  })

  describe('output format', () => {
    it('includes UTF-8 BOM', () => {
      const project = createTestProject()

      const result = exportBOM(project)

      expect(result.data.charCodeAt(0)).toBe(0xfeff)
    })

    it('uses CRLF line endings', () => {
      const comp = createTestComponentNode({ id: 'comp-1' })
      const nodes = new Map<string, ForgeNode>([['comp-1', comp]])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      expect(result.data).toContain('\r\n')
    })

    it('generates filename with project name and date', () => {
      const project = createTestProject()
      project.name = 'My Hardware Project'

      const result = exportBOM(project)

      expect(result.filename).toMatch(
        /^my-hardware-project-bom-\d{4}-\d{2}-\d{2}\.csv$/
      )
    })

    it('escapes special characters in output', () => {
      const comp = createTestComponentNode({
        id: 'comp-1',
        title: 'Motor, "High-Power"',
        supplier: 'Acme, Inc.',
      })
      const nodes = new Map<string, ForgeNode>([['comp-1', comp]])
      const project = createTestProject(nodes)

      const result = exportBOM(project)

      // Check that commas and quotes are properly escaped
      expect(result.data).toContain('"Motor, ""High-Power"""')
      expect(result.data).toContain('"Acme, Inc."')
    })
  })
})
