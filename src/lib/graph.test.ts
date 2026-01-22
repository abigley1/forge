import { describe, expect, it } from 'vitest'
import {
  nodesToGraphData,
  nodesToGraphDataWithClusters,
  extractNodePositions,
  applyStoredPositions,
  filterGraphData,
  getConnectedNodeIds,
  groupNodesByTag,
  createClusterNodes,
  getAllTagsForClustering,
  type ForgeGraphNode,
  type NodePositions,
  type ClusterExpandedState,
} from './graph'
import {
  NodeType,
  type ForgeNode,
  type TaskNode,
  type DecisionNode,
  type NoteNode,
} from '@/types/nodes'
import { buildLinkIndex, createEmptyLinkIndex } from '@/lib/links'

// Helper to create test nodes
function createTaskNode(id: string, title: string, content = ''): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

function createTaskNodeWithDependencies(
  id: string,
  title: string,
  dependsOn: string[],
  content = ''
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    priority: 'medium',
    dependsOn,
    blocks: [],
    checklist: [],
  }
}

function createDecisionNode(
  id: string,
  title: string,
  content = ''
): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    content,
    tags: ['important'],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
  }
}

function createNoteNode(id: string, title: string, content = ''): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
  }
}

function createTaskNodeWithTags(
  id: string,
  title: string,
  tags: string[]
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    content: '',
    tags,
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

describe('nodesToGraphData', () => {
  it('converts empty nodes map to empty graph', () => {
    const nodes = new Map<string, ForgeNode>()
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('converts nodes to graph nodes with correct data', () => {
    const task = createTaskNode('task-1', 'My Task')
    const decision = createDecisionNode('decision-1', 'My Decision')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task],
      ['decision-1', decision],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.nodes).toHaveLength(2)

    const taskNode = result.nodes.find((n) => n.id === 'task-1')
    expect(taskNode).toBeDefined()
    expect(taskNode?.data.label).toBe('My Task')
    expect(taskNode?.data.nodeType).toBe(NodeType.Task)
    expect(taskNode?.data.status).toBe('pending')
    expect(taskNode?.data.forgeNode).toBe(task)

    const decisionNode = result.nodes.find((n) => n.id === 'decision-1')
    expect(decisionNode).toBeDefined()
    expect(decisionNode?.data.label).toBe('My Decision')
    expect(decisionNode?.data.nodeType).toBe(NodeType.Decision)
    expect(decisionNode?.data.tags).toContain('important')
  })

  it('assigns default positions when no stored positions provided', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    // All nodes should have positions
    result.nodes.forEach((node) => {
      expect(node.position).toBeDefined()
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
    })

    // Positions should be different (grid layout)
    const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(result.nodes.length)
  })

  it('uses stored positions when provided', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])
    const linkIndex = createEmptyLinkIndex()
    const storedPositions: NodePositions = {
      'task-1': { x: 500, y: 300 },
    }

    const result = nodesToGraphData(nodes, linkIndex, storedPositions)

    expect(result.nodes[0].position).toEqual({ x: 500, y: 300 })
  })

  it('marks selected node correctly', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex, undefined, 'task-1')

    const task1 = result.nodes.find((n) => n.id === 'task-1')
    const task2 = result.nodes.find((n) => n.id === 'task-2')
    expect(task1?.selected).toBe(true)
    expect(task2?.selected).toBe(false)
  })

  it('creates edges from link index', () => {
    const taskWithLink = createTaskNode(
      'task-1',
      'Task 1',
      'Links to [[task-2]]'
    )
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', taskWithLink],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe('task-1')
    expect(result.edges[0].target).toBe('task-2')
    expect(result.edges[0].data?.linkType).toBe('reference')
  })

  it('creates edges for multiple links', () => {
    const taskWithLinks = createTaskNode(
      'task-1',
      'Task 1',
      'Links to [[task-2]] and [[task-3]]'
    )
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', taskWithLinks],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(2)
    const targets = result.edges.map((e) => e.target).sort()
    expect(targets).toEqual(['task-2', 'task-3'])
  })

  it('handles node without status (NoteNode)', () => {
    const note = createNoteNode('note-1', 'My Note')
    const nodes = new Map<string, ForgeNode>([['note-1', note]])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.nodes[0].data.status).toBeUndefined()
  })
})

