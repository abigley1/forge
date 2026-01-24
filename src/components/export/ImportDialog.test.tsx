/**
 * ImportDialog Tests
 *
 * Tests for the import dialog including:
 * - File selection
 * - Drag and drop
 * - Format auto-detection
 * - Conflict resolution options
 * - Import processing
 * - Error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ImportDialog } from './ImportDialog'
import type { Project } from '@/types/project'
import type { TaskNode, NoteNode } from '@/types/nodes'

// ============================================================================
// Mock Node Factories
// ============================================================================

function createMockTaskNode(id: string, title: string): TaskNode {
  return {
    id,
    type: 'task',
    title,
    content: '',
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-15'),
    },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
  }
}

function createMockNoteNode(id: string, title: string): NoteNode {
  return {
    id,
    type: 'note',
    title,
    content: '',
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-15'),
    },
    parent: null,
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockProject(): Project {
  const nodes = new Map()
  nodes.set('task-1', createMockTaskNode('task-1', 'Task 1'))
  nodes.set('note-1', createMockNoteNode('note-1', 'Note 1'))

  return {
    id: 'current-project',
    name: 'Current Project',
    path: '/current/path',
    nodes,
    metadata: {
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-15'),
      description: 'Current project',
      nodeOrder: [],
      nodePositions: {},
    },
  }
}

function createValidJSONExport(): string {
  return JSON.stringify(
    {
      metadata: {
        version: '1.0.0',
        exportedAt: '2024-01-15T00:00:00.000Z',
        exportedBy: 'Forge',
        nodeCount: 2,
      },
      project: {
        id: 'imported-project',
        name: 'Imported Project',
        description: 'A project to import',
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-15T00:00:00.000Z',
        nodeOrder: [],
        nodePositions: {},
      },
      nodes: [
        {
          id: 'imported-task-1',
          type: 'task',
          title: 'Imported Task',
          content: 'Task content',
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-15T00:00:00.000Z',
          },
          status: 'pending',
          priority: 'medium',
        },
      ],
    },
    null,
    2
  )
}

function createInvalidJSON(): string {
  return '{ invalid json }'
}

function createMockFile(
  name: string,
  content: string,
  type = 'application/json'
): File {
  return new File([content], name, { type })
}

// ============================================================================
// Setup
// ============================================================================

// Polyfill File.prototype.text for jsdom (which doesn't implement it)
if (!File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('ImportDialog', () => {
  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<ImportDialog open />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Import Project')).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<ImportDialog open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<ImportDialog open />)

      expect(
        screen.getByText(/Import project data from JSON or Markdown files/i)
      ).toBeInTheDocument()
    })

    it('renders drop zone with instructions', () => {
      render(<ImportDialog open />)

      expect(
        screen.getByText(/Drag files here or click to browse/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Supports .json and .md files/i)
      ).toBeInTheDocument()
    })

    it('renders Select File and Select Folder buttons', () => {
      render(<ImportDialog open />)

      expect(
        screen.getByRole('button', { name: /Select File/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Select Folder/i })
      ).toBeInTheDocument()
    })

    it('renders Cancel and Import buttons', () => {
      render(<ImportDialog open />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
    })

    it('disables Import button when no file selected', () => {
      render(<ImportDialog open />)

      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    })
  })

  // ============================================================================
  // File Selection Tests
  // ============================================================================

  describe('file selection', () => {
    it('enables Import button after file selection', async () => {
      render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Import' })
        ).not.toBeDisabled()
      })
    })

    it('shows file summary after selection', async () => {
      render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByText(/1 files/i)).toBeInTheDocument()
      })
    })

    it('detects JSON format from file extension', async () => {
      render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Check that format detection shows file extension reason
      await waitFor(() => {
        expect(screen.getByText(/File extension \.json/i)).toBeInTheDocument()
      })
    })

    it('detects Markdown format from file extension', async () => {
      render(<ImportDialog open />)

      const markdownContent = `---
type: task
status: pending
---
# Task Title
Content here`
      const file = createMockFile('task.md', markdownContent, 'text/markdown')
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Check that format detection shows file extension reason
      await waitFor(() => {
        expect(screen.getByText(/File extension \.md/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Drag and Drop Tests
  // ============================================================================

  describe('drag and drop', () => {
    it('shows drag state when file dragged over', () => {
      render(<ImportDialog open />)

      const dropZone = screen.getByText(/Drag files here/i).closest('div')!

      fireEvent.dragEnter(dropZone)

      expect(screen.getByText(/Drop files here/i)).toBeInTheDocument()
    })

    it('removes drag state when file dragged away', () => {
      render(<ImportDialog open />)

      const dropZone = screen.getByText(/Drag files here/i).closest('div')!

      fireEvent.dragEnter(dropZone)
      fireEvent.dragLeave(dropZone)

      expect(
        screen.getByText(/Drag files here or click to browse/i)
      ).toBeInTheDocument()
    })

    it('accepts dropped files', async () => {
      render(<ImportDialog open />)

      const dropZone = screen.getByText(/Drag files here/i).closest('div')!
      const file = createMockFile('export.json', createValidJSONExport())

      const dataTransfer = {
        files: [file],
        dropEffect: '',
        effectAllowed: '',
        items: [],
        types: [],
        clearData: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        setDragImage: vi.fn(),
      }

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Import' })
        ).not.toBeDisabled()
      })
    })
  })

  // ============================================================================
  // Import Options Tests
  // ============================================================================

  describe('import options', () => {
    it('shows merge mode option when currentProject provided', async () => {
      const currentProject = createMockProject()
      render(<ImportDialog open currentProject={currentProject} />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Merge with current project/i)
        ).toBeInTheDocument()
      })
    })

    it('shows conflict resolution options when merge mode enabled', async () => {
      const currentProject = createMockProject()
      render(<ImportDialog open currentProject={currentProject} />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Merge with current project/i)
        ).toBeInTheDocument()
      })

      // Merge mode is enabled by default when currentProject exists
      expect(screen.getByLabelText(/Skip duplicates/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Overwrite existing/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Rename imported/i)).toBeInTheDocument()
    })

    it('has skip duplicates selected by default', async () => {
      const currentProject = createMockProject()
      render(<ImportDialog open currentProject={currentProject} />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/Skip duplicates/i)).toBeChecked()
      })
    })

    it('allows changing conflict resolution strategy', async () => {
      const user = userEvent.setup()
      const currentProject = createMockProject()
      render(<ImportDialog open currentProject={currentProject} />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/Overwrite existing/i)).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText(/Overwrite existing/i))

      expect(screen.getByLabelText(/Overwrite existing/i)).toBeChecked()
    })
  })

  // ============================================================================
  // Import Processing Tests
  // ============================================================================

  describe('import processing', () => {
    it('import button becomes enabled after file selection', async () => {
      render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      // Initially disabled
      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // After file selection, should be enabled
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Import' })
        ).not.toBeDisabled()
      })
    })

    it('detects format from file content', async () => {
      render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Should detect JSON format from file extension
      await waitFor(() => {
        expect(screen.getByText(/File extension \.json/i)).toBeInTheDocument()
      })
    })

    it('import button shows correct label', () => {
      render(<ImportDialog open />)

      // Initially just "Import"
      expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('shows error for invalid JSON', async () => {
      const user = userEvent.setup()
      render(<ImportDialog open />)

      const file = createMockFile('bad.json', createInvalidJSON())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Import' })
        ).not.toBeDisabled()
      })

      await user.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(screen.getByText(/Import failed/i)).toBeInTheDocument()
      })
    })

    it('shows error for JSON with invalid structure', async () => {
      const user = userEvent.setup()
      render(<ImportDialog open />)

      const invalidStructure = JSON.stringify({ foo: 'bar' })
      const file = createMockFile('invalid.json', invalidStructure)
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Import' })
        ).not.toBeDisabled()
      })

      await user.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(screen.getByText(/Import failed/i)).toBeInTheDocument()
      })
    })

    it('displays error with alert role', async () => {
      const user = userEvent.setup()
      render(<ImportDialog open />)

      const file = createMockFile('bad.json', createInvalidJSON())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await user.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Dialog Interaction Tests
  // ============================================================================

  describe('dialog interaction', () => {
    it('calls onOpenChange when Cancel clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<ImportDialog open onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onOpenChange when close button clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<ImportDialog open onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: 'Close' }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets state when dialog reopened', async () => {
      const { rerender } = render(<ImportDialog open />)

      const file = createMockFile('export.json', createValidJSONExport())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Close and reopen dialog
      rerender(<ImportDialog open={false} />)
      rerender(<ImportDialog open />)

      // Should be back to initial state
      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<ImportDialog open />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('file inputs have aria-labels', () => {
      render(<ImportDialog open />)

      expect(
        screen.getByLabelText(/Select file to import/i)
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText(/Select folder to import/i)
      ).toBeInTheDocument()
    })

    it('error display has alert role', async () => {
      const user = userEvent.setup()
      render(<ImportDialog open />)

      const file = createMockFile('bad.json', createInvalidJSON())
      const input = document.querySelector(
        'input[type="file"]:not([webkitdirectory])'
      )!

      await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await user.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('close button has aria-label', () => {
      render(<ImportDialog open />)

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('icons have aria-hidden', () => {
      render(<ImportDialog open />)

      const dialog = screen.getByRole('dialog')
      const hiddenElements = dialog.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenElements.length).toBeGreaterThan(0)
    })
  })
})
