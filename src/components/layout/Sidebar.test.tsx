/**
 * Sidebar Component Tests
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'

import { useNodesStore } from '@/store/useNodesStore'
import { useUndoStore } from '@/store/useUndoStore'
import { NodeType, createNodeDates } from '@/types/nodes'
import type { TaskNode, NoteNode } from '@/types/nodes'
import { Sidebar } from './Sidebar'

// Wrapper with NuqsTestingAdapter for URL state
const renderWithNuqs = (ui: React.ReactElement) => {
  return render(<NuqsTestingAdapter>{ui}</NuqsTestingAdapter>)
}

// Reset stores before each test
beforeEach(() => {
  useNodesStore.setState({
    nodes: new Map(),
    activeNodeId: null,
    dirtyNodeIds: new Set(),
  })
  useUndoStore.setState({
    undoStack: [],
    redoStack: [],
    isUndoRedoInProgress: false,
  })
})

describe('Sidebar', () => {
  describe('rendering', () => {
    it('renders with main navigation landmark', () => {
      renderWithNuqs(<Sidebar />)

      expect(
        screen.getByRole('navigation', { name: /main navigation/i })
      ).toBeInTheDocument()
    })

    it('renders project switcher section', () => {
      renderWithNuqs(<Sidebar />)

      expect(screen.getByText('No Project')).toBeInTheDocument()
      expect(screen.getByText('No project loaded')).toBeInTheDocument()
    })

    it('renders quick create section with all node type buttons', () => {
      renderWithNuqs(<Sidebar />)

      // Section header
      expect(screen.getByText('Quick Create')).toBeInTheDocument()

      // All four quick create buttons
      expect(
        screen.getByRole('button', { name: /create new decision/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new component/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new task/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new note/i })
      ).toBeInTheDocument()
    })

    it('renders filters section', () => {
      renderWithNuqs(<Sidebar />)

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('renders tags section', () => {
      renderWithNuqs(<Sidebar />)

      expect(screen.getByText('Tags')).toBeInTheDocument()
    })

    it('renders version footer', () => {
      renderWithNuqs(<Sidebar />)

      expect(screen.getByText(/v0\.0\.1/)).toBeInTheDocument()
    })
  })

  describe('collapsible sections', () => {
    it('quick create section is expanded by default', () => {
      renderWithNuqs(<Sidebar />)

      const quickCreateButton = screen.getByRole('button', {
        name: /quick create/i,
      })
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'true')

      // Create buttons should be visible
      expect(
        screen.getByRole('button', { name: /create new decision/i })
      ).toBeVisible()
    })

    it('filters section is collapsed by default', () => {
      renderWithNuqs(<Sidebar />)

      const filtersButton = screen.getByRole('button', { name: /filters/i })
      expect(filtersButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('can toggle section expansion', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const quickCreateButton = screen.getByRole('button', {
        name: /quick create/i,
      })
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'true')

      await user.click(quickCreateButton)
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(quickCreateButton)
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('quick create buttons', () => {
    it('creates a new Decision node when clicking Decision button', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const decisionButton = screen.getByRole('button', {
        name: /create new decision/i,
      })
      await user.click(decisionButton)

      // Check that a node was added to the store
      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)

      const node = Array.from(nodes.values())[0]
      expect(node.type).toBe(NodeType.Decision)
      expect(node.title).toBe('New Decision')
    })

    it('creates a new Component node when clicking Component button', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const componentButton = screen.getByRole('button', {
        name: /create new component/i,
      })
      await user.click(componentButton)

      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)

      const node = Array.from(nodes.values())[0]
      expect(node.type).toBe(NodeType.Component)
      expect(node.title).toBe('New Component')
    })

    it('creates a new Task node when clicking Task button', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const taskButton = screen.getByRole('button', {
        name: /create new task/i,
      })
      await user.click(taskButton)

      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)

      const node = Array.from(nodes.values())[0]
      expect(node.type).toBe(NodeType.Task)
      expect(node.title).toBe('New Task')
    })

    it('creates a new Note node when clicking Note button', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const noteButton = screen.getByRole('button', {
        name: /create new note/i,
      })
      await user.click(noteButton)

      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)

      const node = Array.from(nodes.values())[0]
      expect(node.type).toBe(NodeType.Note)
      expect(node.title).toBe('New Note')
    })

    it('sets the newly created node as active', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const decisionButton = screen.getByRole('button', {
        name: /create new decision/i,
      })
      await user.click(decisionButton)

      const nodes = useNodesStore.getState().nodes
      const node = Array.from(nodes.values())[0]
      const activeNodeId = useNodesStore.getState().activeNodeId

      expect(activeNodeId).toBe(node.id)
    })

    it('records action for undo', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const decisionButton = screen.getByRole('button', {
        name: /create new decision/i,
      })
      await user.click(decisionButton)

      const undoStack = useUndoStore.getState().undoStack
      expect(undoStack.length).toBe(1)
      expect(undoStack[0].type).toBe('addNode')
    })

    it('generates unique IDs for multiple nodes of the same type', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      const decisionButton = screen.getByRole('button', {
        name: /create new decision/i,
      })

      // Create three decision nodes
      await user.click(decisionButton)
      await user.click(decisionButton)
      await user.click(decisionButton)

      const nodes = useNodesStore.getState().nodes
      const ids = Array.from(nodes.keys())

      expect(ids).toHaveLength(3)
      expect(new Set(ids).size).toBe(3) // All IDs should be unique
    })
  })

  describe('tag cloud', () => {
    it('shows empty state when no tags exist', () => {
      renderWithNuqs(<Sidebar />)

      expect(screen.getByText(/no tags yet/i)).toBeInTheDocument()
    })

    it('displays tags from nodes with counts', () => {
      const dates = createNodeDates()

      // Add nodes with tags
      useNodesStore.setState({
        nodes: new Map([
          [
            'task-1',
            {
              id: 'task-1',
              type: NodeType.Task,
              title: 'Task 1',
              tags: ['frontend', 'urgent'],
              dates,
              content: '',
              status: 'pending',
              priority: 'high',
              dependsOn: [],
              blocks: [],
              checklist: [],
            } satisfies TaskNode,
          ],
          [
            'task-2',
            {
              id: 'task-2',
              type: NodeType.Task,
              title: 'Task 2',
              tags: ['frontend', 'backend'],
              dates,
              content: '',
              status: 'pending',
              priority: 'medium',
              dependsOn: [],
              blocks: [],
              checklist: [],
            } satisfies TaskNode,
          ],
        ]),
        activeNodeId: null,
        dirtyNodeIds: new Set(),
      })

      renderWithNuqs(<Sidebar />)

      // frontend appears twice (now with "tag filter" aria-labels)
      expect(
        screen.getByRole('button', { name: /tag filter.*frontend/i })
      ).toBeInTheDocument()
      const frontendButton = screen.getByRole('button', {
        name: /tag filter.*frontend/i,
      })
      expect(within(frontendButton).getByText('2')).toBeInTheDocument()

      // urgent appears once
      expect(
        screen.getByRole('button', { name: /tag filter.*urgent/i })
      ).toBeInTheDocument()
      const urgentButton = screen.getByRole('button', {
        name: /tag filter.*urgent/i,
      })
      expect(within(urgentButton).getByText('1')).toBeInTheDocument()
    })

    it('limits tag cloud to 10 tags', () => {
      const dates = createNodeDates()

      // Create 15 unique tags
      const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i + 1}`)

      useNodesStore.setState({
        nodes: new Map([
          [
            'note-1',
            {
              id: 'note-1',
              type: NodeType.Note,
              title: 'Note',
              tags: manyTags,
              dates,
              content: '',
            } satisfies NoteNode,
          ],
        ]),
        activeNodeId: null,
        dirtyNodeIds: new Set(),
      })

      renderWithNuqs(<Sidebar />)

      // Should only show 10 tags (now with "tag filter" aria-labels)
      const tagButtons = screen.getAllByRole('button', {
        name: /tag filter.*tag/i,
      })
      expect(tagButtons.length).toBe(10)
    })
  })

  describe('accessibility', () => {
    it('quick create buttons have proper aria-labels', () => {
      renderWithNuqs(<Sidebar />)

      expect(
        screen.getByRole('button', { name: /create new decision/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new component/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new task/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create new note/i })
      ).toBeInTheDocument()
    })

    it('section buttons have aria-expanded attributes', () => {
      renderWithNuqs(<Sidebar />)

      const quickCreate = screen.getByRole('button', { name: /quick create/i })
      const filters = screen.getByRole('button', { name: /filters/i })
      const tags = screen.getByRole('button', { name: /tags/i })

      expect(quickCreate).toHaveAttribute('aria-expanded')
      expect(filters).toHaveAttribute('aria-expanded')
      expect(tags).toHaveAttribute('aria-expanded')
    })

    it('icons are hidden from screen readers', () => {
      renderWithNuqs(<Sidebar />)

      // All SVG icons should have aria-hidden
      const svgs = document.querySelectorAll('svg')
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('tag buttons have descriptive aria-labels', () => {
      const dates = createNodeDates()

      useNodesStore.setState({
        nodes: new Map([
          [
            'task-1',
            {
              id: 'task-1',
              type: NodeType.Task,
              title: 'Task 1',
              tags: ['test-tag'],
              dates,
              content: '',
              status: 'pending',
              priority: 'medium',
              dependsOn: [],
              blocks: [],
              checklist: [],
            } satisfies TaskNode,
          ],
        ]),
        activeNodeId: null,
        dirtyNodeIds: new Set(),
      })

      renderWithNuqs(<Sidebar />)

      // TagCloud now has "Add tag filter" or "Remove tag filter" aria-labels
      expect(
        screen.getByRole('button', { name: /tag filter.*test-tag/i })
      ).toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('quick create buttons are keyboard accessible', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      // Focus the Decision button directly and press Enter
      const decisionButton = screen.getByRole('button', {
        name: /create new decision/i,
      })
      decisionButton.focus()
      expect(decisionButton).toHaveFocus()

      // Press Enter to create
      await user.keyboard('{Enter}')

      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)
    })

    it('section headers can be toggled with keyboard', async () => {
      const user = userEvent.setup()
      renderWithNuqs(<Sidebar />)

      // Quick Create section is expanded by default
      const quickCreateButton = screen.getByRole('button', {
        name: /quick create/i,
      })
      quickCreateButton.focus()
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'true')

      // Press Enter to collapse
      await user.keyboard('{Enter}')
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'false')

      // Press Space to expand
      await user.keyboard(' ')
      expect(quickCreateButton).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
