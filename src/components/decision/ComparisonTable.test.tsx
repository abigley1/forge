import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComparisonTable } from './ComparisonTable'
import type { DecisionNode } from '@/types/nodes'
import {
  NodeType,
  createDecisionOption,
  createDecisionCriterion,
  createNodeDates,
} from '@/types/nodes'

// Mock crypto.randomUUID for predictable IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `test-uuid-${Date.now()}-${Math.random()}`),
})

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
    parent: null,
    ...overrides,
  }
}

describe('ComparisonTable', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onChange: any
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    onChange = vi.fn()
    user = userEvent.setup()
  })

  describe('Empty State', () => {
    it('renders empty state when no options or criteria', () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      expect(screen.getByText(/no comparison data yet/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /add option/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /add criterion/i })
      ).toBeInTheDocument()
    })

    it('disables add buttons when disabled prop is true', () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} disabled />)

      const addOptionBtn = screen.getByRole('button', { name: /add option/i })
      const addCriterionBtn = screen.getByRole('button', {
        name: /add criterion/i,
      })

      expect(addOptionBtn).toBeDisabled()
      expect(addCriterionBtn).toBeDisabled()
    })
  })

  describe('Adding Options', () => {
    it('shows input when Add Option is clicked', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add option/i }))

      expect(screen.getByLabelText(/new option name/i)).toBeInTheDocument()
    })

    it('adds option on Enter key', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add option/i }))
      const input = screen.getByLabelText(/new option name/i)
      await user.type(input, 'Option A{Enter}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ name: 'Option A' }),
          ]),
        })
      )
    })

    it('cancels adding option on Escape key', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add option/i }))
      const input = screen.getByLabelText(/new option name/i)
      await user.type(input, 'Some text')
      await user.keyboard('{Escape}')

      expect(onChange).not.toHaveBeenCalled()
      expect(
        screen.queryByLabelText(/new option name/i)
      ).not.toBeInTheDocument()
    })

    it('does not add option with empty name', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add option/i }))
      const input = screen.getByLabelText(/new option name/i)
      await user.type(input, '{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Adding Criteria', () => {
    it('shows form when Add Criterion is clicked', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add criterion/i }))

      expect(screen.getByLabelText(/new criterion name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/weight:/i)).toBeInTheDocument()
    })

    it('adds criterion with name, unit, and weight', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add criterion/i }))

      const nameInput = screen.getByLabelText(/new criterion name/i)
      await user.type(nameInput, 'Cost')

      const unitSelect = screen.getByLabelText(/unit/i)
      await user.selectOptions(unitSelect, '$')

      // Click Add button
      await user.click(screen.getByRole('button', { name: /^add$/i }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: expect.arrayContaining([
            expect.objectContaining({
              name: 'Cost',
              unit: '$',
              weight: 5, // default weight
            }),
          ]),
        })
      )
    })

    it('cancels adding criterion on Cancel button', async () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(screen.getByRole('button', { name: /add criterion/i }))
      const nameInput = screen.getByLabelText(/new criterion name/i)
      await user.type(nameInput, 'Some criterion')
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Table Display', () => {
    it('renders table with options as columns and criteria as rows', () => {
      const option1 = createDecisionOption('Option A')
      const option2 = createDecisionOption('Option B')
      const criterion1 = createDecisionCriterion('Cost', 7, '$')
      const criterion2 = createDecisionCriterion('Weight', 5, 'kg')

      const node = createMockDecisionNode({
        options: [option1, option2],
        criteria: [criterion1, criterion2],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      // Check header columns
      expect(screen.getByText('Criteria')).toBeInTheDocument()
      expect(screen.getByText('Option A')).toBeInTheDocument()
      expect(screen.getByText('Option B')).toBeInTheDocument()

      // Check criterion rows
      expect(screen.getByText('Cost')).toBeInTheDocument()
      expect(screen.getByText('Weight')).toBeInTheDocument()

      // Check units are displayed
      expect(screen.getByText('($)')).toBeInTheDocument()
      expect(screen.getByText('(kg)')).toBeInTheDocument()
    })

    it('displays cell values', () => {
      const option1 = createDecisionOption('Option A')
      option1.values = { 'crit-1': 100 }
      const criterion1 = createDecisionCriterion('Cost', 5)
      criterion1.id = 'crit-1'

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('displays placeholder for empty cell values', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      // The em-dash placeholder
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('Cell Editing', () => {
    it('enters edit mode on cell click', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      expect(
        screen.getByRole('textbox', { name: /value for option a/i })
      ).toBeInTheDocument()
    })

    it('commits edit on Enter', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, '150{Enter}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              values: expect.objectContaining({
                [criterion1.id]: 150, // Parsed as number
              }),
            }),
          ]),
        })
      )
    })

    it('commits edit on Tab key', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, '200')
      await user.keyboard('{Tab}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              values: expect.objectContaining({
                [criterion1.id]: 200,
              }),
            }),
          ]),
        })
      )
    })

    it('commits edit on blur', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, '300')

      // Blur the input - handler uses setTimeout(0) to allow Tab navigation
      fireEvent.blur(input)

      // Wait for setTimeout to complete and commit to be called
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.arrayContaining([
              expect.objectContaining({
                values: expect.objectContaining({
                  [criterion1.id]: 300,
                }),
              }),
            ]),
          })
        )
      })
    })

    it('cancels edit on Escape', async () => {
      const option1 = createDecisionOption('Option A')
      option1.values = { 'crit-1': 100 }
      const criterion1 = createDecisionCriterion('Cost', 5)
      criterion1.id = 'crit-1'

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, '999')
      await user.keyboard('{Escape}')

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText('100')).toBeInTheDocument() // Original value still shown
    })

    it('does not allow editing when disabled', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} disabled />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      expect(
        screen.queryByRole('textbox', { name: /value for option a/i })
      ).not.toBeInTheDocument()
    })

    it('parses numeric strings as numbers', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, '42.5{Enter}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              values: expect.objectContaining({
                [criterion1.id]: 42.5,
              }),
            }),
          ]),
        })
      )
    })

    it('keeps non-numeric strings as strings', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Notes', 5)

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.type(input, 'Excellent{Enter}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              values: expect.objectContaining({
                [criterion1.id]: 'Excellent',
              }),
            }),
          ]),
        })
      )
    })
  })

  describe('Deleting Options', () => {
    it('shows delete button on option header', () => {
      const option1 = createDecisionOption('Option A')
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /delete option option a/i })
      ).toBeInTheDocument()
    })

    it('shows confirmation dialog on delete click', async () => {
      const option1 = createDecisionOption('Option A')
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /delete option option a/i })
      )

      expect(screen.getByText(/delete option/i)).toBeInTheDocument()
      expect(
        screen.getByText(/are you sure you want to delete/i)
      ).toBeInTheDocument()
    })

    it('deletes option on confirmation', async () => {
      const option1 = createDecisionOption('Option A')
      const option2 = createDecisionOption('Option B')
      const node = createMockDecisionNode({
        options: [option1, option2],
        criteria: [],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /delete option option a/i })
      )
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [option2],
        })
      )
    })

    it('clears selected if deleted option was selected', async () => {
      const option1 = createDecisionOption('Option A')
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [],
        selected: option1.id,
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /delete option option a/i })
      )
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [],
          selected: null,
        })
      )
    })

    it('hides delete button when disabled', () => {
      const option1 = createDecisionOption('Option A')
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [],
      })

      render(<ComparisonTable node={node} onChange={onChange} disabled />)

      expect(
        screen.queryByRole('button', { name: /delete option/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Deleting Criteria', () => {
    it('shows delete button on criterion row', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      expect(
        screen.getByRole('button', { name: /delete criterion cost/i })
      ).toBeInTheDocument()
    })

    it('deletes criterion and removes values from options', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      option1.values = { [criterion1.id]: 100 }

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      await user.click(
        screen.getByRole('button', { name: /delete criterion cost/i })
      )
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: [],
          options: [expect.objectContaining({ values: {} })],
        })
      )
    })
  })

  describe('Weight Adjustment', () => {
    it('renders weight slider for each criterion', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 7)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const slider = screen.getByRole('slider', { name: /weight for cost/i })
      expect(slider).toHaveValue('7')
    })

    it('updates criterion weight on slider change', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const slider = screen.getByRole('slider', { name: /weight for cost/i })
      fireEvent.change(slider, { target: { value: '8' } })

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: [expect.objectContaining({ weight: 8 })],
        })
      )
    })

    it('disables weight slider when disabled', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} disabled />)

      const slider = screen.getByRole('slider', { name: /weight for cost/i })
      expect(slider).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper table role and aria-label', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      expect(
        screen.getByRole('grid', { name: /decision comparison table/i })
      ).toBeInTheDocument()
    })

    it('has aria-hidden on decorative icons', () => {
      const node = createMockDecisionNode()
      render(<ComparisonTable node={node} onChange={onChange} />)

      // The Plus icons in buttons should be aria-hidden
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        const svg = button.querySelector('svg')
        if (svg) {
          expect(svg).toHaveAttribute('aria-hidden', 'true')
        }
      })
    })

    it('provides proper labels for interactive elements', () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      // Weight slider has accessible name
      expect(
        screen.getByRole('slider', { name: /weight for cost/i })
      ).toBeInTheDocument()

      // Delete buttons have accessible names
      expect(
        screen.getByRole('button', { name: /delete option option a/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /delete criterion cost/i })
      ).toBeInTheDocument()
    })

    it('cells are focusable with keyboard', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabIndex', '0')
    })

    it('opens edit mode on Enter key when cell is focused', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      cell.focus()
      await user.keyboard('{Enter}')

      expect(
        screen.getByRole('textbox', { name: /value for option a/i })
      ).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string values by removing from values object', async () => {
      const option1 = createDecisionOption('Option A')
      const criterion1 = createDecisionCriterion('Cost', 5)
      option1.values = { [criterion1.id]: 100 }

      const node = createMockDecisionNode({
        options: [option1],
        criteria: [criterion1],
      })

      render(<ComparisonTable node={node} onChange={onChange} />)

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      const input = screen.getByRole('textbox', { name: /value for option a/i })
      await user.clear(input)
      await user.keyboard('{Enter}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [expect.objectContaining({ values: {} })],
        })
      )
    })

    it('applies custom className', () => {
      const node = createMockDecisionNode()
      const { container } = render(
        <ComparisonTable
          node={node}
          onChange={onChange}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
