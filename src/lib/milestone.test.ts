import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  groupTasksByMilestone,
  calculateMilestoneProgress,
  getAllMilestones,
  getPersistedMilestoneCollapseState,
  persistMilestoneCollapseState,
  MILESTONE_COLLAPSE_STATE_STORAGE_KEY,
  NO_MILESTONE_LABEL,
} from './outline'
import { NodeType, type TaskNode, type ForgeNode } from '@/types'

// ============================================================================
// Test Helpers
// ============================================================================

function createTaskNode(
  id: string,
  title: string,
  status: 'pending' | 'in_progress' | 'complete' | 'blocked' = 'pending',
  milestone?: string
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    tags: [],
    content: '',
    status,
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    milestone,
    dates: { created: new Date(), modified: new Date() },
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('calculateMilestoneProgress', () => {
  it('returns zero progress for empty array', () => {
    const progress = calculateMilestoneProgress([])
    expect(progress).toEqual({
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      blocked: 0,
      percentage: 0,
    })
  })

  it('calculates progress for pending tasks', () => {
    const tasks = [
      createTaskNode('1', 'Task 1', 'pending'),
      createTaskNode('2', 'Task 2', 'pending'),
    ]
    const progress = calculateMilestoneProgress(tasks)
    expect(progress.total).toBe(2)
    expect(progress.pending).toBe(2)
    expect(progress.percentage).toBe(0)
  })

  it('calculates progress for completed tasks', () => {
    const tasks = [
      createTaskNode('1', 'Task 1', 'complete'),
      createTaskNode('2', 'Task 2', 'complete'),
    ]
    const progress = calculateMilestoneProgress(tasks)
    expect(progress.completed).toBe(2)
    expect(progress.percentage).toBe(100)
  })

  it('calculates progress for mixed statuses', () => {
    const tasks = [
      createTaskNode('1', 'Task 1', 'complete'),
      createTaskNode('2', 'Task 2', 'in_progress'),
      createTaskNode('3', 'Task 3', 'pending'),
      createTaskNode('4', 'Task 4', 'blocked'),
    ]
    const progress = calculateMilestoneProgress(tasks)
    expect(progress.total).toBe(4)
    expect(progress.completed).toBe(1)
    expect(progress.inProgress).toBe(1)
    expect(progress.pending).toBe(1)
    expect(progress.blocked).toBe(1)
    expect(progress.percentage).toBe(25)
  })

  it('rounds percentage correctly', () => {
    const tasks = [
      createTaskNode('1', 'Task 1', 'complete'),
      createTaskNode('2', 'Task 2', 'pending'),
      createTaskNode('3', 'Task 3', 'pending'),
    ]
    const progress = calculateMilestoneProgress(tasks)
    expect(progress.percentage).toBe(33) // 1/3 = 33.33... -> 33
  })
})

describe('groupTasksByMilestone', () => {
  it('returns empty array for no nodes', () => {
    const groups = groupTasksByMilestone(new Map())
    expect(groups).toEqual([])
  })

  it('groups tasks by milestone', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Sprint 1')],
      ['2', createTaskNode('2', 'Task 2', 'pending', 'Sprint 2')],
      ['3', createTaskNode('3', 'Task 3', 'pending', 'Sprint 1')],
    ])

    const groups = groupTasksByMilestone(nodes)

    expect(groups).toHaveLength(2)
    expect(groups[0].milestone).toBe('Sprint 1')
    expect(groups[0].tasks).toHaveLength(2)
    expect(groups[1].milestone).toBe('Sprint 2')
    expect(groups[1].tasks).toHaveLength(1)
  })

  it('places tasks without milestone in "No Milestone" group', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Sprint 1')],
      ['2', createTaskNode('2', 'Task 2', 'pending', undefined)],
      ['3', createTaskNode('3', 'Task 3', 'pending', '')],
    ])

    const groups = groupTasksByMilestone(nodes)

    expect(groups).toHaveLength(2)
    const noMilestoneGroup = groups.find((g) => g.label === NO_MILESTONE_LABEL)
    expect(noMilestoneGroup).toBeDefined()
    expect(noMilestoneGroup?.tasks).toHaveLength(2)
  })

  it('sorts milestones alphabetically with "No Milestone" last', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Zebra')],
      ['2', createTaskNode('2', 'Task 2', 'pending', 'Alpha')],
      ['3', createTaskNode('3', 'Task 3', 'pending', undefined)],
    ])

    const groups = groupTasksByMilestone(nodes)

    expect(groups[0].milestone).toBe('Alpha')
    expect(groups[1].milestone).toBe('Zebra')
    expect(groups[2].label).toBe(NO_MILESTONE_LABEL)
  })

  it('includes progress information for each group', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'complete', 'Sprint 1')],
      ['2', createTaskNode('2', 'Task 2', 'pending', 'Sprint 1')],
    ])

    const groups = groupTasksByMilestone(nodes)

    expect(groups[0].progress.total).toBe(2)
    expect(groups[0].progress.completed).toBe(1)
    expect(groups[0].progress.percentage).toBe(50)
  })

  it('filters out non-task nodes', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Sprint 1')],
      [
        '2',
        {
          id: '2',
          type: NodeType.Note,
          title: 'Note',
          tags: [],
          content: '',
          dates: { created: new Date(), modified: new Date() },
        } as ForgeNode,
      ],
    ])

    const groups = groupTasksByMilestone(nodes)

    expect(groups).toHaveLength(1)
    expect(groups[0].tasks).toHaveLength(1)
  })

  it('accepts array input', () => {
    const nodes = [
      createTaskNode('1', 'Task 1', 'pending', 'Sprint 1'),
      createTaskNode('2', 'Task 2', 'pending', 'Sprint 2'),
    ]

    const groups = groupTasksByMilestone(nodes)

    expect(groups).toHaveLength(2)
  })
})

