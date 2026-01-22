/**
 * Critical Path Tests
 *
 * Tests for critical path calculation through incomplete tasks/decisions.
 */

import { describe, it, expect } from 'vitest'

import {
  calculateCriticalPath,
  createEmptyCriticalPathResult,
  isIncompleteNode,
  canBeOnCriticalPath,
  isOnCriticalPath,
  isEdgeOnCriticalPath,
  getCriticalPathPosition,
  getNonCriticalIncompleteNodes,
  calculateSlack,
  createEdgeKey,
  buildGraphFromNodes,
} from './criticalPath'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  NoteNode,
  ComponentNode,
} from '@/types/nodes'
import { NodeType } from '@/types/nodes'

// ============================================================================
// Test Helpers
// ============================================================================

function createTaskNode(
  id: string,
  status: 'pending' | 'in_progress' | 'blocked' | 'complete' = 'pending',
  dependsOn: string[] = []
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title: `Task ${id}`,
    status,
    priority: 'medium',
    dependsOn,
    blocks: [],
    checklist: [],
    tags: [],
    content: '',
    dates: {
      created: new Date(),
      modified: new Date(),
    },
  }
}

function createDecisionNode(
  id: string,
  status: 'pending' | 'selected' = 'pending'
): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title: `Decision ${id}`,
    status,
    selected: null,
    options: [],
    criteria: [],
    tags: [],
    content: '',
    dates: {
      created: new Date(),
      modified: new Date(),
    },
  }
}

function createNoteNode(id: string): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title: `Note ${id}`,
    tags: [],
    content: '',
    dates: {
      created: new Date(),
      modified: new Date(),
    },
  }
}

function createComponentNode(id: string): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title: `Component ${id}`,
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    tags: [],
    content: '',
    dates: {
      created: new Date(),
      modified: new Date(),
    },
  }
}

function createNodesMap(nodes: ForgeNode[]): Map<string, ForgeNode> {
  const map = new Map<string, ForgeNode>()
  nodes.forEach((node) => map.set(node.id, node))
  return map
}

// ============================================================================
// createEmptyCriticalPathResult Tests
// ============================================================================

describe('createEmptyCriticalPathResult', () => {
  it('returns an empty result with correct structure', () => {
    const result = createEmptyCriticalPathResult()

    expect(result.nodes).toEqual([])
    expect(result.nodeIds.size).toBe(0)
    expect(result.edgeKeys.size).toBe(0)
    expect(result.length).toBe(0)
    expect(result.hasPath).toBe(false)
  })
})

// ============================================================================
// isIncompleteNode Tests
// ============================================================================

describe('isIncompleteNode', () => {
  it('returns true for pending task', () => {
    const task = createTaskNode('task-1', 'pending')
    expect(isIncompleteNode(task)).toBe(true)
  })

  it('returns true for in_progress task', () => {
    const task = createTaskNode('task-1', 'in_progress')
    expect(isIncompleteNode(task)).toBe(true)
  })

  it('returns true for blocked task', () => {
    const task = createTaskNode('task-1', 'blocked')
    expect(isIncompleteNode(task)).toBe(true)
  })

  it('returns false for complete task', () => {
    const task = createTaskNode('task-1', 'complete')
    expect(isIncompleteNode(task)).toBe(false)
  })

  it('returns true for pending decision', () => {
    const decision = createDecisionNode('decision-1', 'pending')
    expect(isIncompleteNode(decision)).toBe(true)
  })

  it('returns false for selected decision', () => {
    const decision = createDecisionNode('decision-1', 'selected')
    expect(isIncompleteNode(decision)).toBe(false)
  })

  it('returns false for note nodes', () => {
    const note = createNoteNode('note-1')
    expect(isIncompleteNode(note)).toBe(false)
  })

  it('returns false for component nodes', () => {
    const component = createComponentNode('component-1')
    expect(isIncompleteNode(component)).toBe(false)
  })
})

// ============================================================================
// canBeOnCriticalPath Tests
// ============================================================================

describe('canBeOnCriticalPath', () => {
  it('returns true for task nodes', () => {
    const task = createTaskNode('task-1')
    expect(canBeOnCriticalPath(task)).toBe(true)
  })

  it('returns true for decision nodes', () => {
    const decision = createDecisionNode('decision-1')
    expect(canBeOnCriticalPath(decision)).toBe(true)
  })

  it('returns false for note nodes', () => {
    const note = createNoteNode('note-1')
    expect(canBeOnCriticalPath(note)).toBe(false)
  })

  it('returns false for component nodes', () => {
    const component = createComponentNode('component-1')
    expect(canBeOnCriticalPath(component)).toBe(false)
  })
})

