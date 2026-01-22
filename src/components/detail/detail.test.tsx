/**
 * Tests for Node Detail Panel components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  NodeDetailPanel,
  NodeTitleEditor,
  StatusSelect,
  TagInput,
  PrioritySelector,
  ChecklistEditor,
  ComponentFields,
  FrontmatterEditor,
} from './index'
import {
  NodeType,
  type TaskNode,
  type ComponentNode,
  type DecisionNode,
  createNodeDates,
  createChecklistItem,
} from '@/types'

// ============================================================================
// Test Data
// ============================================================================

function createTestTaskNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'test-task',
    type: NodeType.Task,
    title: 'Test Task',
    tags: ['test', 'example'],
    dates: createNodeDates(),
    content: 'Test content',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    ...overrides,
  }
}

function createTestComponentNode(
  overrides: Partial<ComponentNode> = {}
): ComponentNode {
  return {
    id: 'test-component',
    type: NodeType.Component,
    title: 'Test Component',
    tags: [],
    dates: createNodeDates(),
    content: 'Test content',
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    ...overrides,
  }
}

function createTestDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'test-decision',
    type: NodeType.Decision,
    title: 'Test Decision',
    tags: [],
    dates: createNodeDates(),
    content: 'Test content',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    ...overrides,
  }
}

// ============================================================================
// NodeDetailPanel Tests
// ============================================================================

describe('NodeDetailPanel', () => {
  const defaultProps = {
    node: createTestTaskNode(),
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open with a node', () => {
    render(<NodeDetailPanel {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Edit Test Task/)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<NodeDetailPanel {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not render when node is null', () => {
    render(<NodeDetailPanel {...defaultProps} node={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NodeDetailPanel {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByLabelText('Close panel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NodeDetailPanel {...defaultProps} onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders children content', () => {
    render(
      <NodeDetailPanel {...defaultProps}>
        <div data-testid="child-content">Child content</div>
      </NodeDetailPanel>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('has correct accessibility attributes', () => {
    render(<NodeDetailPanel {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Edit Test Task')
  })
})

// ============================================================================
// NodeTitleEditor Tests
// ============================================================================

describe('NodeTitleEditor', () => {
  it('renders with value', () => {
    render(<NodeTitleEditor value="Test Title" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
  })

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NodeTitleEditor value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'New Title')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows placeholder when empty', () => {
    render(
      <NodeTitleEditor value="" onChange={vi.fn()} placeholder="Enter title" />
    )
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<NodeTitleEditor value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Node title')).toBeInTheDocument()
  })
})

// ============================================================================
// StatusSelect Tests
// ============================================================================

describe('StatusSelect', () => {
  it('renders for task node type', () => {
    render(
      <StatusSelect
        value="pending"
        onChange={vi.fn()}
        nodeType={NodeType.Task}
      />
    )
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('renders for decision node type', () => {
    render(
      <StatusSelect
        value="pending"
        onChange={vi.fn()}
        nodeType={NodeType.Decision}
      />
    )
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('renders for component node type', () => {
    render(
      <StatusSelect
        value="considering"
        onChange={vi.fn()}
        nodeType={NodeType.Component}
      />
    )
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('does not render for note node type', () => {
    render(
      <StatusSelect value="" onChange={vi.fn()} nodeType={NodeType.Note} />
    )
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <StatusSelect
        value="pending"
        onChange={vi.fn()}
        nodeType={NodeType.Task}
        disabled
      />
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

// ============================================================================
// TagInput Tests
// ============================================================================

describe('TagInput', () => {
  const defaultProps = {
    value: ['tag1', 'tag2'],
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders existing tags', () => {
    render(<TagInput {...defaultProps} />)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
  })

  it('adds tag on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag{Enter}')
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('adds tag on comma', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag,')
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('removes tag on chip X click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

    await user.click(screen.getByLabelText('Remove tag1 tag'))
    expect(onChange).toHaveBeenCalledWith(['tag2'])
  })

  it('removes last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{Backspace}')
    expect(onChange).toHaveBeenCalledWith(['tag1'])
  })

  it('does not add duplicate tags', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['existing']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'existing{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows suggestions when typing', async () => {
    const user = userEvent.setup()
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['suggestion1', 'suggestion2']}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'sug')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('suggestion1')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<TagInput {...defaultProps} label="Custom Label" />)
    expect(screen.getByLabelText('Custom Label')).toBeInTheDocument()
  })
})

// ============================================================================
// PrioritySelector Tests
// ============================================================================

describe('PrioritySelector', () => {
  it('renders all priority options', () => {
    render(<PrioritySelector value="medium" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeInTheDocument()
  })

  it('shows selected priority', () => {
    render(<PrioritySelector value="high" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'High' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('calls onChange when priority is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrioritySelector value="medium" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: 'High' }))
    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('supports keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrioritySelector value="medium" onChange={onChange} />)

    const mediumButton = screen.getByRole('radio', { name: 'Medium' })
    mediumButton.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('can be disabled', () => {
    render(<PrioritySelector value="medium" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('radio', { name: 'High' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Low' })).toBeDisabled()
  })

  it('has accessible label', () => {
    render(
      <PrioritySelector
        value="medium"
        onChange={vi.fn()}
        label="Task Priority"
      />
    )
    expect(screen.getByText('Task Priority')).toBeInTheDocument()
  })
})

// ============================================================================
// ChecklistEditor Tests
// ============================================================================

describe('ChecklistEditor', () => {
  const items = [createChecklistItem('Item 1'), createChecklistItem('Item 2')]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders checklist items', () => {
    render(<ChecklistEditor value={items} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Item 2')).toBeInTheDocument()
  })

  it('shows completion count', () => {
    const itemsWithCompleted = [{ ...items[0], completed: true }, items[1]]
    render(<ChecklistEditor value={itemsWithCompleted} onChange={vi.fn()} />)
    expect(screen.getByText('1/2 complete')).toBeInTheDocument()
  })

  it('toggles item completion on checkbox click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChecklistEditor value={items} onChange={onChange} />)

    const checkbox = screen.getAllByRole('checkbox')[0]
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalled()
    const newItems = onChange.mock.calls[0][0]
    expect(newItems[0].completed).toBe(true)
  })

  it('adds new item on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChecklistEditor value={items} onChange={onChange} />)

    const firstInput = screen.getByDisplayValue('Item 1')
    await user.click(firstInput)
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalled()
    const newItems = onChange.mock.calls[0][0]
    expect(newItems.length).toBe(3)
  })

  it('deletes item on Backspace when empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const emptyItem = { ...createChecklistItem(''), text: '' }
    render(<ChecklistEditor value={[emptyItem]} onChange={onChange} />)

    const input = screen.getByPlaceholderText('New item...')
    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('adds item via Add button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChecklistEditor value={[]} onChange={onChange} />)

    await user.click(screen.getByText('Add item'))

    expect(onChange).toHaveBeenCalled()
    const newItems = onChange.mock.calls[0][0]
    expect(newItems.length).toBe(1)
  })

  it('has accessible label', () => {
    render(
      <ChecklistEditor value={[]} onChange={vi.fn()} label="Task Checklist" />
    )
    expect(screen.getByText('Task Checklist')).toBeInTheDocument()
  })
})

// ============================================================================
// ComponentFields Tests
// ============================================================================

describe('ComponentFields', () => {
  const defaultProps = {
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all standard fields', () => {
    render(<ComponentFields {...defaultProps} />)
    expect(screen.getByLabelText('Cost')).toBeInTheDocument()
    expect(screen.getByLabelText('Supplier')).toBeInTheDocument()
    expect(screen.getByLabelText('Part Number')).toBeInTheDocument()
  })

  it('displays existing values', () => {
    render(
      <ComponentFields
        {...defaultProps}
        cost={29.99}
        supplier="DigiKey"
        partNumber="MFG-12345"
      />
    )
    expect(screen.getByDisplayValue('29.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('DigiKey')).toBeInTheDocument()
    expect(screen.getByDisplayValue('MFG-12345')).toBeInTheDocument()
  })

  it('calls onChange when cost changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComponentFields {...defaultProps} onChange={onChange} />)

    const costInput = screen.getByLabelText('Cost')
    await user.type(costInput, '19.99')

    expect(onChange).toHaveBeenCalled()
  })

  it('renders custom fields', () => {
    render(
      <ComponentFields
        {...defaultProps}
        customFields={{ voltage: '12', torque: '0.5' }}
      />
    )
    expect(screen.getByText('voltage')).toBeInTheDocument()
    expect(screen.getByText('torque')).toBeInTheDocument()
  })

  it('can add custom field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComponentFields {...defaultProps} onChange={onChange} />)

    await user.type(screen.getByPlaceholderText('Field name'), 'weight')
    await user.type(screen.getByPlaceholderText('Value'), '100g')
    await user.click(screen.getByLabelText('Add custom field'))

    expect(onChange).toHaveBeenCalledWith({
      customFields: { weight: '100g' },
    })
  })

  it('can remove custom field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ComponentFields
        {...defaultProps}
        customFields={{ voltage: '12' }}
        onChange={onChange}
      />
    )

    await user.click(screen.getByLabelText('Remove voltage field'))

    expect(onChange).toHaveBeenCalledWith({ customFields: {} })
  })
})

// ============================================================================
// FrontmatterEditor Tests
// ============================================================================

describe('FrontmatterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title editor for all node types', () => {
    render(<FrontmatterEditor node={createTestTaskNode()} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument()
  })

  it('renders tag input for all node types', () => {
    render(<FrontmatterEditor node={createTestTaskNode()} onChange={vi.fn()} />)
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('example')).toBeInTheDocument()
  })

  it('renders status select for task nodes', () => {
    render(<FrontmatterEditor node={createTestTaskNode()} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('renders priority selector for task nodes', () => {
    render(<FrontmatterEditor node={createTestTaskNode()} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument()
  })

  it('renders checklist editor for task nodes', () => {
    const nodeWithChecklist = createTestTaskNode({
      checklist: [createChecklistItem('Test item')],
    })
    render(<FrontmatterEditor node={nodeWithChecklist} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Test item')).toBeInTheDocument()
  })

  it('renders component fields for component nodes', () => {
    render(
      <FrontmatterEditor
        node={createTestComponentNode({ cost: 19.99 })}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Cost')).toBeInTheDocument()
    expect(screen.getByLabelText('Supplier')).toBeInTheDocument()
  })

  it('renders selected option dropdown for decision nodes with options', () => {
    const nodeWithOptions = createTestDecisionNode({
      options: [
        { id: 'opt1', name: 'Option 1', values: {} },
        { id: 'opt2', name: 'Option 2', values: {} },
      ],
    })
    render(<FrontmatterEditor node={nodeWithOptions} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Selected Option')).toBeInTheDocument()
  })

  it('shows message when decision has no options', () => {
    render(
      <FrontmatterEditor node={createTestDecisionNode()} onChange={vi.fn()} />
    )
    expect(screen.getByText(/No options defined yet/)).toBeInTheDocument()
  })

  it('calls onChange when title changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FrontmatterEditor node={createTestTaskNode()} onChange={onChange} />
    )

    const titleInput = screen.getByDisplayValue('Test Task')
    await user.clear(titleInput)
    await user.type(titleInput, 'New Title')

    // Check that onChange was called with title changes (each character triggers onChange)
    expect(onChange).toHaveBeenCalled()
    // The last call should have the complete title typed so far
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall).toHaveProperty('title')
  })

  it('supports available tags for autocomplete', async () => {
    const user = userEvent.setup()
    render(
      <FrontmatterEditor
        node={createTestTaskNode({ tags: [] })}
        onChange={vi.fn()}
        availableTags={['design', 'hardware', 'software']}
      />
    )

    const tagInput = screen.getByLabelText('Tags')
    await user.type(tagInput, 'des')

    expect(screen.getByText('design')).toBeInTheDocument()
  })

  describe('Decision fields', () => {
    it('calls onChange when selected option changes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const nodeWithOptions = createTestDecisionNode({
        options: [
          { id: 'opt1', name: 'Option 1', values: {} },
          { id: 'opt2', name: 'Option 2', values: {} },
        ],
      })
      render(<FrontmatterEditor node={nodeWithOptions} onChange={onChange} />)

      const select = screen.getByLabelText('Selected Option')
      await user.selectOptions(select, 'opt1')

      expect(onChange).toHaveBeenCalledWith({ selected: 'opt1' })
    })

    it('displays current selected option', () => {
      const nodeWithSelection = createTestDecisionNode({
        selected: 'opt2',
        options: [
          { id: 'opt1', name: 'Option 1', values: {} },
          { id: 'opt2', name: 'Option 2', values: {} },
        ],
      })
      render(<FrontmatterEditor node={nodeWithSelection} onChange={vi.fn()} />)

      const select = screen.getByLabelText(
        'Selected Option'
      ) as HTMLSelectElement
      expect(select.value).toBe('opt2')
    })

    it('allows clearing selected option', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const nodeWithSelection = createTestDecisionNode({
        selected: 'opt1',
        options: [
          { id: 'opt1', name: 'Option 1', values: {} },
          { id: 'opt2', name: 'Option 2', values: {} },
        ],
      })
      render(<FrontmatterEditor node={nodeWithSelection} onChange={onChange} />)

      const select = screen.getByLabelText('Selected Option')
      await user.selectOptions(select, '')

      expect(onChange).toHaveBeenCalledWith({ selected: null })
    })

    it('renders all options in dropdown', () => {
      const nodeWithOptions = createTestDecisionNode({
        options: [
          { id: 'opt1', name: 'Alpha Option', values: {} },
          { id: 'opt2', name: 'Beta Option', values: {} },
          { id: 'opt3', name: 'Gamma Option', values: {} },
        ],
      })
      render(<FrontmatterEditor node={nodeWithOptions} onChange={vi.fn()} />)

      expect(
        screen.getByRole('option', { name: 'Alpha Option' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Beta Option' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Gamma Option' })
      ).toBeInTheDocument()
    })

    it('renders status select for decision nodes', () => {
      render(
        <FrontmatterEditor node={createTestDecisionNode()} onChange={vi.fn()} />
      )
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('calls onChange when decision status changes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <FrontmatterEditor
          node={createTestDecisionNode({ status: 'pending' })}
          onChange={onChange}
        />
      )

      // StatusSelect is a custom component using Base UI, need to click to open then select
      const statusButton = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusButton)

      // Wait for dropdown and click the option - Decision status values are 'pending' | 'selected'
      const selectedOption = await screen.findByRole('option', {
        name: /selected/i,
      })
      await user.click(selectedOption)

      expect(onChange).toHaveBeenCalledWith({ status: 'selected' })
    })
  })
})
