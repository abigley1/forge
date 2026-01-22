import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectionPanel } from './SelectionPanel'
import type { DecisionNode } from '@/types/nodes'
import { NodeType, createNodeDates, createDecisionOption } from '@/types/nodes'

function createMockDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'test-decision',
    type: NodeType.Decision,
    title: 'Test Decision',
    content: '',
    tags: [],
    dates: createNodeDates(),
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    ...overrides,
  }
}

describe('SelectionPanel', () => {
  let onChange: (updates: Partial<DecisionNode>) => void
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    onChange = vi.fn<(updates: Partial<DecisionNode>) => void>()
    user = userEvent.setup()
  })

  describe('Empty State', () => {
    it('renders empty state when no options exist', () => {
      const node = createMockDecisionNode()
      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.getByText(/add options to the comparison table/i)
      ).toBeInTheDocument()
    })

    it('does not show select buttons when no options exist', () => {
      const node = createMockDecisionNode()
      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.queryByRole('button', { name: /select/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Pending State', () => {
    it('renders select buttons for each option', () => {
      const options = [
        createDecisionOption('Option A'),
        createDecisionOption('Option B'),
      ]
      const node = createMockDecisionNode({ options })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /select option a/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /select option b/i })
      ).toBeInTheDocument()
    })

    it('calls onChange with correct data when option is selected', async () => {
      const options = [
        { ...createDecisionOption('Option A'), id: 'opt-a' },
        { ...createDecisionOption('Option B'), id: 'opt-b' },
      ]
      const node = createMockDecisionNode({ options })

      render(<SelectionPanel node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /select option a/i }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selected: 'opt-a',
          status: 'selected',
          rationale: expect.stringContaining('Option A'),
          selectedDate: expect.any(Date),
        })
      )
    })

    it('shows previous rationale when decision was reopened', () => {
      const node = createMockDecisionNode({
        options: [createDecisionOption('Option A')],
        rationale: 'Previously selected for cost reasons',
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(screen.getByText(/previous selection notes/i)).toBeInTheDocument()
      expect(
        screen.getByText(/previously selected for cost reasons/i)
      ).toBeInTheDocument()
    })

    it('disables buttons when disabled prop is true', () => {
      const options = [createDecisionOption('Option A')]
      const node = createMockDecisionNode({ options })

      render(<SelectionPanel node={node} onChange={onChange} disabled />)

      const selectButton = screen.getByRole('button', {
        name: /select option a/i,
      })
      expect(selectButton).toBeDisabled()
    })
  })

  describe('Selected State', () => {
    it('shows selected option with trophy icon', () => {
      const options = [
        { ...createDecisionOption('Winner Option'), id: 'winner' },
      ]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'winner',
        rationale: 'This was the best choice',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(screen.getByText('Winner Option')).toBeInTheDocument()
      expect(screen.getByText('Decision Made')).toBeInTheDocument()
    })

    it('shows rationale textarea with current value', () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test rationale',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      const textarea = screen.getByLabelText(/selection rationale/i)
      expect(textarea).toHaveValue('Test rationale')
    })

    it('updates rationale on change', async () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: '',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      const textarea = screen.getByLabelText(/selection rationale/i)
      await user.type(textarea, 'A')

      // onChange is called on every keystroke
      expect(onChange).toHaveBeenCalledWith({
        rationale: 'A',
      })
    })

    it('shows reopen decision button', () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /reopen/i })
      ).toBeInTheDocument()
    })
  })

  describe('Reopen Decision', () => {
    it('shows confirmation dialog when reopen button is clicked', async () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /reopen this decision/i })
      )

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
      expect(
        screen.getByText(/change the decision status/i)
      ).toBeInTheDocument()
    })

    it('reverts to pending when confirmed', async () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /reopen this decision/i })
      )

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // Click confirm button in dialog
      const confirmButton = screen.getByRole('button', { name: /^reopen$/i })
      await user.click(confirmButton)

      expect(onChange).toHaveBeenCalledWith({
        status: 'pending',
        selected: null,
      })
    })

    it('closes dialog when cancelled', async () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /reopen this decision/i })
      )

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // Click cancel button in dialog
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has correct aria labels on select buttons', () => {
      const options = [createDecisionOption('Motor A')]
      const node = createMockDecisionNode({ options })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /select motor a as the decision/i })
      ).toBeInTheDocument()
    })

    it('has correct aria label on reopen button', () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        rationale: 'Test',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /reopen this decision/i })
      ).toBeInTheDocument()
    })

    it('has aria-describedby on rationale textarea', () => {
      const options = [{ ...createDecisionOption('Option A'), id: 'opt-a' }]
      const node = createMockDecisionNode({
        options,
        status: 'selected',
        selected: 'opt-a',
        selectedDate: new Date(),
      })

      render(<SelectionPanel node={node} onChange={onChange} />)

      const textarea = screen.getByLabelText(/selection rationale/i)
      expect(textarea).toHaveAttribute('aria-describedby', 'rationale-hint')
    })
  })
})
