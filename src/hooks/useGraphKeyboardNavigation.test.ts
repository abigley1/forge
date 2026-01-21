import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGraphKeyboardNavigation } from './useGraphKeyboardNavigation'
import type { Node as RFNode } from 'reactflow'

// Create mock nodes for testing
function createMockNode(id: string, label: string): RFNode {
  return {
    id,
    type: 'forgeNode',
    data: { label },
    position: { x: 0, y: 0 },
  }
}

function createMockClusterNode(id: string, tag: string): RFNode {
  return {
    id,
    type: 'tagCluster',
    data: { tag, expanded: false },
    position: { x: 0, y: 0 },
  }
}

describe('useGraphKeyboardNavigation', () => {
  const createKeyboardEvent = (key: string): React.KeyboardEvent =>
    ({
      key,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }) as unknown as React.KeyboardEvent

  describe('initialization', () => {
    it('returns null focusedNodeId initially', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      expect(result.current.focusedNodeId).toBeNull()
    })

    it('returns correct container props', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      const props = result.current.getContainerProps()

      expect(props.tabIndex).toBe(0)
      expect(props.role).toBe('application')
      expect(props['aria-label']).toContain('2 nodes')
      expect(props['aria-activedescendant']).toBeUndefined()
    })

    it('returns tabIndex -1 when disabled', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect: vi.fn(),
          enabled: false,
        })
      )

      const props = result.current.getContainerProps()
      expect(props.tabIndex).toBe(-1)
    })
  })

  describe('arrow key navigation', () => {
    it('focuses first node on ArrowDown when no focus', () => {
      const onFocus = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
          onFocus,
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })

      expect(result.current.focusedNodeId).toBe('1')
      expect(onFocus).toHaveBeenCalledWith('1', 0, 2)
    })

    it('focuses last node on ArrowUp when no focus', () => {
      const onFocus = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
          onFocus,
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'))
      })

      expect(result.current.focusedNodeId).toBe('2')
      expect(onFocus).toHaveBeenCalledWith('2', 1, 2)
    })

    it('moves focus to next node on ArrowDown', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [
            createMockNode('1', 'Node 1'),
            createMockNode('2', 'Node 2'),
            createMockNode('3', 'Node 3'),
          ],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })
      expect(result.current.focusedNodeId).toBe('1')

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })
      expect(result.current.focusedNodeId).toBe('2')
    })

    it('wraps around from last to first on ArrowDown', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('2')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })

      expect(result.current.focusedNodeId).toBe('1')
    })

    it('moves focus to previous node on ArrowUp', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('2')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'))
      })

      expect(result.current.focusedNodeId).toBe('1')
    })

    it('wraps around from first to last on ArrowUp', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('1')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'))
      })

      expect(result.current.focusedNodeId).toBe('2')
    })

    it('handles ArrowRight same as ArrowDown', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowRight'))
      })

      expect(result.current.focusedNodeId).toBe('1')
    })

    it('handles ArrowLeft same as ArrowUp', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowLeft'))
      })

      expect(result.current.focusedNodeId).toBe('2')
    })
  })

  describe('Home and End keys', () => {
    it('focuses first node on Home', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [
            createMockNode('1', 'Node 1'),
            createMockNode('2', 'Node 2'),
            createMockNode('3', 'Node 3'),
          ],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('3')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Home'))
      })

      expect(result.current.focusedNodeId).toBe('1')
    })

    it('focuses last node on End', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [
            createMockNode('1', 'Node 1'),
            createMockNode('2', 'Node 2'),
            createMockNode('3', 'Node 3'),
          ],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('End'))
      })

      expect(result.current.focusedNodeId).toBe('3')
    })
  })

  describe('Enter and Space keys', () => {
    it('selects focused node on Enter', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect,
        })
      )

      act(() => {
        result.current.setFocusedNodeId('2')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'))
      })

      expect(onSelect).toHaveBeenCalledWith('2')
    })

    it('selects focused node on Space', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect,
        })
      )

      act(() => {
        result.current.setFocusedNodeId('1')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(' '))
      })

      expect(onSelect).toHaveBeenCalledWith('1')
    })

    it('does nothing on Enter when no focus', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect,
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'))
      })

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('Escape key', () => {
    it('deselects and clears focus on Escape', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: '1',
          onSelect,
        })
      )

      act(() => {
        result.current.setFocusedNodeId('1')
      })

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Escape'))
      })

      expect(onSelect).toHaveBeenCalledWith(null)
      expect(result.current.focusedNodeId).toBeNull()
    })
  })

  describe('cluster nodes filtering', () => {
    it('only navigates through forgeNode types, not clusters', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [
            createMockNode('1', 'Node 1'),
            createMockClusterNode('cluster-1', 'tag1'),
            createMockNode('2', 'Node 2'),
          ],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })
      expect(result.current.focusedNodeId).toBe('1')

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })
      // Should skip cluster and go to node 2
      expect(result.current.focusedNodeId).toBe('2')
    })
  })

  describe('disabled state', () => {
    it('does nothing when disabled', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect,
          enabled: false,
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })

      expect(result.current.focusedNodeId).toBeNull()
    })
  })

  describe('empty nodes', () => {
    it('does nothing when nodes array is empty', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [],
          selectedNodeId: null,
          onSelect,
        })
      )

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'))
      })

      expect(result.current.focusedNodeId).toBeNull()
    })
  })

  describe('helper methods', () => {
    it('focusFirst focuses the first node', () => {
      const onFocus = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
          onFocus,
        })
      )

      act(() => {
        result.current.focusFirst()
      })

      expect(result.current.focusedNodeId).toBe('1')
      expect(onFocus).toHaveBeenCalledWith('1', 0, 2)
    })

    it('focusLast focuses the last node', () => {
      const onFocus = vi.fn()
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1'), createMockNode('2', 'Node 2')],
          selectedNodeId: null,
          onSelect: vi.fn(),
          onFocus,
        })
      )

      act(() => {
        result.current.focusLast()
      })

      expect(result.current.focusedNodeId).toBe('2')
      expect(onFocus).toHaveBeenCalledWith('2', 1, 2)
    })

    it('clearFocus clears the focus', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('1')
      })
      expect(result.current.focusedNodeId).toBe('1')

      act(() => {
        result.current.clearFocus()
      })
      expect(result.current.focusedNodeId).toBeNull()
    })
  })

  describe('aria-activedescendant', () => {
    it('includes focusedNodeId in container props', () => {
      const { result } = renderHook(() =>
        useGraphKeyboardNavigation({
          nodes: [createMockNode('1', 'Node 1')],
          selectedNodeId: null,
          onSelect: vi.fn(),
        })
      )

      act(() => {
        result.current.setFocusedNodeId('1')
      })

      const props = result.current.getContainerProps()
      expect(props['aria-activedescendant']).toBe('1')
    })
  })
})
