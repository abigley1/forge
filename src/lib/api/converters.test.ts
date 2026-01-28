/**
 * Converter Tests
 *
 * Tests for API type converters between ApiNode and ForgeNode.
 */

import { describe, it, expect } from 'vitest'
import {
  apiNodeToForgeNode,
  apiNodesToForgeNodes,
  forgeNodeToCreateInput,
  forgeNodeToUpdateInput,
} from './converters'
import type { ApiNode } from './types'
import type {
  TaskNode,
  ComponentNode,
  DecisionNode,
  NoteNode,
} from '@/types/nodes'

describe('apiNodeToForgeNode', () => {
  it('converts a task node', () => {
    const apiNode: ApiNode = {
      id: 'task-1',
      project_id: 'project-1',
      type: 'task',
      title: 'Test Task',
      content: 'Task content',
      status: 'in_progress',
      priority: 'high',
      parent_id: 'parent-1',
      milestone: 'v1.0',
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-02T00:00:00.000Z',
      tags: ['urgent', 'review'],
      depends_on: ['dep-1', 'dep-2'],
      checklist: [
        { id: 'item-1', text: 'Step 1', completed: true },
        { id: 'item-2', text: 'Step 2', completed: false },
      ],
    }

    const forgeNode = apiNodeToForgeNode(apiNode) as TaskNode

    expect(forgeNode.id).toBe('task-1')
    expect(forgeNode.type).toBe('task')
    expect(forgeNode.title).toBe('Test Task')
    expect(forgeNode.content).toBe('Task content')
    expect(forgeNode.status).toBe('in_progress')
    expect(forgeNode.priority).toBe('high')
    expect(forgeNode.parent).toBe('parent-1')
    expect(forgeNode.milestone).toBe('v1.0')
    expect(forgeNode.tags).toEqual(['urgent', 'review'])
    expect(forgeNode.dependsOn).toEqual(['dep-1', 'dep-2'])
    expect(forgeNode.checklist).toHaveLength(2)
    expect(forgeNode.dates.created).toEqual(
      new Date('2024-01-01T00:00:00.000Z')
    )
    expect(forgeNode.dates.modified).toEqual(
      new Date('2024-01-02T00:00:00.000Z')
    )
  })

  it('converts a component node', () => {
    const apiNode: ApiNode = {
      id: 'component-1',
      project_id: 'project-1',
      type: 'component',
      title: 'Motor',
      content: 'Brushless DC motor',
      status: 'selected',
      priority: null,
      parent_id: null,
      milestone: null,
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-01T00:00:00.000Z',
      tags: ['electronics'],
      depends_on: [],
      supplier: 'DigiKey',
      part_number: 'MOTOR-123',
      cost: 49.99,
      custom_fields: { torque: 5, voltage: 24 },
    }

    const forgeNode = apiNodeToForgeNode(apiNode) as ComponentNode

    expect(forgeNode.type).toBe('component')
    expect(forgeNode.status).toBe('selected')
    expect(forgeNode.supplier).toBe('DigiKey')
    expect(forgeNode.partNumber).toBe('MOTOR-123')
    expect(forgeNode.cost).toBe(49.99)
    expect(forgeNode.customFields).toEqual({ torque: 5, voltage: 24 })
  })

  it('converts a decision node', () => {
    const apiNode: ApiNode = {
      id: 'decision-1',
      project_id: 'project-1',
      type: 'decision',
      title: 'Motor Selection',
      content: 'Choosing between motors',
      status: 'selected',
      priority: null,
      parent_id: 'subsystem-1',
      milestone: null,
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-01T00:00:00.000Z',
      tags: [],
      depends_on: [],
      selected_option: 'option-1',
      selection_rationale: 'Best performance/cost ratio',
      selected_date: '2024-01-15T00:00:00.000Z',
      comparison_data: {
        options: [
          { id: 'option-1', name: 'Motor A', values: { cost: 50 } },
          { id: 'option-2', name: 'Motor B', values: { cost: 75 } },
        ],
        criteria: [{ id: 'crit-1', name: 'Cost', weight: 8 }],
      },
    }

    const forgeNode = apiNodeToForgeNode(apiNode) as DecisionNode

    expect(forgeNode.type).toBe('decision')
    expect(forgeNode.status).toBe('selected')
    expect(forgeNode.selected).toBe('option-1')
    expect(forgeNode.rationale).toBe('Best performance/cost ratio')
    expect(forgeNode.selectedDate).toEqual(new Date('2024-01-15T00:00:00.000Z'))
    expect(forgeNode.options).toHaveLength(2)
    expect(forgeNode.criteria).toHaveLength(1)
  })

  it('converts a note node', () => {
    const apiNode: ApiNode = {
      id: 'note-1',
      project_id: 'project-1',
      type: 'note',
      title: 'Meeting Notes',
      content: '# Notes\n\nSome content',
      status: null,
      priority: null,
      parent_id: null,
      milestone: null,
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-01T00:00:00.000Z',
      tags: ['meeting'],
      depends_on: [],
    }

    const forgeNode = apiNodeToForgeNode(apiNode) as NoteNode

    expect(forgeNode.type).toBe('note')
    expect(forgeNode.title).toBe('Meeting Notes')
    expect(forgeNode.parent).toBeNull()
  })

  it('computes blocks from all nodes', () => {
    const taskA: ApiNode = {
      id: 'task-a',
      project_id: 'project-1',
      type: 'task',
      title: 'Task A',
      content: '',
      status: 'pending',
      priority: 'medium',
      parent_id: null,
      milestone: null,
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-01T00:00:00.000Z',
      tags: [],
      depends_on: [],
    }

    const taskB: ApiNode = {
      id: 'task-b',
      project_id: 'project-1',
      type: 'task',
      title: 'Task B',
      content: '',
      status: 'pending',
      priority: 'medium',
      parent_id: null,
      milestone: null,
      created_at: '2024-01-01T00:00:00.000Z',
      modified_at: '2024-01-01T00:00:00.000Z',
      tags: [],
      depends_on: ['task-a'], // B depends on A
    }

    const allNodes = new Map([
      ['task-a', taskA],
      ['task-b', taskB],
    ])

    const forgeNodeA = apiNodeToForgeNode(taskA, allNodes) as TaskNode
    const forgeNodeB = apiNodeToForgeNode(taskB, allNodes) as TaskNode

    // A blocks B
    expect(forgeNodeA.blocks).toContain('task-b')
    // B doesn't block anyone
    expect(forgeNodeB.blocks).toEqual([])
  })
})

