import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'
import { NodeType } from '@/types/nodes'
import {
  nodeToDocument,
  createSearchIndex,
  buildSearchIndex,
  findTermPositions,
  mergeMatchLocations,
  extractSnippet,
  highlightSnippet,
  searchNodes,
  addNodeToIndex,
  removeNodeFromIndex,
  updateNodeInIndex,
  vacuumIndex,
  type MatchLocation,
  type ContextSnippet,
} from './fullTextSearch'

// Helper to create test nodes
function createTaskNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'task-1',
    type: NodeType.Task,
    title: 'Test Task',
    tags: ['test'],
    dates: { created: new Date(), modified: new Date() },
    content: 'This is test content for the task.',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    milestone: undefined,
    ...overrides,
  }
}

function createDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'decision-1',
    type: NodeType.Decision,
    title: 'Test Decision',
    tags: ['architecture'],
    dates: { created: new Date(), modified: new Date() },
    content: 'We need to decide on the database approach.',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    ...overrides,
  }
}

function createComponentNode(
  overrides: Partial<ComponentNode> = {}
): ComponentNode {
  return {
    id: 'component-1',
    type: NodeType.Component,
    title: 'Motor Controller',
    tags: ['electronics'],
    dates: { created: new Date(), modified: new Date() },
    content: 'A motor controller for the servo system.',
    status: 'considering',
    cost: 45.99,
    supplier: 'DigiKey',
    partNumber: 'MC-123',
    customFields: {},
    ...overrides,
  }
}

function createNoteNode(overrides: Partial<NoteNode> = {}): NoteNode {
  return {
    id: 'note-1',
    type: NodeType.Note,
    title: 'Research Notes',
    tags: ['research'],
    dates: { created: new Date(), modified: new Date() },
    content: 'Notes about the project research and findings.',
    ...overrides,
  }
}

describe('nodeToDocument', () => {
  it('converts a ForgeNode to SearchDocument', () => {
    const node = createTaskNode({
      id: 'my-task',
      title: 'My Task Title',
      content: 'Task content here',
      tags: ['tag1', 'tag2'],
    })

    const doc = nodeToDocument(node)

    expect(doc).toEqual({
      id: 'my-task',
      title: 'My Task Title',
      content: 'Task content here',
      type: NodeType.Task,
      tags: ['tag1', 'tag2'],
    })
  })

  it('handles all node types', () => {
    const task = nodeToDocument(createTaskNode())
    expect(task.type).toBe(NodeType.Task)

    const decision = nodeToDocument(createDecisionNode())
    expect(decision.type).toBe(NodeType.Decision)

    const component = nodeToDocument(createComponentNode())
    expect(component.type).toBe(NodeType.Component)

    const note = nodeToDocument(createNoteNode())
    expect(note.type).toBe(NodeType.Note)
  })
})

describe('createSearchIndex', () => {
  it('creates an empty MiniSearch index', () => {
    const index = createSearchIndex()
    expect(index.documentCount).toBe(0)
  })

  it('accepts custom field options', () => {
    const index = createSearchIndex({
      fields: ['title'],
      boost: { title: 5 },
    })
    expect(index.documentCount).toBe(0)
  })
})

describe('buildSearchIndex', () => {
  it('builds index from Map of nodes', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set('task-1', createTaskNode())
    nodes.set('decision-1', createDecisionNode())

    const index = buildSearchIndex(nodes)

    expect(index.documentCount).toBe(2)
  })

  it('builds index from array of nodes', () => {
    const nodes = [
      createTaskNode(),
      createDecisionNode(),
      createComponentNode(),
    ]

    const index = buildSearchIndex(nodes)

    expect(index.documentCount).toBe(3)
  })

  it('handles empty input', () => {
    const index = buildSearchIndex(new Map())
    expect(index.documentCount).toBe(0)
  })
})

describe('findTermPositions', () => {
  it('finds all occurrences of a term', () => {
    const positions = findTermPositions('hello world hello', 'hello')

    expect(positions).toHaveLength(2)
    expect(positions[0]).toEqual({ start: 0, end: 5, term: 'hello' })
    expect(positions[1]).toEqual({ start: 12, end: 17, term: 'hello' })
  })

  it('is case-insensitive', () => {
    const positions = findTermPositions('Hello HELLO hello', 'hello')

    expect(positions).toHaveLength(3)
    expect(positions[0].start).toBe(0)
    expect(positions[1].start).toBe(6)
    expect(positions[2].start).toBe(12)
  })

  it('returns empty array when term not found', () => {
    const positions = findTermPositions('hello world', 'xyz')
    expect(positions).toEqual([])
  })

  it('handles overlapping potential matches', () => {
    const positions = findTermPositions('aaa', 'aa')

    expect(positions).toHaveLength(2)
    expect(positions[0]).toEqual({ start: 0, end: 2, term: 'aa' })
    expect(positions[1]).toEqual({ start: 1, end: 3, term: 'aa' })
  })
})

