import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CommandPalette } from './CommandPalette'
import { useNodesStore } from '@/store/useNodesStore'
import { ToastProvider } from '@/components/ui'
import { NodeType } from '@/types'
import type { ForgeNode, TaskNode, DecisionNode } from '@/types'

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

// Create test nodes
function createTaskNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: `task-${Date.now()}-${Math.random()}`,
    type: NodeType.Task,
    title: 'Test Task',
    content: 'Task content',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
    ...overrides,
  }
}

function createDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: `decision-${Date.now()}-${Math.random()}`,
    type: NodeType.Decision,
    title: 'Test Decision',
    content: 'Decision content',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
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

const RECENT_COMMANDS_KEY = 'forge-recent-commands'

describe('CommandPalette', () => {
  beforeEach(() => {
    // Reset store
    useNodesStore.setState({
      nodes: new Map(),
      activeNodeId: null,
      dirtyNodeIds: new Set(),
      linkIndex: { outgoing: new Map(), incoming: new Map() },
    })
    // Clear localStorage
    localStorage.removeItem(RECENT_COMMANDS_KEY)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when open', () => {
      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Search nodes')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      renderWithProviders(
        <CommandPalette open={false} onOpenChange={() => {}} />
      )

      expect(screen.queryByLabelText('Search nodes')).not.toBeInTheDocument()
    })

    it('shows search input with placeholder', () => {
      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
    })

    it('shows keyboard hints in footer', () => {
      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText('navigate')).toBeInTheDocument()
      expect(screen.getByText('open')).toBeInTheDocument()
      expect(screen.getByText('close')).toBeInTheDocument()
    })
  })

  describe('node search', () => {
    it('displays all nodes when query is empty', () => {
      // Add test nodes
      const task = createTaskNode({ id: 'task-1', title: 'Build Feature' })
      const decision = createDecisionNode({
        id: 'decision-1',
        title: 'Choose Framework',
      })

      const nodes = new Map<string, ForgeNode>([
        [task.id, task],
        [decision.id, decision],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText('Build Feature')).toBeInTheDocument()
      expect(screen.getByText('Choose Framework')).toBeInTheDocument()
    })

    it('filters nodes based on search query', async () => {
      const user = userEvent.setup()

      const task1 = createTaskNode({ id: 'task-1', title: 'Build Feature' })
      const task2 = createTaskNode({ id: 'task-2', title: 'Write Tests' })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'Build')

      // Text may be broken up by highlight marks, so check for option role
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBe(1)
        expect(options[0].textContent).toContain('Build Feature')
      })
    })

    it('performs fuzzy matching', async () => {
      const user = userEvent.setup()

      const task = createTaskNode({
        id: 'task-1',
        title: 'Configure Authentication',
      })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'confauth')

      // Text may be broken up by highlight marks, so check for option presence
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
        expect(options[0].textContent).toContain('Configure Authentication')
      })
    })

    it('shows "No results found" when nothing matches', async () => {
      const user = userEvent.setup()

      const task = createTaskNode({ id: 'task-1', title: 'Build Feature' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'xyznotfound')

      expect(screen.getByText(/No results found/)).toBeInTheDocument()
    })

    it('displays node type icons', () => {
      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })
      const decision = createDecisionNode({
        id: 'decision-1',
        title: 'Test Decision',
      })

      const nodes = new Map<string, ForgeNode>([
        [task.id, task],
        [decision.id, decision],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      // Icons should have aria-hidden="true"
      const icons = document.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('displays status badges for nodes with status', () => {
      const task = createTaskNode({
        id: 'task-1',
        title: 'Test Task',
        status: 'in_progress',
      })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('selects first item by default', () => {
      const task1 = createTaskNode({ id: 'task-1', title: 'First Task' })
      const task2 = createTaskNode({ id: 'task-2', title: 'Second Task' })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const firstItem = screen.getByRole('option', { name: /First Task/i })
      expect(firstItem).toHaveAttribute('aria-selected', 'true')
    })

    it('navigates down with ArrowDown', async () => {
      const user = userEvent.setup()

      // Use different modified dates to control order (most recent first)
      const now = new Date()
      const task1 = createTaskNode({
        id: 'task-1',
        title: 'First Task',
        dates: { created: now, modified: new Date(now.getTime() + 1000) },
      })
      const task2 = createTaskNode({
        id: 'task-2',
        title: 'Second Task',
        dates: { created: now, modified: now },
      })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[1]).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('navigates up with ArrowUp', async () => {
      const user = userEvent.setup()

      const now = new Date()
      const task1 = createTaskNode({
        id: 'task-1',
        title: 'First Task',
        dates: { created: now, modified: new Date(now.getTime() + 1000) },
      })
      const task2 = createTaskNode({
        id: 'task-2',
        title: 'Second Task',
        dates: { created: now, modified: now },
      })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('selects item with Enter', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={onOpenChange} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{Enter}')

      // Should close dialog and set active node
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(useNodesStore.getState().activeNodeId).toBe('task-1')
    })

    it('closes with Escape', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      renderWithProviders(<CommandPalette open onOpenChange={onOpenChange} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('jumps to first item with Home', async () => {
      const user = userEvent.setup()

      const now = new Date()
      const task1 = createTaskNode({
        id: 'task-1',
        title: 'First Task',
        dates: { created: now, modified: new Date(now.getTime() + 2000) },
      })
      const task2 = createTaskNode({
        id: 'task-2',
        title: 'Second Task',
        dates: { created: now, modified: new Date(now.getTime() + 1000) },
      })
      const task3 = createTaskNode({
        id: 'task-3',
        title: 'Third Task',
        dates: { created: now, modified: now },
      })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
        [task3.id, task3],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{ArrowDown}{ArrowDown}{Home}')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('jumps to last item with End', async () => {
      const user = userEvent.setup()

      const now = new Date()
      const task1 = createTaskNode({
        id: 'task-1',
        title: 'First Task',
        dates: { created: now, modified: new Date(now.getTime() + 2000) },
      })
      const task2 = createTaskNode({
        id: 'task-2',
        title: 'Second Task',
        dates: { created: now, modified: new Date(now.getTime() + 1000) },
      })
      const task3 = createTaskNode({
        id: 'task-3',
        title: 'Third Task',
        dates: { created: now, modified: now },
      })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
        [task3.id, task3],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.click(input)
      await user.keyboard('{End}')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[options.length - 1]).toHaveAttribute(
          'aria-selected',
          'true'
        )
      })
    })
  })

  describe('mouse interaction', () => {
    it('selects item on hover', async () => {
      const user = userEvent.setup()

      const now = new Date()
      const task1 = createTaskNode({
        id: 'task-1',
        title: 'First Task',
        dates: { created: now, modified: new Date(now.getTime() + 1000) },
      })
      const task2 = createTaskNode({
        id: 'task-2',
        title: 'Second Task',
        dates: { created: now, modified: now },
      })

      const nodes = new Map<string, ForgeNode>([
        [task1.id, task1],
        [task2.id, task2],
      ])
      useNodesStore.setState({ nodes })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      // Get all options and hover over the second one
      const options = screen.getAllByRole('option')
      await user.hover(options[1])

      await waitFor(() => {
        expect(options[1]).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('executes item on click', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={onOpenChange} />)

      const item = screen.getByRole('option', { name: /Test Task/i })
      await user.click(item)

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(useNodesStore.getState().activeNodeId).toBe('task-1')
    })
  })

  describe('recent commands', () => {
    it('shows recent hint when query is empty and recent commands exist', async () => {
      const task = createTaskNode({ id: 'task-recent', title: 'Recent Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      // Store recent command
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(['task-recent']))

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText('Recent')).toBeInTheDocument()
    })

    it('stores selected item in recent commands', async () => {
      const user = userEvent.setup()

      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const item = screen.getByRole('option', { name: /Test Task/i })
      await user.click(item)

      const stored = JSON.parse(
        localStorage.getItem(RECENT_COMMANDS_KEY) || '[]'
      )
      expect(stored).toContain('task-1')
    })

    it('shows recently modified hint when no recent commands', () => {
      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText('Recently modified')).toBeInTheDocument()
    })
  })

  describe('clear button', () => {
    it('shows clear button when query is not empty', async () => {
      const user = userEvent.setup()

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'test')

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
    })

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup()

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'test')

      const clearButton = screen.getByLabelText('Clear search')
      await user.click(clearButton)

      expect(input).toHaveValue('')
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes on listbox', () => {
      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveAttribute('aria-label', 'Search results')
    })

    it('has correct ARIA attributes on input', () => {
      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-controls', 'command-palette-results')
    })

    it('announces result count', () => {
      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      expect(screen.getByText(/1 node/i)).toBeInTheDocument()
    })

    it('options have correct role', () => {
      const task = createTaskNode({ id: 'task-1', title: 'Test Task' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
  })

  describe('highlighting', () => {
    it('highlights matched characters in results', async () => {
      const user = userEvent.setup()

      const task = createTaskNode({ id: 'task-1', title: 'Build Feature' })

      useNodesStore.setState({
        nodes: new Map<string, ForgeNode>([[task.id, task]]),
      })

      renderWithProviders(<CommandPalette open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Search nodes')
      await user.type(input, 'Build')

      // Check that mark elements exist for highlighting
      const marks = document.querySelectorAll('mark')
      expect(marks.length).toBeGreaterThan(0)
    })
  })
})