describe('apiNodesToForgeNodes', () => {
  it('converts multiple nodes and computes relationships', () => {
    const apiNodes: ApiNode[] = [
      {
        id: 'task-1',
        project_id: 'project-1',
        type: 'task',
        title: 'Task 1',
        content: '',
        status: 'complete',
        priority: 'medium',
        parent_id: null,
        milestone: null,
        created_at: '2024-01-01T00:00:00.000Z',
        modified_at: '2024-01-01T00:00:00.000Z',
        tags: [],
        depends_on: [],
      },
      {
        id: 'task-2',
        project_id: 'project-1',
        type: 'task',
        title: 'Task 2',
        content: '',
        status: 'pending',
        priority: 'high',
        parent_id: null,
        milestone: null,
        created_at: '2024-01-01T00:00:00.000Z',
        modified_at: '2024-01-01T00:00:00.000Z',
        tags: [],
        depends_on: ['task-1'],
      },
    ]

    const forgeNodes = apiNodesToForgeNodes(apiNodes)

    expect(forgeNodes.size).toBe(2)

    const task1 = forgeNodes.get('task-1') as TaskNode
    const task2 = forgeNodes.get('task-2') as TaskNode

    expect(task1.blocks).toContain('task-2')
    expect(task2.dependsOn).toContain('task-1')
  })
})

describe('forgeNodeToCreateInput', () => {
  it('converts a task node to create input', () => {
    const taskNode: TaskNode = {
      id: 'task-1',
      type: 'task',
      title: 'New Task',
      content: 'Task description',
      tags: ['priority'],
      dates: {
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-01'),
      },
      status: 'pending',
      priority: 'high',
      dependsOn: ['dep-1'],
      blocks: [],
      checklist: [{ id: 'item-1', text: 'Do thing', completed: false }],
      milestone: 'v1.0',
      parent: 'parent-1',
    }

    const input = forgeNodeToCreateInput(taskNode)

    expect(input.id).toBe('task-1')
    expect(input.type).toBe('task')
    expect(input.title).toBe('New Task')
    expect(input.status).toBe('pending')
    expect(input.priority).toBe('high')
    expect(input.depends_on).toEqual(['dep-1'])
    expect(input.milestone).toBe('v1.0')
    expect(input.parent_id).toBe('parent-1')
    expect(input.checklist).toHaveLength(1)
  })

  it('converts a decision node to create input', () => {
    const decisionNode: DecisionNode = {
      id: 'decision-1',
      type: 'decision',
      title: 'Choose Motor',
      content: '',
      tags: [],
      dates: {
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-01'),
      },
      status: 'selected',
      selected: 'opt-1',
      options: [{ id: 'opt-1', name: 'Option 1', values: {} }],
      criteria: [{ id: 'crit-1', name: 'Cost', weight: 5 }],
      rationale: 'Best value',
      selectedDate: new Date('2024-01-15'),
      parent: null,
    }

    const input = forgeNodeToCreateInput(decisionNode)

    expect(input.type).toBe('decision')
    expect(input.selected_option).toBe('opt-1')
    expect(input.selection_rationale).toBe('Best value')
    expect(input.selected_date).toContain('2024-01-15')
    expect(input.comparison_data).toEqual({
      options: decisionNode.options,
      criteria: decisionNode.criteria,
    })
  })
})

describe('forgeNodeToUpdateInput', () => {
  it('converts partial task updates', () => {
    const existingNode: TaskNode = {
      id: 'task-1',
      type: 'task',
      title: 'Original',
      content: '',
      tags: [],
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

    const updates: Partial<TaskNode> = {
      title: 'Updated',
      status: 'complete',
    }

    const input = forgeNodeToUpdateInput(existingNode, updates)

    expect(input.title).toBe('Updated')
    expect(input.status).toBe('complete')
    // Other fields should not be included
    expect(input.priority).toBeUndefined()
    expect(input.depends_on).toBeUndefined()
  })

  it('handles null values for clearing fields', () => {
    const existingNode: ComponentNode = {
      id: 'component-1',
      type: 'component',
      title: 'Component',
      content: '',
      tags: [],
      dates: {
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-01'),
      },
      status: 'selected',
      cost: 100,
      supplier: 'Supplier A',
      partNumber: 'PART-123',
      customFields: {},
      parent: null,
    }

    const updates: Partial<ComponentNode> = {
      cost: null,
      supplier: null,
    }

    const input = forgeNodeToUpdateInput(existingNode, updates)

    expect(input.cost).toBeNull()
    expect(input.supplier).toBeNull()
  })
})