describe('getAllMilestones', () => {
  it('returns empty array for no nodes', () => {
    expect(getAllMilestones(new Map())).toEqual([])
  })

  it('extracts unique milestones', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Sprint 1')],
      ['2', createTaskNode('2', 'Task 2', 'pending', 'Sprint 2')],
      ['3', createTaskNode('3', 'Task 3', 'pending', 'Sprint 1')],
    ])

    const milestones = getAllMilestones(nodes)

    expect(milestones).toEqual(['Sprint 1', 'Sprint 2'])
  })

  it('ignores tasks without milestone', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Sprint 1')],
      ['2', createTaskNode('2', 'Task 2', 'pending', undefined)],
    ])

    const milestones = getAllMilestones(nodes)

    expect(milestones).toEqual(['Sprint 1'])
  })

  it('ignores non-task nodes', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        '1',
        {
          id: '1',
          type: NodeType.Note,
          title: 'Note',
          tags: [],
          content: '',
          dates: { created: new Date(), modified: new Date() },
        } as ForgeNode,
      ],
    ])

    const milestones = getAllMilestones(nodes)

    expect(milestones).toEqual([])
  })

  it('returns sorted milestones', () => {
    const nodes = new Map<string, ForgeNode>([
      ['1', createTaskNode('1', 'Task 1', 'pending', 'Zebra')],
      ['2', createTaskNode('2', 'Task 2', 'pending', 'Alpha')],
    ])

    const milestones = getAllMilestones(nodes)

    expect(milestones).toEqual(['Alpha', 'Zebra'])
  })
})

describe('milestone collapse state persistence', () => {
  const mockStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  })

  describe('getPersistedMilestoneCollapseState', () => {
    it('returns empty object when nothing stored', () => {
      const state = getPersistedMilestoneCollapseState()
      expect(state).toEqual({})
    })

    it('returns stored state', () => {
      mockStorage[MILESTONE_COLLAPSE_STATE_STORAGE_KEY] = JSON.stringify({
        'Sprint 1': true,
        'Sprint 2': false,
      })

      const state = getPersistedMilestoneCollapseState()

      expect(state).toEqual({
        'Sprint 1': true,
        'Sprint 2': false,
      })
    })

    it('handles invalid JSON gracefully', () => {
      mockStorage[MILESTONE_COLLAPSE_STATE_STORAGE_KEY] = 'invalid json'

      const state = getPersistedMilestoneCollapseState()

      expect(state).toEqual({})
    })
  })

  describe('persistMilestoneCollapseState', () => {
    it('persists state to localStorage', () => {
      const state = { 'Sprint 1': true, 'Sprint 2': false }

      persistMilestoneCollapseState(state)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        MILESTONE_COLLAPSE_STATE_STORAGE_KEY,
        JSON.stringify(state)
      )
    })
  })
})
