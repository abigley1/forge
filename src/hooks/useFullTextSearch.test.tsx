import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useFullTextSearch,
  useFilteredSearchResults,
} from './useFullTextSearch'
import { useNodesStore } from '@/store/useNodesStore'
import type { ForgeNode, TaskNode, DecisionNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

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

describe('useFullTextSearch', () => {
  beforeEach(() => {
    // Reset the nodes store
    useNodesStore.getState().clearNodes()

    // Add test nodes
    const nodes = new Map<string, ForgeNode>()
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

    useNodesStore.getState().setNodes(nodes)
  })

  it('initializes with empty results', () => {
    const { result } = renderHook(() => useFullTextSearch())

    expect(result.current.results).toEqual([])
    expect(result.current.query).toBe('')
    expect(result.current.isSearching).toBe(false)
  })

  it('becomes ready after mount', async () => {
    const { result } = renderHook(() => useFullTextSearch())

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })
  })

  it('searches and returns results', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 0 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    act(() => {
      result.current.search('database')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    expect(result.current.results[0].id).toBe('task-database')
  })

  it('updates query state immediately', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 100 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    act(() => {
      result.current.search('test query')
    })

    // Query updates immediately (not debounced)
    expect(result.current.query).toBe('test query')
  })

  it('clears search results', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 0 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // First search
    act(() => {
      result.current.search('database')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    // Then clear
    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.results).toEqual([])
    expect(result.current.query).toBe('')
  })

  it('returns empty results for empty query', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 0 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    act(() => {
      result.current.search('')
    })

    // Empty query immediately returns empty results (no debounce needed)
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
  })

  it('provides highlightSnippet function', () => {
    const { result } = renderHook(() => useFullTextSearch())

    expect(typeof result.current.highlightSnippet).toBe('function')
  })

  it('provides rebuildIndex function', async () => {
    const { result } = renderHook(() => useFullTextSearch())

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // Should not throw
    act(() => {
      result.current.rebuildIndex()
    })

    expect(result.current.isIndexReady).toBe(true)
  })

  it('updates index when nodes change', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 0 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // Search for something not in initial nodes
    act(() => {
      result.current.search('uniqueterm')
    })

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false)
    })

    expect(result.current.results.length).toBe(0)

    // Add a node with the search term
    act(() => {
      useNodesStore.getState().addNode(
        createTaskNode({
          id: 'task-new',
          title: 'Task with uniqueterm',
          content: 'Some content',
        })
      )
    })

    // Search again
    act(() => {
      result.current.search('uniqueterm')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    expect(result.current.results[0].id).toBe('task-new')
  })

  it('results include snippets with match information', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 0 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    act(() => {
      result.current.search('database')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    const firstResult = result.current.results[0]
    expect(firstResult.snippets).toBeDefined()
    expect(firstResult.snippets.length).toBeGreaterThan(0)
    expect(firstResult.matchedTerms).toBeDefined()
    expect(firstResult.matchedTerms.length).toBeGreaterThan(0)
  })

  it('sets isSearching true during search', async () => {
    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 50 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    act(() => {
      result.current.search('database')
    })

    // Should be searching immediately after calling search
    expect(result.current.isSearching).toBe(true)

    // Wait for search to complete
    await waitFor(() => {
      expect(result.current.isSearching).toBe(false)
    })
  })
})

