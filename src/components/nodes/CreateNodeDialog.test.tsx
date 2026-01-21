/**
 * CreateNodeDialog Tests
 *
 * Tests for the node creation dialog including:
 * - Type selection
 * - Title input
 * - Template selection
 * - Keyboard shortcut (Ctrl+Shift+N)
 * - Node creation flow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { NodeType } from '@/types/nodes'
import { useNodesStore } from '@/store/useNodesStore'
import { useUndoStore } from '@/store/useUndoStore'
import { useCreateNodeDialog } from '@/hooks'
import { CreateNodeDialog } from './CreateNodeDialog'
import { NODE_TYPE_ICON_CONFIG } from './config'
import { renderHook, act } from '@testing-library/react'

// ============================================================================
// Setup
// ============================================================================

// Reset stores before each test
beforeEach(() => {
  useNodesStore.getState().clearNodes()
  useUndoStore.getState().clearHistory()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('CreateNodeDialog', () => {
  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create New Node')).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<CreateNodeDialog open={false} onOpenChange={() => {}} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders type selector with all node types', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      Object.values(NODE_TYPE_ICON_CONFIG).forEach((config) => {
        expect(screen.getByText(config.label)).toBeInTheDocument()
      })
    })

    it('renders title input', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('renders template selector', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Template')).toBeInTheDocument()
    })

    it('renders Cancel and Create buttons', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    })

    it('renders keyboard shortcut hint', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByText(/Keyboard shortcut/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Type Selection Tests
  // ============================================================================

  describe('type selection', () => {
    it('selects Note type by default', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const noteButton = screen.getByRole('radio', { name: /Note/i })
      expect(noteButton).toHaveAttribute('aria-checked', 'true')
    })

    it('allows selecting different node types', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const decisionButton = screen.getByRole('radio', { name: /Decision/i })
      await user.click(decisionButton)

      expect(decisionButton).toHaveAttribute('aria-checked', 'true')
    })

    it('respects defaultType prop', () => {
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
        />
      )

      const taskButton = screen.getByRole('radio', { name: /Task/i })
      expect(taskButton).toHaveAttribute('aria-checked', 'true')
    })

    it('updates template options when type changes', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      // Note type should have certain templates
      expect(screen.getByText('Blank Note')).toBeInTheDocument()

      // Switch to Decision
      const decisionButton = screen.getByRole('radio', { name: /Decision/i })
      await user.click(decisionButton)

      // Should now have Decision templates
      expect(screen.getByText('Blank Decision')).toBeInTheDocument()
    })

    it('type selector has proper aria attributes', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(
        screen.getByRole('radiogroup', { name: 'Node type' })
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Title Input Tests
  // ============================================================================

  describe('title input', () => {
    it('accepts text input', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'My New Node')

      expect(input).toHaveValue('My New Node')
    })

    it('shows placeholder based on selected type', () => {
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Decision}
        />
      )

      const input = screen.getByLabelText('Title')
      expect(input).toHaveAttribute('placeholder', 'My Decision')
    })

    it('is required for form submission', async () => {
      const user = userEvent.setup()
      const handleOpenChange = vi.fn()
      render(<CreateNodeDialog open onOpenChange={handleOpenChange} />)

      const createButton = screen.getByRole('button', { name: 'Create' })
      expect(createButton).toBeDisabled()

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Test')

      expect(createButton).not.toBeDisabled()
    })

    it('trims whitespace from title', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, '  My Node  ')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Node' })
      )
    })

    it('focuses title input when dialog opens', async () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveFocus()
      })
    })
  })

  // ============================================================================
  // Template Selection Tests
  // ============================================================================

  describe('template selection', () => {
    it('defaults to Blank template', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const select = screen.getByLabelText('Template')
      expect(select).toHaveValue('blank')
    })

    it('shows different templates for each type', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      // Check Decision templates
      const decisionButton = screen.getByRole('radio', { name: /Decision/i })
      await user.click(decisionButton)

      const select = screen.getByLabelText('Template')
      expect(select).toContainHTML('Component Selection')
      expect(select).toContainHTML('Design Choice')
    })

    it('shows template description when non-blank selected', async () => {
      const user = userEvent.setup()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
        />
      )

      const select = screen.getByLabelText('Template')
      await user.selectOptions(select, 'with-checklist')

      expect(screen.getByText('Task with subtasks')).toBeInTheDocument()
    })

    it('resets to blank when type changes', async () => {
      const user = userEvent.setup()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
        />
      )

      const select = screen.getByLabelText('Template')
      await user.selectOptions(select, 'with-checklist')
      expect(select).toHaveValue('with-checklist')

      // Change type
      const noteButton = screen.getByRole('radio', { name: /Note/i })
      await user.click(noteButton)

      expect(select).toHaveValue('blank')
    })
  })

  // ============================================================================
  // Node Creation Tests
  // ============================================================================

  describe('node creation', () => {
    it('creates node with correct type', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, 'My Task')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task' })
      )
    })

    it('creates node with correct title', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Test Title')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Title' })
      )
    })

    it('creates node with template content', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
          onNodeCreated={handleNodeCreated}
        />
      )

      const select = screen.getByLabelText('Template')
      await user.selectOptions(select, 'with-checklist')

      const input = screen.getByLabelText('Title')
      await user.type(input, 'My Task')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Checklist'),
        })
      )
    })

    it('adds node to store', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Store Test Node')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      const nodes = useNodesStore.getState().nodes
      expect(nodes.size).toBe(1)
    })

    it('generates unique node ID from title', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, 'My Test Node!')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-test-node' })
      )
    })

    it('generates unique ID when collision exists', async () => {
      // Add an existing node
      useNodesStore.getState().addNode({
        id: 'test-node',
        type: NodeType.Note,
        title: 'Test Node',
        content: '',
        tags: [],
        dates: { created: new Date(), modified: new Date() },
      })

      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Test Node')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-node-2' })
      )
    })

    it('sets created node as active', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Active Test')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      const activeNodeId = useNodesStore.getState().activeNodeId
      expect(activeNodeId).toBe('active-test')
    })

    it('records action for undo', async () => {
      const user = userEvent.setup()
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Undo Test')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      const undoStack = useUndoStore.getState().undoStack
      expect(undoStack.length).toBe(1)
      expect(undoStack[0].type).toBe('addNode')
    })

    it('closes dialog after creation', async () => {
      const user = userEvent.setup()
      const handleOpenChange = vi.fn()
      render(<CreateNodeDialog open onOpenChange={handleOpenChange} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Close Test')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    it('creates type-specific node properties', async () => {
      const user = userEvent.setup()
      const handleNodeCreated = vi.fn()
      render(
        <CreateNodeDialog
          open
          onOpenChange={() => {}}
          defaultType={NodeType.Task}
          onNodeCreated={handleNodeCreated}
        />
      )

      const input = screen.getByLabelText('Title')
      await user.type(input, 'Task Props Test')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      expect(handleNodeCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task',
          status: 'pending',
          priority: 'medium',
          dependsOn: [],
          blocks: [],
          checklist: [],
        })
      )
    })
  })

  // ============================================================================
  // Dialog Controls Tests
  // ============================================================================

  describe('dialog controls', () => {
    it('closes when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const handleOpenChange = vi.fn()
      render(<CreateNodeDialog open onOpenChange={handleOpenChange} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    it('closes when Escape is pressed', async () => {
      const user = userEvent.setup()
      const handleOpenChange = vi.fn()
      render(<CreateNodeDialog open onOpenChange={handleOpenChange} />)

      await user.keyboard('{Escape}')

      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets form when reopened', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <CreateNodeDialog open onOpenChange={() => {}} />
      )

      // Type something
      const input = screen.getByLabelText('Title')
      await user.type(input, 'Test')

      // Close and reopen
      rerender(<CreateNodeDialog open={false} onOpenChange={() => {}} />)
      rerender(<CreateNodeDialog open onOpenChange={() => {}} />)

      // Form should be reset
      expect(screen.getByLabelText('Title')).toHaveValue('')
    })
  })

  // ============================================================================
  // Keyboard Shortcut Tests
  // ============================================================================

  describe('keyboard shortcut', () => {
    it('opens dialog with Ctrl+Shift+N', async () => {
      const handleOpenChange = vi.fn()
      render(
        <CreateNodeDialog
          open={false}
          onOpenChange={handleOpenChange}
          enableHotkey
        />
      )

      // Simulate Ctrl+Shift+N
      fireEvent.keyDown(document, {
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })

    it('does not open when hotkey is disabled', () => {
      const handleOpenChange = vi.fn()
      render(
        <CreateNodeDialog
          open={false}
          onOpenChange={handleOpenChange}
          enableHotkey={false}
        />
      )

      fireEvent.keyDown(document, {
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
      })

      expect(handleOpenChange).not.toHaveBeenCalled()
    })

    it('does not trigger when dialog is already open', () => {
      const handleOpenChange = vi.fn()
      render(
        <CreateNodeDialog
          open={true}
          onOpenChange={handleOpenChange}
          enableHotkey
        />
      )

      fireEvent.keyDown(document, {
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
      })

      // Should not be called again when already open
      expect(handleOpenChange).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has proper dialog role and aria attributes', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('has accessible name from title', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(
        screen.getByRole('dialog', { name: /Create New Node/i })
      ).toBeInTheDocument()
    })

    it('form inputs have proper labels', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Template')).toBeInTheDocument()
    })

    it('type icons have aria-hidden', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const icons = document.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('type selector buttons have aria-checked', () => {
      render(<CreateNodeDialog open onOpenChange={() => {}} />)

      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-checked')
      })
    })
  })
})

// ============================================================================
// useCreateNodeDialog Hook Tests
// ============================================================================

describe('useCreateNodeDialog', () => {
  it('returns open state and handlers', () => {
    const { result } = renderHook(() => useCreateNodeDialog())

    expect(result.current.open).toBe(false)
    expect(result.current.defaultType).toBe(NodeType.Note)
    expect(typeof result.current.openDialog).toBe('function')
    expect(typeof result.current.closeDialog).toBe('function')
    expect(typeof result.current.setOpen).toBe('function')
  })

  it('openDialog opens the dialog', () => {
    const { result } = renderHook(() => useCreateNodeDialog())

    act(() => {
      result.current.openDialog()
    })

    expect(result.current.open).toBe(true)
  })

  it('openDialog can set default type', () => {
    const { result } = renderHook(() => useCreateNodeDialog())

    act(() => {
      result.current.openDialog(NodeType.Decision)
    })

    expect(result.current.open).toBe(true)
    expect(result.current.defaultType).toBe(NodeType.Decision)
  })

  it('closeDialog closes the dialog', () => {
    const { result } = renderHook(() => useCreateNodeDialog())

    act(() => {
      result.current.openDialog()
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.open).toBe(false)
  })
})
