/**
 * useWikiLinkAutocomplete Hook Tests
 *
 * Tests for the hook that integrates wiki-link autocomplete with the nodes store
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWikiLinkAutocomplete } from './useWikiLinkAutocomplete'
import { useNodesStore } from '@/store'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  NodeType,
} from '@/types/nodes'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockNode(id: string, title: string, type: NodeType): ForgeNode {
  const baseNode = {
    id,
    title,
    type,
    content: `# ${title}\n\nContent for ${id}`,
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
  }

  switch (type) {
    case 'decision':
      return {
        ...baseNode,
        type: 'decision',
        status: 'pending',
        selected: null,
        options: [],
        criteria: [],
      } as DecisionNode
    case 'task':
      return {
        ...baseNode,
        type: 'task',
        status: 'pending',
        priority: 'medium',
        dependsOn: [],
        blocks: [],
        checklist: [],
      } as TaskNode
    case 'component':
      return {
        ...baseNode,
        type: 'component',
        status: 'considering',
        cost: null,
        supplier: null,
        partNumber: null,
        customFields: {},
      } as ComponentNode
    case 'note':
      return {
        ...baseNode,
        type: 'note',
      } as NoteNode
    default:
      throw new Error(`Unknown type: ${type}`)
  }
}

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  // Reset store state before each test
  useNodesStore.setState({
    nodes: new Map(),
    activeNodeId: null,
    dirtyNodeIds: new Set(),
    linkIndex: { outgoing: new Map(), incoming: new Map() },
  })
})

// ============================================================================
// Basic Hook Tests
// ============================================================================

describe('useWikiLinkAutocomplete', () => {
  describe('initialization', () => {
    it('returns expected shape', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current).toHaveProperty('nodes')
      expect(result.current).toHaveProperty('onLinkInserted')
      expect(result.current).toHaveProperty('onAutocompleteNavigate')
      expect(result.current).toHaveProperty('onAutocompleteResultCountChange')
      expect(result.current).toHaveProperty('announcement')
      expect(result.current).toHaveProperty('lastInsertedLinkId')
    })

    it('initializes with empty nodes array when store is empty', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.nodes).toEqual([])
    })

    it('initializes with empty announcement', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.announcement).toBe('')
    })

    it('initializes lastInsertedLinkId as null', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.lastInsertedLinkId).toBeNull()
    })
  })

  // ============================================================================
  // Nodes from Store Tests
  // ============================================================================

  describe('nodes from store', () => {
    it('converts store nodes to suggestions', () => {
      // Add nodes to store
      const nodes = new Map<string, ForgeNode>()
      nodes.set('task-1', createMockNode('task-1', 'Task One', 'task'))
      nodes.set(
        'decision-1',
        createMockNode('decision-1', 'Decision One', 'decision')
      )

      useNodesStore.setState({ nodes })

      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.nodes).toHaveLength(2)
      expect(result.current.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'task-1',
            title: 'Task One',
            type: 'task',
          }),
          expect.objectContaining({
            id: 'decision-1',
            title: 'Decision One',
            type: 'decision',
          }),
        ])
      )
    })

    it('excludes current node from suggestions', () => {
      const nodes = new Map<string, ForgeNode>()
      nodes.set(
        'current-node',
        createMockNode('current-node', 'Current Node', 'task')
      )
      nodes.set(
        'other-node',
        createMockNode('other-node', 'Other Node', 'decision')
      )

      useNodesStore.setState({ nodes })

      const { result } = renderHook(() =>
        useWikiLinkAutocomplete({ currentNodeId: 'current-node' })
      )

      expect(result.current.nodes).toHaveLength(1)
      expect(result.current.nodes[0].id).toBe('other-node')
    })

    it('includes all nodes when currentNodeId is not specified', () => {
      const nodes = new Map<string, ForgeNode>()
      nodes.set('node-1', createMockNode('node-1', 'Node One', 'task'))
      nodes.set('node-2', createMockNode('node-2', 'Node Two', 'decision'))

      useNodesStore.setState({ nodes })

      const { result } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.nodes).toHaveLength(2)
    })

    it('updates when store nodes change', () => {
      const nodes = new Map<string, ForgeNode>()
      nodes.set(
        'initial-node',
        createMockNode('initial-node', 'Initial Node', 'task')
      )

      useNodesStore.setState({ nodes })

      const { result, rerender } = renderHook(() => useWikiLinkAutocomplete())

      expect(result.current.nodes).toHaveLength(1)

      // Add another node
      act(() => {
        const newNodes = new Map(useNodesStore.getState().nodes)
        newNodes.set('new-node', createMockNode('new-node', 'New Node', 'note'))
        useNodesStore.setState({ nodes: newNodes })
      })

      rerender()

      expect(result.current.nodes).toHaveLength(2)
    })
  })

  // ============================================================================
  // Link Insertion Tests
  // ============================================================================

  describe('onLinkInserted', () => {
    it('updates lastInsertedLinkId', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onLinkInserted('inserted-node', 'Inserted Node')
      })

      expect(result.current.lastInsertedLinkId).toBe('inserted-node')
    })

    it('sets announcement for link insertion', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onLinkInserted('test-node', 'Test Node Title')
      })

      expect(result.current.announcement).toBe(
        'Link inserted to Test Node Title'
      )
    })

    it('calls external onLinkInserted callback', () => {
      const externalCallback = vi.fn()
      const { result } = renderHook(() =>
        useWikiLinkAutocomplete({ onLinkInserted: externalCallback })
      )

      act(() => {
        result.current.onLinkInserted('node-id', 'Node Title')
      })

      expect(externalCallback).toHaveBeenCalledWith('node-id', 'Node Title')
    })

    it('clears announcement after timeout', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onLinkInserted('test-node', 'Test Node')
      })

      expect(result.current.announcement).toBe('Link inserted to Test Node')

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.announcement).toBe('')

      vi.useRealTimers()
    })
  })

  // ============================================================================
  // Navigation Announcement Tests
  // ============================================================================

  describe('onAutocompleteNavigate', () => {
    it('announces suggestion with total count', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteNavigate(
          { id: 'test-id', title: 'Test Title', type: 'task' },
          5
        )
      })

      expect(result.current.announcement).toBe('Test Title, task, 5 results')
    })

    it('announces available suggestions when suggestion is null', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteNavigate(null, 3)
      })

      expect(result.current.announcement).toBe('3 suggestions available')
    })

    it('handles different node types', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteNavigate(
          { id: 'decision-1', title: 'My Decision', type: 'decision' },
          2
        )
      })

      expect(result.current.announcement).toBe(
        'My Decision, decision, 2 results'
      )
    })
  })

  // ============================================================================
  // Result Count Announcement Tests
  // ============================================================================

  describe('onAutocompleteResultCountChange', () => {
    it('announces when no results found', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteResultCountChange(0)
      })

      expect(result.current.announcement).toBe('No matching nodes found')
    })

    it('announces single suggestion', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteResultCountChange(1)
      })

      expect(result.current.announcement).toBe('1 suggestion available')
    })

    it('announces multiple suggestions', () => {
      const { result } = renderHook(() => useWikiLinkAutocomplete())

      act(() => {
        result.current.onAutocompleteResultCountChange(5)
      })

      expect(result.current.announcement).toBe('5 suggestions available')
    })
  })
})

// ============================================================================
// Export Tests
// ============================================================================

describe('exports', () => {
  it('exports useWikiLinkAutocomplete', async () => {
    const module = await import('./useWikiLinkAutocomplete')
    expect(module.useWikiLinkAutocomplete).toBeDefined()
    expect(typeof module.useWikiLinkAutocomplete).toBe('function')
  })

  it('is exported from hooks index', async () => {
    const exports = await import('./index')
    expect(exports.useWikiLinkAutocomplete).toBeDefined()
  })
})
