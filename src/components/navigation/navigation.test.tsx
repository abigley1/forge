/**
 * Navigation Components Tests
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'

import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'
import { useProjectStore } from '@/store/useProjectStore'
import { useNodesStore } from '@/store/useNodesStore'
import { useNodeNavigation } from '@/hooks/useNodeNavigation'

import { Breadcrumbs } from './Breadcrumbs'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/store/useProjectStore', () => ({
  useProjectStore: vi.fn(),
}))

vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

vi.mock('@/hooks/useNodeNavigation', () => ({
  useNodeNavigation: vi.fn(),
}))

const mockUseProjectStore = useProjectStore as unknown as ReturnType<
  typeof vi.fn
>
const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>
const mockUseNodeNavigation = useNodeNavigation as unknown as ReturnType<
  typeof vi.fn
>

// ============================================================================
// Test Setup
// ============================================================================

const wrapper = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
)

// Test nodes
const createTaskNode = (id: string, title: string): TaskNode => ({
  id,
  type: NodeType.Task,
  title,
  content: '',
  tags: [],
  dates: createNodeDates(),
  status: 'pending',
  priority: 'medium',
  dependsOn: [],
  blocks: [],
  checklist: [],
})

const createDecisionNode = (id: string, title: string): DecisionNode => ({
  id,
  type: NodeType.Decision,
  title,
  content: '',
  tags: [],
  dates: createNodeDates(),
  status: 'pending',
  selected: null,
  options: [],
  criteria: [],
  rationale: null,
  selectedDate: null,
})

const createComponentNode = (id: string, title: string): ComponentNode => ({
  id,
  type: NodeType.Component,
  title,
  content: '',
  tags: [],
  dates: createNodeDates(),
  status: 'considering',
  cost: null,
  supplier: null,
  partNumber: null,
  customFields: {},
})

const createNoteNode = (id: string, title: string): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content: '',
  tags: [],
  dates: createNodeDates(),
})

const mockNavigateToNode = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockUseProjectStore.mockImplementation(
    (selector: (state: { project: { name: string } | null }) => unknown) => {
      return selector({ project: { name: 'My Project' } })
    }
  )

  mockUseNodesStore.mockImplementation(
    (
      selector: (state: {
        activeNodeId: string | null
        getNodeById: (id: string) => unknown
      }) => unknown
    ) => {
      return selector({
        activeNodeId: null,
        getNodeById: () => null,
      })
    }
  )

  mockUseNodeNavigation.mockReturnValue({
    navigateToNode: mockNavigateToNode,
  })
})

// ============================================================================
// Tests
// ============================================================================

describe('Breadcrumbs', () => {
  describe('rendering', () => {
    it('renders nothing when no project', () => {
      mockUseProjectStore.mockImplementation(
        (selector: (state: { project: null }) => unknown) => {
          return selector({ project: null })
        }
      )

      const { container } = render(<Breadcrumbs />, { wrapper })

      expect(container.querySelector('nav')).toBeNull()
    })

    it('renders project name when project exists', () => {
      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText('My Project')).toBeInTheDocument()
    })

    it('has correct aria-label on nav', () => {
      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByRole('navigation')).toHaveAttribute(
        'aria-label',
        'Breadcrumb'
      )
    })

    it('renders as ordered list', () => {
      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('project segment', () => {
    it('shows project name as clickable button', () => {
      render(<Breadcrumbs />, { wrapper })

      const button = screen.getByRole('button', { name: /My Project/i })
      expect(button).toBeInTheDocument()
    })

    it('shows home icon in project button', () => {
      render(<Breadcrumbs />, { wrapper })

      // Home icon should be in the project button (aria-hidden)
      const button = screen.getByRole('button', { name: /My Project/i })
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('navigates to null when project clicked', () => {
      render(<Breadcrumbs />, { wrapper })

      const button = screen.getByRole('button', { name: /My Project/i })
      fireEvent.click(button)

      expect(mockNavigateToNode).toHaveBeenCalledWith(null)
    })

    it('calls onProjectClick when provided', () => {
      const onProjectClick = vi.fn()

      render(<Breadcrumbs onProjectClick={onProjectClick} />, { wrapper })

      const button = screen.getByRole('button', { name: /My Project/i })
      fireEvent.click(button)

      expect(onProjectClick).toHaveBeenCalled()
      expect(mockNavigateToNode).not.toHaveBeenCalled()
    })
  })

  describe('with active node', () => {
    beforeEach(() => {
      const taskNode = createTaskNode('task-1', 'My Task')

      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: (id: string) => (id === 'task-1' ? taskNode : null),
          })
        }
      )
    })

    it('shows all three segments: project, type, node', () => {
      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText(/My Project/i)).toBeInTheDocument()
      expect(screen.getByText('Tasks')).toBeInTheDocument()
      expect(screen.getByText('My Task')).toBeInTheDocument()
    })

    it('renders chevron separators between segments', () => {
      render(<Breadcrumbs />, { wrapper })

      // Chevrons have class text-gray-500, Home icon does not
      const container = screen.getByRole('navigation')
      const chevrons = container.querySelectorAll('svg.text-gray-500')

      // There should be two separators (project > type > node)
      expect(chevrons.length).toBe(2)
    })

    it('marks current node segment with aria-current', () => {
      render(<Breadcrumbs />, { wrapper })

      const currentSegment = screen.getByText('My Task')
      expect(currentSegment).toHaveAttribute('aria-current', 'page')
    })

    it('current node segment is not a button', () => {
      render(<Breadcrumbs />, { wrapper })

      const nodeText = screen.getByText('My Task')
      expect(nodeText.tagName).toBe('SPAN')
    })
  })

  describe('type segment', () => {
    it('pluralizes task type correctly', () => {
      const taskNode = createTaskNode('task-1', 'My Task')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: () => taskNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    it('pluralizes decision type correctly', () => {
      const decisionNode = createDecisionNode('decision-1', 'My Decision')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'decision-1',
            getNodeById: () => decisionNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText('Decisions')).toBeInTheDocument()
    })

    it('pluralizes component type correctly', () => {
      const componentNode = createComponentNode('comp-1', 'My Component')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'comp-1',
            getNodeById: () => componentNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText('Components')).toBeInTheDocument()
    })

    it('pluralizes note type correctly', () => {
      const noteNode = createNoteNode('note-1', 'My Note')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'note-1',
            getNodeById: () => noteNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('type segment is not clickable without onTypeClick', () => {
      const taskNode = createTaskNode('task-1', 'My Task')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: () => taskNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      const typeSegment = screen.getByText('Tasks')
      expect(typeSegment.tagName).toBe('SPAN')
    })

    it('type segment is clickable when onTypeClick provided', () => {
      const taskNode = createTaskNode('task-1', 'My Task')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: () => taskNode,
          })
        }
      )

      const onTypeClick = vi.fn()

      render(<Breadcrumbs onTypeClick={onTypeClick} />, { wrapper })

      const typeButton = screen.getByRole('button', { name: 'Tasks' })
      fireEvent.click(typeButton)

      expect(onTypeClick).toHaveBeenCalledWith(NodeType.Task)
    })
  })

  describe('styling', () => {
    it('accepts className prop', () => {
      render(<Breadcrumbs className="custom-class" />, { wrapper })

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('custom-class')
    })

    it('truncates long project names', () => {
      mockUseProjectStore.mockImplementation(
        (selector: (state: { project: { name: string } }) => unknown) => {
          return selector({
            project: {
              name: 'Very Long Project Name That Should Be Truncated',
            },
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      const button = screen.getByRole('button', {
        name: /Very Long Project Name/i,
      })
      expect(button).toHaveClass('truncate')
    })

    it('truncates long node titles', () => {
      const taskNode = createTaskNode(
        'task-1',
        'This Is A Very Long Task Title That Should Definitely Be Truncated'
      )
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: () => taskNode,
          })
        }
      )

      render(<Breadcrumbs />, { wrapper })

      const nodeSegment = screen.getByText(/This Is A Very Long/i)
      expect(nodeSegment).toHaveClass('truncate')
    })
  })

  describe('keyboard accessibility', () => {
    it('project button is focusable', () => {
      render(<Breadcrumbs />, { wrapper })

      const button = screen.getByRole('button', { name: /My Project/i })
      button.focus()

      expect(document.activeElement).toBe(button)
    })

    it('type button is focusable when clickable', () => {
      const taskNode = createTaskNode('task-1', 'My Task')
      mockUseNodesStore.mockImplementation(
        (
          selector: (state: {
            activeNodeId: string | null
            getNodeById: (id: string) => unknown
          }) => unknown
        ) => {
          return selector({
            activeNodeId: 'task-1',
            getNodeById: () => taskNode,
          })
        }
      )

      const onTypeClick = vi.fn()

      render(<Breadcrumbs onTypeClick={onTypeClick} />, { wrapper })

      const typeButton = screen.getByRole('button', { name: 'Tasks' })
      typeButton.focus()

      expect(document.activeElement).toBe(typeButton)
    })
  })
})
