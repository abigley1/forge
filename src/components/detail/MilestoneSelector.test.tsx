import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MilestoneSelector, extractMilestones } from './MilestoneSelector'

describe('MilestoneSelector', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(<MilestoneSelector value={undefined} onChange={() => {}} />)
      expect(screen.getByText('Milestone')).toBeInTheDocument()
    })

    it('renders with custom label', () => {
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          label="Sprint"
        />
      )
      expect(screen.getByText('Sprint')).toBeInTheDocument()
    })

    it('renders placeholder when no value', () => {
      render(<MilestoneSelector value={undefined} onChange={() => {}} />)
      expect(
        screen.getByPlaceholderText('Select or create milestone...')
      ).toBeInTheDocument()
    })

    it('renders custom placeholder', () => {
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          placeholder="Choose milestone"
        />
      )
      expect(
        screen.getByPlaceholderText('Choose milestone')
      ).toBeInTheDocument()
    })

    it('renders selected value', () => {
      render(<MilestoneSelector value="Sprint 1" onChange={() => {}} />)
      expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    })

    it('renders disabled state', () => {
      render(
        <MilestoneSelector value={undefined} onChange={() => {}} disabled />
      )
      expect(screen.getByRole('combobox')).toBeDisabled()
    })
  })

  describe('selection', () => {
    it('calls onChange when selecting from suggestions', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={onChange}
          suggestions={['Sprint 1', 'Sprint 2']}
        />
      )

      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByText('Sprint 1'))

      expect(onChange).toHaveBeenCalledWith('Sprint 1')
    })

    it('filters suggestions based on input', async () => {
      const user = userEvent.setup()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          suggestions={['Sprint 1', 'Sprint 2', 'Release']}
        />
      )

      await user.type(screen.getByRole('combobox'), 'Sprint')

      expect(screen.getByText('Sprint 1')).toBeInTheDocument()
      expect(screen.getByText('Sprint 2')).toBeInTheDocument()
      expect(screen.queryByText('Release')).not.toBeInTheDocument()
    })

    it('shows create new option for new milestone', async () => {
      const user = userEvent.setup()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          suggestions={['Sprint 1']}
        />
      )

      await user.type(screen.getByRole('combobox'), 'New Milestone')

      expect(screen.getByText(/Create/)).toBeInTheDocument()
      expect(screen.getByText('New Milestone')).toBeInTheDocument()
    })

    it('creates new milestone on Enter', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={onChange}
          suggestions={[]}
        />
      )

      await user.type(screen.getByRole('combobox'), 'New Sprint{Enter}')

      expect(onChange).toHaveBeenCalledWith('New Sprint')
    })
  })

  describe('clearing', () => {
    it('shows clear button when value is set', () => {
      render(<MilestoneSelector value="Sprint 1" onChange={() => {}} />)
      expect(screen.getByLabelText('Clear milestone')).toBeInTheDocument()
    })

    it('calls onChange with undefined when cleared', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<MilestoneSelector value="Sprint 1" onChange={onChange} />)

      await user.click(screen.getByLabelText('Clear milestone'))

      expect(onChange).toHaveBeenCalledWith(undefined)
    })

    it('does not show clear button when disabled', () => {
      render(
        <MilestoneSelector value="Sprint 1" onChange={() => {}} disabled />
      )
      expect(screen.queryByLabelText('Clear milestone')).not.toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('navigates suggestions with arrow keys', async () => {
      const user = userEvent.setup()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          suggestions={['Sprint 1', 'Sprint 2']}
        />
      )

      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{ArrowDown}')

      expect(input).toHaveAttribute('aria-activedescendant')
    })

    it('closes dropdown on Escape', async () => {
      const user = userEvent.setup()
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          suggestions={['Sprint 1']}
        />
      )

      const input = screen.getByRole('combobox')
      await user.click(input)
      // Dropdown should be open with suggestions
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          id="test-milestone"
        />
      )

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-expanded')
      expect(input).toHaveAttribute('aria-controls')
    })

    it('associates label with input', () => {
      render(
        <MilestoneSelector
          value={undefined}
          onChange={() => {}}
          id="test-milestone"
          label="Test Label"
        />
      )

      expect(screen.getByLabelText('Test Label')).toBeInTheDocument()
    })
  })
})

describe('extractMilestones', () => {
  it('returns empty array for empty input', () => {
    expect(extractMilestones([])).toEqual([])
  })

  it('extracts unique milestones', () => {
    const nodes = [
      { milestone: 'Sprint 1' },
      { milestone: 'Sprint 2' },
      { milestone: 'Sprint 1' }, // duplicate
    ]
    expect(extractMilestones(nodes)).toEqual(['Sprint 1', 'Sprint 2'])
  })

  it('ignores nodes without milestones', () => {
    const nodes = [
      { milestone: 'Sprint 1' },
      { milestone: undefined },
      { milestone: '' },
    ]
    expect(extractMilestones(nodes)).toEqual(['Sprint 1'])
  })

  it('sorts milestones alphabetically', () => {
    const nodes = [
      { milestone: 'Zebra' },
      { milestone: 'Alpha' },
      { milestone: 'Beta' },
    ]
    expect(extractMilestones(nodes)).toEqual(['Alpha', 'Beta', 'Zebra'])
  })
})
