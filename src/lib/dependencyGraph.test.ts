/**
 * Dependency Graph Tests
 *
 * Tests for the DAG data structure with cycle detection and topological sort.
 */

import { describe, it, expect, beforeEach } from 'vitest'

import {
  DependencyGraph,
  CycleError,
  wouldCreateCycle,
  topologicalSort,
  buildDependencyGraph,
  getTransitiveDependencies,
  getTransitiveDependents,
} from './dependencyGraph'

// ============================================================================
// DependencyGraph Class Tests
// ============================================================================

describe('DependencyGraph', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  // --------------------------------------------------------------------------
  // Node Operations
  // --------------------------------------------------------------------------

  describe('addNode', () => {
    it('adds a node to an empty graph', () => {
      const result = graph.addNode('task-1')
      expect(result).toBe(true)
      expect(graph.hasNode('task-1')).toBe(true)
      expect(graph.nodeCount).toBe(1)
    })

    it('returns false when adding duplicate node', () => {
      graph.addNode('task-1')
      const result = graph.addNode('task-1')
      expect(result).toBe(false)
      expect(graph.nodeCount).toBe(1)
    })

    it('adds multiple nodes', () => {
      graph.addNode('task-1')
      graph.addNode('task-2')
      graph.addNode('task-3')
      expect(graph.nodeCount).toBe(3)
      expect(graph.hasNode('task-1')).toBe(true)
      expect(graph.hasNode('task-2')).toBe(true)
      expect(graph.hasNode('task-3')).toBe(true)
    })
  })

  describe('removeNode', () => {
    it('removes an existing node', () => {
      graph.addNode('task-1')
      const result = graph.removeNode('task-1')
      expect(result).toBe(true)
      expect(graph.hasNode('task-1')).toBe(false)
      expect(graph.nodeCount).toBe(0)
    })

    it('returns false when removing non-existent node', () => {
      const result = graph.removeNode('task-1')
      expect(result).toBe(false)
    })

    it('removes all edges connected to the node', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-3', 'task-1')

      graph.removeNode('task-1')

      expect(graph.hasNode('task-1')).toBe(false)
      expect(graph.hasEdge('task-1', 'task-2')).toBe(false)
      expect(graph.hasEdge('task-3', 'task-1')).toBe(false)
      expect(graph.hasNode('task-2')).toBe(true)
      expect(graph.hasNode('task-3')).toBe(true)
    })
  })

  describe('hasNode', () => {
    it('returns true for existing node', () => {
      graph.addNode('task-1')
      expect(graph.hasNode('task-1')).toBe(true)
    })

    it('returns false for non-existent node', () => {
      expect(graph.hasNode('task-1')).toBe(false)
    })
  })

  describe('getNodes', () => {
    it('returns empty array for empty graph', () => {
      expect(graph.getNodes()).toEqual([])
    })

    it('returns all nodes', () => {
      graph.addNode('task-1')
      graph.addNode('task-2')
      const nodes = graph.getNodes()
      expect(nodes).toHaveLength(2)
      expect(nodes).toContain('task-1')
      expect(nodes).toContain('task-2')
    })
  })

  // --------------------------------------------------------------------------
  // Edge Operations
  // --------------------------------------------------------------------------

  describe('addEdge', () => {
    it('adds an edge between two nodes', () => {
      graph.addNode('task-1')
      graph.addNode('task-2')
      const result = graph.addEdge('task-1', 'task-2')
      expect(result).toBe(true)
      expect(graph.hasEdge('task-1', 'task-2')).toBe(true)
    })

    it('auto-creates nodes when adding edge', () => {
      graph.addEdge('task-1', 'task-2')
      expect(graph.hasNode('task-1')).toBe(true)
      expect(graph.hasNode('task-2')).toBe(true)
    })

    it('returns false when adding duplicate edge', () => {
      graph.addEdge('task-1', 'task-2')
      const result = graph.addEdge('task-1', 'task-2')
      expect(result).toBe(false)
      expect(graph.edgeCount).toBe(1)
    })

    it('throws CycleError for self-loop', () => {
      expect(() => graph.addEdge('task-1', 'task-1')).toThrow(CycleError)
    })

    it('returns false for self-loop when validateCycle is false', () => {
      const result = graph.addEdge('task-1', 'task-1', false)
      expect(result).toBe(false)
    })

    it('throws CycleError when adding edge would create cycle', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      expect(() => graph.addEdge('task-3', 'task-1')).toThrow(CycleError)
    })

    it('includes cycle path in CycleError', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      try {
        graph.addEdge('task-3', 'task-1')
        expect.fail('Should have thrown CycleError')
      } catch (e) {
        expect(e).toBeInstanceOf(CycleError)
        const cycleError = e as CycleError
        expect(cycleError.cyclePath).toContain('task-1')
        expect(cycleError.cyclePath).toContain('task-2')
        expect(cycleError.cyclePath).toContain('task-3')
      }
    })

    it('allows adding non-cyclic edges', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      graph.addEdge('task-1', 'task-3') // Skip connection, still DAG
      expect(graph.edgeCount).toBe(3)
    })
  })

  describe('removeEdge', () => {
    it('removes an existing edge', () => {
      graph.addEdge('task-1', 'task-2')
      const result = graph.removeEdge('task-1', 'task-2')
      expect(result).toBe(true)
      expect(graph.hasEdge('task-1', 'task-2')).toBe(false)
    })

    it('returns false when removing non-existent edge', () => {
      graph.addNode('task-1')
      graph.addNode('task-2')
      const result = graph.removeEdge('task-1', 'task-2')
      expect(result).toBe(false)
    })

    it('keeps nodes after removing edge', () => {
      graph.addEdge('task-1', 'task-2')
      graph.removeEdge('task-1', 'task-2')
      expect(graph.hasNode('task-1')).toBe(true)
      expect(graph.hasNode('task-2')).toBe(true)
    })
  })

  describe('hasEdge', () => {
    it('returns true for existing edge', () => {
      graph.addEdge('task-1', 'task-2')
      expect(graph.hasEdge('task-1', 'task-2')).toBe(true)
    })

    it('returns false for non-existent edge', () => {
      graph.addNode('task-1')
      graph.addNode('task-2')
      expect(graph.hasEdge('task-1', 'task-2')).toBe(false)
    })

    it('returns false for reverse direction', () => {
      graph.addEdge('task-1', 'task-2')
      expect(graph.hasEdge('task-2', 'task-1')).toBe(false)
    })
  })

  describe('getEdges', () => {
    it('returns empty array for empty graph', () => {
      expect(graph.getEdges()).toEqual([])
    })

    it('returns all edges', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      const edges = graph.getEdges()
      expect(edges).toHaveLength(2)
      expect(edges).toContainEqual({ from: 'task-1', to: 'task-2' })
      expect(edges).toContainEqual({ from: 'task-2', to: 'task-3' })
    })
  })

  // --------------------------------------------------------------------------
  // Dependency/Dependent Queries
  // --------------------------------------------------------------------------

  describe('getDependencies', () => {
    it('returns empty array for node with no dependencies', () => {
      graph.addNode('task-1')
      expect(graph.getDependencies('task-1')).toEqual([])
    })

    it('returns dependencies of a node', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-1', 'task-3')
      const deps = graph.getDependencies('task-1')
      expect(deps).toHaveLength(2)
      expect(deps).toContain('task-2')
      expect(deps).toContain('task-3')
    })

    it('returns empty array for non-existent node', () => {
      expect(graph.getDependencies('task-1')).toEqual([])
    })
  })

  describe('getDependents', () => {
    it('returns empty array for node with no dependents', () => {
      graph.addNode('task-1')
      expect(graph.getDependents('task-1')).toEqual([])
    })

    it('returns dependents of a node', () => {
      graph.addEdge('task-2', 'task-1')
      graph.addEdge('task-3', 'task-1')
      const dependents = graph.getDependents('task-1')
      expect(dependents).toHaveLength(2)
      expect(dependents).toContain('task-2')
      expect(dependents).toContain('task-3')
    })

    it('returns empty array for non-existent node', () => {
      expect(graph.getDependents('task-1')).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // Cycle Detection
  // --------------------------------------------------------------------------

  describe('checkCycle', () => {
    it('detects self-loop cycle', () => {
      const result = graph.checkCycle('task-1', 'task-1')
      expect(result.wouldCreateCycle).toBe(true)
    })

    it('returns false for non-cyclic edge', () => {
      graph.addEdge('task-1', 'task-2')
      const result = graph.checkCycle('task-2', 'task-3')
      expect(result.wouldCreateCycle).toBe(false)
    })

    it('detects simple two-node cycle', () => {
      graph.addEdge('task-1', 'task-2')
      const result = graph.checkCycle('task-2', 'task-1')
      expect(result.wouldCreateCycle).toBe(true)
      expect(result.cyclePath).toBeDefined()
    })

    it('detects longer cycle', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      graph.addEdge('task-3', 'task-4')
      const result = graph.checkCycle('task-4', 'task-1')
      expect(result.wouldCreateCycle).toBe(true)
    })

    it('handles disconnected components', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-3', 'task-4')
      // task-1,2 and task-3,4 are disconnected
      const result = graph.checkCycle('task-2', 'task-3')
      expect(result.wouldCreateCycle).toBe(false)
    })

    it('returns false when target node does not exist', () => {
      graph.addNode('task-1')
      const result = graph.checkCycle('task-1', 'task-2')
      expect(result.wouldCreateCycle).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // Graph Operations
  // --------------------------------------------------------------------------

  describe('clone', () => {
    it('creates an independent copy', () => {
      graph.addEdge('task-1', 'task-2')
      const clone = graph.clone()

      graph.addNode('task-3')
      clone.addNode('task-4')

      expect(graph.hasNode('task-3')).toBe(true)
      expect(graph.hasNode('task-4')).toBe(false)
      expect(clone.hasNode('task-3')).toBe(false)
      expect(clone.hasNode('task-4')).toBe(true)
    })

    it('copies all nodes and edges', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      const clone = graph.clone()

      expect(clone.nodeCount).toBe(3)
      expect(clone.edgeCount).toBe(2)
      expect(clone.hasEdge('task-1', 'task-2')).toBe(true)
      expect(clone.hasEdge('task-2', 'task-3')).toBe(true)
    })
  })

  describe('clear', () => {
    it('removes all nodes and edges', () => {
      graph.addEdge('task-1', 'task-2')
      graph.addEdge('task-2', 'task-3')
      graph.clear()

      expect(graph.nodeCount).toBe(0)
      expect(graph.edgeCount).toBe(0)
      expect(graph.isEmpty()).toBe(true)
    })
  })

  describe('isEmpty', () => {
    it('returns true for empty graph', () => {
      expect(graph.isEmpty()).toBe(true)
    })

    it('returns false after adding node', () => {
      graph.addNode('task-1')
      expect(graph.isEmpty()).toBe(false)
    })
  })
})

// ============================================================================
// wouldCreateCycle Function Tests
// ============================================================================

describe('wouldCreateCycle', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  it('returns true for self-loop', () => {
    expect(wouldCreateCycle(graph, 'task-1', 'task-1')).toBe(true)
  })

  it('returns false for valid DAG edge', () => {
    graph.addEdge('task-1', 'task-2')
    expect(wouldCreateCycle(graph, 'task-2', 'task-3')).toBe(false)
  })

  it('returns true when edge would create cycle', () => {
    graph.addEdge('task-1', 'task-2')
    graph.addEdge('task-2', 'task-3')
    expect(wouldCreateCycle(graph, 'task-3', 'task-1')).toBe(true)
  })

  it('returns false for empty graph', () => {
    expect(wouldCreateCycle(graph, 'task-1', 'task-2')).toBe(false)
  })
})

// ============================================================================
// topologicalSort Function Tests
// ============================================================================

describe('topologicalSort', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  it('returns empty array for empty graph', () => {
    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toEqual([])
  })

  it('returns single node for single-node graph', () => {
    graph.addNode('task-1')
    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toEqual(['task-1'])
  })

  it('sorts linear chain correctly', () => {
    // task-3 depends on task-2 depends on task-1
    graph.addEdge('task-3', 'task-2')
    graph.addEdge('task-2', 'task-1')

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)

    // Dependencies should come before dependents
    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-2'))
    expect(indexOf('task-2')).toBeLessThan(indexOf('task-3'))
  })

  it('handles diamond dependency', () => {
    //       task-4
    //      /      \
    //   task-2   task-3
    //      \      /
    //       task-1
    graph.addEdge('task-4', 'task-2')
    graph.addEdge('task-4', 'task-3')
    graph.addEdge('task-2', 'task-1')
    graph.addEdge('task-3', 'task-1')

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(4)

    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-2'))
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-3'))
    expect(indexOf('task-2')).toBeLessThan(indexOf('task-4'))
    expect(indexOf('task-3')).toBeLessThan(indexOf('task-4'))
  })

  it('handles disconnected subgraphs', () => {
    // Subgraph 1: task-2 -> task-1
    graph.addEdge('task-2', 'task-1')
    // Subgraph 2: task-4 -> task-3
    graph.addEdge('task-4', 'task-3')

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(4)

    // Within each subgraph, order should be maintained
    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-2'))
    expect(indexOf('task-3')).toBeLessThan(indexOf('task-4'))
  })

  it('handles graph with isolated nodes', () => {
    graph.addEdge('task-2', 'task-1')
    graph.addNode('task-3') // Isolated node

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(3)
    expect(result.sorted).toContain('task-3')
  })

  it('handles multiple roots', () => {
    // task-1 and task-2 both have no dependencies
    graph.addNode('task-1')
    graph.addNode('task-2')
    graph.addEdge('task-3', 'task-1')
    graph.addEdge('task-4', 'task-2')

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(4)

    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-3'))
    expect(indexOf('task-2')).toBeLessThan(indexOf('task-4'))
  })

  it('handles multiple leaves', () => {
    // task-2 and task-3 both depend on task-1
    graph.addEdge('task-2', 'task-1')
    graph.addEdge('task-3', 'task-1')

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(3)

    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-2'))
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-3'))
  })
})

