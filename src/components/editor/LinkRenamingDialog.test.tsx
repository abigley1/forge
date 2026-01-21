import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  LinkRenamingDialog,
  type ReferencingNodeInfo,
} from './LinkRenamingDialog'

describe('LinkRenamingDialog', () => {
  const mockReferencingNodes: ReferencingNodeInfo[] = [
    { id: 'task-1', title: 'Build Frame', type: 'task', referenceCount: 2 },
    { id: 'note-1', title: 'Research Notes', type: 'note', referenceCount: 1 },
  ]

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    oldTitle: 'Motor Selection',
    newTitle: 'Stepper Motor Selection',
    referencingNodes: mockReferencingNodes,
    onUpdateReferences: vi.fn(),
    onSkip: vi.fn(),
  }

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(screen.getByText('Update References?')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<LinkRenamingDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('Update References?')).not.toBeInTheDocument()
    })

    it('should show description text', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(screen.getByText(/You renamed a node/i)).toBeInTheDocument()
    })
  })

  describe('title change preview', () => {
    it('should show old title with brackets', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(screen.getByText('[[Motor Selection]]')).toBeInTheDocument()
    })

    it('should show new title with brackets', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(
        screen.getByText('[[Stepper Motor Selection]]')
      ).toBeInTheDocument()
    })

    it('should show arrow between old and new titles', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // Arrow icon should be present (aria-hidden)
      const container = screen.getByText('[[Motor Selection]]').closest('div')
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('referencing nodes list', () => {
    it('should show reference count summary', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // Total: 3 references in 2 nodes
      expect(screen.getByText(/3 references in 2 nodes/i)).toBeInTheDocument()
    })

    it('should list referencing nodes', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(screen.getByText('Build Frame')).toBeInTheDocument()
      expect(screen.getByText('Research Notes')).toBeInTheDocument()
    })

    it('should show reference count for nodes with multiple references', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // Build Frame has 2 references
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })

    it('should not show reference count for single reference', () => {
      const singleRef: ReferencingNodeInfo[] = [
        { id: 'task-1', title: 'Only One', type: 'task', referenceCount: 1 },
      ]
      render(
        <LinkRenamingDialog {...defaultProps} referencingNodes={singleRef} />
      )

      expect(screen.queryByText('(1)')).not.toBeInTheDocument()
    })

    it('should show correct singular form for 1 node', () => {
      const singleNode: ReferencingNodeInfo[] = [
        { id: 'task-1', title: 'Only Task', type: 'task', referenceCount: 1 },
      ]
      render(
        <LinkRenamingDialog {...defaultProps} referencingNodes={singleNode} />
      )

      expect(screen.getByText(/1 reference in 1 node/i)).toBeInTheDocument()
    })

    it('should truncate long list to 10 items', () => {
      const manyNodes: ReferencingNodeInfo[] = Array.from(
        { length: 15 },
        (_, i) => ({
          id: `node-${i}`,
          title: `Node ${i}`,
          type: 'task' as const,
          referenceCount: 1,
        })
      )

      render(
        <LinkRenamingDialog {...defaultProps} referencingNodes={manyNodes} />
      )

      // Should show 10 + "and 5 more..."
      expect(screen.getByText('and 5 more...')).toBeInTheDocument()
    })
  })

  describe('button interactions', () => {
    it('should call onSkip when Skip button is clicked', () => {
      const onSkip = vi.fn()
      render(<LinkRenamingDialog {...defaultProps} onSkip={onSkip} />)

      fireEvent.click(screen.getByText('Skip'))

      expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it('should call onUpdateReferences when Update All is clicked', () => {
      const onUpdateReferences = vi.fn()
      render(
        <LinkRenamingDialog
          {...defaultProps}
          onUpdateReferences={onUpdateReferences}
        />
      )

      fireEvent.click(screen.getByText('Update All'))

      expect(onUpdateReferences).toHaveBeenCalledTimes(1)
    })

    it('should disable Update All button when no referencing nodes', () => {
      render(<LinkRenamingDialog {...defaultProps} referencingNodes={[]} />)

      expect(screen.getByText('Update All')).toBeDisabled()
    })

    it('should disable buttons when isUpdating', () => {
      render(<LinkRenamingDialog {...defaultProps} isUpdating={true} />)

      expect(screen.getByText('Skip')).toBeDisabled()
      expect(screen.getByText(/Updating/)).toBeDisabled()
    })

    it('should show loading state when isUpdating', () => {
      render(<LinkRenamingDialog {...defaultProps} isUpdating={true} />)

      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })
  })

  describe('empty referencing nodes', () => {
    it('should not show node list section when empty', () => {
      render(<LinkRenamingDialog {...defaultProps} referencingNodes={[]} />)

      expect(screen.queryByText(/references in/)).not.toBeInTheDocument()
    })
  })

  describe('node type icons', () => {
    it('should show NodeTypeIcon for each referencing node', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // NodeTypeIcon should render svg elements (aria-hidden)
      const list = screen.getByRole('list')
      const icons = list.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('accessibility', () => {
    it('should have accessible dialog structure', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // Dialog should be present
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have descriptive button labels', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      expect(screen.getByText('Skip')).toHaveAttribute('type', 'button')
      expect(screen.getByText('Update All')).toHaveAttribute('type', 'button')
    })

    it('should have list element for referencing nodes', () => {
      render(<LinkRenamingDialog {...defaultProps} />)

      // ul element has implicit list role
      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })
})
