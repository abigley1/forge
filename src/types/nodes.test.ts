import { describe, it, expect } from 'vitest'
import {
  NodeType,
  isDecisionNode,
  isComponentNode,
  isTaskNode,
  isNoteNode,
  isSubsystemNode,
  isAssemblyNode,
  isModuleNode,
  isContainerNode,
  createNodeDates,
  createChecklistItem,
  createDecisionOption,
  createDecisionCriterion,
  createSubsystemNode,
  createAssemblyNode,
  createModuleNode,
  type ForgeNode,
  type DecisionNode,
  type ComponentNode,
  type TaskNode,
  type NoteNode,
  type NodeDates,
} from './nodes'

// ============================================================================
// Test Fixtures
// ============================================================================

function createBaseDates(): NodeDates {
  return {
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-02'),
  }
}

function createTestDecisionNode(): DecisionNode {
  return {
    id: 'motor-choice',
    type: NodeType.Decision,
    title: 'Stepper Motor Choice',
    tags: ['electronics', 'motor'],
    dates: createBaseDates(),
    content: '# Motor selection for barrel rotation',
    status: 'pending',
    selected: null,
    options: [
      { id: 'opt-1', name: 'NEMA 17', values: { torque: 0.4, cost: 15 } },
      { id: 'opt-2', name: 'NEMA 23', values: { torque: 1.2, cost: 35 } },
    ],
    criteria: [
      { id: 'crit-1', name: 'Torque', weight: 8, unit: 'Nm' },
      { id: 'crit-2', name: 'Cost', weight: 5, unit: '$' },
    ],
    rationale: null,
    selectedDate: null,
    parent: null,
  }
}

function createTestComponentNode(): ComponentNode {
  return {
    id: 'stepper-17hs4401',
    type: NodeType.Component,
    title: 'NEMA 17 Stepper Motor',
    tags: ['electronics', 'motor'],
    dates: createBaseDates(),
    content: '# NEMA 17 Stepper specifications',
    status: 'selected',
    cost: 35.0,
    supplier: 'amazon',
    partNumber: '17HS4401',
    customFields: {
      torque: '1.2 Nm',
      voltage: 24,
      weight: '570g',
    },
    parent: null,
  }
}

function createTestTaskNode(): TaskNode {
  return {
    id: 'order-parts',
    type: NodeType.Task,
    title: 'Order Electronic Parts',
    tags: ['procurement'],
    dates: createBaseDates(),
    content: '# Parts to order',
    status: 'pending',
    priority: 'high',
    dependsOn: ['motor-choice', 'driver-choice'],
    blocks: ['assemble-electronics'],
    checklist: [
      { id: 'cl-1', text: 'Stepper motor', completed: true },
      { id: 'cl-2', text: 'Driver board', completed: false },
    ],
    parent: null,
  }
}

function createTestNoteNode(): NoteNode {
  return {
    id: 'design-ideas',
    type: NodeType.Note,
    title: 'Design Ideas',
    tags: ['design', 'brainstorm'],
    dates: createBaseDates(),
    content: '# Random ideas for the project',
    parent: null,
  }
}

// ============================================================================
// NodeType Enum Tests
// ============================================================================