describe('extractNodePositions', () => {
  it('extracts positions from graph nodes', () => {
    const graphNodes: ForgeGraphNode[] = [
      {
        id: 'node-1',
        type: 'forgeNode',
        position: { x: 100, y: 200 },
        data: {
          label: 'Node 1',
          nodeType: NodeType.Task,
          tags: [],
          forgeNode: createTaskNode('node-1', 'Node 1'),
        },
      },
      {
        id: 'node-2',
        type: 'forgeNode',
        position: { x: 300, y: 400 },
        data: {
          label: 'Node 2',
          nodeType: NodeType.Task,
          tags: [],
          forgeNode: createTaskNode('node-2', 'Node 2'),
        },
      },
    ]

    const positions = extractNodePositions(graphNodes)

    expect(positions['node-1']).toEqual({ x: 100, y: 200 })
    expect(positions['node-2']).toEqual({ x: 300, y: 400 })
  })

  it('returns empty object for empty nodes array', () => {
    const positions = extractNodePositions([])
    expect(positions).toEqual({})
  })
})

describe('applyStoredPositions', () => {
  it('applies stored positions to matching nodes', () => {
    const graphNodes: ForgeGraphNode[] = [
      {
        id: 'node-1',
        type: 'forgeNode',
        position: { x: 0, y: 0 },
        data: {
          label: 'Node 1',
          nodeType: NodeType.Task,
          tags: [],
          forgeNode: createTaskNode('node-1', 'Node 1'),
        },
      },
    ]
    const storedPositions: NodePositions = {
      'node-1': { x: 500, y: 600 },
    }

    const result = applyStoredPositions(graphNodes, storedPositions)

    expect(result[0].position).toEqual({ x: 500, y: 600 })
  })

  it('keeps original position for nodes without stored position', () => {
    const graphNodes: ForgeGraphNode[] = [
      {
        id: 'node-1',
        type: 'forgeNode',
        position: { x: 100, y: 200 },
        data: {
          label: 'Node 1',
          nodeType: NodeType.Task,
          tags: [],
          forgeNode: createTaskNode('node-1', 'Node 1'),
        },
      },
    ]
    const storedPositions: NodePositions = {}

    const result = applyStoredPositions(graphNodes, storedPositions)

    expect(result[0].position).toEqual({ x: 100, y: 200 })
  })
})

describe('filterGraphData', () => {
  it('filters nodes to only visible ones', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const visibleIds = new Set(['task-1', 'task-3'])
    const filtered = filterGraphData(graphData, visibleIds)

    expect(filtered.nodes).toHaveLength(2)
    expect(filtered.nodes.map((n) => n.id).sort()).toEqual(['task-1', 'task-3'])
  })

  it('filters edges to only those between visible nodes', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]] [[task-3]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Only show task-1 and task-2, hide task-3
    const visibleIds = new Set(['task-1', 'task-2'])
    const filtered = filterGraphData(graphData, visibleIds)

    // Edge task-1 -> task-3 should be filtered out
    expect(filtered.edges).toHaveLength(1)
    expect(filtered.edges[0].source).toBe('task-1')
    expect(filtered.edges[0].target).toBe('task-2')
  })

  it('returns empty data when no nodes visible', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const filtered = filterGraphData(graphData, new Set())

    expect(filtered.nodes).toHaveLength(0)
    expect(filtered.edges).toHaveLength(0)
  })
})

describe('getConnectedNodeIds', () => {
  it('returns outgoing connections', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const connected = getConnectedNodeIds('task-1', linkIndex)

    expect(connected.has('task-2')).toBe(true)
  })

  it('returns incoming connections', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const connected = getConnectedNodeIds('task-2', linkIndex)

    expect(connected.has('task-1')).toBe(true)
  })

  it('returns both incoming and outgoing connections', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]]')
    const task2 = createTaskNode('task-2', 'Task 2', '[[task-1]] [[task-3]]')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const connected = getConnectedNodeIds('task-2', linkIndex)

    expect(connected.has('task-1')).toBe(true) // incoming from task-1
    expect(connected.has('task-3')).toBe(true) // outgoing to task-3
  })

  it('returns empty set for node with no connections', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = buildLinkIndex(nodes)

    const connected = getConnectedNodeIds('task-1', linkIndex)

    expect(connected.size).toBe(0)
  })
})