describe('useFilteredSearchResults', () => {
  const mockResults = [
    {
      id: 'task-1',
      title: 'Task 1',
      type: NodeType.Task,
      score: 1,
      snippets: [],
      matchedTerms: ['test'],
    },
    {
      id: 'decision-1',
      title: 'Decision 1',
      type: NodeType.Decision,
      score: 0.9,
      snippets: [],
      matchedTerms: ['test'],
    },
    {
      id: 'task-2',
      title: 'Task 2',
      type: NodeType.Task,
      score: 0.8,
      snippets: [],
      matchedTerms: ['test'],
    },
  ]

  it('returns all results when no filter', () => {
    const { result } = renderHook(() => useFilteredSearchResults(mockResults))

    expect(result.current).toHaveLength(3)
  })

  it('returns all results when filterTypes is empty', () => {
    const { result } = renderHook(() =>
      useFilteredSearchResults(mockResults, [])
    )

    expect(result.current).toHaveLength(3)
  })

  it('filters by single type', () => {
    const { result } = renderHook(() =>
      useFilteredSearchResults(mockResults, [NodeType.Task])
    )

    expect(result.current).toHaveLength(2)
    expect(result.current.every((r) => r.type === NodeType.Task)).toBe(true)
  })

  it('filters by multiple types', () => {
    const { result } = renderHook(() =>
      useFilteredSearchResults(mockResults, [NodeType.Task, NodeType.Decision])
    )

    expect(result.current).toHaveLength(3)
  })

  it('returns empty array when no matches', () => {
    const { result } = renderHook(() =>
      useFilteredSearchResults(mockResults, [NodeType.Component])
    )

    expect(result.current).toHaveLength(0)
  })
})

describe('useFullTextSearch edge cases', () => {
  beforeEach(() => {
    // Start with empty nodes store
    useNodesStore.setState({ nodes: new Map() })
  })

  it('handles empty nodes store gracefully', async () => {
    const { result } = renderHook(() => useFullTextSearch())

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // Search should work but return no results
    act(() => {
      result.current.search('anything')
    })

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false)
    })

    expect(result.current.results).toHaveLength(0)
  })

  it('cancels pending search on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useFullTextSearch({ debounceMs: 100 })
    )

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // Start a search
    act(() => {
      result.current.search('test')
    })

    // Unmount before debounce completes - should not throw
    expect(() => unmount()).not.toThrow()
  })

  it('rebuildIndex fixes stale results after bulk node replacement', async () => {
    // Start with initial nodes
    const initialNodes = new Map()
    initialNodes.set(
      'old-node',
      createTestNode({
        id: 'old-node',
        type: NodeType.Task,
        title: 'Old Node',
        content: 'Old content',
      })
    )
    useNodesStore.setState({ nodes: initialNodes })

    const { result } = renderHook(() => useFullTextSearch({ debounceMs: 10 }))

    await waitFor(() => {
      expect(result.current.isIndexReady).toBe(true)
    })

    // Search for old content
    act(() => {
      result.current.search('Old')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    // Replace all nodes with new ones
    const newNodes = new Map()
    newNodes.set(
      'new-node',
      createTestNode({
        id: 'new-node',
        type: NodeType.Task,
        title: 'New Node',
        content: 'Completely different content',
      })
    )
    act(() => {
      useNodesStore.setState({ nodes: newNodes })
    })

    // Rebuild index
    act(() => {
      result.current.rebuildIndex()
    })

    // Clear and search again
    act(() => {
      result.current.clearSearch()
    })

    act(() => {
      result.current.search('New')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
      expect(result.current.results[0].id).toBe('new-node')
    })

    // Old node should no longer be found
    act(() => {
      result.current.clearSearch()
    })

    act(() => {
      result.current.search('Old')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBe(0)
    })
  })
})

// Helper function for creating test nodes
function createTestNode(
  overrides: Partial<ForgeNode> & { id: string; type: NodeType }
): ForgeNode {
  const base = {
    title: 'Test Node',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: 'Test content',
  }

  if (overrides.type === NodeType.Task) {
    return {
      ...base,
      ...overrides,
      status: 'pending',
      priority: 'medium',
      dependsOn: [],
      blocks: [],
      checklist: [],
      milestone: undefined,
    } as ForgeNode
  }

  if (overrides.type === NodeType.Decision) {
    return {
      ...base,
      ...overrides,
      status: 'pending',
      selected: null,
      options: [],
      criteria: [],
      rationale: null,
      selectedDate: null,
    } as ForgeNode
  }

  if (overrides.type === NodeType.Component) {
    return {
      ...base,
      ...overrides,
      status: 'considering',
      cost: 0,
      supplier: '',
      partNumber: '',
      customFields: {},
    } as ForgeNode
  }

  return {
    ...base,
    ...overrides,
  } as ForgeNode
}