// ============================================================================
// buildDependencyGraph Function Tests
// ============================================================================

describe('buildDependencyGraph', () => {
  it('builds graph from Map', () => {
    const deps = new Map<string, string[]>([
      ['task-2', ['task-1']],
      ['task-3', ['task-1', 'task-2']],
    ])

    const graph = buildDependencyGraph(deps)
    expect(graph.nodeCount).toBe(3)
    expect(graph.hasEdge('task-2', 'task-1')).toBe(true)
    expect(graph.hasEdge('task-3', 'task-1')).toBe(true)
    expect(graph.hasEdge('task-3', 'task-2')).toBe(true)
  })

  it('builds graph from object', () => {
    const deps = {
      'task-2': ['task-1'],
      'task-3': ['task-1', 'task-2'],
    }

    const graph = buildDependencyGraph(deps)
    expect(graph.nodeCount).toBe(3)
    expect(graph.hasEdge('task-2', 'task-1')).toBe(true)
    expect(graph.hasEdge('task-3', 'task-1')).toBe(true)
    expect(graph.hasEdge('task-3', 'task-2')).toBe(true)
  })

  it('throws CycleError for cyclic dependencies', () => {
    const deps = {
      'task-1': ['task-2'],
      'task-2': ['task-1'],
    }

    expect(() => buildDependencyGraph(deps)).toThrow(CycleError)
  })

  it('handles empty dependencies', () => {
    const deps = {
      'task-1': [],
      'task-2': [],
    }

    const graph = buildDependencyGraph(deps)
    expect(graph.nodeCount).toBe(2)
    expect(graph.edgeCount).toBe(0)
  })
})

