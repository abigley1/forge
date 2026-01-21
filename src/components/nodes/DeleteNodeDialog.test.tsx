/**
 * DeleteNodeDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DeleteNodeDialog } from './DeleteNodeDialog'
import { useDeleteNodeDialog } from '@/hooks/useDeleteNodeDialog'
import { ToastProvider } from '@/components/ui/Toast'
import { useNodesStore } from '@/store/useNodesStore'
import { NodeType } from '@/types/nodes'
import type { ForgeNode, TaskNode, DecisionNode } from '@/types/nodes'

// ============================================================================
// Test Setup
// ============================================================================

// Mock the stores
vi.mock('@/store/useNodesStore', () => ({
  useNodesStore: vi.fn(),
}))

vi.mock('@/hooks/useUndoRedo', () => ({
  useUndoableDeleteNode: () => vi.fn(),
}))

const mockUseNodesStore = useNodesStore as unknown as ReturnType<typeof vi.fn>

// Helper to create test nodes
function createTestNode(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 'test-node-1',
    type: NodeType.Task,
    title: 'Test Task',
    content: 'Test content',
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    ...overrides,
  }
}

function createDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'decision-1',
    type: NodeType.Decision,
    title: 'Test Decision',
    content: 'Decision content [[test-node-1]]',
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    ...overrides,
  }
}

// Wrapper component with ToastProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('DeleteNodeDialog', () => {
  const mockNodes = new Map<string, ForgeNode>()
  const mockAddNode = vi.fn()
  const mockSetActiveNode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNodes.clear()

    const testNode = createTestNode()
    mockNodes.set(testNode.id, testNode)

    mockUseNodesStore.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          nodes: mockNodes,
          addNode: mockAddNode,
          setActiveNode: mockSetActiveNode,
        }
        return selector(state)
      }
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when node is null', () => {
      const { container } = render(
        <TestWrapper>
          <DeleteNodeDialog node={null} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      expect(container).toBeEmptyDOMElement()
    })

    it('renders nothing when dialog is closed', () => {
      const node = createTestNode()
      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={false} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      // Dialog should not render its content when closed
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open with node', async () => {
      const node = createTestNode()
      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
    })

    it('displays node title', async () => {
      const node = createTestNode({ title: 'My Important Task' })
      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('My Important Task')).toBeInTheDocument()
      })
    })

    it('displays delete confirmation title with node type', async () => {
      const node = createTestNode()
      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Delete Task?')).toBeInTheDocument()
      })
    })

    it('displays cancel and delete buttons', async () => {
      const node = createTestNode()
      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /cancel/i })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: /delete/i })
        ).toBeInTheDocument()
      })
    })
  })

  describe('broken links warning', () => {
    it('shows warning when other nodes link to this node', async () => {
      const targetNode = createTestNode({ id: 'test-node-1' })
      const linkingNode = createDecisionNode({
        id: 'decision-1',
        content: 'This links to [[test-node-1]]',
      })

      mockNodes.set(targetNode.id, targetNode)
      mockNodes.set(linkingNode.id, linkingNode)

      render(
        <TestWrapper>
          <DeleteNodeDialog
            node={targetNode}
            open={true}
            onOpenChange={vi.fn()}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/will break 1 link/i)).toBeInTheDocument()
        expect(screen.getByText('Test Decision')).toBeInTheDocument()
      })
    })

    it('shows correct count for multiple linking nodes', async () => {
      const targetNode = createTestNode({ id: 'test-node-1' })
      const linkingNode1 = createDecisionNode({
        id: 'decision-1',
        title: 'Decision 1',
        content: 'Links to [[test-node-1]]',
      })
      const linkingNode2 = createDecisionNode({
        id: 'decision-2',
        title: 'Decision 2',
        content: 'Also links to [[test-node-1]]',
      })

      mockNodes.set(targetNode.id, targetNode)
      mockNodes.set(linkingNode1.id, linkingNode1)
      mockNodes.set(linkingNode2.id, linkingNode2)

      render(
        <TestWrapper>
          <DeleteNodeDialog
            node={targetNode}
            open={true}
            onOpenChange={vi.fn()}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/will break 2 links/i)).toBeInTheDocument()
      })
    })

    it('does not show warning when no nodes link to this node', async () => {
      const node = createTestNode()
      mockNodes.clear()
      mockNodes.set(node.id, node)

      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })

    it('truncates list when more than 3 linking nodes', async () => {
      const targetNode = createTestNode({ id: 'test-node-1' })

      // Create 5 nodes that link to the target
      for (let i = 1; i <= 5; i++) {
        mockNodes.set(
          `linker-${i}`,
          createDecisionNode({
            id: `linker-${i}`,
            title: `Linker ${i}`,
            content: '[[test-node-1]]',
          })
        )
      }
      mockNodes.set(targetNode.id, targetNode)

      render(
        <TestWrapper>
          <DeleteNodeDialog
            node={targetNode}
            open={true}
            onOpenChange={vi.fn()}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/and 2 more/i)).toBeInTheDocument()
      })
    })
  })

  describe('interactions', () => {
    it('calls onOpenChange when cancel clicked', async () => {
      const node = createTestNode()
      const onOpenChange = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DeleteNodeDialog
            node={node}
            open={true}
            onOpenChange={onOpenChange}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Base UI calls onOpenChange with (false, event) where event has reason
      expect(onOpenChange).toHaveBeenCalled()
      expect(onOpenChange.mock.calls[0][0]).toBe(false)
    })

    it('closes dialog and shows undo toast on delete', async () => {
      const node = createTestNode()
      const onOpenChange = vi.fn()
      const onDeleted = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DeleteNodeDialog
            node={node}
            open={true}
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', {
        name: /delete test task/i,
      })
      await user.click(deleteButton)

      // Verify callbacks were called
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(onDeleted).toHaveBeenCalled()
      expect(mockSetActiveNode).toHaveBeenCalledWith(null)
    })

    it('has informative message about undo', async () => {
      const node = createTestNode()

      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/can be undone/i)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('has correct aria attributes', async () => {
      const node = createTestNode()

      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title')
      })
    })

    it('delete button has descriptive aria-label', async () => {
      const node = createTestNode({ title: 'My Task' })

      render(
        <TestWrapper>
          <DeleteNodeDialog node={node} open={true} onOpenChange={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /delete my task/i })
        ).toBeInTheDocument()
      })
    })
  })
})

describe('useDeleteNodeDialog', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useDeleteNodeDialog())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.nodeToDelete).toBeNull()
  })

  it('opens dialog for a node', () => {
    const { result } = renderHook(() => useDeleteNodeDialog())
    const node = createTestNode()

    act(() => {
      result.current.openForNode(node)
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.nodeToDelete).toEqual(node)
  })

  it('closes dialog', () => {
    const { result } = renderHook(() => useDeleteNodeDialog())
    const node = createTestNode()

    act(() => {
      result.current.openForNode(node)
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
  })
})
