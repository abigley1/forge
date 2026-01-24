/**
 * Tests for outline utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  groupNodesByType,
  getNodeCountsByType,
  getPersistedCollapseState,
  persistCollapseState,
  NODE_TYPE_ORDER,
  NODE_TYPE_LABELS,
  COLLAPSE_STATE_STORAGE_KEY,
  type CollapseState,
} from './outline'
import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  ForgeNode,
} from '@/types/nodes'

// ============================================================================
// Test Fixtures
// ============================================================================

function createTaskNode(id: string, title: string): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
  }
}

function createDecisionNode(id: string, title: string): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    parent: null,
  }
}

function createComponentNode(id: string, title: string): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    parent: null,
  }
}

function createNoteNode(id: string, title: string): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    parent: null,
  }
}

// ============================================================================
// groupNodesByType Tests
// ============================================================================

describe('groupNodesByType', () => {
  it('groups nodes by type in correct order', () => {
    const nodes = new Map<string, ForgeNode>([
      ['note1', createNoteNode('note1', 'Note 1')],
      ['task1', createTaskNode('task1', 'Task 1')],
      ['decision1', createDecisionNode('decision1', 'Decision 1')],
      ['component1', createComponentNode('component1', 'Component 1')],
    ])

    const groups = groupNodesByType(nodes)

    expect(groups).toHaveLength(7)
    expect(groups[0].type).toBe(NodeType.Task)
    expect(groups[1].type).toBe(NodeType.Decision)
    expect(groups[2].type).toBe(NodeType.Component)
    expect(groups[3].type).toBe(NodeType.Note)
    expect(groups[4].type).toBe(NodeType.Subsystem)
    expect(groups[5].type).toBe(NodeType.Assembly)
    expect(groups[6].type).toBe(NodeType.Module)
  })

  it('includes empty groups by default', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task1', createTaskNode('task1', 'Task 1')],
    ])

    const groups = groupNodesByType(nodes)

    expect(groups).toHaveLength(7)
    expect(groups[0].nodes).toHaveLength(1) // Tasks
    expect(groups[1].nodes).toHaveLength(0) // Decisions
    expect(groups[2].nodes).toHaveLength(0) // Components
    expect(groups[3].nodes).toHaveLength(0) // Notes
    expect(groups[4].nodes).toHaveLength(0) // Subsystems
    expect(groups[5].nodes).toHaveLength(0) // Assemblies
    expect(groups[6].nodes).toHaveLength(0) // Modules
  })

  it('can exclude empty groups', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task1', createTaskNode('task1', 'Task 1')],
    ])

    const groups = groupNodesByType(nodes, false)

    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe(NodeType.Task)
  })

  it('handles empty input', () => {
    const groups = groupNodesByType(new Map())

    expect(groups).toHaveLength(7)
    groups.forEach((group) => {
      expect(group.nodes).toHaveLength(0)
    })
  })

  it('accepts array input', () => {
    const nodes: ForgeNode[] = [
      createTaskNode('task1', 'Task 1'),
      createTaskNode('task2', 'Task 2'),
    ]

    const groups = groupNodesByType(nodes)

    expect(groups[0].nodes).toHaveLength(2)
  })

  it('sets correct labels', () => {
    const groups = groupNodesByType(new Map())

    expect(groups[0].label).toBe('Tasks')
    expect(groups[1].label).toBe('Decisions')
    expect(groups[2].label).toBe('Components')
    expect(groups[3].label).toBe('Notes')
  })

  it('groups multiple nodes of same type together', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task1', createTaskNode('task1', 'Task 1')],
      ['task2', createTaskNode('task2', 'Task 2')],
      ['task3', createTaskNode('task3', 'Task 3')],
    ])

    const groups = groupNodesByType(nodes)
    const taskGroup = groups.find((g) => g.type === NodeType.Task)

    expect(taskGroup?.nodes).toHaveLength(3)
  })
})

// ============================================================================
// getNodeCountsByType Tests
// ============================================================================

describe('getNodeCountsByType', () => {
  it('counts nodes by type', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task1', createTaskNode('task1', 'Task 1')],
      ['task2', createTaskNode('task2', 'Task 2')],
      ['note1', createNoteNode('note1', 'Note 1')],
    ])

    const counts = getNodeCountsByType(nodes)

    expect(counts[NodeType.Task]).toBe(2)
    expect(counts[NodeType.Decision]).toBe(0)
    expect(counts[NodeType.Component]).toBe(0)
    expect(counts[NodeType.Note]).toBe(1)
  })

  it('handles empty input', () => {
    const counts = getNodeCountsByType(new Map())

    expect(counts[NodeType.Task]).toBe(0)
    expect(counts[NodeType.Decision]).toBe(0)
    expect(counts[NodeType.Component]).toBe(0)
    expect(counts[NodeType.Note]).toBe(0)
  })

  it('accepts array input', () => {
    const nodes: ForgeNode[] = [
      createTaskNode('task1', 'Task 1'),
      createDecisionNode('decision1', 'Decision 1'),
    ]

    const counts = getNodeCountsByType(nodes)

    expect(counts[NodeType.Task]).toBe(1)
    expect(counts[NodeType.Decision]).toBe(1)
  })
})

// ============================================================================
// localStorage persistence Tests
// ============================================================================

describe('localStorage persistence', () => {
  const mockLocalStorage: Record<string, string> = {}

  beforeEach(() => {
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => mockLocalStorage[key] ?? null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value
    })
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPersistedCollapseState', () => {
    it('returns empty object when no stored state', () => {
      const state = getPersistedCollapseState()
      expect(state).toEqual({})
    })

    it('returns stored state', () => {
      const storedState: CollapseState = { task: true, decision: false }
      mockLocalStorage[COLLAPSE_STATE_STORAGE_KEY] = JSON.stringify(storedState)

      const state = getPersistedCollapseState()

      expect(state).toEqual(storedState)
    })

    it('handles invalid JSON', () => {
      mockLocalStorage[COLLAPSE_STATE_STORAGE_KEY] = 'invalid json'

      const state = getPersistedCollapseState()

      expect(state).toEqual({})
    })

    it('handles non-object values', () => {
      mockLocalStorage[COLLAPSE_STATE_STORAGE_KEY] = '"string"'

      const state = getPersistedCollapseState()

      expect(state).toEqual({})
    })
  })

  describe('persistCollapseState', () => {
    it('saves state to localStorage', () => {
      const state: CollapseState = { task: true, note: false }

      persistCollapseState(state)

      expect(mockLocalStorage[COLLAPSE_STATE_STORAGE_KEY]).toBe(
        JSON.stringify(state)
      )
    })

    it('handles storage errors gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })

      // Should not throw
      expect(() => persistCollapseState({ task: true })).not.toThrow()
    })
  })
})

// ============================================================================
// Constants Tests
// ============================================================================

describe('constants', () => {
  it('NODE_TYPE_ORDER contains all types', () => {
    expect(NODE_TYPE_ORDER).toContain(NodeType.Task)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Decision)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Component)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Note)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Subsystem)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Assembly)
    expect(NODE_TYPE_ORDER).toContain(NodeType.Module)
    expect(NODE_TYPE_ORDER).toHaveLength(7)
  })

  it('NODE_TYPE_LABELS has labels for all types', () => {
    expect(NODE_TYPE_LABELS[NodeType.Task]).toBe('Tasks')
    expect(NODE_TYPE_LABELS[NodeType.Decision]).toBe('Decisions')
    expect(NODE_TYPE_LABELS[NodeType.Component]).toBe('Components')
    expect(NODE_TYPE_LABELS[NodeType.Note]).toBe('Notes')
    expect(NODE_TYPE_LABELS[NodeType.Subsystem]).toBe('Subsystems')
    expect(NODE_TYPE_LABELS[NodeType.Assembly]).toBe('Assemblies')
    expect(NODE_TYPE_LABELS[NodeType.Module]).toBe('Modules')
  })
})