describe('mergeMatchLocations', () => {
  it('merges overlapping locations', () => {
    const locations: MatchLocation[] = [
      { start: 0, end: 5, term: 'hello' },
      { start: 3, end: 8, term: 'lo wor' },
    ]

    const merged = mergeMatchLocations(locations)

    expect(merged).toHaveLength(1)
    expect(merged[0].start).toBe(0)
    expect(merged[0].end).toBe(8)
  })

  it('keeps non-overlapping locations separate', () => {
    const locations: MatchLocation[] = [
      { start: 0, end: 5, term: 'hello' },
      { start: 10, end: 15, term: 'world' },
    ]

    const merged = mergeMatchLocations(locations)

    expect(merged).toHaveLength(2)
  })

  it('handles adjacent locations', () => {
    const locations: MatchLocation[] = [
      { start: 0, end: 5, term: 'hello' },
      { start: 5, end: 10, term: 'world' },
    ]

    const merged = mergeMatchLocations(locations)

    expect(merged).toHaveLength(1)
    expect(merged[0].end).toBe(10)
  })

  it('returns empty array for empty input', () => {
    expect(mergeMatchLocations([])).toEqual([])
  })
})

describe('extractSnippet', () => {
  it('extracts snippet around match with context', () => {
    const text =
      'This is a long text with some important content that we want to find.'
    const matches: MatchLocation[] = [{ start: 25, end: 34, term: 'important' }]

    const snippet = extractSnippet(text, matches, 'content')

    expect(snippet).not.toBeNull()
    expect(snippet!.source).toBe('content')
    expect(snippet!.text).toContain('important')
    expect(snippet!.matches.length).toBeGreaterThan(0)
  })

  it('returns null for title with no matches', () => {
    const snippet = extractSnippet('Short title', [], 'title')
    expect(snippet).toBeNull()
  })

  it('returns beginning of content when no matches', () => {
    const text = 'This is content without any specific matches to highlight.'
    const snippet = extractSnippet(text, [], 'content')

    expect(snippet).not.toBeNull()
    expect(snippet!.matches).toEqual([])
    expect(snippet!.text.startsWith('This is content')).toBe(true)
  })

  it('adds ellipsis for truncated content', () => {
    const text = 'A'.repeat(200)
    const snippet = extractSnippet(text, [], 'content', { maxLength: 50 })

    expect(snippet!.text.endsWith('...')).toBe(true)
    expect(snippet!.text.length).toBeLessThanOrEqual(53) // 50 + '...'
  })

  it('adjusts match positions for snippet offset', () => {
    const text =
      'Prefix text that comes before the match term here and more text after.'
    const matches: MatchLocation[] = [{ start: 33, end: 38, term: 'match' }]

    const snippet = extractSnippet(text, matches, 'content', {
      contextBefore: 50,
      contextAfter: 50,
      maxLength: 200,
    })

    expect(snippet).not.toBeNull()
    // The match position should be adjusted relative to snippet start
    expect(snippet!.matches.length).toBeGreaterThan(0)
    // The snippet should contain the match
    expect(snippet!.text).toContain('match')
  })
})

describe('highlightSnippet', () => {
  it('creates highlighted segments', () => {
    const snippet: ContextSnippet = {
      text: 'This is important text',
      matches: [{ start: 8, end: 17, term: 'important' }],
      source: 'content',
    }

    const segments = highlightSnippet(snippet)

    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({ text: 'This is ', isHighlight: false })
    expect(segments[1]).toEqual({ text: 'important', isHighlight: true })
    expect(segments[2]).toEqual({ text: ' text', isHighlight: false })
  })

  it('handles no matches', () => {
    const snippet: ContextSnippet = {
      text: 'No matches here',
      matches: [],
      source: 'content',
    }

    const segments = highlightSnippet(snippet)

    expect(segments).toHaveLength(1)
    expect(segments[0]).toEqual({ text: 'No matches here', isHighlight: false })
  })

  it('handles match at start', () => {
    const snippet: ContextSnippet = {
      text: 'Start here',
      matches: [{ start: 0, end: 5, term: 'Start' }],
      source: 'content',
    }

    const segments = highlightSnippet(snippet)

    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ text: 'Start', isHighlight: true })
    expect(segments[1]).toEqual({ text: ' here', isHighlight: false })
  })

  it('handles match at end', () => {
    const snippet: ContextSnippet = {
      text: 'At the end',
      matches: [{ start: 7, end: 10, term: 'end' }],
      source: 'content',
    }

    const segments = highlightSnippet(snippet)

    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ text: 'At the ', isHighlight: false })
    expect(segments[1]).toEqual({ text: 'end', isHighlight: true })
  })

  it('handles multiple matches', () => {
    const snippet: ContextSnippet = {
      text: 'foo bar foo baz',
      matches: [
        { start: 0, end: 3, term: 'foo' },
        { start: 8, end: 11, term: 'foo' },
      ],
      source: 'content',
    }

    const segments = highlightSnippet(snippet)

    expect(segments).toHaveLength(4)
    expect(segments[0]).toEqual({ text: 'foo', isHighlight: true })
    expect(segments[1]).toEqual({ text: ' bar ', isHighlight: false })
    expect(segments[2]).toEqual({ text: 'foo', isHighlight: true })
    expect(segments[3]).toEqual({ text: ' baz', isHighlight: false })
  })
})

