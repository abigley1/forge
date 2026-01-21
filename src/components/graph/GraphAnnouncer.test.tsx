import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { GraphAnnouncer } from './GraphAnnouncer'
import { useGraphAnnouncer } from './useGraphAnnouncer'

describe('GraphAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders with sr-only class for screen reader only', () => {
      const { container } = render(<GraphAnnouncer message="Test message" />)

      const announcer = container.querySelector('.sr-only')
      expect(announcer).toBeInTheDocument()
    })

    it('has role="status" for accessibility', () => {
      render(<GraphAnnouncer message="Test message" />)

      const announcer = screen.getByRole('status')
      expect(announcer).toBeInTheDocument()
    })

    it('has aria-live="polite" by default', () => {
      render(<GraphAnnouncer />)

      const announcer = screen.getByRole('status')
      expect(announcer).toHaveAttribute('aria-live', 'polite')
    })

    it('supports aria-live="assertive"', () => {
      render(<GraphAnnouncer politeness="assertive" />)

      const announcer = screen.getByRole('status')
      expect(announcer).toHaveAttribute('aria-live', 'assertive')
    })

    it('has aria-atomic="true"', () => {
      render(<GraphAnnouncer />)

      const announcer = screen.getByRole('status')
      expect(announcer).toHaveAttribute('aria-atomic', 'true')
    })
  })

  describe('message display', () => {
    it('displays the message', () => {
      render(<GraphAnnouncer message="Node selected" />)

      expect(screen.getByText('Node selected')).toBeInTheDocument()
    })

    it('clears message after delay', () => {
      render(<GraphAnnouncer message="Temporary message" clearDelay={1000} />)

      expect(screen.getByText('Temporary message')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.queryByText('Temporary message')).not.toBeInTheDocument()
    })

    it('uses default clear delay of 1000ms', () => {
      render(<GraphAnnouncer message="Test" />)

      expect(screen.getByText('Test')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(999)
      })

      expect(screen.getByText('Test')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(screen.queryByText('Test')).not.toBeInTheDocument()
    })

    it('updates message when prop changes', () => {
      const { rerender } = render(<GraphAnnouncer message="First" />)

      expect(screen.getByText('First')).toBeInTheDocument()

      rerender(<GraphAnnouncer message="Second" />)

      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('resets timer when message changes', () => {
      const { rerender } = render(
        <GraphAnnouncer message="First" clearDelay={1000} />
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })

      rerender(<GraphAnnouncer message="Second" clearDelay={1000} />)

      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Second should still be visible (only 500ms since it was set)
      expect(screen.getByText('Second')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(screen.queryByText('Second')).not.toBeInTheDocument()
    })
  })
})

describe('useGraphAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('returns empty announcement initially', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      expect(result.current.announcement).toBe('')
    })
  })

  describe('announce', () => {
    it('sets announcement message', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announce('Custom message')
      })

      expect(result.current.announcement).toBe('Custom message')
    })

    it('clears announcement after delay', () => {
      const { result } = renderHook(() => useGraphAnnouncer(1000))

      act(() => {
        result.current.announce('Test')
      })

      expect(result.current.announcement).toBe('Test')

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.announcement).toBe('')
    })
  })

  describe('announceNodeSelected', () => {
    it('announces node selection with title and type', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceNodeSelected('My Task', 'task')
      })

      expect(result.current.announcement).toBe('Selected task: My Task')
    })
  })

  describe('announceNodeDeselected', () => {
    it('announces deselection', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceNodeDeselected()
      })

      expect(result.current.announcement).toBe('Node deselected')
    })
  })

  describe('announceNodeFocused', () => {
    it('announces focused node with position', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceNodeFocused('Build Frame', 'task', 2, 10)
      })

      expect(result.current.announcement).toBe('Build Frame, task, 3 of 10')
    })

    it('handles first position (index 0)', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceNodeFocused('First Item', 'note', 0, 5)
      })

      expect(result.current.announcement).toBe('First Item, note, 1 of 5')
    })
  })

  describe('announceGraphSummary', () => {
    it('announces graph summary with plural nodes', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceGraphSummary(5, 3)
      })

      expect(result.current.announcement).toBe(
        'Graph view: 5 nodes, 3 connections'
      )
    })

    it('uses singular for 1 node', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceGraphSummary(1, 0)
      })

      expect(result.current.announcement).toBe(
        'Graph view: 1 node, 0 connections'
      )
    })

    it('uses singular for 1 connection', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceGraphSummary(2, 1)
      })

      expect(result.current.announcement).toBe(
        'Graph view: 2 nodes, 1 connection'
      )
    })
  })

  describe('announceFilterApplied', () => {
    it('announces when showing all nodes', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceFilterApplied(10, 10)
      })

      expect(result.current.announcement).toBe('Showing all 10 nodes')
    })

    it('announces when showing filtered nodes', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceFilterApplied(3, 10)
      })

      expect(result.current.announcement).toBe('Showing 3 of 10 nodes')
    })
  })

  describe('announceMinimapToggled', () => {
    it('announces minimap shown', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceMinimapToggled(true)
      })

      expect(result.current.announcement).toBe('Minimap shown')
    })

    it('announces minimap hidden', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceMinimapToggled(false)
      })

      expect(result.current.announcement).toBe('Minimap hidden')
    })
  })

  describe('announceLayoutReset', () => {
    it('announces layout reset', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announceLayoutReset()
      })

      expect(result.current.announcement).toBe('Layout reset complete')
    })
  })

  describe('clear', () => {
    it('clears the announcement immediately', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announce('Test message')
      })

      expect(result.current.announcement).toBe('Test message')

      act(() => {
        result.current.clear()
      })

      expect(result.current.announcement).toBe('')
    })

    it('cancels pending timeout', () => {
      const { result } = renderHook(() => useGraphAnnouncer(5000))

      act(() => {
        result.current.announce('Test')
      })

      act(() => {
        result.current.clear()
      })

      // Verify no state updates happen after clear
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Should still be empty (not re-cleared or errored)
      expect(result.current.announcement).toBe('')
    })
  })

  describe('multiple announcements', () => {
    it('replaces previous announcement', () => {
      const { result } = renderHook(() => useGraphAnnouncer())

      act(() => {
        result.current.announce('First')
      })

      act(() => {
        result.current.announce('Second')
      })

      expect(result.current.announcement).toBe('Second')
    })

    it('resets timer for new announcement', () => {
      const { result } = renderHook(() => useGraphAnnouncer(1000))

      act(() => {
        result.current.announce('First')
      })

      act(() => {
        vi.advanceTimersByTime(800)
      })

      act(() => {
        result.current.announce('Second')
      })

      act(() => {
        vi.advanceTimersByTime(800)
      })

      // Second should still be visible (only 800ms since it was set)
      expect(result.current.announcement).toBe('Second')

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.announcement).toBe('')
    })
  })
})
