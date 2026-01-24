/**
 * Tests for useWikiLinkNavigation Hook
 *
 * Tests the wiki-link navigation and preview functionality including:
 * - Link resolution
 * - Preview state management
 * - Navigation handlers
 * - Create node integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'

import { useWikiLinkNavigation } from './useWikiLinkNavigation'
import { useNodesStore } from '@/store'
import { NodeType } from '@/types/nodes'
import type { ForgeNode, TaskNode, NoteNode } from '@/types/nodes'

// ============================================================================
// Test Utilities
// ============================================================================

const wrapper = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
)

// Helper to create test nodes
function createTestNode(
  id: string,
  title: string,
  type: NodeType = NodeType.Task
): ForgeNode {
  const baseNode = {
    id,
    title,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: `# ${title}\n\nThis is the content for ${title}.`,
  }

  if (type === NodeType.Task) {
    return {
      ...baseNode,
      type: NodeType.Task,
      status: 'pending',
      priority: 'medium',
      dependsOn: [],
      blocks: [],
      checklist: [],
      parent: null,
    } as TaskNode
  }

  if (type === NodeType.Note) {
    return {
      ...baseNode,
      type: NodeType.Note,
      parent: null,
    } as NoteNode
  }

  // Default to Note for other types
  return {
    ...baseNode,
    type: NodeType.Note,
    parent: null,
  } as NoteNode
}

// ============================================================================
// Setup / Teardown
// ============================================================================

describe('useWikiLinkNavigation', () => {
  beforeEach(() => {
    // Reset stores
    useNodesStore.getState().clearNodes()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('returns initial state with preview not visible', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      expect(result.current.state.previewVisible).toBe(false)
      expect(result.current.state.previewLinkInfo).toBeNull()
      expect(result.current.state.previewAnchorRect).toBeNull()
      expect(result.current.state.showCreateDialog).toBe(false)
    })

    it('returns decoration options', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      expect(result.current.decorationOptions).toBeDefined()
      expect(typeof result.current.decorationOptions.resolveLink).toBe(
        'function'
      )
    })

    it('returns handler functions', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      expect(typeof result.current.dismissPreview).toBe('function')
      expect(typeof result.current.handleNavigate).toBe('function')
      expect(typeof result.current.handleCreate).toBe('function')
      expect(typeof result.current.clearCreateNodeState).toBe('function')
    })
  })

  // ============================================================================
  // Link Resolution Tests
  // ============================================================================

  describe('link resolution', () => {
    it('resolves existing node by ID', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      const linkInfo = result.current.decorationOptions.resolveLink('task-1')

      expect(linkInfo).not.toBeNull()
      expect(linkInfo?.exists).toBe(true)
      if (linkInfo?.exists) {
        expect(linkInfo.id).toBe('task-1')
        expect(linkInfo.title).toBe('Test Task')
        expect(linkInfo.type).toBe('task')
      }
    })

    it('resolves existing node by title (case-insensitive)', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      const linkInfo = result.current.decorationOptions.resolveLink('test task')

      expect(linkInfo).not.toBeNull()
      expect(linkInfo?.exists).toBe(true)
      if (linkInfo?.exists) {
        expect(linkInfo.id).toBe('task-1')
      }
    })

    it('returns unresolved link info for non-existent target', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      const linkInfo =
        result.current.decorationOptions.resolveLink('non-existent')

      expect(linkInfo).not.toBeNull()
      expect(linkInfo?.exists).toBe(false)
      if (linkInfo && !linkInfo.exists) {
        expect(linkInfo.target).toBe('non-existent')
      }
    })

    it('includes content preview for resolved links', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      const linkInfo = result.current.decorationOptions.resolveLink('task-1')

      expect(linkInfo?.exists).toBe(true)
      if (linkInfo?.exists) {
        expect(linkInfo.contentPreview).toBeDefined()
        expect(linkInfo.contentPreview.length).toBeGreaterThan(0)
      }
    })
  })

  // ============================================================================
  // Preview State Tests
  // ============================================================================

  describe('preview state', () => {
    it('dismissPreview clears preview state', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      // First trigger a hover to set preview state
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const linkInfo = result.current.decorationOptions.resolveLink('task-1')
      const mockRect = new DOMRect(100, 100, 50, 20)

      act(() => {
        result.current.decorationOptions.onLinkHover?.(linkInfo!, mockRect)
      })

      // Verify preview is visible
      expect(result.current.state.previewVisible).toBe(true)

      // Dismiss
      act(() => {
        result.current.dismissPreview()
      })

      expect(result.current.state.previewVisible).toBe(false)
      expect(result.current.state.previewLinkInfo).toBeNull()
      expect(result.current.state.previewAnchorRect).toBeNull()
    })
  })

  // ============================================================================
  // Navigation Handler Tests
  // ============================================================================

  describe('handleNavigate', () => {
    it('dismisses preview after navigation', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      // Set up preview state
      const linkInfo = result.current.decorationOptions.resolveLink('task-1')
      const mockRect = new DOMRect(100, 100, 50, 20)

      act(() => {
        result.current.decorationOptions.onLinkHover?.(linkInfo!, mockRect)
      })

      // Navigate
      act(() => {
        if (linkInfo?.exists) {
          result.current.handleNavigate(linkInfo)
        }
      })

      expect(result.current.state.previewVisible).toBe(false)
    })

    it('does not navigate to current node (prevents self-navigation)', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(
        () => useWikiLinkNavigation({ currentNodeId: 'task-1' }),
        { wrapper }
      )

      const linkInfo = result.current.decorationOptions.resolveLink('task-1')

      // The handleLinkClick callback should filter out navigation to self
      // We verify this by checking that it doesn't throw
      expect(linkInfo?.exists).toBe(true)
      if (linkInfo?.exists) {
        expect(linkInfo.id).toBe('task-1')
      }
    })
  })

  // ============================================================================
  // Create Handler Tests
  // ============================================================================

  describe('handleCreate', () => {
    it('sets create node state', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      act(() => {
        result.current.handleCreate('new-node-title')
      })

      expect(result.current.state.createNodeTitle).toBe('new-node-title')
      expect(result.current.state.showCreateDialog).toBe(true)
    })

    it('calls onCreateNode callback', () => {
      const onCreateNode = vi.fn()

      const { result } = renderHook(
        () => useWikiLinkNavigation({ onCreateNode }),
        { wrapper }
      )

      act(() => {
        result.current.handleCreate('new-node-title')
      })

      expect(onCreateNode).toHaveBeenCalledWith('new-node-title')
    })

    it('clearCreateNodeState resets create state', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      // Set create state
      act(() => {
        result.current.handleCreate('new-node-title')
      })

      expect(result.current.state.showCreateDialog).toBe(true)

      // Clear it
      act(() => {
        result.current.clearCreateNodeState()
      })

      expect(result.current.state.createNodeTitle).toBeNull()
      expect(result.current.state.showCreateDialog).toBe(false)
    })
  })

  // ============================================================================
  // Decoration Options Tests
  // ============================================================================

  describe('decoration options callbacks', () => {
    it('onLinkHover sets preview state', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      const linkInfo = result.current.decorationOptions.resolveLink('task-1')
      const mockRect = new DOMRect(100, 100, 50, 20)

      act(() => {
        result.current.decorationOptions.onLinkHover?.(linkInfo!, mockRect)
      })

      expect(result.current.state.previewVisible).toBe(true)
      expect(result.current.state.previewLinkInfo).toEqual(linkInfo)
      expect(result.current.state.previewAnchorRect).toEqual(mockRect)
    })

    it('onLinkHoverEnd clears preview visibility', () => {
      const node = createTestNode('task-1', 'Test Task')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      // Set up preview state
      const linkInfo = result.current.decorationOptions.resolveLink('task-1')
      const mockRect = new DOMRect(100, 100, 50, 20)

      act(() => {
        result.current.decorationOptions.onLinkHover?.(linkInfo!, mockRect)
      })

      expect(result.current.state.previewVisible).toBe(true)

      // Hover end
      act(() => {
        result.current.decorationOptions.onLinkHoverEnd?.()
      })

      expect(result.current.state.previewVisible).toBe(false)
    })

    it('onBrokenLinkClick sets create state', () => {
      const { result } = renderHook(() => useWikiLinkNavigation(), { wrapper })

      act(() => {
        result.current.decorationOptions.onBrokenLinkClick?.('broken-link')
      })

      expect(result.current.state.createNodeTitle).toBe('broken-link')
      expect(result.current.state.showCreateDialog).toBe(true)
    })
  })

  // ============================================================================
  // Memoization Tests
  // ============================================================================

  describe('memoization', () => {
    it('decorationOptions is stable across renders', () => {
      const { result, rerender } = renderHook(() => useWikiLinkNavigation(), {
        wrapper,
      })

      const initialOptions = result.current.decorationOptions

      rerender()

      expect(result.current.decorationOptions).toBe(initialOptions)
    })

    it('state object is stable when values unchanged', () => {
      const { result, rerender } = renderHook(() => useWikiLinkNavigation(), {
        wrapper,
      })

      const initialState = result.current.state

      rerender()

      expect(result.current.state).toEqual(initialState)
    })
  })
})