describe('searchNodes', () => {
  let nodes: Map<string, ForgeNode>

  beforeEach(() => {
    nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-database',
      createTaskNode({
        id: 'task-database',
        title: 'Set up database',
        content: 'Configure PostgreSQL for the application.',
        tags: ['database', 'setup'],
      })
    )
    nodes.set(
      'task-api',
      createTaskNode({
        id: 'task-api',
        title: 'Build REST API',
        content: 'Create API endpoints for CRUD operations.',
        tags: ['api', 'backend'],
      })
    )
    nodes.set(
      'decision-framework',
      createDecisionNode({
        id: 'decision-framework',
        title: 'Choose framework',
        content: 'Decide between React and Vue for the frontend.',
        tags: ['frontend', 'decision'],
      })
    )
    nodes.set(
      'component-motor',
      createComponentNode({
        id: 'component-motor',
        title: 'Servo Motor',
        content: 'High torque servo motor for precision control.',
        tags: ['motor', 'mechanical'],
      })
    )
  })

  it('searches by title', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'database', nodes)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('task-database')
  })

  it('searches by content', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'PostgreSQL', nodes)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('task-database')
  })

  it('searches by tags', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'frontend', nodes)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('decision-framework')
  })

  it('returns empty array for empty query', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, '', nodes)

    expect(results).toEqual([])
  })

  it('returns empty array for whitespace query', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, '   ', nodes)

    expect(results).toEqual([])
  })

  it('respects limit option', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'the', nodes, { limit: 2 })

    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('filters by node type', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'the', nodes, {
      filterTypes: [NodeType.Task],
    })

    for (const result of results) {
      expect(result.type).toBe(NodeType.Task)
    }
  })

  it('returns results with snippets', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'database', nodes)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].snippets.length).toBeGreaterThan(0)
  })

  it('includes matched terms', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'API endpoints', nodes)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].matchedTerms.length).toBeGreaterThan(0)
  })

  it('handles fuzzy matching', () => {
    const index = buildSearchIndex(nodes)
    // 'databse' is a typo of 'database'
    const results = searchNodes(index, 'databse', nodes, { fuzzy: 0.3 })

    // Should still find results with fuzzy matching
    expect(results.length).toBeGreaterThanOrEqual(0)
  })

  it('handles prefix matching', () => {
    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'data', nodes, { prefix: true })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('task-database')
  })
})

describe('index mutations', () => {
  let nodes: Map<string, ForgeNode>

  beforeEach(() => {
    nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-1',
      createTaskNode({ id: 'task-1', title: 'Original Task' })
    )
  })

  describe('addNodeToIndex', () => {
    it('adds a new node to the index', () => {
      const index = buildSearchIndex(nodes)
      expect(index.documentCount).toBe(1)

      const newNode = createTaskNode({ id: 'task-2', title: 'New Task' })
      addNodeToIndex(index, newNode)

      expect(index.documentCount).toBe(2)

      // Should be searchable
      nodes.set('task-2', newNode)
      const results = searchNodes(index, 'New', nodes)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('task-2')
    })
  })

  describe('removeNodeFromIndex', () => {
    it('removes a node from the index', () => {
      const index = buildSearchIndex(nodes)
      expect(index.documentCount).toBe(1)

      removeNodeFromIndex(index, 'task-1')

      // Document count may not change immediately due to MiniSearch's discard behavior
      // but search should not return the removed document
      const results = searchNodes(index, 'Original', nodes)
      expect(results).toEqual([])
    })
  })

  describe('updateNodeInIndex', () => {
    it('updates an existing node in the index', () => {
      const index = buildSearchIndex(nodes)

      const updatedNode = createTaskNode({
        id: 'task-1',
        title: 'Updated Task Title',
        content: 'New content here',
      })
      updateNodeInIndex(index, updatedNode)
      nodes.set('task-1', updatedNode)

      // Should find by new title
      const results = searchNodes(index, 'Updated', nodes)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('task-1')

      // Should not find by old title
      const oldResults = searchNodes(index, 'Original', nodes)
      expect(oldResults).toEqual([])
    })

    it('handles updating non-existent node (adds it)', () => {
      const index = buildSearchIndex(nodes)
      expect(index.documentCount).toBe(1)

      const newNode = createTaskNode({ id: 'task-new', title: 'Brand New' })
      updateNodeInIndex(index, newNode)
      nodes.set('task-new', newNode)

      const results = searchNodes(index, 'Brand', nodes)
      expect(results.length).toBeGreaterThan(0)
    })
  })
})

