/**
 * Sorting Utility Tests
 */

import { describe, it, expect } from 'vitest'

import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  NoteNode,
  ComponentNode,
} from '@/types/nodes'

import { sortNodes, DEFAULT_SORT, SORT_OPTIONS } from './sorting'

// ============================================================================
// Test Data Factories
// ============================================================================

const createTaskNode = (
  id: string,
  title: string,
  status: 'pending' | 'in_progress' | 'blocked' | 'complete' = 'pending',
  dates?: { created: Date; modified: Date }
): TaskNode => ({
  id,
  type: NodeType.Task,
  title,
  status,
  priority: 'medium',
  content: '',
  tags: [],
  dates: dates || createNodeDates(),
  dependsOn: [],
  blocks: [],
  checklist: [],
})

const createDecisionNode = (
  id: string,
  title: string,
  status: 'pending' | 'selected' = 'pending',
  dates?: { created: Date; modified: Date }
): DecisionNode => ({
  id,
  type: NodeType.Decision,
  title,
  status,
  selected: null,
  content: '',
  tags: [],
  dates: dates || createNodeDates(),
  options: [],
  criteria: [],
  rationale: null,
  selectedDate: null,
})

const createComponentNode = (
  id: string,
  title: string,
  status: 'considering' | 'selected' | 'rejected' = 'considering',
  dates?: { created: Date; modified: Date }
): ComponentNode => ({
  id,
  type: NodeType.Component,
  title,
  status,
  content: '',
  tags: [],
  dates: dates || createNodeDates(),
  cost: null,
  supplier: null,
  partNumber: null,
  customFields: {},
})

const createNoteNode = (
  id: string,
  title: string,
  dates?: { created: Date; modified: Date }
): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content: '',
  tags: [],
  dates: dates || createNodeDates(),
})

// ============================================================================
// Tests
// ============================================================================