// ============================================================================
// Tag Clustering Tests (Task 5.2)
// ============================================================================

describe('groupNodesByTag', () => {
  it('groups nodes by their tags', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', ['frontend'])],
      ['task-2', createTaskNodeWithTags('task-2', 'Task 2', ['frontend'])],
      ['task-3', createTaskNodeWithTags('task-3', 'Task 3', ['backend'])],
    ])

    const groups = groupNodesByTag(nodes)

    expect(groups.get('frontend')).toEqual(['task-1', 'task-2'])
    expect(groups.get('backend')).toEqual(['task-3'])
  })

  it('places node in multiple groups if it has multiple tags', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNodeWithTags('task-1', 'Task 1', ['frontend', 'urgent']),
      ],
    ])

    const groups = groupNodesByTag(nodes)

    expect(groups.get('frontend')).toContain('task-1')
    expect(groups.get('urgent')).toContain('task-1')
  })

  it('places untagged nodes in __untagged__ group', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', [])],
      ['task-2', createTaskNodeWithTags('task-2', 'Task 2', ['frontend'])],
    ])

    const groups = groupNodesByTag(nodes)

    expect(groups.get('__untagged__')).toEqual(['task-1'])
    expect(groups.get('frontend')).toEqual(['task-2'])
  })

  it('returns empty map for empty nodes', () => {
    const nodes = new Map<string, ForgeNode>()

    const groups = groupNodesByTag(nodes)

    expect(groups.size).toBe(0)
  })
})

describe('createClusterNodes', () => {
  it('creates cluster nodes for collapsed groups', () => {
    const tagGroups = new Map<string, string[]>([
      ['frontend', ['task-1', 'task-2']],
      ['backend', ['task-3']],
    ])
    const expandedState: ClusterExpandedState = {}

    const clusters = createClusterNodes(tagGroups, expandedState)

    expect(clusters).toHaveLength(2)
    expect(clusters[0].type).toBe('tagCluster')
    expect(clusters[0].data.tag).toBe('frontend')
    expect(clusters[0].data.nodeCount).toBe(2)
    expect(clusters[0].data.nodeIds).toEqual(['task-1', 'task-2'])
  })

  it('does not create cluster node for expanded groups', () => {
    const tagGroups = new Map<string, string[]>([
      ['frontend', ['task-1', 'task-2']],
      ['backend', ['task-3']],
    ])
    const expandedState: ClusterExpandedState = { frontend: true }

    const clusters = createClusterNodes(tagGroups, expandedState)

    expect(clusters).toHaveLength(1)
    expect(clusters[0].data.tag).toBe('backend')
  })

  it('renames __untagged__ to Untagged in display', () => {
    const tagGroups = new Map<string, string[]>([['__untagged__', ['task-1']]])
    const expandedState: ClusterExpandedState = {}

    const clusters = createClusterNodes(tagGroups, expandedState)

    expect(clusters[0].data.tag).toBe('Untagged')
  })

  it('assigns unique cluster IDs', () => {
    const tagGroups = new Map<string, string[]>([
      ['frontend', ['task-1']],
      ['backend', ['task-2']],
    ])
    const expandedState: ClusterExpandedState = {}

    const clusters = createClusterNodes(tagGroups, expandedState)

    expect(clusters[0].id).toBe('cluster-frontend')
    expect(clusters[1].id).toBe('cluster-backend')
  })
})

describe('getAllTagsForClustering', () => {
  it('returns all unique tags sorted alphabetically', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNodeWithTags('task-1', 'Task 1', ['frontend', 'urgent']),
      ],
      [
        'task-2',
        createTaskNodeWithTags('task-2', 'Task 2', ['backend', 'frontend']),
      ],
    ])

    const tags = getAllTagsForClustering(nodes)

    expect(tags).toEqual(['backend', 'frontend', 'urgent'])
  })

  it('returns empty array for nodes with no tags', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', [])],
    ])

    const tags = getAllTagsForClustering(nodes)

    expect(tags).toEqual([])
  })
})

