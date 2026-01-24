/**
 * Tests for Runtime Validation with Zod
 */

import { describe, it, expect } from 'vitest'
import {
  validateNode,
  validateFrontmatter,
  isValidDecisionNode,
  isValidComponentNode,
  isValidTaskNode,
  isValidNoteNode,
  decisionNodeSchema,
  componentNodeSchema,
  taskNodeSchema,
  noteNodeSchema,
  decisionFrontmatterSchema,
  componentFrontmatterSchema,
  taskFrontmatterSchema,
  noteFrontmatterSchema,
} from './validation'
import { NodeType } from '../types/nodes'

// ============================================================================
// Sample Valid Node Data
// ============================================================================

const validDecisionData = {
  id: 'motor-selection',
  type: 'decision',
  title: 'Motor Selection',
  status: 'pending',
  selected: null,
  options: [],
  criteria: [],
  tags: ['motor', 'electronics'],
  content: 'Comparing motor options.',
}

const validComponentData = {
  id: 'nema-17-stepper',
  type: 'component',
  title: 'NEMA 17 Stepper',
  status: 'considering',
  cost: 24.99,
  supplier: 'Pololu',
  partNumber: '2267',
  customFields: { voltage: 12, torque: '5Nm' },
  tags: ['motor', 'actuator'],
  content: 'Stepper motor specs.',
}

const validTaskData = {
  id: 'wire-motor',
  type: 'task',
  title: 'Wire Motor Controller',
  status: 'pending',
  priority: 'high',
  dependsOn: ['motor-selection'],
  blocks: ['final-assembly'],
  checklist: [],
  tags: ['electronics'],
  content: 'Connect the motor controller.',
}

const validNoteData = {
  id: 'research-notes',
  type: 'note',
  title: 'Research Notes',
  tags: ['research'],
  content: 'General notes about motors.',
  parent: null,
}

// ============================================================================
// validateNode Tests
// ============================================================================

