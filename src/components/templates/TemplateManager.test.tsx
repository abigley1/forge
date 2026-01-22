import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TemplateManager } from './TemplateManager'
import { useTemplatesStore } from '@/store/useTemplatesStore'
import { ToastProvider } from '@/components/ui'
import { NodeType } from '@/types/nodes'

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('TemplateManager', () => {
  beforeEach(() => {
    // Reset store
    useTemplatesStore.setState({ customTemplates: new Map() })
    // Clear localStorage to prevent persistence
    localStorage.removeItem('forge-templates')
  })

  describe('rendering', () => {
    it('renders when open', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      expect(screen.getByText('Template Manager')).toBeInTheDocument()
    })

    it('does not render content when closed', () => {
      renderWithProviders(
        <TemplateManager open={false} onOpenChange={() => {}} />
      )

      expect(screen.queryByText('Template Manager')).not.toBeInTheDocument()
    })

    it('shows type filter dropdown', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      const filter = screen.getByLabelText('Filter by type')
      expect(filter).toBeInTheDocument()
    })

    it('shows New Template button', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      expect(
        screen.getByRole('button', { name: /new template/i })
      ).toBeInTheDocument()
    })
  })

  describe('template listing', () => {
    it('lists built-in templates', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Should show at least some built-in templates
      expect(screen.getByText('Blank Decision')).toBeInTheDocument()
      expect(screen.getByText('Component Selection')).toBeInTheDocument()
      expect(screen.getByText('Vendor Selection')).toBeInTheDocument()
    })

    it('shows Built-in badge for built-in templates', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      const badges = screen.getAllByText('Built-in')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('shows custom templates', () => {
      // Add a custom template
      useTemplatesStore.getState().addTemplate({
        name: 'My Custom Template',
        description: 'A custom template',
        type: NodeType.Task,
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      expect(screen.getByText('My Custom Template')).toBeInTheDocument()
    })

    it('filters templates by type', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      const filter = screen.getByLabelText('Filter by type')
      await user.selectOptions(filter, NodeType.Task)

      // Should show Task templates
      expect(screen.getByText('Blank Task')).toBeInTheDocument()
      expect(screen.getByText('Task with Checklist')).toBeInTheDocument()

      // Should not show Decision templates
      expect(screen.queryByText('Blank Decision')).not.toBeInTheDocument()
    })

    it('shows template count in footer', () => {
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Should show count in footer (e.g., "11 templates (0 custom)")
      expect(screen.getByText(/\d+ template/)).toBeInTheDocument()
      expect(screen.getByText(/custom\)/)).toBeInTheDocument()
    })
  })

  describe('creating templates', () => {
    it('opens create dialog when clicking New Template', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: /new template/i }))

      expect(screen.getByText('Create Template')).toBeInTheDocument()
    })

    it('creates a new custom template', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /new template/i }))

      // Fill form
      await user.type(screen.getByLabelText('Name'), 'New Test Template')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      await user.type(
        screen.getByLabelText(/initial content/i),
        '## Test Content'
      )

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create' }))

      // Should appear in list
      expect(screen.getByText('New Test Template')).toBeInTheDocument()
    })

    it('disables Create button when name is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: /new template/i }))

      const createButton = screen.getByRole('button', { name: 'Create' })
      expect(createButton).toBeDisabled()
    })
  })

  describe('duplicating templates', () => {
    it('duplicates a built-in template', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Find duplicate button for Blank Decision (the first one)
      const duplicateButtons = screen.getAllByLabelText(/duplicate/i)
      await user.click(duplicateButtons[0])

      // Should create a copy - look for the template name in the list (h3 elements)
      const templateNames = screen.getAllByRole('heading', { level: 3 })
      const copyTemplate = templateNames.find((h) =>
        h.textContent?.includes('(Copy)')
      )
      expect(copyTemplate).toBeInTheDocument()
    })

    it('duplicates a custom template', async () => {
      const user = userEvent.setup()

      // Add a custom template
      useTemplatesStore.getState().addTemplate({
        name: 'Original Custom',
        description: 'Original description',
        type: NodeType.Note,
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Filter to Note type to find our custom template easier
      await user.selectOptions(screen.getByLabelText('Filter by type'), 'note')

      // Find and duplicate - custom templates appear after built-in ones
      const duplicateButtons = screen.getAllByLabelText(/duplicate/i)
      // The last one should be our custom template
      await user.click(duplicateButtons[duplicateButtons.length - 1])

      expect(screen.getByText('Original Custom (Copy)')).toBeInTheDocument()
    })
  })

  describe('editing templates', () => {
    it('shows edit button only for custom templates', () => {
      // Add a custom template
      useTemplatesStore.getState().addTemplate({
        name: 'Editable Template',
        description: 'Can be edited',
        type: NodeType.Task,
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Custom templates have edit buttons, built-in don't
      // Look for the specific edit button for our custom template
      const editButton = screen.queryByLabelText('Edit Editable Template')
      expect(editButton).toBeInTheDocument()
    })

    it('opens edit dialog when clicking edit button', async () => {
      const user = userEvent.setup()

      useTemplatesStore.getState().addTemplate({
        name: 'To Edit',
        description: 'Edit me',
        type: NodeType.Note,
        content: '## Original',
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Click the edit button for our specific template
      const editButton = screen.getByLabelText('Edit To Edit')
      await user.click(editButton)

      // Dialog should open with edit mode title
      expect(screen.getByText('Edit Template')).toBeInTheDocument()
      // Save button should be present (not Create)
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('saves edited template', async () => {
      const user = userEvent.setup()

      useTemplatesStore.getState().addTemplate({
        name: 'Before Edit',
        description: 'Before',
        type: NodeType.Task,
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      await user.click(screen.getByLabelText('Edit Before Edit'))

      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'After Edit')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('After Edit')).toBeInTheDocument()
      expect(screen.queryByText('Before Edit')).not.toBeInTheDocument()
    })
  })

  describe('deleting templates', () => {
    it('shows delete button only for custom templates', () => {
      useTemplatesStore.getState().addTemplate({
        name: 'Deletable',
        description: 'Can be deleted',
        type: NodeType.Note,
      })

      renderWithProviders(<TemplateManager open onOpenChange={() => {}} />)

      // Delete buttons only exist for custom templates
      const deleteButtons = screen.queryAllByLabelText(/delete/i)
      // 1 custom template = 1 delete button
      expect(deleteButtons.length).toBe(1)
    })

    it('delete functionality works via store', () => {
      // Test the store deletion directly since nested dialogs are complex in tests
      const { addTemplate, deleteTemplate, getCustomTemplates } =
        useTemplatesStore.getState()

      const template = addTemplate({
        name: 'To Delete',
        description: 'Will be deleted',
        type: NodeType.Task,
      })

      expect(getCustomTemplates().length).toBe(1)

      const result = deleteTemplate(template.id)
      expect(result).toBe(true)
      expect(getCustomTemplates().length).toBe(0)
    })
  })

  describe('filterType prop', () => {
    it('hides type filter when filterType is provided', () => {
      renderWithProviders(
        <TemplateManager
          open
          onOpenChange={() => {}}
          filterType={NodeType.Decision}
        />
      )

      expect(screen.queryByLabelText('Filter by type')).not.toBeInTheDocument()
    })

    it('shows only templates of filtered type', () => {
      renderWithProviders(
        <TemplateManager
          open
          onOpenChange={() => {}}
          filterType={NodeType.Decision}
        />
      )

      // Should show Decision templates
      expect(screen.getByText('Blank Decision')).toBeInTheDocument()

      // Should not show other types
      expect(screen.queryByText('Blank Task')).not.toBeInTheDocument()
      expect(screen.queryByText('Blank Note')).not.toBeInTheDocument()
    })
  })

  describe('dialog controls', () => {
    it('calls onOpenChange when closing', async () => {
      const user = userEvent.setup()
      const handleOpenChange = vi.fn()

      renderWithProviders(
        <TemplateManager open onOpenChange={handleOpenChange} />
      )

      await user.click(screen.getByRole('button', { name: 'Close' }))

      // Dialog passes event data along with false
      expect(handleOpenChange).toHaveBeenCalled()
      expect(handleOpenChange.mock.calls[0][0]).toBe(false)
    })
  })
})