describe('nodesToGraphDataWithClusters', () => {
  it('returns standard graph data when clustering disabled', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', ['frontend'])],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphDataWithClusters(nodes, linkIndex, {
      enableClustering: false,
    })

    expect(result.nodes).toHaveLength(1)
    expect(result.clusters).toHaveLength(0)
  })

  it('creates cluster nodes when clustering enabled', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', ['frontend'])],
      ['task-2', createTaskNodeWithTags('task-2', 'Task 2', ['frontend'])],
      ['task-3', createTaskNodeWithTags('task-3', 'Task 3', ['backend'])],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphDataWithClusters(nodes, linkIndex, {
      enableClustering: true,
      expandedClusters: {},
    })

    // All clusters collapsed, so regular nodes hidden
    expect(result.nodes).toHaveLength(0)
    expect(result.clusters.length).toBeGreaterThan(0)
  })

  it('shows nodes from expanded clusters', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNodeWithTags('task-1', 'Task 1', ['frontend'])],
      ['task-2', createTaskNodeWithTags('task-2', 'Task 2', ['backend'])],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphDataWithClusters(nodes, linkIndex, {
      enableClustering: true,
      expandedClusters: { frontend: true },
    })

    // frontend expanded, backend collapsed
    expect(result.nodes).toHaveLength(1) // task-1 visible
    expect(result.nodes[0].id).toBe('task-1')
    expect(result.clusters).toHaveLength(1) // backend cluster
    expect(result.clusters[0].data.tag).toBe('backend')
  })

  it('filters edges to only visible nodes', () => {
    const task1 = {
      ...createTaskNodeWithTags('task-1', 'Task 1', ['frontend']),
      content: '[[task-2]]',
    }
    const task2 = createTaskNodeWithTags('task-2', 'Task 2', ['backend'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    // Both collapsed - no visible edges
    const result1 = nodesToGraphDataWithClusters(nodes, linkIndex, {
      enableClustering: true,
      expandedClusters: {},
    })
    expect(result1.edges).toHaveLength(0)

    // Both expanded - edge visible
    const result2 = nodesToGraphDataWithClusters(nodes, linkIndex, {
      enableClustering: true,
      expandedClusters: { frontend: true, backend: true },
    })
    expect(result2.edges).toHaveLength(1)
  })
})

// ============================================================================
// Dependency Edge Tests (Task 5.3)
// ============================================================================

describe('Dependency Edges', () => {
  it('creates dependency edges from TaskNode.dependsOn', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(1)
    // Dependency edge goes from dependency (task-1) TO dependent (task-2)
    expect(result.edges[0].source).toBe('task-1')
    expect(result.edges[0].target).toBe('task-2')
    expect(result.edges[0].type).toBe('dependency')
    expect(result.edges[0].data?.linkType).toBe('dependency')
  })

  it('creates dependency edges with correct ID prefix', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges[0].id).toMatch(/^dep-/)
  })

  it('creates multiple dependency edges for task with multiple dependencies', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNodeWithDependencies('task-3', 'Task 3', [
      'task-1',
      'task-2',
    ])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(2)
    const sources = result.edges.map((e) => e.source).sort()
    expect(sources).toEqual(['task-1', 'task-2'])
    result.edges.forEach((edge) => {
      expect(edge.target).toBe('task-3')
      expect(edge.type).toBe('dependency')
    })
  })

  it('ignores dependencies to non-existent nodes', () => {
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', [
      'non-existent',
    ])
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(0)
  })

  it('creates both dependency and reference edges when both exist', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies(
      'task-2',
      'Task 2',
      ['task-1'],
      '[[task-3]]'
    )
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(2)

    const depEdge = result.edges.find((e) => e.type === 'dependency')
    const refEdge = result.edges.find((e) => e.type === 'reference')

    expect(depEdge).toBeDefined()
    expect(depEdge?.source).toBe('task-1')
    expect(depEdge?.target).toBe('task-2')

    expect(refEdge).toBeDefined()
    expect(refEdge?.source).toBe('task-2')
    expect(refEdge?.target).toBe('task-3')
  })

  it('prioritizes dependency edge when wiki-link exists for same node pair', () => {
    // task-2 depends on task-1 AND links to task-1 via wiki-link
    // dependency edge: task-1 -> task-2 (task-1 blocks task-2)
    // wiki-link reference: task-2 -> task-1 (task-2 mentions task-1)
    // These are the same node pair, so we show only the dependency (more semantically important)
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies(
      'task-2',
      'Task 2',
      ['task-1'],
      '[[task-1]]'
    )
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    // Should only have the dependency edge (reference filtered out for same node pair)
    // This prevents visual clutter on the graph
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].type).toBe('dependency')
    expect(result.edges[0].source).toBe('task-1')
    expect(result.edges[0].target).toBe('task-2')
  })

  it('does not create duplicate edges for same dependency', () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(1)
  })

  it('only creates dependency edges from TaskNodes (not other node types)', () => {
    const decision = createDecisionNode('decision-1', 'Decision 1')
    const task = createTaskNodeWithDependencies('task-1', 'Task 1', [
      'decision-1',
    ])
    const nodes = new Map<string, ForgeNode>([
      ['decision-1', decision],
      ['task-1', task],
    ])
    const linkIndex = createEmptyLinkIndex()

    const result = nodesToGraphData(nodes, linkIndex)

    // Decision node doesn't have dependsOn, but task depends on decision
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe('decision-1')
    expect(result.edges[0].target).toBe('task-1')
  })
})

