import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useLinkRenaming,
  updateWikiLinkReferences,
  countWikiLinkReferences,
} from './useLinkRenaming'
import { useNodesStore } from '@/store'
import type { ForgeNode } from '@/types/nodes'
import { createNodeDates } from '@/types/nodes'

// Helper to create test nodes
function createTestNode(
  id: string,
  title: string,
  content: string,
  type: 'note' | 'task' | 'decision' | 'component' = 'note'
): ForgeNode {
  const baseNode = {
    id,
    title,
    content,
    tags: [],
    dates: createNodeDates(),
  }

  switch (type) {
    case 'task':
      return {
        ...baseNode,
        type: 'task' as const,
        status: 'pending',
        priority: 'medium',
        dependsOn: [],
        blocks: [],
        checklist: [],
      }
    case 'decision':
      return {
        ...baseNode,
        type: 'decision' as const,
        status: 'pending',
        selected: null,
        options: [],
        criteria: [],
      }
    case 'component':
      return {
        ...baseNode,
        type: 'component' as const,
        status: 'considering',
        cost: null,
        supplier: null,
        partNumber: null,
        customFields: {},
      }
    case 'note':
    default:
      return {
        ...baseNode,
        type: 'note' as const,
      }
  }
}

describe('useLinkRenaming', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useNodesStore.getState()
    store.clearNodes()
  })

  describe('initialization', () => {
    it('should initialize with null state', () => {
      const { result } = renderHook(() => useLinkRenaming({ node: null }))

      expect(result.current.state).toBeNull()
      expect(result.current.isUpdating).toBe(false)
    })

    it('should initialize with node', () => {
      const node = createTestNode('my-node', 'My Node', 'Content')
      const { result } = renderHook(() => useLinkRenaming({ node }))

      expect(result.current.state).toBeNull()
    })
  })

  describe('checkTitleChange', () => {
    it('should not open dialog when titles are the same', () => {
      const node = createTestNode('my-node', 'My Node', 'Content')
      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('My Node', 'My Node')
      })

      expect(result.current.state).toBeNull()
    })

    it('should not open dialog when no referencing nodes', () => {
      // Add node to store
      const node = createTestNode('my-node', 'My Node', 'Content')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('My Node', 'New Title')
      })

      expect(result.current.state).toBeNull()
    })

    it('should open dialog when there are referencing nodes', () => {
      // Add renamed node
      const node = createTestNode('motor', 'Motor Selection', 'Content')
      useNodesStore.getState().addNode(node)

      // Add referencing node
      const refNode = createTestNode(
        'task-1',
        'Build Frame',
        'Need to check [[Motor Selection]] first',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor Selection', 'Stepper Motor')
      })

      expect(result.current.state).not.toBeNull()
      expect(result.current.state?.oldTitle).toBe('Motor Selection')
      expect(result.current.state?.newTitle).toBe('Stepper Motor')
      expect(result.current.state?.referencingNodes).toHaveLength(1)
    })

    it('should count multiple references in single node', () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]] twice, and [[Motor]] again',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      expect(result.current.state?.referencingNodes[0].referenceCount).toBe(2)
    })

    it('should not open dialog for empty titles', () => {
      const node = createTestNode('my-node', 'My Node', 'Content')
      useNodesStore.getState().addNode(node)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('', 'New Title')
      })
      expect(result.current.state).toBeNull()

      act(() => {
        result.current.checkTitleChange('Old Title', '')
      })
      expect(result.current.state).toBeNull()
    })
  })

  describe('updateAllReferences', () => {
    it('should update references in all nodes', async () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]] here',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const onReferencesUpdated = vi.fn()
      const { result } = renderHook(() =>
        useLinkRenaming({ node, onReferencesUpdated })
      )

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      let updatedCount: number = 0
      await act(async () => {
        updatedCount = await result.current.updateAllReferences()
      })

      expect(updatedCount).toBe(1)
      expect(onReferencesUpdated).toHaveBeenCalledWith(1)

      // Check that node was updated
      const updatedNode = useNodesStore.getState().getNodeById('task-1')
      expect(updatedNode?.content).toBe('Check [[New Motor]] here')
    })

    it('should close dialog after update', async () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]]',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      expect(result.current.state).not.toBeNull()

      await act(async () => {
        await result.current.updateAllReferences()
      })

      expect(result.current.state).toBeNull()
    })

    it('should return 0 when no state', async () => {
      const { result } = renderHook(() => useLinkRenaming({ node: null }))

      let count: number = 0
      await act(async () => {
        count = await result.current.updateAllReferences()
      })

      expect(count).toBe(0)
    })

    it('should mark updated nodes as dirty', async () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]]',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      await act(async () => {
        await result.current.updateAllReferences()
      })

      expect(useNodesStore.getState().isNodeDirty('task-1')).toBe(true)
    })
  })

  describe('skipUpdate', () => {
    it('should close dialog without updating', () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]]',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      expect(result.current.state).not.toBeNull()

      act(() => {
        result.current.skipUpdate()
      })

      expect(result.current.state).toBeNull()

      // Node should be unchanged
      expect(useNodesStore.getState().getNodeById('task-1')?.content).toBe(
        'Check [[Motor]]'
      )
    })
  })

  describe('closeDialog', () => {
    it('should close dialog', () => {
      const node = createTestNode('motor', 'Motor', 'Content')
      useNodesStore.getState().addNode(node)

      const refNode = createTestNode(
        'task-1',
        'Task',
        'Check [[Motor]]',
        'task'
      )
      useNodesStore.getState().addNode(refNode)

      const { result } = renderHook(() => useLinkRenaming({ node }))

      act(() => {
        result.current.checkTitleChange('Motor', 'New Motor')
      })

      act(() => {
        result.current.closeDialog()
      })

      expect(result.current.state).toBeNull()
    })
  })
})