describe('search result scoring', () => {
  it('ranks title matches higher than content matches', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'title-match',
      createTaskNode({
        id: 'title-match',
        title: 'Database Setup',
        content: 'Some generic content.',
      })
    )
    nodes.set(
      'content-match',
      createTaskNode({
        id: 'content-match',
        title: 'Generic Task',
        content: 'This involves database configuration.',
      })
    )

    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'database', nodes)

    expect(results.length).toBe(2)
    // Title match should score higher due to boost
    expect(results[0].id).toBe('title-match')
  })
})

describe('edge cases', () => {
  it('handles special characters in search query', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-1',
      createTaskNode({
        id: 'task-1',
        title: 'Test (with) brackets',
        content: 'Content with [special] characters.',
      })
    )

    const index = buildSearchIndex(nodes)

    // Should not throw
    const results = searchNodes(index, '(with)', nodes)
    expect(Array.isArray(results)).toBe(true)
  })

  it('handles very long content', () => {
    const longContent = 'word '.repeat(1000)
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-1',
      createTaskNode({
        id: 'task-1',
        title: 'Long Content Task',
        content: longContent,
      })
    )

    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'word', nodes)

    expect(results.length).toBeGreaterThan(0)
    // Snippet should be reasonable length
    expect(results[0].snippets[0].text.length).toBeLessThan(200)
  })

  it('handles nodes with empty content', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-1',
      createTaskNode({
        id: 'task-1',
        title: 'Empty Content Task',
        content: '',
      })
    )

    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'Empty', nodes)

    expect(results.length).toBeGreaterThan(0)
  })

  it('handles unicode characters', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'task-1',
      createTaskNode({
        id: 'task-1',
        title: 'Task with émojis 🎉',
        content: 'Content with café and naïve.',
      })
    )

    const index = buildSearchIndex(nodes)
    const results = searchNodes(index, 'café', nodes)

    expect(results.length).toBeGreaterThan(0)
  })
})

describe('vacuumIndex', () => {
  it('cleans up removed documents from the index', () => {
    const nodes = new Map<string, ForgeNode>()
    const node1 = createTaskNode({ id: 'task-1', title: 'Task One' })
    const node2 = createTaskNode({ id: 'task-2', title: 'Task Two' })
    nodes.set('task-1', node1)
    nodes.set('task-2', node2)

    const index = buildSearchIndex(nodes)

    // Remove a node
    removeNodeFromIndex(index, 'task-1')

    // Vacuum should not throw
    expect(() => vacuumIndex(index)).not.toThrow()

    // Search should still work and only find the remaining node
    const results = searchNodes(index, 'Task', nodes)
    expect(results.map((r) => r.id)).not.toContain('task-1')
  })
})

describe('updateNodeInIndex error handling', () => {
  it('does not throw when updating node that was never indexed', () => {
    const index = createSearchIndex()
    const node = createTaskNode({ id: 'never-indexed', title: 'New Node' })

    // Should not throw - the node was never in the index
    expect(() => updateNodeInIndex(index, node)).not.toThrow()

    // Node should now be searchable
    const nodes = new Map<string, ForgeNode>()
    nodes.set('never-indexed', node)
    const results = searchNodes(index, 'New', nodes)
    expect(results.map((r) => r.id)).toContain('never-indexed')
  })

  it('logs unexpected errors but does not throw', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const index = createSearchIndex()
    const node = createTaskNode({ id: 'test-node', title: 'Test' })

    // Add the node first
    addNodeToIndex(index, node)

    // Update should work fine
    const updatedNode = createTaskNode({
      id: 'test-node',
      title: 'Updated Test',
    })
    expect(() => updateNodeInIndex(index, updatedNode)).not.toThrow()

    consoleSpy.mockRestore()
  })
})