describe('Reference Edges', () => {
  it('creates reference edges from wiki-links', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].type).toBe('reference')
    expect(result.edges[0].data?.linkType).toBe('reference')
  })

  it('creates reference edges with correct ID prefix', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges[0].id).toMatch(/^ref-/)
  })

  it('creates multiple reference edges for multiple wiki-links', () => {
    const task1 = createTaskNode(
      'task-1',
      'Task 1',
      '[[task-2]] and [[task-3]]'
    )
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)

    const result = nodesToGraphData(nodes, linkIndex)

    expect(result.edges).toHaveLength(2)
    result.edges.forEach((edge) => {
      expect(edge.type).toBe('reference')
      expect(edge.source).toBe('task-1')
    })
  })

  it('filters reference edges to only visible nodes when using filterGraphData', () => {
    const task1 = createTaskNode('task-1', 'Task 1', '[[task-2]] [[task-3]]')
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = buildLinkIndex(nodes)
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Hide task-3
    const visibleIds = new Set(['task-1', 'task-2'])
    const filtered = filterGraphData(graphData, visibleIds)

    expect(filtered.edges).toHaveLength(1)
    expect(filtered.edges[0].target).toBe('task-2')
  })
})

// ============================================================================
// Auto Layout Tests (Task 5.4)
// ============================================================================

import {
  calculateLayout,
  calculateCenteredLayout,
  type AutoLayoutOptions,
} from './graph'

