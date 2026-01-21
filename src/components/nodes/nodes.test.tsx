/**
 * Node Components Tests
 *
 * Tests for NodeTypeIcon, StatusBadge, EmptyState, NodeListItem, NodeList
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { NodeType } from '@/types/nodes'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'
import { NodeTypeIcon } from './NodeTypeIcon'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from './EmptyState'
import { NodeListItem } from './NodeListItem'
import { NodeList } from './NodeList'
import { NODE_TYPE_ICON_CONFIG, STATUS_CONFIG } from './config'

// ============================================================================
// Test Data
// ============================================================================

const createTaskNode = (overrides: Partial<TaskNode> = {}): TaskNode => ({
  id: 'task-1',
  type: NodeType.Task,
  title: 'Test Task',
  status: 'pending',
  priority: 'medium',
  content: 'Task content',
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  dependsOn: [],
  blocks: [],
  checklist: [],
  ...overrides,
})

const createDecisionNode = (
  overrides: Partial<DecisionNode> = {}
): DecisionNode => ({
  id: 'decision-1',
  type: NodeType.Decision,
  title: 'Test Decision',
  status: 'pending',
  selected: null,
  content: 'Decision content',
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  options: [],
  criteria: [],
  ...overrides,
})

const createComponentNode = (
  overrides: Partial<ComponentNode> = {}
): ComponentNode => ({
  id: 'component-1',
  type: NodeType.Component,
  title: 'Test Component',
  status: 'considering',
  cost: null,
  supplier: null,
  partNumber: null,
  customFields: {},
  content: 'Component content',
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  ...overrides,
})

const createNoteNode = (overrides: Partial<NoteNode> = {}): NoteNode => ({
  id: 'note-1',
  type: NodeType.Note,
  title: 'Test Note',
  content: 'Note content',
  tags: [],
  dates: { created: new Date(), modified: new Date() },
  ...overrides,
})

// ============================================================================
// NodeTypeIcon Tests
// ============================================================================

describe('NodeTypeIcon', () => {
  it('renders icon for each node type', () => {
    const types = Object.values(NodeType)

    types.forEach((type) => {
      const { container } = render(<NodeTypeIcon type={type} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('applies correct color classes per type', () => {
    Object.entries(NODE_TYPE_ICON_CONFIG).forEach(([type, config]) => {
      const { container } = render(<NodeTypeIcon type={type as NodeType} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass(config.color)
    })
  })

  it('supports size variants', () => {
    const { container: smContainer } = render(
      <NodeTypeIcon type={NodeType.Task} size="sm" />
    )
    const { container: mdContainer } = render(
      <NodeTypeIcon type={NodeType.Task} size="md" />
    )
    const { container: lgContainer } = render(
      <NodeTypeIcon type={NodeType.Task} size="lg" />
    )

    expect(smContainer.querySelector('svg')).toHaveClass('h-4', 'w-4')
    expect(mdContainer.querySelector('svg')).toHaveClass('h-5', 'w-5')
    expect(lgContainer.querySelector('svg')).toHaveClass('h-6', 'w-6')
  })

  it('accepts custom className', () => {
    const { container } = render(
      <NodeTypeIcon type={NodeType.Task} className="custom-class" />
    )
    expect(container.querySelector('svg')).toHaveClass('custom-class')
  })
})

// ============================================================================
// StatusBadge Tests
// ============================================================================

describe('StatusBadge', () => {
  it('renders status badge with label text', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders all status types with their labels', () => {
    Object.entries(STATUS_CONFIG).forEach(([status, config]) => {
      const { unmount } = render(
        <StatusBadge status={status as keyof typeof STATUS_CONFIG} />
      )
      expect(screen.getByText(config.label)).toBeInTheDocument()
      unmount()
    })
  })

  it('includes color dot for visual indication', () => {
    const { container } = render(<StatusBadge status="pending" />)
    // The dot should have aria-hidden for accessibility
    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('rounded-full')
  })

  it('supports size variants', () => {
    const { container: smContainer } = render(
      <StatusBadge status="pending" size="sm" />
    )
    const { container: mdContainer } = render(
      <StatusBadge status="pending" size="md" />
    )

    expect(smContainer.querySelector('span')).toHaveClass('text-xs')
    expect(mdContainer.querySelector('span')).toHaveClass('text-xs')
  })

  it('handles unknown status gracefully', () => {
    // @ts-expect-error - Testing unknown status
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })
})

// ============================================================================
// EmptyState Tests
// ============================================================================

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon" />}
        title="No items"
        description="Create your first item"
      />
    )

    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Create your first item')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon" />}
        title="No items"
        description="Create your first item"
      />
    )

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const handleAction = vi.fn()
    render(
      <EmptyState
        icon={<span data-testid="test-icon" />}
        title="No items"
        description="Create your first item"
        actionLabel="Create Item"
        onAction={handleAction}
      />
    )

    const button = screen.getByRole('button', { name: 'Create Item' })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button without actionLabel', () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon" />}
        title="No items"
        description="Create your first item"
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// ============================================================================
// NodeListItem Tests
// ============================================================================

describe('NodeListItem', () => {
  it('renders node title', () => {
    const node = createTaskNode({ title: 'My Task' })
    render(<NodeListItem node={node} />)
    expect(screen.getByText('My Task')).toBeInTheDocument()
  })

  it('renders node type icon', () => {
    const node = createTaskNode()
    const { container } = render(<NodeListItem node={node} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders status badge for nodes with status', () => {
    const node = createTaskNode({ status: 'in_progress' })
    render(<NodeListItem node={node} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('does not render status badge for Note nodes', () => {
    const node = createNoteNode()
    render(<NodeListItem node={node} />)
    // Note nodes don't have status, so no badge should be rendered
    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
  })

  it('applies active styling when isActive is true', () => {
    const node = createTaskNode()
    render(<NodeListItem node={node} isActive={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gray-100')
    expect(button).toHaveAttribute('aria-current', 'true')
  })

  it('does not have active styling when isActive is false', () => {
    const node = createTaskNode()
    render(<NodeListItem node={node} isActive={false} />)

    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('aria-current')
  })

  it('calls onClick when clicked', () => {
    const node = createTaskNode()
    const handleClick = vi.fn()
    render(<NodeListItem node={node} onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders status badges for all node types with status', () => {
    const taskNode = createTaskNode({ status: 'complete' })
    const decisionNode = createDecisionNode({ status: 'selected' })
    const componentNode = createComponentNode({ status: 'rejected' })

    const { unmount: unmount1 } = render(<NodeListItem node={taskNode} />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
    unmount1()

    const { unmount: unmount2 } = render(<NodeListItem node={decisionNode} />)
    expect(screen.getByText('Selected')).toBeInTheDocument()
    unmount2()

    render(<NodeListItem node={componentNode} />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })
})

// ============================================================================
// NodeList Tests
// ============================================================================

describe('NodeList', () => {
  const nodes: ForgeNode[] = [
    createTaskNode({ id: 'task-1', title: 'Task 1' }),
    createDecisionNode({ id: 'decision-1', title: 'Decision 1' }),
    createComponentNode({ id: 'component-1', title: 'Component 1' }),
  ]

  it('renders all nodes', () => {
    render(
      <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
    )

    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Decision 1')).toBeInTheDocument()
    expect(screen.getByText('Component 1')).toBeInTheDocument()
  })

  it('renders empty state when no nodes', () => {
    render(<NodeList nodes={[]} activeNodeId={null} onNodeSelect={vi.fn()} />)

    expect(screen.getByText('No nodes yet')).toBeInTheDocument()
  })

  it('renders empty state with action button when onCreateNode provided', () => {
    const handleCreate = vi.fn()
    render(
      <NodeList
        nodes={[]}
        activeNodeId={null}
        onNodeSelect={vi.fn()}
        onCreateNode={handleCreate}
      />
    )

    const button = screen.getByRole('button', { name: 'Create Node' })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleCreate).toHaveBeenCalledTimes(1)
  })

  it('highlights active node', () => {
    render(
      <NodeList nodes={nodes} activeNodeId="task-1" onNodeSelect={vi.fn()} />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons[1]).not.toHaveAttribute('aria-current')
    expect(buttons[2]).not.toHaveAttribute('aria-current')
  })

  it('calls onNodeSelect when node is clicked', () => {
    const handleSelect = vi.fn()
    render(
      <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={handleSelect} />
    )

    fireEvent.click(screen.getByText('Decision 1'))
    expect(handleSelect).toHaveBeenCalledWith('decision-1')
  })

  it('has listbox role with aria-label', () => {
    render(
      <NodeList
        nodes={nodes}
        activeNodeId={null}
        onNodeSelect={vi.fn()}
        aria-label="Project nodes"
      />
    )

    expect(
      screen.getByRole('listbox', { name: 'Project nodes' })
    ).toBeInTheDocument()
  })

  describe('keyboard navigation', () => {
    it('navigates with ArrowDown', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const listbox = screen.getByRole('listbox')
      listbox.focus()

      // Focus first item
      const buttons = screen.getAllByRole('button')
      buttons[0].focus()

      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(buttons[1])

      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(buttons[2])
    })

    it('navigates with ArrowUp', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const buttons = screen.getAllByRole('button')
      buttons[2].focus()

      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(buttons[1])

      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(buttons[0])
    })

    it('wraps around with ArrowDown at end', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const buttons = screen.getAllByRole('button')
      buttons[2].focus()

      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(buttons[0])
    })

    it('wraps around with ArrowUp at start', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const buttons = screen.getAllByRole('button')
      buttons[0].focus()

      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(buttons[2])
    })

    it('navigates to first with Home', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const buttons = screen.getAllByRole('button')
      buttons[2].focus()

      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(buttons[0])
    })

    it('navigates to last with End', async () => {
      const user = userEvent.setup()
      render(
        <NodeList nodes={nodes} activeNodeId={null} onNodeSelect={vi.fn()} />
      )

      const buttons = screen.getAllByRole('button')
      buttons[0].focus()

      await user.keyboard('{End}')
      expect(document.activeElement).toBe(buttons[2])
    })

    it('selects node with Enter', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()
      render(
        <NodeList
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={handleSelect}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons[1].focus()

      await user.keyboard('{Enter}')
      expect(handleSelect).toHaveBeenCalledWith('decision-1')
    })
  })
})