// ============================================================================
// createEdgeKey Tests
// ============================================================================

describe('createEdgeKey', () => {
  it('creates correct edge key format', () => {
    expect(createEdgeKey('a', 'b')).toBe('a->b')
    expect(createEdgeKey('task-1', 'task-2')).toBe('task-1->task-2')
  })

  it('creates different keys for different directions', () => {
    const key1 = createEdgeKey('a', 'b')
    const key2 = createEdgeKey('b', 'a')
    expect(key1).not.toBe(key2)
  })
})

// ============================================================================
// buildGraphFromNodes Tests
// ============================================================================

describe('buildGraphFromNodes', () => {
  it('returns empty graph for empty nodes', () => {
    const nodes = createNodesMap([])
    const graph = buildGraphFromNodes(nodes)
    expect(graph.isEmpty()).toBe(true)
  })

  it('adds all nodes to the graph', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2'),
      createNoteNode('note-1'),
    ])
    const graph = buildGraphFromNodes(nodes)
    expect(graph.nodeCount).toBe(3)
    expect(graph.hasNode('task-1')).toBe(true)
    expect(graph.hasNode('task-2')).toBe(true)
    expect(graph.hasNode('note-1')).toBe(true)
  })

  it('creates edges for task dependencies', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
    ])
    const graph = buildGraphFromNodes(nodes)
    expect(graph.edgeCount).toBe(1)
    // task-2 depends on task-1
    expect(graph.hasEdge('task-2', 'task-1')).toBe(true)
  })

  it('ignores dependencies to non-existent nodes', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1', 'pending', ['non-existent']),
    ])
    const graph = buildGraphFromNodes(nodes)
    expect(graph.edgeCount).toBe(0)
  })
})

// ============================================================================
// calculateCriticalPath Tests
// ============================================================================