describe('calculateLayout', () => {
  it('returns empty positions for empty node array', async () => {
    const positions = await calculateLayout([], [])
    expect(positions).toEqual({})
  })

  it('calculates positions for a single node', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    expect(positions).toHaveProperty('task-1')
    expect(positions['task-1']).toHaveProperty('x')
    expect(positions['task-1']).toHaveProperty('y')
    expect(typeof positions['task-1'].x).toBe('number')
    expect(typeof positions['task-1'].y).toBe('number')
  })

  it('calculates positions for multiple nodes', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    expect(Object.keys(positions)).toHaveLength(3)
    expect(positions).toHaveProperty('task-1')
    expect(positions).toHaveProperty('task-2')
    expect(positions).toHaveProperty('task-3')
  })

  it('respects DAG structure with dependencies', async () => {
    // Create a chain: task-1 -> task-2 -> task-3
    // task-1 has no dependencies, task-2 depends on task-1, task-3 depends on task-2
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', [])
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const task3 = createTaskNodeWithDependencies('task-3', 'Task 3', ['task-2'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    // With layered layout and DOWN direction (default), dependencies should be above dependents
    // task-1 should be above task-2, which should be above task-3
    expect(positions['task-1'].y).toBeLessThan(positions['task-2'].y)
    expect(positions['task-2'].y).toBeLessThan(positions['task-3'].y)
  })

  it('handles multiple roots in DAG', async () => {
    // Two independent chains:
    // task-1 -> task-3
    // task-2 -> task-4
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', [])
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', [])
    const task3 = createTaskNodeWithDependencies('task-3', 'Task 3', ['task-1'])
    const task4 = createTaskNodeWithDependencies('task-4', 'Task 4', ['task-2'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
      ['task-4', task4],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    // Verify all nodes got positions
    expect(Object.keys(positions)).toHaveLength(4)
    // Both roots should be at the top
    expect(positions['task-1'].y).toBeLessThan(positions['task-3'].y)
    expect(positions['task-2'].y).toBeLessThan(positions['task-4'].y)
  })

  it('uses RIGHT direction when specified', async () => {
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', [])
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const options: AutoLayoutOptions = { direction: 'RIGHT' }
    const positions = await calculateLayout(
      graphData.nodes,
      graphData.edges,
      options
    )

    // With RIGHT direction, dependency (task-1) should be to the left of dependent (task-2)
    expect(positions['task-1'].x).toBeLessThan(positions['task-2'].x)
  })

  it('handles disconnected subgraphs', async () => {
    // task-1 and task-2 are not connected
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    // Both should get valid positions
    expect(positions['task-1']).toBeDefined()
    expect(positions['task-2']).toBeDefined()
    // Nodes should not overlap (assuming default spacing)
    const xDiff = Math.abs(positions['task-1'].x - positions['task-2'].x)
    const yDiff = Math.abs(positions['task-1'].y - positions['task-2'].y)
    expect(xDiff > 0 || yDiff > 0).toBe(true)
  })

  it('respects nodeSpacing option', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const task3 = createTaskNode('task-3', 'Task 3')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Calculate with large spacing
    const optionsLarge: AutoLayoutOptions = { nodeSpacing: 200 }
    const positionsLarge = await calculateLayout(
      graphData.nodes,
      graphData.edges,
      optionsLarge
    )

    // Calculate with small spacing
    const optionsSmall: AutoLayoutOptions = { nodeSpacing: 50 }
    const positionsSmall = await calculateLayout(
      graphData.nodes,
      graphData.edges,
      optionsSmall
    )

    // Both should produce valid positions
    expect(Object.keys(positionsLarge)).toHaveLength(3)
    expect(Object.keys(positionsSmall)).toHaveLength(3)
  })
})

describe('calculateCenteredLayout', () => {
  it('returns empty positions for empty node array', async () => {
    const positions = await calculateCenteredLayout([], [], 800, 600)
    expect(positions).toEqual({})
  })

  it('calculates centered positions for nodes', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateCenteredLayout(
      graphData.nodes,
      graphData.edges,
      800,
      600
    )

    expect(positions).toHaveProperty('task-1')
    expect(positions).toHaveProperty('task-2')
    // Positions should be offset to center in viewport
    expect(positions['task-1'].x).toBeGreaterThan(0)
    expect(positions['task-1'].y).toBeGreaterThan(0)
  })

  it('applies offset to all nodes', async () => {
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', [])
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Get regular layout
    const regularPositions = await calculateLayout(
      graphData.nodes,
      graphData.edges
    )
    // Get centered layout
    const centeredPositions = await calculateCenteredLayout(
      graphData.nodes,
      graphData.edges,
      800,
      600
    )

    // Both layouts should have the same relative positions (DAG structure preserved)
    const regularDiffY =
      regularPositions['task-2'].y - regularPositions['task-1'].y
    const centeredDiffY =
      centeredPositions['task-2'].y - centeredPositions['task-1'].y
    expect(centeredDiffY).toBeCloseTo(regularDiffY, 5)
  })

  it('accepts layout options', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const options: AutoLayoutOptions = { direction: 'RIGHT', nodeSpacing: 100 }
    const positions = await calculateCenteredLayout(
      graphData.nodes,
      graphData.edges,
      800,
      600,
      options
    )

    expect(positions).toHaveProperty('task-1')
    expect(positions['task-1'].x).toBeGreaterThan(0)
    expect(positions['task-1'].y).toBeGreaterThan(0)
  })
})

// ============================================================================
// ELK Layout Error Tests (PR review feedback)
// ============================================================================