describe('sortNodes', () => {
  describe('sort by title', () => {
    it('sorts alphabetically ascending', () => {
      const nodes: ForgeNode[] = [
        createNoteNode('c', 'Charlie'),
        createNoteNode('a', 'Alpha'),
        createNoteNode('b', 'Beta'),
      ]

      const sorted = sortNodes(nodes, 'title', 'asc')

      expect(sorted.map((n) => n.title)).toEqual(['Alpha', 'Beta', 'Charlie'])
    })

    it('sorts alphabetically descending', () => {
      const nodes: ForgeNode[] = [
        createNoteNode('a', 'Alpha'),
        createNoteNode('c', 'Charlie'),
        createNoteNode('b', 'Beta'),
      ]

      const sorted = sortNodes(nodes, 'title', 'desc')

      expect(sorted.map((n) => n.title)).toEqual(['Charlie', 'Beta', 'Alpha'])
    })

    it('is case-insensitive', () => {
      const nodes: ForgeNode[] = [
        createNoteNode('b', 'BETA'),
        createNoteNode('a', 'alpha'),
        createNoteNode('c', 'Charlie'),
      ]

      const sorted = sortNodes(nodes, 'title', 'asc')

      expect(sorted.map((n) => n.title)).toEqual(['alpha', 'BETA', 'Charlie'])
    })
  })

  describe('sort by type', () => {
    it('sorts by type order: Decision, Component, Task, Note', () => {
      const nodes: ForgeNode[] = [
        createNoteNode('note', 'Note'),
        createTaskNode('task', 'Task'),
        createDecisionNode('decision', 'Decision'),
        createComponentNode('component', 'Component'),
      ]

      const sorted = sortNodes(nodes, 'type', 'asc')

      expect(sorted.map((n) => n.type)).toEqual([
        NodeType.Decision,
        NodeType.Component,
        NodeType.Task,
        NodeType.Note,
      ])
    })

    it('reverses type order when descending', () => {
      const nodes: ForgeNode[] = [
        createDecisionNode('decision', 'Decision'),
        createComponentNode('component', 'Component'),
        createTaskNode('task', 'Task'),
        createNoteNode('note', 'Note'),
      ]

      const sorted = sortNodes(nodes, 'type', 'desc')

      expect(sorted.map((n) => n.type)).toEqual([
        NodeType.Note,
        NodeType.Task,
        NodeType.Component,
        NodeType.Decision,
      ])
    })
  })

  describe('sort by status', () => {
    it('sorts task statuses: in_progress, pending, blocked, complete', () => {
      const nodes: ForgeNode[] = [
        createTaskNode('complete', 'Complete', 'complete'),
        createTaskNode('pending', 'Pending', 'pending'),
        createTaskNode('in_progress', 'In Progress', 'in_progress'),
        createTaskNode('blocked', 'Blocked', 'blocked'),
      ]

      const sorted = sortNodes(nodes, 'status', 'asc')

      expect(sorted.map((n) => n.id)).toEqual([
        'in_progress',
        'pending',
        'blocked',
        'complete',
      ])
    })

    it('sorts component statuses: considering, selected, rejected', () => {
      const nodes: ForgeNode[] = [
        createComponentNode('rejected', 'Rejected', 'rejected'),
        createComponentNode('selected', 'Selected', 'selected'),
        createComponentNode('considering', 'Considering', 'considering'),
      ]

      const sorted = sortNodes(nodes, 'status', 'asc')

      expect(sorted.map((n) => n.id)).toEqual([
        'considering',
        'selected',
        'rejected',
      ])
    })

    it('handles nodes without status (Note)', () => {
      const nodes: ForgeNode[] = [
        createTaskNode('task', 'Task', 'pending'),
        createNoteNode('note', 'Note'),
        createComponentNode('component', 'Component', 'considering'),
      ]

      const sorted = sortNodes(nodes, 'status', 'asc')

      // Nodes without status sort to the end
      expect(sorted[2].id).toBe('note')
    })

    it('reverses status order when descending', () => {
      const nodes: ForgeNode[] = [
        createTaskNode('in_progress', 'In Progress', 'in_progress'),
        createTaskNode('complete', 'Complete', 'complete'),
      ]

      const sorted = sortNodes(nodes, 'status', 'desc')

      expect(sorted[0].id).toBe('complete')
      expect(sorted[1].id).toBe('in_progress')
    })
  })

  describe('sort by modified date', () => {
    it('sorts by modified date ascending (oldest first)', () => {
      const jan1 = new Date('2024-01-01')
      const jan15 = new Date('2024-01-15')
      const jan30 = new Date('2024-01-30')

      const nodes: ForgeNode[] = [
        createNoteNode('middle', 'Middle', { created: jan1, modified: jan15 }),
        createNoteNode('newest', 'Newest', { created: jan1, modified: jan30 }),
        createNoteNode('oldest', 'Oldest', { created: jan1, modified: jan1 }),
      ]

      const sorted = sortNodes(nodes, 'modified', 'asc')

      expect(sorted.map((n) => n.id)).toEqual(['oldest', 'middle', 'newest'])
    })

    it('sorts by modified date descending (newest first)', () => {
      const jan1 = new Date('2024-01-01')
      const jan15 = new Date('2024-01-15')
      const jan30 = new Date('2024-01-30')

      const nodes: ForgeNode[] = [
        createNoteNode('oldest', 'Oldest', { created: jan1, modified: jan1 }),
        createNoteNode('newest', 'Newest', { created: jan1, modified: jan30 }),
        createNoteNode('middle', 'Middle', { created: jan1, modified: jan15 }),
      ]

      const sorted = sortNodes(nodes, 'modified', 'desc')

      expect(sorted.map((n) => n.id)).toEqual(['newest', 'middle', 'oldest'])
    })
  })

  describe('sort by created date', () => {
    it('sorts by created date ascending (oldest first)', () => {
      const jan1 = new Date('2024-01-01')
      const jan15 = new Date('2024-01-15')
      const jan30 = new Date('2024-01-30')

      const nodes: ForgeNode[] = [
        createNoteNode('middle', 'Middle', { created: jan15, modified: jan15 }),
        createNoteNode('newest', 'Newest', { created: jan30, modified: jan30 }),
        createNoteNode('oldest', 'Oldest', { created: jan1, modified: jan1 }),
      ]

      const sorted = sortNodes(nodes, 'created', 'asc')

      expect(sorted.map((n) => n.id)).toEqual(['oldest', 'middle', 'newest'])
    })

    it('sorts by created date descending (newest first)', () => {
      const jan1 = new Date('2024-01-01')
      const jan15 = new Date('2024-01-15')
      const jan30 = new Date('2024-01-30')

      const nodes: ForgeNode[] = [
        createNoteNode('oldest', 'Oldest', { created: jan1, modified: jan1 }),
        createNoteNode('middle', 'Middle', { created: jan15, modified: jan15 }),
        createNoteNode('newest', 'Newest', { created: jan30, modified: jan30 }),
      ]

      const sorted = sortNodes(nodes, 'created', 'desc')

      expect(sorted.map((n) => n.id)).toEqual(['newest', 'middle', 'oldest'])
    })
  })

  describe('stable sort', () => {
    it('preserves original order for equal elements', () => {
      const sameDate = new Date('2024-01-15')
      const nodes: ForgeNode[] = [
        createNoteNode('first', 'Note A', {
          created: sameDate,
          modified: sameDate,
        }),
        createNoteNode('second', 'Note B', {
          created: sameDate,
          modified: sameDate,
        }),
        createNoteNode('third', 'Note C', {
          created: sameDate,
          modified: sameDate,
        }),
      ]

      const sorted = sortNodes(nodes, 'modified', 'asc')

      // Original order should be preserved since all have same modified date
      expect(sorted.map((n) => n.id)).toEqual(['first', 'second', 'third'])
    })

    it('preserves order for items with same sort key in descending', () => {
      const nodes: ForgeNode[] = [
        createTaskNode('task1', 'Task 1', 'pending'),
        createTaskNode('task2', 'Task 2', 'pending'),
        createTaskNode('task3', 'Task 3', 'pending'),
      ]

      const sorted = sortNodes(nodes, 'status', 'desc')

      // Original order preserved when status is equal
      expect(sorted.map((n) => n.id)).toEqual(['task1', 'task2', 'task3'])
    })
  })

  describe('empty array', () => {
    it('returns empty array for empty input', () => {
      const sorted = sortNodes([], 'title', 'asc')
      expect(sorted).toEqual([])
    })
  })

  describe('single item', () => {
    it('returns same array for single item', () => {
      const nodes: ForgeNode[] = [createNoteNode('only', 'Only Node')]
      const sorted = sortNodes(nodes, 'title', 'asc')

      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('only')
    })
  })

  describe('does not mutate original array', () => {
    it('returns a new array', () => {
      const nodes: ForgeNode[] = [
        createNoteNode('b', 'Beta'),
        createNoteNode('a', 'Alpha'),
      ]

      const sorted = sortNodes(nodes, 'title', 'asc')

      expect(sorted).not.toBe(nodes)
      expect(nodes[0].id).toBe('b') // Original unchanged
      expect(sorted[0].id).toBe('a')
    })
  })
})

describe('DEFAULT_SORT', () => {
  it('defaults to modified descending', () => {
    expect(DEFAULT_SORT.sortBy).toBe('modified')
    expect(DEFAULT_SORT.direction).toBe('desc')
  })
})

describe('SORT_OPTIONS', () => {
  it('includes all sort options', () => {
    const values = SORT_OPTIONS.map((o) => o.value)

    expect(values).toContain('modified')
    expect(values).toContain('created')
    expect(values).toContain('title')
    expect(values).toContain('type')
    expect(values).toContain('status')
  })

  it('has labels for all options', () => {
    SORT_OPTIONS.forEach((option) => {
      expect(option.label).toBeTruthy()
      expect(typeof option.label).toBe('string')
    })
  })
})
