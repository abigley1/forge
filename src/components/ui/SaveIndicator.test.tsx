/**
 * SaveIndicator Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

import { SaveIndicator, useSaveIndicator } from './SaveIndicator'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { SaveStatus } from './SaveIndicator'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: vi.fn(),
}))

const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>
const mockUseProjectStore = useProjectStore as unknown as ReturnType<
  typeof vi.fn
>

describe('SaveIndicator', () => {
  describe('rendering', () => {
    it('renders nothing when status is idle and showWhenIdle is false', () => {
      const { container } = render(<SaveIndicator status="idle" />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders when status is idle and showWhenIdle is true', () => {
      render(<SaveIndicator status="idle" showWhenIdle />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders saving status with spinner icon', () => {
      render(<SaveIndicator status="saving" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('renders saved status with check icon', () => {
      render(<SaveIndicator status="saved" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Saved')).toBeInTheDocument()
    })

    it('renders unsaved status with alert icon', () => {
      render(<SaveIndicator status="unsaved" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })

    it('renders error status with alert icon', () => {
      render(<SaveIndicator status="error" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })

    it('shows custom error message when provided', () => {
      render(<SaveIndicator status="error" errorMessage="Network error" />)

      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies saving status styling', () => {
      render(<SaveIndicator status="saving" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('text-forge-accent')
    })

    it('applies saved status styling', () => {
      render(<SaveIndicator status="saved" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('text-green-600')
    })

    it('applies unsaved status styling', () => {
      render(<SaveIndicator status="unsaved" />)

      const indicator = screen.getByRole('status')
      // Using amber-700 for better color contrast (WCAG 4.5:1)
      expect(indicator).toHaveClass('text-amber-700')
    })

    it('applies error status styling', () => {
      render(<SaveIndicator status="error" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('text-red-600')
    })

    it('applies custom className', () => {
      render(<SaveIndicator status="saving" className="custom-class" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<SaveIndicator status="saving" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has aria-live="polite"', () => {
      render(<SaveIndicator status="saving" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveAttribute('aria-live', 'polite')
    })

    it('has aria-atomic="true"', () => {
      render(<SaveIndicator status="saving" />)

      const indicator = screen.getByRole('status')
      expect(indicator).toHaveAttribute('aria-atomic', 'true')
    })

    it('icons have aria-hidden', () => {
      render(<SaveIndicator status="saving" />)

      // The SVG icon should have aria-hidden
      const svg = screen.getByRole('status').querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('all statuses', () => {
    const statuses: SaveStatus[] = [
      'idle',
      'saving',
      'saved',
      'unsaved',
      'error',
    ]

    it.each(statuses)('handles %s status', (status) => {
      // Should not throw
      expect(() =>
        render(<SaveIndicator status={status} showWhenIdle />)
      ).not.toThrow()
    })
  })
})

describe('useSaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => false,
        }
        return selector(state)
      }
    )

    mockUseProjectStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasProject: () => true,
          error: null,
        }
        return selector(state)
      }
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Test component to use the hook
  function TestComponent({
    onStatusChange,
  }: {
    onStatusChange?: (status: SaveStatus) => void
  }) {
    const { status, isSaving, hasUnsavedChanges, saveNow } = useSaveIndicator()

    onStatusChange?.(status)

    return (
      <div>
        <span data-testid="status">{status}</span>
        <span data-testid="is-saving">{String(isSaving)}</span>
        <span data-testid="has-unsaved">{String(hasUnsavedChanges)}</span>
        <button onClick={() => saveNow()}>Save</button>
      </div>
    )
  }

  it('returns idle status when no dirty nodes', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('status')).toHaveTextContent('idle')
    expect(screen.getByTestId('is-saving')).toHaveTextContent('false')
    expect(screen.getByTestId('has-unsaved')).toHaveTextContent('false')
  })

  it('returns unsaved status when dirty nodes exist', () => {
    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => true,
        }
        return selector(state)
      }
    )

    render(<TestComponent />)

    expect(screen.getByTestId('status')).toHaveTextContent('unsaved')
    expect(screen.getByTestId('has-unsaved')).toHaveTextContent('true')
  })

  it('returns saved status after successful save', async () => {
    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => false, // Clean after save
        }
        return selector(state)
      }
    )

    render(<TestComponent />)

    // Trigger save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await act(async () => {
      saveButton.click()
    })

    // Should show saved briefly
    expect(screen.getByTestId('status')).toHaveTextContent('saved')

    // After timeout, should return to idle
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(screen.getByTestId('status')).toHaveTextContent('idle')
  })

  it('returns error status when no project is open', async () => {
    mockUseProjectStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasProject: () => false,
          error: null,
        }
        return selector(state)
      }
    )

    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasDirtyNodes: () => true,
        }
        return selector(state)
      }
    )

    render(<TestComponent />)

    const saveButton = screen.getByRole('button', { name: /save/i })
    await act(async () => {
      saveButton.click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('error')
  })

  it('returns error status when store has error', () => {
    mockUseProjectStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          hasProject: () => true,
          error: 'Some error',
        }
        return selector(state)
      }
    )

    render(<TestComponent />)

    expect(screen.getByTestId('status')).toHaveTextContent('error')
  })
})
