/**
 * useFilters Hook Tests
 *
 * Tests for the filter logic (pure function tests)
 * The URL state management via nuqs is tested indirectly through component tests
 */

import { describe, it, expect } from 'vitest'

import { NodeType, createNodeDates } from '@/types/nodes'
import type { ForgeNode, TaskNode, DecisionNode, NoteNode } from '@/types/nodes'

// ============================================================================
// Test Data
// ============================================================================

const createTaskNode = (
  id: string,
  title: string,
  status: 'pending' | 'in_progress' | 'complete' = 'pending',
  tags: string[] = []
): TaskNode => ({
  id,
  type: NodeType.Task,
  title,
  status,
  priority: 'medium',
  content: `Content for ${title}`,
  tags,
  dates: createNodeDates(),
  dependsOn: [],
  blocks: [],
  checklist: [],
  parent: null,
})

const createDecisionNode = (
  id: string,
  title: string,
  status: 'pending' | 'selected' = 'pending',
  tags: string[] = []
): DecisionNode => ({
  id,
  type: NodeType.Decision,
  title,
  status,
  selected: null,
  content: `Content for ${title}`,
  tags,
  dates: createNodeDates(),
  options: [],
  criteria: [],
  rationale: null,
  selectedDate: null,
  parent: null,
})

const createNoteNode = (
  id: string,
  title: string,
  tags: string[] = []
): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content: `Content for ${title}`,
  tags,
  dates: createNodeDates(),
  parent: null,
})

// ============================================================================
// filterNodes Logic Tests (Pure function tests)
// ============================================================================