describe('updateWikiLinkReferences', () => {
  it('should replace single reference', () => {
    const content = 'Link to [[old-title]]'
    const result = updateWikiLinkReferences(content, 'old-title', 'new-title')
    expect(result).toBe('Link to [[new-title]]')
  })

  it('should replace multiple references', () => {
    const content = 'Link [[old]] and [[old]] again'
    const result = updateWikiLinkReferences(content, 'old', 'new')
    expect(result).toBe('Link [[new]] and [[new]] again')
  })

  it('should be case-insensitive', () => {
    const content = 'Link [[OLD-TITLE]] and [[Old-Title]]'
    const result = updateWikiLinkReferences(content, 'old-title', 'new-title')
    expect(result).toBe('Link [[new-title]] and [[new-title]]')
  })

  it('should handle special regex characters', () => {
    const content = 'Link [[Title (v2)]]'
    const result = updateWikiLinkReferences(content, 'Title (v2)', 'Title v3')
    expect(result).toBe('Link [[Title v3]]')
  })

  it('should not replace partial matches', () => {
    const content = 'Link [[motor-selection-v2]]'
    const result = updateWikiLinkReferences(content, 'motor', 'engine')
    expect(result).toBe('Link [[motor-selection-v2]]')
  })
})

describe('countWikiLinkReferences', () => {
  it('should count single reference', () => {
    const content = 'Link to [[target]]'
    expect(countWikiLinkReferences(content, 'target')).toBe(1)
  })

  it('should count multiple references', () => {
    const content = 'Link [[target]] and [[target]] and [[target]]'
    expect(countWikiLinkReferences(content, 'target')).toBe(3)
  })

  it('should be case-insensitive', () => {
    const content = 'Link [[Target]] and [[TARGET]]'
    expect(countWikiLinkReferences(content, 'target')).toBe(2)
  })

  it('should return 0 for no matches', () => {
    const content = 'Link [[other]]'
    expect(countWikiLinkReferences(content, 'target')).toBe(0)
  })

  it('should not count partial matches', () => {
    const content = 'Link [[target-extended]]'
    expect(countWikiLinkReferences(content, 'target')).toBe(0)
  })
})
