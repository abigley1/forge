/**
 * Outline Component Tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { NodeType, createNodeDates } from '@/types/nodes'
import type { TaskNode, DecisionNode, ForgeNode } from '@/types/nodes'
import { CollapsibleSection } from './CollapsibleSection'
import { OutlineView } from './OutlineView'
import { ViewToggle } from './ViewToggle'

// ============================================================================
// Test Fixtures
// ============================================================================

function createTaskNode(
  id: string,
  title: string,
  status: TaskNode['status'] = 'pending'
): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    status,
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

function createDecisionNode(id: string, title: string): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    tags: [],
    dates: createNodeDates(),
    content: '',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
  }
}

// ============================================================================
// CollapsibleSection Tests
// ============================================================================

describe('CollapsibleSection', () => {
  describe('rendering', () => {
    it('renders title', () => {
      render(
        <CollapsibleSection title="Tasks" expanded={true} onToggle={() => {}}>
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
      render(
        <CollapsibleSection
          title="Tasks"
          icon={<span data-testid="custom-icon">Icon</span>}
          expanded={true}
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('renders item count badge', () => {
      render(
        <CollapsibleSection
          title="Tasks"
          itemCount={5}
          expanded={true}
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByLabelText('5 items')).toBeInTheDocument()
    })

    it('shows content when expanded', () => {
      render(
        <CollapsibleSection title="Tasks" expanded={true} onToggle={() => {}}>
          <div>Content visible</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Content visible')).toBeInTheDocument()
    })

    it('hides content when collapsed', () => {
      render(
        <CollapsibleSection title="Tasks" expanded={false} onToggle={() => {}}>
          <div>Content hidden</div>
        </CollapsibleSection>
      )

      // Content is in the DOM but aria-hidden
      const content = screen.getByText('Content hidden')
      expect(content.closest('[aria-hidden="true"]')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onToggle when header clicked', async () => {
      const user = userEvent.setup()
      const handleToggle = vi.fn()

      render(
        <CollapsibleSection
          title="Tasks"
          expanded={true}
          onToggle={handleToggle}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      await user.click(screen.getByRole('button', { expanded: true }))
      expect(handleToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle when Enter is pressed', async () => {
      const user = userEvent.setup()
      const handleToggle = vi.fn()

      render(
        <CollapsibleSection
          title="Tasks"
          expanded={true}
          onToggle={handleToggle}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button', { expanded: true })
      button.focus()
      await user.keyboard('{Enter}')
      expect(handleToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle when Space is pressed', async () => {
      const user = userEvent.setup()
      const handleToggle = vi.fn()

      render(
        <CollapsibleSection
          title="Tasks"
          expanded={true}
          onToggle={handleToggle}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button', { expanded: true })
      button.focus()
      await user.keyboard(' ')
      expect(handleToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has aria-expanded attribute', () => {
      const { rerender } = render(
        <CollapsibleSection title="Tasks" expanded={true} onToggle={() => {}}>
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'true'
      )

      rerender(
        <CollapsibleSection title="Tasks" expanded={false} onToggle={() => {}}>
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })

    it('has aria-controls linking to content', () => {
      render(
        <CollapsibleSection title="Tasks" expanded={true} onToggle={() => {}}>
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button')
      const controlsId = button.getAttribute('aria-controls')
      expect(controlsId).toBeTruthy()
      expect(document.getElementById(controlsId!)).toBeInTheDocument()
    })
  })
})

// ============================================================================
// OutlineView Tests
// ============================================================================

describe('OutlineView', () => {
  // Mock localStorage
  const mockLocalStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => mockLocalStorage[key] ?? null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value
    })
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders all section headers', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      expect(screen.getByText('Tasks')).toBeInTheDocument()
      expect(screen.getByText('Decisions')).toBeInTheDocument()
      expect(screen.getByText('Components')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('renders nodes in correct sections', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'My Task')],
        ['decision1', createDecisionNode('decision1', 'My Decision')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      expect(screen.getByText('My Task')).toBeInTheDocument()
      expect(screen.getByText('My Decision')).toBeInTheDocument()
    })

    it('shows empty state when no nodes', () => {
      render(
        <OutlineView
          nodes={new Map()}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      expect(screen.getByText('No nodes yet')).toBeInTheDocument()
    })

    it('shows empty message for sections without nodes', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      expect(screen.getByText('No decisions yet')).toBeInTheDocument()
    })

    it('highlights active node', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId="task1"
          onNodeSelect={() => {}}
        />
      )

      // Item with aria-current="true" indicates active state
      const activeItem = document.getElementById('outline-item-task1')
      expect(activeItem).toHaveAttribute('aria-current', 'true')
      expect(activeItem).toHaveTextContent('Task 1')
    })
  })

  describe('interactions', () => {
    it('calls onNodeSelect when node clicked', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={handleSelect}
        />
      )

      await user.click(screen.getByText('Task 1'))
      expect(handleSelect).toHaveBeenCalledWith('task1')
    })

    it('toggles section collapse when header clicked', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const tasksHeader = screen.getByRole('button', { name: /tasks/i })

      // Initially expanded
      expect(screen.getByText('Task 1')).toBeVisible()

      // Collapse
      await user.click(tasksHeader)

      // Now collapsed - content is hidden
      const taskItem = screen.getByText('Task 1')
      expect(taskItem.closest('[aria-hidden="true"]')).toBeInTheDocument()
    })
  })

  describe('quick status toggle', () => {
    it('calls onTaskStatusToggle when status toggled', async () => {
      const user = userEvent.setup()
      const handleStatusToggle = vi.fn()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1', 'pending')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
          onTaskStatusToggle={handleStatusToggle}
        />
      )

      const statusButton = screen.getByLabelText(/toggle status/i)
      await user.click(statusButton)

      expect(handleStatusToggle).toHaveBeenCalledWith('task1', 'in_progress')
    })

    it('cycles through statuses correctly', async () => {
      const user = userEvent.setup()
      const handleStatusToggle = vi.fn()

      // Test pending -> in_progress
      const nodesPending = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1', 'pending')],
      ])

      const { rerender } = render(
        <OutlineView
          nodes={nodesPending}
          activeNodeId={null}
          onNodeSelect={() => {}}
          onTaskStatusToggle={handleStatusToggle}
        />
      )

      await user.click(screen.getByLabelText(/toggle status/i))
      expect(handleStatusToggle).toHaveBeenCalledWith('task1', 'in_progress')

      // Test in_progress -> complete
      const nodesInProgress = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1', 'in_progress')],
      ])

      rerender(
        <OutlineView
          nodes={nodesInProgress}
          activeNodeId={null}
          onNodeSelect={() => {}}
          onTaskStatusToggle={handleStatusToggle}
        />
      )

      await user.click(screen.getByLabelText(/toggle status/i))
      expect(handleStatusToggle).toHaveBeenCalledWith('task1', 'complete')

      // Test complete -> pending
      const nodesComplete = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1', 'complete')],
      ])

      rerender(
        <OutlineView
          nodes={nodesComplete}
          activeNodeId={null}
          onNodeSelect={() => {}}
          onTaskStatusToggle={handleStatusToggle}
        />
      )

      await user.click(screen.getByLabelText(/toggle status/i))
      expect(handleStatusToggle).toHaveBeenCalledWith('task1', 'pending')
    })
  })

  describe('keyboard navigation', () => {
    it('navigates with Arrow Down', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const firstItem = document.getElementById('outline-item-task1')!
      firstItem.focus()

      await user.keyboard('{ArrowDown}')

      expect(document.activeElement).toHaveTextContent('Task 2')
    })

    it('navigates with Arrow Up', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const secondItem = document.getElementById('outline-item-task2')!
      secondItem.focus()

      await user.keyboard('{ArrowUp}')

      expect(document.activeElement).toHaveTextContent('Task 1')
    })

    it('navigates with Home key', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
        ['task3', createTaskNode('task3', 'Task 3')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const lastItem = document.getElementById('outline-item-task3')!
      lastItem.focus()

      await user.keyboard('{Home}')

      expect(document.activeElement).toHaveTextContent('Task 1')
    })

    it('navigates with End key', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
        ['task3', createTaskNode('task3', 'Task 3')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const firstItem = document.getElementById('outline-item-task1')!
      firstItem.focus()

      await user.keyboard('{End}')

      expect(document.activeElement).toHaveTextContent('Task 3')
    })

    it('selects node with Enter', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={handleSelect}
        />
      )

      const item = document.getElementById('outline-item-task1')!
      item.focus()

      await user.keyboard('{Enter}')

      expect(handleSelect).toHaveBeenCalledWith('task1')
    })

    it('wraps around when navigating past end', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const lastItem = document.getElementById('outline-item-task2')!
      lastItem.focus()

      await user.keyboard('{ArrowDown}')

      expect(document.activeElement).toHaveTextContent('Task 1')
    })
  })

  describe('localStorage persistence', () => {
    it('persists collapse state', async () => {
      const user = userEvent.setup()
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      const tasksHeader = screen.getByRole('button', { name: /tasks/i })
      await user.click(tasksHeader)

      // Check localStorage was updated
      const stored = mockLocalStorage['forge-outline-collapse-state']
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored)
      expect(parsed.task).toBe(true) // collapsed
    })
  })

  describe('accessibility', () => {
    it('has listbox role', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId={null}
          onNodeSelect={() => {}}
        />
      )

      // Container has accessible label
      expect(screen.getByLabelText('Project outline')).toBeInTheDocument()
    })

    it('has aria-roledescription for assistive technology', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId="task1"
          onNodeSelect={() => {}}
        />
      )

      const container = screen.getByLabelText('Project outline')
      expect(container).toHaveAttribute(
        'aria-roledescription',
        'navigable outline'
      )
    })

    it('active item has aria-current', () => {
      const nodes = new Map<string, ForgeNode>([
        ['task1', createTaskNode('task1', 'Task 1')],
        ['task2', createTaskNode('task2', 'Task 2')],
      ])

      render(
        <OutlineView
          nodes={nodes}
          activeNodeId="task1"
          onNodeSelect={() => {}}
        />
      )

      // Active item should have aria-current
      const activeItem = document.getElementById('outline-item-task1')
      expect(activeItem).toHaveAttribute('aria-current', 'true')

      // Non-active item should not have aria-current
      const otherItem = document.getElementById('outline-item-task2')
      expect(otherItem).not.toHaveAttribute('aria-current')
    })
  })
})

// ============================================================================
// ViewToggle Tests
// ============================================================================

describe('ViewToggle', () => {
  describe('rendering', () => {
    it('renders outline and graph options', () => {
      render(<ViewToggle value="outline" onChange={() => {}} />)

      expect(screen.getByRole('tab', { name: /outline/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /graph/i })).toBeInTheDocument()
    })

    it('shows keyboard shortcuts when enabled', () => {
      render(<ViewToggle value="outline" onChange={() => {}} showShortcuts />)

      expect(screen.getByText('⌘1')).toBeInTheDocument()
      expect(screen.getByText('⌘2')).toBeInTheDocument()
    })

    it('hides keyboard shortcuts when disabled', () => {
      render(
        <ViewToggle value="outline" onChange={() => {}} showShortcuts={false} />
      )

      expect(screen.queryByText('⌘1')).not.toBeInTheDocument()
      expect(screen.queryByText('⌘2')).not.toBeInTheDocument()
    })

    it('highlights selected tab', () => {
      const { rerender } = render(
        <ViewToggle value="outline" onChange={() => {}} />
      )

      // Tabs use aria-selected, not aria-current (per WAI-ARIA tabs pattern)
      expect(screen.getByRole('tab', { name: /outline/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(screen.getByRole('tab', { name: /graph/i })).toHaveAttribute(
        'aria-selected',
        'false'
      )

      rerender(<ViewToggle value="graph" onChange={() => {}} />)

      expect(screen.getByRole('tab', { name: /outline/i })).toHaveAttribute(
        'aria-selected',
        'false'
      )
      expect(screen.getByRole('tab', { name: /graph/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })
  })

  describe('interactions', () => {
    it('calls onChange when tab clicked', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<ViewToggle value="outline" onChange={handleChange} />)

      await user.click(screen.getByRole('tab', { name: /graph/i }))
      expect(handleChange).toHaveBeenCalledWith('graph')
    })

    it('responds to Ctrl+1 for outline', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<ViewToggle value="graph" onChange={handleChange} />)

      await user.keyboard('{Control>}1{/Control}')
      expect(handleChange).toHaveBeenCalledWith('outline')
    })

    it('responds to Ctrl+2 for graph', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<ViewToggle value="outline" onChange={handleChange} />)

      await user.keyboard('{Control>}2{/Control}')
      expect(handleChange).toHaveBeenCalledWith('graph')
    })
  })

  describe('accessibility', () => {
    it('has tablist role', () => {
      render(<ViewToggle value="outline" onChange={() => {}} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('tabs have aria-controls', () => {
      render(<ViewToggle value="outline" onChange={() => {}} />)

      expect(screen.getByRole('tab', { name: /outline/i })).toHaveAttribute(
        'aria-controls',
        'outline-panel'
      )
      expect(screen.getByRole('tab', { name: /graph/i })).toHaveAttribute(
        'aria-controls',
        'graph-panel'
      )
    })
  })
})
