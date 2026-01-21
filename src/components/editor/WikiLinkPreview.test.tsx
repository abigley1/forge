/**
 * Tests for WikiLinkPreview Component
 *
 * Tests the hover preview tooltip for wiki-links including:
 * - Rendering with resolved/unresolved links
 * - Navigation and create callbacks
 * - Accessibility features
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { WikiLinkPreview } from './WikiLinkPreview'
import type { ResolvedLink, UnresolvedLink } from './wikiLinkDecorations'

// ============================================================================
// Test Data
// ============================================================================

const mockResolvedLink: ResolvedLink = {
  id: 'task-1',
  title: 'Test Task',
  type: 'task',
  contentPreview: 'This is the content preview for the task node...',
  exists: true,
}

const mockUnresolvedLink: UnresolvedLink = {
  target: 'non-existent-node',
  exists: false,
}

const mockAnchorRect: DOMRect = {
  top: 100,
  left: 200,
  bottom: 120,
  right: 300,
  width: 100,
  height: 20,
  x: 200,
  y: 100,
  toJSON: () => ({}),
}

// ============================================================================
// Rendering Tests
// ============================================================================

describe('WikiLinkPreview', () => {
  describe('rendering', () => {
    it('renders nothing when not visible', () => {
      const { container } = render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when linkInfo is null', () => {
      const { container } = render(
        <WikiLinkPreview
          linkInfo={null}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders resolved link preview', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(screen.getByText('Test Task')).toBeInTheDocument()
      expect(screen.getByText('Task')).toBeInTheDocument()
      expect(
        screen.getByText('This is the content preview for the task node...')
      ).toBeInTheDocument()
    })

    it('renders unresolved link preview', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockUnresolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(screen.getByText('Broken Link')).toBeInTheDocument()
      expect(screen.getByText('"non-existent-node"')).toBeInTheDocument()
      expect(
        screen.getByText("This node doesn't exist yet.")
      ).toBeInTheDocument()
    })

    it('shows navigation hint for resolved links', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(screen.getByText(/\+Click to navigate/)).toBeInTheDocument()
    })

    it('shows create button for unresolved links', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockUnresolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onCreate={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Create Linked Node' })
      ).toBeInTheDocument()
    })

    it('hides create button when onCreate not provided', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockUnresolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(
        screen.queryByRole('button', { name: 'Create Linked Node' })
      ).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Type Badge Tests
  // ============================================================================

  describe('type badge', () => {
    it.each([
      ['task', 'Task'],
      ['decision', 'Decision'],
      ['component', 'Component'],
      ['note', 'Note'],
    ] as const)('shows correct badge for %s type', (type, label) => {
      const link: ResolvedLink = {
        ...mockResolvedLink,
        type,
      }

      render(
        <WikiLinkPreview
          linkInfo={link}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('interactions', () => {
    it('calls onNavigate when resolved link preview is clicked', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()

      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onNavigate={onNavigate}
        />
      )

      const clickable = screen.getByRole('button', {
        name: 'Navigate to Test Task',
      })
      await user.click(clickable)

      expect(onNavigate).toHaveBeenCalledWith(mockResolvedLink)
    })

    it('calls onCreate when create button is clicked', async () => {
      const user = userEvent.setup()
      const onCreate = vi.fn()

      render(
        <WikiLinkPreview
          linkInfo={mockUnresolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onCreate={onCreate}
        />
      )

      const createButton = screen.getByRole('button', {
        name: 'Create Linked Node',
      })
      await user.click(createButton)

      expect(onCreate).toHaveBeenCalledWith('non-existent-node')
    })

    it('calls onDismiss when Escape is pressed', () => {
      const onDismiss = vi.fn()

      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onDismiss={onDismiss}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onDismiss).toHaveBeenCalled()
    })

    it('navigates on Enter key for resolved links', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()

      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onNavigate={onNavigate}
        />
      )

      const clickable = screen.getByRole('button', {
        name: 'Navigate to Test Task',
      })
      clickable.focus()
      await user.keyboard('{Enter}')

      expect(onNavigate).toHaveBeenCalledWith(mockResolvedLink)
    })

    it('navigates on Space key for resolved links', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()

      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onNavigate={onNavigate}
        />
      )

      const clickable = screen.getByRole('button', {
        name: 'Navigate to Test Task',
      })
      clickable.focus()
      await user.keyboard(' ')

      expect(onNavigate).toHaveBeenCalledWith(mockResolvedLink)
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has tooltip role', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('resolved link preview is keyboard focusable', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onNavigate={vi.fn()}
        />
      )

      const clickable = screen.getByRole('button', {
        name: 'Navigate to Test Task',
      })
      expect(clickable).toHaveAttribute('tabIndex', '0')
    })

    it('create button has correct label', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockUnresolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
          onCreate={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Create Linked Node' })
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Content Preview Tests
  // ============================================================================

  describe('content preview', () => {
    it('shows content preview when available', () => {
      render(
        <WikiLinkPreview
          linkInfo={mockResolvedLink}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      expect(
        screen.getByText('This is the content preview for the task node...')
      ).toBeInTheDocument()
    })

    it('handles empty content preview', () => {
      const linkWithEmptyContent: ResolvedLink = {
        ...mockResolvedLink,
        contentPreview: '',
      }

      render(
        <WikiLinkPreview
          linkInfo={linkWithEmptyContent}
          anchorRect={mockAnchorRect}
          isVisible={true}
        />
      )

      // Should still render title
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })
  })
})