describe('calculateCriticalPath', () => {
  describe('empty and single node cases', () => {
    it('returns empty result for empty nodes map', () => {
      const nodes = createNodesMap([])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(false)
      expect(result.length).toBe(0)
      expect(result.nodes).toEqual([])
    })

    it('returns single node path for one incomplete task', () => {
      const nodes = createNodesMap([createTaskNode('task-1')])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(1)
      expect(result.nodeIds.has('task-1')).toBe(true)
    })

    it('returns empty result when only node is complete', () => {
      const nodes = createNodesMap([createTaskNode('task-1', 'complete')])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(false)
      expect(result.length).toBe(0)
    })

    it('returns empty result when only notes and components', () => {
      const nodes = createNodesMap([
        createNoteNode('note-1'),
        createComponentNode('component-1'),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(false)
      expect(result.length).toBe(0)
    })
  })

  describe('linear chains', () => {
    it('finds critical path through linear chain of 2 tasks', () => {
      // task-1 -> task-2 (task-2 depends on task-1)
      const nodes = createNodesMap([
        createTaskNode('task-1'),
        createTaskNode('task-2', 'pending', ['task-1']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(2)
      expect(result.nodeIds.has('task-1')).toBe(true)
      expect(result.nodeIds.has('task-2')).toBe(true)
    })

    it('finds critical path through linear chain of 3 tasks', () => {
      // task-1 -> task-2 -> task-3
      const nodes = createNodesMap([
        createTaskNode('task-1'),
        createTaskNode('task-2', 'pending', ['task-1']),
        createTaskNode('task-3', 'pending', ['task-2']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(3)

      // Verify order: task-1 should come before task-2 should come before task-3
      const positions = result.nodes.map((n) => n.id)
      expect(positions.indexOf('task-1')).toBeLessThan(
        positions.indexOf('task-2')
      )
      expect(positions.indexOf('task-2')).toBeLessThan(
        positions.indexOf('task-3')
      )
    })

    it('excludes completed tasks from critical path', () => {
      // task-1 (complete) -> task-2 (pending) -> task-3 (pending)
      const nodes = createNodesMap([
        createTaskNode('task-1', 'complete'),
        createTaskNode('task-2', 'pending', ['task-1']),
        createTaskNode('task-3', 'pending', ['task-2']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(2)
      expect(result.nodeIds.has('task-1')).toBe(false)
      expect(result.nodeIds.has('task-2')).toBe(true)
      expect(result.nodeIds.has('task-3')).toBe(true)
    })
  })

  describe('branching paths', () => {
    it('finds longest path when multiple branches exist', () => {
      // task-1 -> task-2 -> task-3 (length 3)
      // task-4 (length 1, disconnected)
      const nodes = createNodesMap([
        createTaskNode('task-1'),
        createTaskNode('task-2', 'pending', ['task-1']),
        createTaskNode('task-3', 'pending', ['task-2']),
        createTaskNode('task-4'),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(3)
      expect(result.nodeIds.has('task-1')).toBe(true)
      expect(result.nodeIds.has('task-2')).toBe(true)
      expect(result.nodeIds.has('task-3')).toBe(true)
      expect(result.nodeIds.has('task-4')).toBe(false)
    })

    it('finds longest path with converging branches', () => {
      // task-1 -> task-3 (via task-1)
      // task-2 -> task-3 (via task-2)
      // Both paths to task-3, but task-1 has longer chain before
      // Actually let's make:
      // task-a -> task-b -> task-d (length 3)
      // task-c -> task-d (length 2)
      const nodes = createNodesMap([
        createTaskNode('task-a'),
        createTaskNode('task-b', 'pending', ['task-a']),
        createTaskNode('task-c'),
        createTaskNode('task-d', 'pending', ['task-b', 'task-c']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(3)
      // Critical path should be: task-a -> task-b -> task-d
      expect(result.nodeIds.has('task-a')).toBe(true)
      expect(result.nodeIds.has('task-b')).toBe(true)
      expect(result.nodeIds.has('task-d')).toBe(true)
      expect(result.nodeIds.has('task-c')).toBe(false)
    })

    it('handles diamond dependency pattern', () => {
      //       task-b
      //      /      \
      // task-a      task-d
      //      \      /
      //       task-c
      const nodes = createNodesMap([
        createTaskNode('task-a'),
        createTaskNode('task-b', 'pending', ['task-a']),
        createTaskNode('task-c', 'pending', ['task-a']),
        createTaskNode('task-d', 'pending', ['task-b', 'task-c']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(3)
      // Critical path should include task-a, task-d, and either task-b or task-c
      expect(result.nodeIds.has('task-a')).toBe(true)
      expect(result.nodeIds.has('task-d')).toBe(true)
    })
  })

  describe('decisions in path', () => {
    it('includes incomplete decisions in critical path', () => {
      // decision-1 (pending) -> task-1 (depends on decision)
      const nodes = createNodesMap([
        createDecisionNode('decision-1', 'pending'),
        createTaskNode('task-1', 'pending', ['decision-1']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(2)
      expect(result.nodeIds.has('decision-1')).toBe(true)
      expect(result.nodeIds.has('task-1')).toBe(true)
    })

    it('excludes selected decisions from critical path', () => {
      const nodes = createNodesMap([
        createDecisionNode('decision-1', 'selected'),
        createTaskNode('task-1', 'pending', ['decision-1']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.hasPath).toBe(true)
      expect(result.length).toBe(1)
      expect(result.nodeIds.has('decision-1')).toBe(false)
      expect(result.nodeIds.has('task-1')).toBe(true)
    })
  })

  describe('edge keys', () => {
    it('creates edge keys for critical path connections', () => {
      const nodes = createNodesMap([
        createTaskNode('task-1'),
        createTaskNode('task-2', 'pending', ['task-1']),
        createTaskNode('task-3', 'pending', ['task-2']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.edgeKeys.size).toBe(2)
      // Edges go from earlier to later in the path
      expect(result.edgeKeys.has('task-1->task-2')).toBe(true)
      expect(result.edgeKeys.has('task-2->task-3')).toBe(true)
    })

    it('has no edge keys for single node path', () => {
      const nodes = createNodesMap([createTaskNode('task-1')])
      const result = calculateCriticalPath(nodes)

      expect(result.edgeKeys.size).toBe(0)
    })
  })

  describe('node information', () => {
    it('includes correct node information', () => {
      const nodes = createNodesMap([
        createTaskNode('task-1', 'in_progress'),
        createTaskNode('task-2', 'blocked', ['task-1']),
      ])
      const result = calculateCriticalPath(nodes)

      expect(result.nodes.length).toBe(2)

      const firstNode = result.nodes[0]
      expect(firstNode.id).toBe('task-1')
      expect(firstNode.type).toBe(NodeType.Task)
      expect(firstNode.status).toBe('in_progress')
      expect(firstNode.distance).toBe(0)

      const secondNode = result.nodes[1]
      expect(secondNode.id).toBe('task-2')
      expect(secondNode.distance).toBe(1)
    })
  })
})

// ============================================================================
// isOnCriticalPath Tests
// ============================================================================

describe('isOnCriticalPath', () => {
  it('returns true for node on critical path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
    ])
    const result = calculateCriticalPath(nodes)

    expect(isOnCriticalPath('task-1', result)).toBe(true)
    expect(isOnCriticalPath('task-2', result)).toBe(true)
  })

  it('returns false for node not on critical path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
      createTaskNode('task-3'), // Disconnected, not on critical path
    ])
    const result = calculateCriticalPath(nodes)

    expect(isOnCriticalPath('task-3', result)).toBe(false)
  })

  it('returns false for non-existent node', () => {
    const nodes = createNodesMap([createTaskNode('task-1')])
    const result = calculateCriticalPath(nodes)

    expect(isOnCriticalPath('non-existent', result)).toBe(false)
  })
})

// ============================================================================
// isEdgeOnCriticalPath Tests
// ============================================================================

describe('isEdgeOnCriticalPath', () => {
  it('returns true for edge on critical path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
    ])
    const result = calculateCriticalPath(nodes)

    expect(isEdgeOnCriticalPath('task-1', 'task-2', result)).toBe(true)
  })

  it('returns false for edge not on critical path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
    ])
    const result = calculateCriticalPath(nodes)

    expect(isEdgeOnCriticalPath('task-2', 'task-1', result)).toBe(false) // Wrong direction
    expect(isEdgeOnCriticalPath('task-1', 'task-3', result)).toBe(false) // Non-existent edge
  })
})

// ============================================================================
// getCriticalPathPosition Tests
// ============================================================================

describe('getCriticalPathPosition', () => {
  it('returns correct position for nodes on path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
      createTaskNode('task-3', 'pending', ['task-2']),
    ])
    const result = calculateCriticalPath(nodes)

    expect(getCriticalPathPosition('task-1', result)).toBe(0)
    expect(getCriticalPathPosition('task-2', result)).toBe(1)
    expect(getCriticalPathPosition('task-3', result)).toBe(2)
  })

  it('returns -1 for node not on path', () => {
    const nodes = createNodesMap([createTaskNode('task-1')])
    const result = calculateCriticalPath(nodes)

    expect(getCriticalPathPosition('non-existent', result)).toBe(-1)
  })
})

// ============================================================================
// getNonCriticalIncompleteNodes Tests
// ============================================================================

describe('getNonCriticalIncompleteNodes', () => {
  it('returns incomplete nodes not on critical path', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
      createTaskNode('task-3'), // Disconnected, shorter path
    ])
    const result = calculateCriticalPath(nodes)
    const nonCritical = getNonCriticalIncompleteNodes(nodes, result)

    expect(nonCritical).toContain('task-3')
    expect(nonCritical).not.toContain('task-1')
    expect(nonCritical).not.toContain('task-2')
  })

  it('excludes complete tasks', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'complete'),
    ])
    const result = calculateCriticalPath(nodes)
    const nonCritical = getNonCriticalIncompleteNodes(nodes, result)

    expect(nonCritical).not.toContain('task-2')
  })

  it('excludes notes and components', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createNoteNode('note-1'),
      createComponentNode('component-1'),
    ])
    const result = calculateCriticalPath(nodes)
    const nonCritical = getNonCriticalIncompleteNodes(nodes, result)

    expect(nonCritical).not.toContain('note-1')
    expect(nonCritical).not.toContain('component-1')
  })
})

// ============================================================================
// calculateSlack Tests
// ============================================================================

describe('calculateSlack', () => {
  it('returns zero slack for critical path nodes', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
    ])
    const result = calculateCriticalPath(nodes)
    const slack = calculateSlack(nodes, result)

    expect(slack.get('task-1')).toBe(0)
    expect(slack.get('task-2')).toBe(0)
  })

  it('returns positive slack for non-critical nodes', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'pending', ['task-1']),
      createTaskNode('task-3'), // Disconnected
    ])
    const result = calculateCriticalPath(nodes)
    const slack = calculateSlack(nodes, result)

    expect(slack.get('task-1')).toBe(0)
    expect(slack.get('task-2')).toBe(0)
    expect(slack.get('task-3')).toBeGreaterThan(0)
  })

  it('does not include complete tasks in slack calculation', () => {
    const nodes = createNodesMap([
      createTaskNode('task-1'),
      createTaskNode('task-2', 'complete'),
    ])
    const result = calculateCriticalPath(nodes)
    const slack = calculateSlack(nodes, result)

    expect(slack.has('task-2')).toBe(false)
  })
})
