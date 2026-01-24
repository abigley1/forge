/**
 * Filter Components Tests
 *
 * Tests for TypeFilter, TagFilter, StatusFilter, NodeSearchInput,
 * FilterResultsAnnouncer, and FilterResultsCount
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { NodeType } from '@/types/nodes'
import type { ForgeNode, TaskNode, NoteNode } from '@/types/nodes'
import { useNodesStore } from '@/store'
import { TypeFilter } from './TypeFilter'
import { TagFilter } from './TagFilter'
import { StatusFilter } from './StatusFilter'
import { NodeSearchInput } from './NodeSearchInput'
import {
  FilterResultsAnnouncer,
  FilterResultsCount,
} from './FilterResultsAnnouncer'

// ============================================================================
// Test Data
// ============================================================================

const createTaskNode = (
  id: string,
  title: string,
  tags: string[] = []
): TaskNode => ({
  id,
  type: NodeType.Task,
  title,
  status: 'pending',
  priority: 'medium',
  content: 'Task content',
  tags,
  dates: { created: new Date(), modified: new Date() },
  dependsOn: [],
  blocks: [],
  checklist: [],
  parent: null,
})

const createNoteNode = (
  id: string,
  title: string,
  tags: string[] = []
): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content: 'Note content',
  tags,
  dates: { created: new Date(), modified: new Date() },
  parent: null,
})

// ============================================================================
// TypeFilter Tests
// ============================================================================

describe('TypeFilter', () => {
  it('renders all node type buttons', () => {
    render(<TypeFilter selectedTypes={[]} onToggleType={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /filter by task/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /filter by decision/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /filter by component/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /filter by note/i })
    ).toBeInTheDocument()
  })

  it('shows selected state for active types', () => {
    render(
      <TypeFilter
        selectedTypes={[NodeType.Task, NodeType.Decision]}
        onToggleType={vi.fn()}
      />
    )

    const taskButton = screen.getByRole('button', {
      name: /filter by task.*active/i,
    })
    const decisionButton = screen.getByRole('button', {
      name: /filter by decision.*active/i,
    })
    const componentButton = screen.getByRole('button', {
      name: /filter by component/i,
    })

    expect(taskButton).toHaveAttribute('aria-pressed', 'true')
    expect(decisionButton).toHaveAttribute('aria-pressed', 'true')
    expect(componentButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggleType when button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleType = vi.fn()

    render(<TypeFilter selectedTypes={[]} onToggleType={onToggleType} />)

    await user.click(screen.getByRole('button', { name: /filter by task/i }))
    expect(onToggleType).toHaveBeenCalledWith(NodeType.Task)
  })

  it('has accessible group label', () => {
    render(<TypeFilter selectedTypes={[]} onToggleType={vi.fn()} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /type/i })).toBeInTheDocument()
  })
})

// ============================================================================
// TagFilter Tests
// ============================================================================

describe('TagFilter', () => {
  beforeEach(() => {
    // Set up test nodes with tags
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', ['electronics', 'urgent'])],
      ['task-2', createTaskNode('task-2', 'Task 2', ['electronics', 'design'])],
      ['note-1', createNoteNode('note-1', 'Note 1', ['research'])],
    ])
    useNodesStore.setState({ nodes })
  })

  afterEach(() => {
    useNodesStore.setState({ nodes: new Map() })
  })

  it('renders available tags from nodes', () => {
    render(
      <TagFilter selectedTags={[]} onAddTag={vi.fn()} onRemoveTag={vi.fn()} />
    )

    expect(
      screen.getByRole('button', { name: /add tag filter: electronics/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add tag filter: urgent/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add tag filter: design/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add tag filter: research/i })
    ).toBeInTheDocument()
  })

  it('shows selected tags as chips', () => {
    render(
      <TagFilter
        selectedTags={['electronics']}
        onAddTag={vi.fn()}
        onRemoveTag={vi.fn()}
      />
    )

    // Selected tag should appear as chip with remove button
    expect(
      screen.getByRole('button', { name: /remove tag: electronics/i })
    ).toBeInTheDocument()
    // Should not appear in available tags
    expect(
      screen.queryByRole('button', { name: /add tag filter: electronics/i })
    ).not.toBeInTheDocument()
  })

  it('calls onAddTag when available tag is clicked', async () => {
    const user = userEvent.setup()
    const onAddTag = vi.fn()

    render(
      <TagFilter selectedTags={[]} onAddTag={onAddTag} onRemoveTag={vi.fn()} />
    )

    await user.click(
      screen.getByRole('button', { name: /add tag filter: electronics/i })
    )
    expect(onAddTag).toHaveBeenCalledWith('electronics')
  })

  it('calls onRemoveTag when chip remove button is clicked', async () => {
    const user = userEvent.setup()
    const onRemoveTag = vi.fn()

    render(
      <TagFilter
        selectedTags={['electronics']}
        onAddTag={vi.fn()}
        onRemoveTag={onRemoveTag}
      />
    )

    await user.click(
      screen.getByRole('button', { name: /remove tag: electronics/i })
    )
    expect(onRemoveTag).toHaveBeenCalledWith('electronics')
  })

  it('shows AND logic hint when multiple tags selected', () => {
    render(
      <TagFilter
        selectedTags={['electronics', 'urgent']}
        onAddTag={vi.fn()}
        onRemoveTag={vi.fn()}
      />
    )

    expect(
      screen.getByText(/showing nodes with all selected tags/i)
    ).toBeInTheDocument()
  })

  it('shows empty state when no tags available', () => {
    useNodesStore.setState({ nodes: new Map() })

    render(
      <TagFilter selectedTags={[]} onAddTag={vi.fn()} onRemoveTag={vi.fn()} />
    )

    expect(screen.getByText(/no tags available/i)).toBeInTheDocument()
  })
})

// ============================================================================
// StatusFilter Tests
// ============================================================================

describe('StatusFilter', () => {
  it('renders all status checkboxes', () => {
    render(<StatusFilter selectedStatuses={[]} onToggleStatus={vi.fn()} />)

    expect(screen.getByLabelText(/pending/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/in progress/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/blocked/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/complete/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/considering/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/selected/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/rejected/i)).toBeInTheDocument()
  })

  it('shows checked state for selected statuses', () => {
    render(
      <StatusFilter
        selectedStatuses={['pending', 'in_progress']}
        onToggleStatus={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/pending/i)).toBeChecked()
    expect(screen.getByLabelText(/in progress/i)).toBeChecked()
    expect(screen.getByLabelText(/blocked/i)).not.toBeChecked()
  })

  it('calls onToggleStatus when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onToggleStatus = vi.fn()

    render(
      <StatusFilter selectedStatuses={[]} onToggleStatus={onToggleStatus} />
    )

    await user.click(screen.getByLabelText(/pending/i))
    expect(onToggleStatus).toHaveBeenCalledWith('pending')
  })

  it('shows count in label when statuses selected', () => {
    render(
      <StatusFilter
        selectedStatuses={['pending', 'in_progress']}
        onToggleStatus={vi.fn()}
      />
    )

    expect(screen.getByText(/status \(2\)/i)).toBeInTheDocument()
  })

  it('organizes statuses by category', () => {
    render(<StatusFilter selectedStatuses={[]} onToggleStatus={vi.fn()} />)

    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('Decision/Component')).toBeInTheDocument()
  })
})

// ============================================================================
// NodeSearchInput Tests
// ============================================================================

describe('NodeSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders search input with placeholder', () => {
    render(<NodeSearchInput value="" onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText(/search nodes/i)).toBeInTheDocument()
  })

  it('shows current value', () => {
    render(<NodeSearchInput value="test query" onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
  })

  it('shows clear button when value is not empty', () => {
    render(<NodeSearchInput value="test" onChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /clear search/i })
    ).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<NodeSearchInput value="" onChange={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: /clear search/i })
    ).not.toBeInTheDocument()
  })

  it('calls onChange immediately when clear button is clicked', async () => {
    vi.useRealTimers() // Use real timers for this test
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NodeSearchInput value="test" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /clear search/i }))
    expect(onChange).toHaveBeenCalledWith('')
    vi.useFakeTimers() // Restore fake timers
  })

  it('debounces onChange calls when typing', async () => {
    const onChange = vi.fn()

    render(<NodeSearchInput value="" onChange={onChange} debounceMs={150} />)

    const input = screen.getByPlaceholderText(/search nodes/i)

    // Type quickly
    fireEvent.change(input, { target: { value: 't' } })
    fireEvent.change(input, { target: { value: 'te' } })
    fireEvent.change(input, { target: { value: 'tes' } })
    fireEvent.change(input, { target: { value: 'test' } })

    // Should not have called onChange yet
    expect(onChange).not.toHaveBeenCalled()

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Now should have called with final value
    expect(onChange).toHaveBeenCalledWith('test')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('has accessible label', () => {
    render(<NodeSearchInput value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText(/search nodes/i)).toBeInTheDocument()
  })

  it('uses type="search" for proper semantics', () => {
    render(<NodeSearchInput value="" onChange={vi.fn()} />)

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
})

// ============================================================================
// FilterResultsAnnouncer Tests
// ============================================================================

describe('FilterResultsAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with aria-live polite', () => {
    render(
      <FilterResultsAnnouncer
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    const announcer = screen.getByRole('status')
    expect(announcer).toHaveAttribute('aria-live', 'polite')
    expect(announcer).toHaveAttribute('aria-atomic', 'true')
  })

  it('is visually hidden (sr-only)', () => {
    render(
      <FilterResultsAnnouncer
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    expect(screen.getByRole('status')).toHaveClass('sr-only')
  })

  it('announces result count when it changes', () => {
    const { rerender } = render(
      <FilterResultsAnnouncer
        resultCount={10}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    // Change count
    rerender(
      <FilterResultsAnnouncer
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    // Advance timers for debounce
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/5 nodes match/i)
  })

  it('announces "no matches" when count is zero', () => {
    const { rerender } = render(
      <FilterResultsAnnouncer
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    rerender(
      <FilterResultsAnnouncer
        resultCount={0}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/no nodes match/i)
  })
})

// ============================================================================
// FilterResultsCount Tests
// ============================================================================

describe('FilterResultsCount', () => {
  it('renders nothing when no filters active', () => {
    const { container } = render(
      <FilterResultsCount
        resultCount={10}
        totalCount={10}
        hasActiveFilters={false}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows count when filters are active', () => {
    render(
      <FilterResultsCount
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('/ 10')).toBeInTheDocument()
  })

  it('shows "No matches" when count is zero', () => {
    render(
      <FilterResultsCount
        resultCount={0}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })

  it('shows clear filters button when callback provided', () => {
    render(
      <FilterResultsCount
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
        onClearFilters={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /clear filters/i })
    ).toBeInTheDocument()
  })

  it('calls onClearFilters when button clicked', async () => {
    const user = userEvent.setup()
    const onClearFilters = vi.fn()

    render(
      <FilterResultsCount
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />
    )

    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('has aria-live for screen readers', () => {
    render(
      <FilterResultsCount
        resultCount={5}
        totalCount={10}
        hasActiveFilters={true}
      />
    )

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})

// ============================================================================
// SortDropdown Tests
// ============================================================================

import { SortDropdown } from './SortDropdown'

describe('SortDropdown', () => {
  it('renders sort select with current value', () => {
    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    const select = screen.getByRole('combobox', { name: /sort by/i })
    expect(select).toHaveValue('modified')
  })

  it('renders all sort options', () => {
    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    const select = screen.getByRole('combobox')
    expect(select).toContainHTML('<option value="modified">Modified</option>')
    expect(select).toContainHTML('<option value="created">Created</option>')
    expect(select).toContainHTML('<option value="title">Title</option>')
    expect(select).toContainHTML('<option value="type">Type</option>')
    expect(select).toContainHTML('<option value="status">Status</option>')
  })

  it('calls onSortByChange when selection changes', async () => {
    const user = userEvent.setup()
    const onSortByChange = vi.fn()

    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={onSortByChange}
        onDirectionChange={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByRole('combobox'), 'title')
    expect(onSortByChange).toHaveBeenCalledWith('title')
  })

  it('renders direction toggle button', () => {
    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /sort direction.*descending/i })
    ).toBeInTheDocument()
  })

  it('calls onDirectionChange when toggle is clicked', async () => {
    const user = userEvent.setup()
    const onDirectionChange = vi.fn()

    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={vi.fn()}
        onDirectionChange={onDirectionChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /sort direction/i }))
    expect(onDirectionChange).toHaveBeenCalledWith('asc')
  })

  it('toggles from asc to desc', async () => {
    const user = userEvent.setup()
    const onDirectionChange = vi.fn()

    render(
      <SortDropdown
        sortBy="modified"
        direction="asc"
        onSortByChange={vi.fn()}
        onDirectionChange={onDirectionChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /sort direction/i }))
    expect(onDirectionChange).toHaveBeenCalledWith('desc')
  })

  it('shows ascending label when direction is asc', () => {
    render(
      <SortDropdown
        sortBy="modified"
        direction="asc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /ascending/i })
    ).toBeInTheDocument()
  })

  it('shows descending label when direction is desc', () => {
    render(
      <SortDropdown
        sortBy="modified"
        direction="desc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: /descending/i })
    ).toBeInTheDocument()
  })

  it('has accessible label for select', () => {
    render(
      <SortDropdown
        sortBy="title"
        direction="asc"
        onSortByChange={vi.fn()}
        onDirectionChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })
})