// ============================================================================
// getTransitiveDependencies Function Tests
// ============================================================================

describe('getTransitiveDependencies', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  it('returns empty set for node with no dependencies', () => {
    graph.addNode('task-1')
    const result = getTransitiveDependencies(graph, 'task-1')
    expect(result.size).toBe(0)
  })

  it('returns direct dependencies', () => {
    graph.addEdge('task-2', 'task-1')
    const result = getTransitiveDependencies(graph, 'task-2')
    expect(result.has('task-1')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('returns transitive dependencies', () => {
    graph.addEdge('task-3', 'task-2')
    graph.addEdge('task-2', 'task-1')

    const result = getTransitiveDependencies(graph, 'task-3')
    expect(result.has('task-1')).toBe(true)
    expect(result.has('task-2')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('handles diamond dependencies', () => {
    graph.addEdge('task-4', 'task-2')
    graph.addEdge('task-4', 'task-3')
    graph.addEdge('task-2', 'task-1')
    graph.addEdge('task-3', 'task-1')

    const result = getTransitiveDependencies(graph, 'task-4')
    expect(result.has('task-1')).toBe(true)
    expect(result.has('task-2')).toBe(true)
    expect(result.has('task-3')).toBe(true)
    expect(result.size).toBe(3)
  })

  it('does not include the node itself', () => {
    graph.addEdge('task-2', 'task-1')
    const result = getTransitiveDependencies(graph, 'task-2')
    expect(result.has('task-2')).toBe(false)
  })
})

// ============================================================================
// getTransitiveDependents Function Tests
// ============================================================================

describe('getTransitiveDependents', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  it('returns empty set for node with no dependents', () => {
    graph.addNode('task-1')
    const result = getTransitiveDependents(graph, 'task-1')
    expect(result.size).toBe(0)
  })

  it('returns direct dependents', () => {
    graph.addEdge('task-2', 'task-1')
    const result = getTransitiveDependents(graph, 'task-1')
    expect(result.has('task-2')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('returns transitive dependents', () => {
    graph.addEdge('task-3', 'task-2')
    graph.addEdge('task-2', 'task-1')

    const result = getTransitiveDependents(graph, 'task-1')
    expect(result.has('task-2')).toBe(true)
    expect(result.has('task-3')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('handles diamond dependencies', () => {
    graph.addEdge('task-4', 'task-2')
    graph.addEdge('task-4', 'task-3')
    graph.addEdge('task-2', 'task-1')
    graph.addEdge('task-3', 'task-1')

    const result = getTransitiveDependents(graph, 'task-1')
    expect(result.has('task-2')).toBe(true)
    expect(result.has('task-3')).toBe(true)
    expect(result.has('task-4')).toBe(true)
    expect(result.size).toBe(3)
  })

  it('does not include the node itself', () => {
    graph.addEdge('task-2', 'task-1')
    const result = getTransitiveDependents(graph, 'task-1')
    expect(result.has('task-1')).toBe(false)
  })
})

// ============================================================================
// CycleError Tests
// ============================================================================

describe('CycleError', () => {
  it('creates error with cycle path', () => {
    const error = new CycleError(['task-1', 'task-2', 'task-1'])
    expect(error.cyclePath).toEqual(['task-1', 'task-2', 'task-1'])
    expect(error.name).toBe('CycleError')
  })

  it('creates error with custom message', () => {
    const error = new CycleError(['task-1', 'task-2'], 'Custom message')
    expect(error.message).toBe('Custom message')
  })

  it('creates default message from cycle path', () => {
    const error = new CycleError(['task-1', 'task-2', 'task-1'])
    expect(error.message).toBe('Cycle detected: task-1 -> task-2 -> task-1')
  })
})

// ============================================================================
// Edge Cases and Complex Scenarios
// ============================================================================

describe('Edge Cases', () => {
  let graph: DependencyGraph

  beforeEach(() => {
    graph = new DependencyGraph()
  })

  it('handles large graph efficiently', () => {
    // Create a graph with 100 nodes in a chain
    for (let i = 1; i < 100; i++) {
      graph.addEdge(`task-${i + 1}`, `task-${i}`)
    }

    expect(graph.nodeCount).toBe(100)
    expect(graph.edgeCount).toBe(99)

    // Topological sort should work
    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
    expect(result.sorted).toHaveLength(100)

    // Check that task-1 comes before task-100
    const indexOf = (id: string) => result.sorted.indexOf(id)
    expect(indexOf('task-1')).toBeLessThan(indexOf('task-100'))
  })

  it('handles graph with many edges', () => {
    // Create a fully connected DAG (each node depends on all previous)
    for (let i = 1; i <= 10; i++) {
      graph.addNode(`task-${i}`)
    }
    for (let i = 2; i <= 10; i++) {
      for (let j = 1; j < i; j++) {
        graph.addEdge(`task-${i}`, `task-${j}`)
      }
    }

    // 10 nodes, 9+8+7+...+1 = 45 edges
    expect(graph.nodeCount).toBe(10)
    expect(graph.edgeCount).toBe(45)

    const result = topologicalSort(graph)
    expect(result.success).toBe(true)
  })

  it('handles node ID with special characters', () => {
    graph.addEdge('task-with-dash', 'task_with_underscore')
    graph.addEdge('task.with.dot', 'task:with:colon')

    expect(graph.nodeCount).toBe(4)
    expect(graph.hasEdge('task-with-dash', 'task_with_underscore')).toBe(true)
  })

  it('handles empty string node ID', () => {
    graph.addNode('')
    expect(graph.hasNode('')).toBe(true)
    expect(graph.nodeCount).toBe(1)
  })

  it('preserves graph state after failed cycle addition', () => {
    graph.addEdge('task-1', 'task-2')
    graph.addEdge('task-2', 'task-3')

    const initialEdgeCount = graph.edgeCount
    const initialNodeCount = graph.nodeCount

    expect(() => graph.addEdge('task-3', 'task-1')).toThrow(CycleError)

    // Graph should be unchanged
    expect(graph.edgeCount).toBe(initialEdgeCount)
    expect(graph.nodeCount).toBe(initialNodeCount)
    expect(graph.hasEdge('task-3', 'task-1')).toBe(false)
  })
})