describe('ELK Layout Error Handling', () => {
  it('handles nodes with missing required properties gracefully', async () => {
    // Create a minimal valid graph node
    const task = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task]])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // This should not throw - ELK should handle the node
    const positions = await calculateLayout(graphData.nodes, graphData.edges)
    expect(positions).toHaveProperty('task-1')
  })

  it('throws error for edges referencing non-existent nodes', async () => {
    // Create nodes
    const task1 = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Manually add an invalid edge that references non-existent node
    const edgesWithInvalidRef = [
      ...graphData.edges,
      {
        id: 'invalid-edge',
        source: 'task-1',
        target: 'non-existent-node',
        type: 'reference' as const,
        data: { linkType: 'reference' as const },
      },
    ]

    // ELK throws when given edges to non-existent nodes
    // Callers must filter edges to valid nodes before calling calculateLayout
    await expect(
      calculateLayout(graphData.nodes, edgesWithInvalidRef)
    ).rejects.toThrow()
  })

  it('handles self-referencing edges', async () => {
    // Create a node that might reference itself
    const task1 = createTaskNode('task-1', 'Task 1')
    const nodes = new Map<string, ForgeNode>([['task-1', task1]])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Manually add a self-referencing edge
    const edgesWithSelfRef = [
      ...graphData.edges,
      {
        id: 'self-ref-edge',
        source: 'task-1',
        target: 'task-1',
        type: 'reference' as const,
        data: { linkType: 'reference' as const },
      },
    ]

    // Should not throw, even with self-referencing edge
    const positions = await calculateLayout(graphData.nodes, edgesWithSelfRef)
    expect(positions).toHaveProperty('task-1')
  })

  it('handles cyclic dependencies', async () => {
    // Create a cycle: task-1 -> task-2 -> task-3 -> task-1
    const task1 = createTaskNodeWithDependencies('task-1', 'Task 1', ['task-3'])
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const task3 = createTaskNodeWithDependencies('task-3', 'Task 3', ['task-2'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // ELK's layered algorithm should handle cycles (breaks them for layout)
    const positions = await calculateLayout(graphData.nodes, graphData.edges)
    expect(Object.keys(positions)).toHaveLength(3)
    expect(positions).toHaveProperty('task-1')
    expect(positions).toHaveProperty('task-2')
    expect(positions).toHaveProperty('task-3')
  })

  it('handles large graphs without timeout', async () => {
    // Create a graph with many nodes
    const nodes = new Map<string, ForgeNode>()
    for (let i = 0; i < 50; i++) {
      nodes.set(`task-${i}`, createTaskNode(`task-${i}`, `Task ${i}`))
    }
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Should complete without timeout
    const startTime = Date.now()
    const positions = await calculateLayout(graphData.nodes, graphData.edges)
    const elapsed = Date.now() - startTime

    expect(Object.keys(positions)).toHaveLength(50)
    // Should complete in reasonable time (< 5 seconds)
    expect(elapsed).toBeLessThan(5000)
  })

  it('handles graph with many edges', async () => {
    // Create nodes with many interconnections
    const task1 = createTaskNode(
      'task-1',
      'Task 1',
      '[[task-2]] [[task-3]] [[task-4]]'
    )
    const task2 = createTaskNode('task-2', 'Task 2', '[[task-3]] [[task-4]]')
    const task3 = createTaskNode('task-3', 'Task 3', '[[task-4]]')
    const task4 = createTaskNode('task-4', 'Task 4')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
      ['task-3', task3],
      ['task-4', task4],
    ])
    const linkIndex = buildLinkIndex(nodes)
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    expect(Object.keys(positions)).toHaveLength(4)
  })

  it('handles force layout algorithm option', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNode('task-2', 'Task 2')
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    // Test with force algorithm instead of layered
    const options: AutoLayoutOptions = { algorithm: 'force' }
    const positions = await calculateLayout(
      graphData.nodes,
      graphData.edges,
      options
    )

    expect(positions).toHaveProperty('task-1')
    expect(positions).toHaveProperty('task-2')
  })

  it('produces valid numeric positions for all nodes', async () => {
    const task1 = createTaskNode('task-1', 'Task 1')
    const task2 = createTaskNodeWithDependencies('task-2', 'Task 2', ['task-1'])
    const nodes = new Map<string, ForgeNode>([
      ['task-1', task1],
      ['task-2', task2],
    ])
    const linkIndex = createEmptyLinkIndex()
    const graphData = nodesToGraphData(nodes, linkIndex)

    const positions = await calculateLayout(graphData.nodes, graphData.edges)

    // All positions should be valid finite numbers
    Object.values(positions).forEach((pos) => {
      expect(Number.isFinite(pos.x)).toBe(true)
      expect(Number.isFinite(pos.y)).toBe(true)
      expect(Number.isNaN(pos.x)).toBe(false)
      expect(Number.isNaN(pos.y)).toBe(false)
    })
  })
})