describe('NodeType', () => {
  it('should have correct enum values', () => {
    expect(NodeType.Decision).toBe('decision')
    expect(NodeType.Component).toBe('component')
    expect(NodeType.Task).toBe('task')
    expect(NodeType.Note).toBe('note')
  })

  it('should have exactly 7 node types', () => {
    const values = Object.values(NodeType)
    expect(values).toHaveLength(7)
    expect(values).toContain('decision')
    expect(values).toContain('component')
    expect(values).toContain('task')
    expect(values).toContain('note')
    expect(values).toContain('subsystem')
    expect(values).toContain('assembly')
    expect(values).toContain('module')
  })
})

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('type guards', () => {
  describe('isDecisionNode', () => {
    it('should return true for DecisionNode', () => {
      const node = createTestDecisionNode()
      expect(isDecisionNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isDecisionNode(createTestComponentNode())).toBe(false)
      expect(isDecisionNode(createTestTaskNode())).toBe(false)
      expect(isDecisionNode(createTestNoteNode())).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createTestDecisionNode()
      if (isDecisionNode(node)) {
        // TypeScript should allow access to DecisionNode properties
        expect(node.status).toBe('pending')
        expect(node.selected).toBeNull()
        expect(node.options).toHaveLength(2)
        expect(node.criteria).toHaveLength(2)
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isComponentNode', () => {
    it('should return true for ComponentNode', () => {
      const node = createTestComponentNode()
      expect(isComponentNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isComponentNode(createTestDecisionNode())).toBe(false)
      expect(isComponentNode(createTestTaskNode())).toBe(false)
      expect(isComponentNode(createTestNoteNode())).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createTestComponentNode()
      if (isComponentNode(node)) {
        // TypeScript should allow access to ComponentNode properties
        expect(node.status).toBe('selected')
        expect(node.cost).toBe(35.0)
        expect(node.supplier).toBe('amazon')
        expect(node.partNumber).toBe('17HS4401')
        expect(node.customFields.torque).toBe('1.2 Nm')
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isTaskNode', () => {
    it('should return true for TaskNode', () => {
      const node = createTestTaskNode()
      expect(isTaskNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isTaskNode(createTestDecisionNode())).toBe(false)
      expect(isTaskNode(createTestComponentNode())).toBe(false)
      expect(isTaskNode(createTestNoteNode())).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createTestTaskNode()
      if (isTaskNode(node)) {
        // TypeScript should allow access to TaskNode properties
        expect(node.status).toBe('pending')
        expect(node.priority).toBe('high')
        expect(node.dependsOn).toHaveLength(2)
        expect(node.blocks).toHaveLength(1)
        expect(node.checklist).toHaveLength(2)
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isNoteNode', () => {
    it('should return true for NoteNode', () => {
      const node = createTestNoteNode()
      expect(isNoteNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isNoteNode(createTestDecisionNode())).toBe(false)
      expect(isNoteNode(createTestComponentNode())).toBe(false)
      expect(isNoteNode(createTestTaskNode())).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createTestNoteNode()
      if (isNoteNode(node)) {
        // TypeScript should allow access to NoteNode properties (just BaseNode)
        expect(node.id).toBe('design-ideas')
        expect(node.title).toBe('Design Ideas')
        expect(node.tags).toContain('brainstorm')
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isSubsystemNode', () => {
    it('should return true for SubsystemNode', () => {
      const node = createSubsystemNode('sub-1', 'Test Subsystem')
      expect(isSubsystemNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isSubsystemNode(createTestDecisionNode())).toBe(false)
      expect(isSubsystemNode(createTestComponentNode())).toBe(false)
      expect(isSubsystemNode(createTestTaskNode())).toBe(false)
      expect(isSubsystemNode(createTestNoteNode())).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createSubsystemNode('sub-1', 'Test Subsystem')
      if (isSubsystemNode(node)) {
        expect(node.status).toBe('planning')
        expect(node.type).toBe(NodeType.Subsystem)
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isAssemblyNode', () => {
    it('should return true for AssemblyNode', () => {
      const node = createAssemblyNode('asm-1', 'Test Assembly')
      expect(isAssemblyNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isAssemblyNode(createTestDecisionNode())).toBe(false)
      expect(isAssemblyNode(createTestComponentNode())).toBe(false)
      expect(isAssemblyNode(createTestTaskNode())).toBe(false)
      expect(isAssemblyNode(createSubsystemNode('s', 'S'))).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createAssemblyNode('asm-1', 'Test Assembly')
      if (isAssemblyNode(node)) {
        expect(node.status).toBe('planning')
        expect(node.type).toBe(NodeType.Assembly)
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isModuleNode', () => {
    it('should return true for ModuleNode', () => {
      const node = createModuleNode('mod-1', 'Test Module')
      expect(isModuleNode(node)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(isModuleNode(createTestDecisionNode())).toBe(false)
      expect(isModuleNode(createTestComponentNode())).toBe(false)
      expect(isModuleNode(createSubsystemNode('s', 'S'))).toBe(false)
      expect(isModuleNode(createAssemblyNode('a', 'A'))).toBe(false)
    })

    it('should narrow type correctly', () => {
      const node: ForgeNode = createModuleNode('mod-1', 'Test Module')
      if (isModuleNode(node)) {
        expect(node.status).toBe('planning')
        expect(node.type).toBe(NodeType.Module)
      } else {
        throw new Error('Type guard should have returned true')
      }
    })
  })

  describe('isContainerNode', () => {
    it('should return true for all container node types', () => {
      expect(isContainerNode(createSubsystemNode('s', 'Subsystem'))).toBe(true)
      expect(isContainerNode(createAssemblyNode('a', 'Assembly'))).toBe(true)
      expect(isContainerNode(createModuleNode('m', 'Module'))).toBe(true)
    })

    it('should return false for non-container node types', () => {
      expect(isContainerNode(createTestDecisionNode())).toBe(false)
      expect(isContainerNode(createTestComponentNode())).toBe(false)
      expect(isContainerNode(createTestTaskNode())).toBe(false)
      expect(isContainerNode(createTestNoteNode())).toBe(false)
    })
  })
})

// ============================================================================
// Discriminated Union Tests
// ============================================================================

describe('ForgeNode discriminated union', () => {
  it('should narrow correctly in switch statement', () => {
    const nodes: ForgeNode[] = [
      createTestDecisionNode(),
      createTestComponentNode(),
      createTestTaskNode(),
      createTestNoteNode(),
    ]

    nodes.forEach((node) => {
      switch (node.type) {
        case NodeType.Decision:
          // TypeScript knows this is DecisionNode
          expect(node.options).toBeDefined()
          expect(node.criteria).toBeDefined()
          break
        case NodeType.Component:
          // TypeScript knows this is ComponentNode
          expect(node.cost).toBeDefined()
          expect(node.customFields).toBeDefined()
          break
        case NodeType.Task:
          // TypeScript knows this is TaskNode
          expect(node.priority).toBeDefined()
          expect(node.checklist).toBeDefined()
          break
        case NodeType.Note:
          // TypeScript knows this is NoteNode (just BaseNode properties)
          expect(node.content).toBeDefined()
          break
        case NodeType.Subsystem:
        case NodeType.Assembly:
        case NodeType.Module:
          // TypeScript knows these are container nodes
          expect(node.status).toBeDefined()
          break
        default: {
          // Exhaustiveness check - this should never be reached
          const _exhaustiveCheck: never = node
          throw new Error(`Unknown node type: ${_exhaustiveCheck}`)
        }
      }
    })
  })

  it('should allow filtering by type', () => {
    const nodes: ForgeNode[] = [
      createTestDecisionNode(),
      createTestComponentNode(),
      createTestTaskNode(),
      createTestNoteNode(),
    ]

    const decisions = nodes.filter(isDecisionNode)
    const components = nodes.filter(isComponentNode)
    const tasks = nodes.filter(isTaskNode)
    const notes = nodes.filter(isNoteNode)

    expect(decisions).toHaveLength(1)
    expect(components).toHaveLength(1)
    expect(tasks).toHaveLength(1)
    expect(notes).toHaveLength(1)

    // Verify the filtered arrays have the correct types
    decisions.forEach((d) => expect(d.options).toBeDefined())
    components.forEach((c) => expect(c.cost).toBeDefined())
    tasks.forEach((t) => expect(t.priority).toBeDefined())
  })
})

// ============================================================================
// Factory Helper Tests
// ============================================================================

describe('factory helpers', () => {
  describe('createNodeDates', () => {
    it('should create dates with current timestamp', () => {
      const before = new Date()
      const dates = createNodeDates()
      const after = new Date()

      expect(dates.created.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(dates.created.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(dates.modified.getTime()).toBe(dates.created.getTime())
    })
  })

  describe('createChecklistItem', () => {
    it('should create an uncompleted checklist item', () => {
      const item = createChecklistItem('Test item')

      expect(item.id).toBeDefined()
      expect(item.id.length).toBeGreaterThan(0)
      expect(item.text).toBe('Test item')
      expect(item.completed).toBe(false)
    })

    it('should generate unique IDs', () => {
      const item1 = createChecklistItem('Item 1')
      const item2 = createChecklistItem('Item 2')

      expect(item1.id).not.toBe(item2.id)
    })
  })

  describe('createDecisionOption', () => {
    it('should create a decision option with empty values', () => {
      const option = createDecisionOption('Option A')

      expect(option.id).toBeDefined()
      expect(option.name).toBe('Option A')
      expect(option.values).toEqual({})
    })

    it('should generate unique IDs', () => {
      const opt1 = createDecisionOption('A')
      const opt2 = createDecisionOption('B')

      expect(opt1.id).not.toBe(opt2.id)
    })
  })

  describe('createDecisionCriterion', () => {
    it('should create a criterion with default weight', () => {
      const criterion = createDecisionCriterion('Cost')

      expect(criterion.id).toBeDefined()
      expect(criterion.name).toBe('Cost')
      expect(criterion.weight).toBe(5)
      expect(criterion.unit).toBeUndefined()
    })

    it('should create a criterion with custom weight and unit', () => {
      const criterion = createDecisionCriterion('Torque', 8, 'Nm')

      expect(criterion.name).toBe('Torque')
      expect(criterion.weight).toBe(8)
      expect(criterion.unit).toBe('Nm')
    })

    it('should generate unique IDs', () => {
      const crit1 = createDecisionCriterion('A')
      const crit2 = createDecisionCriterion('B')

      expect(crit1.id).not.toBe(crit2.id)
    })
  })

  describe('createSubsystemNode', () => {
    it('should create a subsystem with default planning status', () => {
      const node = createSubsystemNode('sub-1', 'Propulsion System')
      expect(node.type).toBe(NodeType.Subsystem)
      expect(node.id).toBe('sub-1')
      expect(node.title).toBe('Propulsion System')
      expect(node.status).toBe('planning')
      expect(node.tags).toEqual([])
      expect(node.content).toBe('')
    })

    it('should allow status override', () => {
      const node = createSubsystemNode('sub-1', 'Test', {
        status: 'in_progress',
      })
      expect(node.status).toBe('in_progress')
    })

    it('should allow requirements override', () => {
      const node = createSubsystemNode('sub-1', 'Test', {
        requirements: ['Must support 10kg payload'],
      })
      expect(node.requirements).toEqual(['Must support 10kg payload'])
    })
  })

  describe('createAssemblyNode', () => {
    it('should create an assembly with default planning status', () => {
      const node = createAssemblyNode('asm-1', 'Drive Train')
      expect(node.type).toBe(NodeType.Assembly)
      expect(node.id).toBe('asm-1')
      expect(node.title).toBe('Drive Train')
      expect(node.status).toBe('planning')
    })

    it('should allow status override', () => {
      const node = createAssemblyNode('asm-1', 'Test', { status: 'complete' })
      expect(node.status).toBe('complete')
    })
  })

  describe('createModuleNode', () => {
    it('should create a module with default planning status', () => {
      const node = createModuleNode('mod-1', 'Control Module')
      expect(node.type).toBe(NodeType.Module)
      expect(node.id).toBe('mod-1')
      expect(node.title).toBe('Control Module')
      expect(node.status).toBe('planning')
    })

    it('should allow status override', () => {
      const node = createModuleNode('mod-1', 'Test', { status: 'on_hold' })
      expect(node.status).toBe('on_hold')
    })
  })
})

// ============================================================================
// BaseNode Property Tests
// ============================================================================

describe('BaseNode properties', () => {
  it('should have all required properties on all node types', () => {
    const nodes: ForgeNode[] = [
      createTestDecisionNode(),
      createTestComponentNode(),
      createTestTaskNode(),
      createTestNoteNode(),
    ]

    nodes.forEach((node) => {
      expect(node.id).toBeDefined()
      expect(typeof node.id).toBe('string')

      expect(node.type).toBeDefined()
      expect(Object.values(NodeType)).toContain(node.type)

      expect(node.title).toBeDefined()
      expect(typeof node.title).toBe('string')

      expect(node.tags).toBeDefined()
      expect(Array.isArray(node.tags)).toBe(true)

      expect(node.dates).toBeDefined()
      expect(node.dates.created).toBeInstanceOf(Date)
      expect(node.dates.modified).toBeInstanceOf(Date)

      expect(node.content).toBeDefined()
      expect(typeof node.content).toBe('string')
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('should handle empty tags array', () => {
    const node: NoteNode = {
      ...createTestNoteNode(),
      tags: [],
    }
    expect(node.tags).toEqual([])
  })

  it('should handle null cost on component', () => {
    const node: ComponentNode = {
      ...createTestComponentNode(),
      cost: null,
    }
    expect(node.cost).toBeNull()
  })

  it('should handle empty checklist on task', () => {
    const node: TaskNode = {
      ...createTestTaskNode(),
      checklist: [],
      parent: null,
    }
    expect(node.checklist).toEqual([])
  })

  it('should handle empty options and criteria on decision', () => {
    const node: DecisionNode = {
      ...createTestDecisionNode(),
      options: [],
      criteria: [],
    }
    expect(node.options).toEqual([])
    expect(node.criteria).toEqual([])
  })

  it('should handle empty customFields on component', () => {
    const node: ComponentNode = {
      ...createTestComponentNode(),
      customFields: {},
      parent: null,
    }
    expect(node.customFields).toEqual({})
  })
})