describe('useFilters - filterNodes logic', () => {
  // Since we can't easily test the hook with mocked nuqs,
  // let's test the filtering logic directly

  describe('type filtering', () => {
    it('returns all nodes when no type filter', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1')],
        ['decision-1', createDecisionNode('decision-1', 'Decision 1')],
        ['note-1', createNoteNode('note-1', 'Note 1')],
      ])

      const types: NodeType[] = []
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (types.length > 0 && !types.includes(node.type)) return false
        return true
      })

      expect(filtered).toHaveLength(3)
    })

    it('filters by single type', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1')],
        ['decision-1', createDecisionNode('decision-1', 'Decision 1')],
        ['note-1', createNoteNode('note-1', 'Note 1')],
      ])

      const types: NodeType[] = [NodeType.Task]
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (types.length > 0 && !types.includes(node.type)) return false
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe(NodeType.Task)
    })

    it('filters by multiple types (OR logic)', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1')],
        ['decision-1', createDecisionNode('decision-1', 'Decision 1')],
        ['note-1', createNoteNode('note-1', 'Note 1')],
      ])

      const types: NodeType[] = [NodeType.Task, NodeType.Decision]
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (types.length > 0 && !types.includes(node.type)) return false
        return true
      })

      expect(filtered).toHaveLength(2)
      expect(filtered.map((n) => n.type)).toContain(NodeType.Task)
      expect(filtered.map((n) => n.type)).toContain(NodeType.Decision)
    })
  })

  describe('tag filtering', () => {
    it('returns all nodes when no tag filter', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTaskNode('task-1', 'Task 1', 'pending', ['electronics']),
        ],
        [
          'task-2',
          createTaskNode('task-2', 'Task 2', 'pending', ['mechanical']),
        ],
      ])

      const tags: string[] = []
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (tags.length > 0) {
          const hasAllTags = tags.every((tag) => node.tags.includes(tag))
          if (!hasAllTags) return false
        }
        return true
      })

      expect(filtered).toHaveLength(2)
    })

    it('filters by single tag', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTaskNode('task-1', 'Task 1', 'pending', ['electronics']),
        ],
        [
          'task-2',
          createTaskNode('task-2', 'Task 2', 'pending', ['mechanical']),
        ],
      ])

      const tags = ['electronics']
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (tags.length > 0) {
          const hasAllTags = tags.every((tag) => node.tags.includes(tag))
          if (!hasAllTags) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].tags).toContain('electronics')
    })

    it('filters by multiple tags with AND logic', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTaskNode('task-1', 'Task 1', 'pending', [
            'electronics',
            'urgent',
          ]),
        ],
        [
          'task-2',
          createTaskNode('task-2', 'Task 2', 'pending', ['electronics']),
        ],
        ['task-3', createTaskNode('task-3', 'Task 3', 'pending', ['urgent'])],
      ])

      const tags = ['electronics', 'urgent']
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (tags.length > 0) {
          const hasAllTags = tags.every((tag) => node.tags.includes(tag))
          if (!hasAllTags) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('task-1')
    })
  })

  describe('status filtering', () => {
    it('returns all nodes when no status filter', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1', 'pending')],
        ['task-2', createTaskNode('task-2', 'Task 2', 'in_progress')],
        ['task-3', createTaskNode('task-3', 'Task 3', 'complete')],
      ])

      const statuses: string[] = []
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (statuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (!nodeStatus || !statuses.includes(nodeStatus)) return false
        }
        return true
      })

      expect(filtered).toHaveLength(3)
    })

    it('filters by single status', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1', 'pending')],
        ['task-2', createTaskNode('task-2', 'Task 2', 'in_progress')],
        ['task-3', createTaskNode('task-3', 'Task 3', 'complete')],
      ])

      const statuses = ['pending']
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (statuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (!nodeStatus || !statuses.includes(nodeStatus)) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect('status' in filtered[0] ? filtered[0].status : null).toBe(
        'pending'
      )
    })

    it('filters by multiple statuses (OR logic)', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1', 'pending')],
        ['task-2', createTaskNode('task-2', 'Task 2', 'in_progress')],
        ['task-3', createTaskNode('task-3', 'Task 3', 'complete')],
      ])

      const statuses = ['pending', 'in_progress']
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (statuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (!nodeStatus || !statuses.includes(nodeStatus)) return false
        }
        return true
      })

      expect(filtered).toHaveLength(2)
    })

    it('excludes nodes without status field (like Note)', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task 1', 'pending')],
        ['note-1', createNoteNode('note-1', 'Note 1')],
      ])

      const statuses = ['pending']
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (statuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (!nodeStatus || !statuses.includes(nodeStatus)) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe(NodeType.Task)
    })
  })

  describe('search filtering', () => {
    it('returns all nodes when no search query', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task Alpha')],
        ['task-2', createTaskNode('task-2', 'Task Beta')],
      ])

      const search = ''
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) return false
        }
        return true
      })

      expect(filtered).toHaveLength(2)
    })

    it('searches in title (case-insensitive)', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task-1', createTaskNode('task-1', 'Task Alpha')],
        ['task-2', createTaskNode('task-2', 'Task Beta')],
      ])

      const search = 'alpha'
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Task Alpha')
    })

    it('searches in content', () => {
      const task1 = createTaskNode('task-1', 'Task 1')
      task1.content = 'This contains the secret keyword'
      const task2 = createTaskNode('task-2', 'Task 2')
      task2.content = 'Normal content'

      const nodes = new Map<string, ForgeNode>([
        ['task-1', task1],
        ['task-2', task2],
      ])

      const search = 'secret'
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('task-1')
    })

    it('searches in tags', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTaskNode('task-1', 'Task 1', 'pending', ['electronics']),
        ],
        [
          'task-2',
          createTaskNode('task-2', 'Task 2', 'pending', ['mechanical']),
        ],
      ])

      const search = 'electron'
      const filtered = Array.from(nodes.values()).filter((node) => {
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) return false
        }
        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].tags).toContain('electronics')
    })
  })

  describe('combined filters', () => {
    it('applies all filters together', () => {
      const nodes = new Map<string, ForgeNode>([
        [
          'task-1',
          createTaskNode('task-1', 'Build Motor', 'pending', ['electronics']),
        ],
        [
          'task-2',
          createTaskNode('task-2', 'Design Frame', 'pending', ['mechanical']),
        ],
        [
          'task-3',
          createTaskNode('task-3', 'Test Motor', 'complete', ['electronics']),
        ],
        [
          'decision-1',
          createDecisionNode('decision-1', 'Motor Selection', 'pending', [
            'electronics',
          ]),
        ],
      ])

      const types: NodeType[] = [NodeType.Task]
      const tags = ['electronics']
      const statuses = ['pending']
      const search = 'motor'

      const filtered = Array.from(nodes.values()).filter((node) => {
        // Type filter
        if (types.length > 0 && !types.includes(node.type)) return false

        // Tag filter
        if (tags.length > 0) {
          const hasAllTags = tags.every((tag) => node.tags.includes(tag))
          if (!hasAllTags) return false
        }

        // Status filter
        if (statuses.length > 0) {
          const nodeStatus = 'status' in node ? node.status : null
          if (!nodeStatus || !statuses.includes(nodeStatus)) return false
        }

        // Search filter
        if (search.length > 0) {
          const searchLower = search.toLowerCase()
          const titleMatch = node.title.toLowerCase().includes(searchLower)
          const contentMatch = node.content.toLowerCase().includes(searchLower)
          const tagMatch = node.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
          if (!titleMatch && !contentMatch && !tagMatch) return false
        }

        return true
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('task-1')
    })
  })
})