describe('validateNode', () => {
  describe('valid nodes', () => {
    it('validates a decision node', () => {
      const result = validateNode(validDecisionData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(NodeType.Decision)
        expect(result.data.id).toBe('motor-selection')
        expect(result.data.title).toBe('Motor Selection')
      }
    })

    it('validates a component node', () => {
      const result = validateNode(validComponentData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(NodeType.Component)
        expect(result.data.id).toBe('nema-17-stepper')
      }
    })

    it('validates a task node', () => {
      const result = validateNode(validTaskData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(NodeType.Task)
        expect(result.data.id).toBe('wire-motor')
      }
    })

    it('validates a note node', () => {
      const result = validateNode(validNoteData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(NodeType.Note)
        expect(result.data.id).toBe('research-notes')
      }
    })

    it('adds default values for optional fields', () => {
      const minimalTask = {
        id: 'my-task',
        type: 'task',
        title: 'My Task',
      }

      const result = validateNode(minimalTask)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(NodeType.Task)
        expect(result.data.tags).toEqual([])
        expect(result.data.content).toBe('')
        // Check task-specific defaults
        if (result.data.type === NodeType.Task) {
          expect(result.data.status).toBe('pending')
          expect(result.data.priority).toBe('medium')
          expect(result.data.dependsOn).toEqual([])
          expect(result.data.blocks).toEqual([])
          expect(result.data.checklist).toEqual([])
        }
      }
    })

    it('transforms depends_on to dependsOn for task nodes', () => {
      const taskWithSnakeCase = {
        id: 'my-task',
        type: 'task',
        title: 'My Task',
        depends_on: ['task-1', 'task-2'],
        parent: null,
      }

      const result = validateNode(taskWithSnakeCase)

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Task) {
        expect(result.data.dependsOn).toEqual(['task-1', 'task-2'])
      }
    })

    it('creates dates object from created/modified fields', () => {
      const nodeWithDates = {
        id: 'my-node',
        type: 'note',
        title: 'My Note',
        created: '2024-01-15T10:00:00Z',
        modified: '2024-01-20T15:30:00Z',
      }

      const result = validateNode(nodeWithDates)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dates.created).toBeInstanceOf(Date)
        expect(result.data.dates.modified).toBeInstanceOf(Date)
        expect(result.data.dates.created.toISOString()).toBe(
          '2024-01-15T10:00:00.000Z'
        )
        expect(result.data.dates.modified.toISOString()).toBe(
          '2024-01-20T15:30:00.000Z'
        )
      }
    })

    it('creates default dates when not provided', () => {
      const nodeWithoutDates = {
        id: 'my-node',
        type: 'note',
        title: 'My Note',
      }

      const beforeTest = new Date()
      const result = validateNode(nodeWithoutDates)
      const afterTest = new Date()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dates.created).toBeInstanceOf(Date)
        expect(result.data.dates.modified).toBeInstanceOf(Date)
        // Dates should be between before and after test execution
        expect(result.data.dates.created.getTime()).toBeGreaterThanOrEqual(
          beforeTest.getTime()
        )
        expect(result.data.dates.created.getTime()).toBeLessThanOrEqual(
          afterTest.getTime()
        )
      }
    })
  })

  describe('missing required fields', () => {
    it('fails when type is missing', () => {
      const noType = { id: 'test', title: 'Test' }
      const result = validateNode(noType)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FIELD')
        expect(result.error.message).toContain('type')
      }
    })

    it('fails when id is missing', () => {
      const noId = { type: 'task', title: 'Test' }
      const result = validateNode(noId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FIELD')
        expect(result.error.message).toContain('id')
      }
    })

    it('fails when id is empty string', () => {
      const emptyId = { id: '', type: 'task', title: 'Test' }
      const result = validateNode(emptyId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FIELD')
        expect(result.error.message).toContain('id')
      }
    })

    it('fails when title is missing', () => {
      const noTitle = { id: 'test', type: 'task' }
      const result = validateNode(noTitle)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FIELD')
        expect(result.error.message).toContain('title')
      }
    })

    it('fails when title is empty string', () => {
      const emptyTitle = { id: 'test', type: 'task', title: '' }
      const result = validateNode(emptyTitle)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FIELD')
        expect(result.error.message).toContain('title')
      }
    })
  })

  describe('invalid field values', () => {
    it('fails for invalid node type', () => {
      const invalidType = { id: 'test', type: 'invalid', title: 'Test' }
      const result = validateNode(invalidType)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_VALUE')
        expect(result.error.message).toContain('invalid')
      }
    })

    it('fails for invalid decision status', () => {
      const invalidStatus = {
        id: 'test',
        type: 'decision',
        title: 'Test',
        status: 'invalid-status',
      }
      const result = validateNode(invalidStatus)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_VALUE')
      }
    })

    it('fails for invalid component status', () => {
      const invalidStatus = {
        id: 'test',
        type: 'component',
        title: 'Test',
        status: 'invalid-status',
      }
      const result = validateNode(invalidStatus)

      expect(result.success).toBe(false)
    })

    it('fails for invalid task status', () => {
      const invalidStatus = {
        id: 'test',
        type: 'task',
        title: 'Test',
        status: 'invalid-status',
      }
      const result = validateNode(invalidStatus)

      expect(result.success).toBe(false)
    })

    it('fails for invalid task priority', () => {
      const invalidPriority = {
        id: 'test',
        type: 'task',
        title: 'Test',
        priority: 'invalid-priority',
      }
      const result = validateNode(invalidPriority)

      expect(result.success).toBe(false)
    })
  })

  describe('error details', () => {
    it('includes path in error for nested field', () => {
      const invalidOption = {
        id: 'test',
        type: 'decision',
        title: 'Test',
        options: [{ id: 123, name: 'Option' }], // id should be string
      }
      const result = validateNode(invalidOption)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toBeDefined()
        expect(result.error.issues!.length).toBeGreaterThan(0)
      }
    })

    it('includes all validation issues', () => {
      const multipleErrors = {
        id: 'test',
        type: 'task',
        title: 'Test',
        status: 'invalid',
        priority: 'invalid',
      }
      const result = validateNode(multipleErrors)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toBeDefined()
        expect(result.error.issues!.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

// ============================================================================
// validateFrontmatter Tests
// ============================================================================

describe('validateFrontmatter', () => {
  it('validates decision frontmatter', () => {
    const frontmatter = {
      type: 'decision',
      status: 'pending',
      tags: ['motor'],
    }
    const result = validateFrontmatter(frontmatter)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('decision')
    }
  })

  it('validates component frontmatter', () => {
    const frontmatter = {
      type: 'component',
      status: 'selected',
      cost: 45.99,
      supplier: 'Pololu',
    }
    const result = validateFrontmatter(frontmatter)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('component')
    }
  })

  it('validates task frontmatter with snake_case depends_on', () => {
    const frontmatter = {
      type: 'task',
      status: 'in_progress',
      priority: 'high',
      depends_on: ['task-1', 'task-2'],
    }
    const result = validateFrontmatter(frontmatter)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === 'task') {
      expect(result.data.depends_on).toEqual(['task-1', 'task-2'])
    }
  })

  it('validates note frontmatter', () => {
    const frontmatter = {
      type: 'note',
      tags: ['research'],
    }
    const result = validateFrontmatter(frontmatter)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('note')
    }
  })

  it('fails for invalid type', () => {
    const frontmatter = { type: 'invalid' }
    const result = validateFrontmatter(frontmatter)

    expect(result.success).toBe(false)
  })

  it('fails for missing type', () => {
    const frontmatter = { status: 'pending' }
    const result = validateFrontmatter(frontmatter as Record<string, unknown>)

    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('type guards', () => {
  describe('isValidDecisionNode', () => {
    it('returns true for valid decision node', () => {
      expect(isValidDecisionNode(validDecisionData)).toBe(true)
    })

    it('returns false for invalid decision node', () => {
      expect(isValidDecisionNode({ ...validDecisionData, type: 'task' })).toBe(
        false
      )
    })

    it('returns false for missing required fields', () => {
      expect(isValidDecisionNode({ type: 'decision' })).toBe(false)
    })
  })

  describe('isValidComponentNode', () => {
    it('returns true for valid component node', () => {
      expect(isValidComponentNode(validComponentData)).toBe(true)
    })

    it('returns false for invalid component node', () => {
      expect(
        isValidComponentNode({ ...validComponentData, type: 'task' })
      ).toBe(false)
    })
  })

  describe('isValidTaskNode', () => {
    it('returns true for valid task node', () => {
      expect(isValidTaskNode(validTaskData)).toBe(true)
    })

    it('returns false for invalid task node', () => {
      expect(isValidTaskNode({ ...validTaskData, type: 'note' })).toBe(false)
    })
  })

  describe('isValidNoteNode', () => {
    it('returns true for valid note node', () => {
      expect(isValidNoteNode(validNoteData)).toBe(true)
    })

    it('returns false for invalid note node', () => {
      expect(isValidNoteNode({ ...validNoteData, type: 'task' })).toBe(false)
    })
  })
})

// ============================================================================
// Schema Tests
// ============================================================================

describe('individual schemas', () => {
  describe('decisionNodeSchema', () => {
    it('validates complete decision node', () => {
      const node = {
        id: 'test',
        type: 'decision',
        title: 'Test Decision',
        tags: ['test'],
        content: 'Content',
        status: 'pending',
        selected: null,
        options: [{ id: 'opt-1', name: 'Option 1', values: { score: 5 } }],
        criteria: [{ id: 'crit-1', name: 'Score', weight: 5 }],
        dates: { created: new Date(), modified: new Date() },
      }
      const result = decisionNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })

    it('provides defaults for optional fields', () => {
      const minimal = {
        id: 'test',
        type: 'decision',
        title: 'Test',
      }
      const result = decisionNodeSchema.safeParse(minimal)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('pending')
        expect(result.data.selected).toBeNull()
        expect(result.data.options).toEqual([])
        expect(result.data.criteria).toEqual([])
      }
    })
  })

  describe('componentNodeSchema', () => {
    it('validates complete component node', () => {
      const node = {
        id: 'test',
        type: 'component',
        title: 'Test Component',
        tags: ['test'],
        content: 'Content',
        status: 'considering',
        cost: 99.99,
        supplier: 'Supplier Inc',
        partNumber: 'ABC-123',
        customFields: { voltage: '12V' },
        dates: { created: new Date(), modified: new Date() },
      }
      const result = componentNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })

    it('allows null values for optional fields', () => {
      const node = {
        id: 'test',
        type: 'component',
        title: 'Test',
        cost: null,
        supplier: null,
        partNumber: null,
      }
      const result = componentNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })
  })

  describe('taskNodeSchema', () => {
    it('validates complete task node', () => {
      const node = {
        id: 'test',
        type: 'task',
        title: 'Test Task',
        tags: ['test'],
        content: 'Content',
        status: 'in_progress',
        priority: 'high',
        dependsOn: ['other-task'],
        blocks: ['blocked-task'],
        checklist: [{ id: 'item-1', text: 'Do thing', completed: false }],
        dates: { created: new Date(), modified: new Date() },
      }
      const result = taskNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })

    it('validates all task status values', () => {
      const statuses = ['pending', 'in_progress', 'blocked', 'complete']
      for (const status of statuses) {
        const node = { id: 'test', type: 'task', title: 'Test', status }
        const result = taskNodeSchema.safeParse(node)
        expect(result.success).toBe(true)
      }
    })

    it('validates all task priority values', () => {
      const priorities = ['high', 'medium', 'low']
      for (const priority of priorities) {
        const node = { id: 'test', type: 'task', title: 'Test', priority }
        const result = taskNodeSchema.safeParse(node)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('noteNodeSchema', () => {
    it('validates complete note node', () => {
      const node = {
        id: 'test',
        type: 'note',
        title: 'Test Note',
        tags: ['test'],
        content: 'Content',
        dates: { created: new Date(), modified: new Date() },
        parent: null,
      }
      const result = noteNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })

    it('validates minimal note node', () => {
      const node = { id: 'test', type: 'note', title: 'Test' }
      const result = noteNodeSchema.safeParse(node)

      expect(result.success).toBe(true)
    })
  })
})

describe('frontmatter schemas', () => {
  describe('decisionFrontmatterSchema', () => {
    it('validates decision frontmatter', () => {
      const fm = { type: 'decision', status: 'selected' }
      const result = decisionFrontmatterSchema.safeParse(fm)
      expect(result.success).toBe(true)
    })
  })

  describe('componentFrontmatterSchema', () => {
    it('validates component frontmatter', () => {
      const fm = {
        type: 'component',
        status: 'selected',
        cost: 10,
        supplier: 'Test',
      }
      const result = componentFrontmatterSchema.safeParse(fm)
      expect(result.success).toBe(true)
    })
  })

  describe('taskFrontmatterSchema', () => {
    it('validates task frontmatter with depends_on', () => {
      const fm = {
        type: 'task',
        status: 'pending',
        priority: 'low',
        depends_on: ['other'],
        parent: null,
      }
      const result = taskFrontmatterSchema.safeParse(fm)
      expect(result.success).toBe(true)
    })
  })

  describe('noteFrontmatterSchema', () => {
    it('validates note frontmatter', () => {
      const fm = { type: 'note', tags: ['research'] }
      const result = noteFrontmatterSchema.safeParse(fm)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('handles Date objects in dates field', () => {
    const node = {
      id: 'test',
      type: 'note',
      title: 'Test',
      dates: {
        created: new Date('2024-01-15'),
        modified: new Date('2024-01-20'),
      },
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dates.created).toBeInstanceOf(Date)
    }
  })

  it('handles numeric timestamps', () => {
    const timestamp = Date.now()
    const node = {
      id: 'test',
      type: 'note',
      title: 'Test',
      created: timestamp,
      modified: timestamp,
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dates.created).toBeInstanceOf(Date)
    }
  })

  it('handles invalid date strings gracefully', () => {
    const node = {
      id: 'test',
      type: 'note',
      title: 'Test',
      created: 'not-a-date',
      modified: 'also-not-a-date',
    }
    const result = validateNode(node)

    // Should still succeed but with current dates as fallback
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dates.created).toBeInstanceOf(Date)
    }
  })

  it('handles empty arrays correctly', () => {
    const node = {
      id: 'test',
      type: 'task',
      title: 'Test',
      tags: [],
      dependsOn: [],
      blocks: [],
      checklist: [],
      parent: null,
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Task) {
      expect(result.data.tags).toEqual([])
      expect(result.data.dependsOn).toEqual([])
      expect(result.data.blocks).toEqual([])
      expect(result.data.checklist).toEqual([])
    }
  })

  it('handles empty customFields object', () => {
    const node = {
      id: 'test',
      type: 'component',
      title: 'Test',
      customFields: {},
      parent: null,
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Component) {
      expect(result.data.customFields).toEqual({})
    }
  })

  it('handles customFields with mixed value types', () => {
    const node = {
      id: 'test',
      type: 'component',
      title: 'Test',
      customFields: {
        voltage: 12,
        unit: 'V',
        rating: 100,
        description: 'High power',
      },
      parent: null,
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Component) {
      expect(result.data.customFields.voltage).toBe(12)
      expect(result.data.customFields.unit).toBe('V')
    }
  })

  it('handles decision options with values', () => {
    const node = {
      id: 'test',
      type: 'decision',
      title: 'Test',
      options: [
        {
          id: 'opt-1',
          name: 'Option 1',
          values: { cost: 100, quality: 'high' },
        },
        {
          id: 'opt-2',
          name: 'Option 2',
          values: { cost: 50, quality: 'medium' },
        },
      ],
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Decision) {
      expect(result.data.options).toHaveLength(2)
      expect(result.data.options[0].values.cost).toBe(100)
    }
  })

  it('handles decision criteria with optional unit', () => {
    const node = {
      id: 'test',
      type: 'decision',
      title: 'Test',
      criteria: [
        { id: 'c1', name: 'Cost', weight: 8, unit: '$' },
        { id: 'c2', name: 'Quality', weight: 10 }, // no unit
      ],
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Decision) {
      expect(result.data.criteria).toHaveLength(2)
      expect(result.data.criteria[0].unit).toBe('$')
      expect(result.data.criteria[1].unit).toBeUndefined()
    }
  })

  it('handles task checklist items', () => {
    const node = {
      id: 'test',
      type: 'task',
      title: 'Test',
      checklist: [
        { id: 'i1', text: 'First item', completed: true },
        { id: 'i2', text: 'Second item', completed: false },
      ],
      parent: null,
    }
    const result = validateNode(node)

    expect(result.success).toBe(true)
    if (result.success && result.data.type === NodeType.Task) {
      expect(result.data.checklist).toHaveLength(2)
      expect(result.data.checklist[0].completed).toBe(true)
      expect(result.data.checklist[1].completed).toBe(false)
    }
  })
})

// ============================================================================
// Parent Linking Field Tests (Sprint 13 - Task 13.2)
// ============================================================================

describe('parent linking field', () => {
  describe('TaskNode with parent field', () => {
    it('should accept valid parent id', () => {
      const result = validateNode({
        id: 'task-1',
        type: 'task',
        title: 'Task with Parent',
        status: 'pending',
        priority: 'medium',
        parent: 'cannon-subsystem',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Task) {
        expect(result.data.parent).toBe('cannon-subsystem')
      }
    })

    it('should allow null parent', () => {
      const result = validateNode({
        id: 'task-1',
        type: 'task',
        title: 'Task without Parent',
        status: 'pending',
        priority: 'medium',
        parent: null,
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Task) {
        expect(result.data.parent).toBeNull()
      }
    })

    it('should default parent to null when not provided', () => {
      const result = validateNode({
        id: 'task-1',
        type: 'task',
        title: 'Task',
        status: 'pending',
        priority: 'medium',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Task) {
        expect(result.data.parent).toBeNull()
      }
    })
  })

  describe('ComponentNode with parent field', () => {
    it('should accept valid parent id', () => {
      const result = validateNode({
        id: 'comp-1',
        type: 'component',
        title: 'Component with Parent',
        status: 'considering',
        parent: 'drive-assembly',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Component) {
        expect(result.data.parent).toBe('drive-assembly')
      }
    })

    it('should default parent to null when not provided', () => {
      const result = validateNode({
        id: 'comp-1',
        type: 'component',
        title: 'Component',
        status: 'considering',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Component) {
        expect(result.data.parent).toBeNull()
      }
    })
  })

  describe('DecisionNode with parent field', () => {
    it('should accept valid parent id', () => {
      const result = validateNode({
        id: 'dec-1',
        type: 'decision',
        title: 'Decision with Parent',
        status: 'pending',
        parent: 'control-module',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Decision) {
        expect(result.data.parent).toBe('control-module')
      }
    })

    it('should default parent to null when not provided', () => {
      const result = validateNode({
        id: 'dec-1',
        type: 'decision',
        title: 'Decision',
        status: 'pending',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Decision) {
        expect(result.data.parent).toBeNull()
      }
    })
  })

  describe('NoteNode with parent field', () => {
    it('should accept valid parent id', () => {
      const result = validateNode({
        id: 'note-1',
        type: 'note',
        title: 'Note with Parent',
        parent: 'propulsion-subsystem',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Note) {
        expect(result.data.parent).toBe('propulsion-subsystem')
      }
    })

    it('should default parent to null when not provided', () => {
      const result = validateNode({
        id: 'note-1',
        type: 'note',
        title: 'Note',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === NodeType.Note) {
        expect(result.data.parent).toBeNull()
      }
    })
  })

  describe('frontmatter parsing with parent field', () => {
    it('should parse parent from task frontmatter', () => {
      const result = validateFrontmatter({
        type: 'task',
        status: 'pending',
        priority: 'medium',
        parent: 'cannon-subsystem',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === 'task') {
        expect(result.data.parent).toBe('cannon-subsystem')
      }
    })

    it('should parse parent from component frontmatter', () => {
      const result = validateFrontmatter({
        type: 'component',
        status: 'considering',
        parent: 'drive-assembly',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === 'component') {
        expect(result.data.parent).toBe('drive-assembly')
      }
    })

    it('should parse parent from decision frontmatter', () => {
      const result = validateFrontmatter({
        type: 'decision',
        status: 'pending',
        parent: 'control-module',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === 'decision') {
        expect(result.data.parent).toBe('control-module')
      }
    })

    it('should parse parent from note frontmatter', () => {
      const result = validateFrontmatter({
        type: 'note',
        parent: 'propulsion-subsystem',
      })

      expect(result.success).toBe(true)
      if (result.success && result.data.type === 'note') {
        expect(result.data.parent).toBe('propulsion-subsystem')
      }
    })
  })
})
