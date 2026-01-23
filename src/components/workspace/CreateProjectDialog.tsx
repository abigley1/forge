/**
 * Create Project Dialog Component
 *
 * Dialog for creating a new project with:
 * - Project name input (required)
 * - Description input (optional)
 * - Folder selection
 * - Validation and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { FolderOpen, X, AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog } from '@/components/ui'
import { useWorkspaceStore } from '@/store'
import { slugify } from '@/lib/project'
import { Z_MODAL } from '@/lib/z-index'

// ============================================================================
// Types
// ============================================================================

interface CreateProjectDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Called when project is created successfully */
  onCreated?: (projectId: string) => void
}

// ============================================================================
// CreateProjectDialog Component
// ============================================================================

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Store actions
  const addProject = useWorkspaceStore((state) => state.addProject)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setFolderPath(null)
      setError(null)
      setIsSubmitting(false)
      // Focus name input after a short delay for animation
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [open])

  // Handle folder selection
  const handleSelectFolder = useCallback(async () => {
    try {
      // Check if File System Access API is available
      if ('showDirectoryPicker' in window) {
        const handle = await (
          window as unknown as {
            showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
          }
        ).showDirectoryPicker()
        setFolderPath(handle.name)
        setError(null)
      } else {
        // Fallback for browsers without File System Access API
        setError(
          'Your browser does not support folder selection. Please use Chrome or Edge.'
        )
      }
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to select folder')
      }
    }
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      // Validate
      if (!name.trim()) {
        setError('Project name is required')
        nameInputRef.current?.focus()
        return
      }

      if (!folderPath) {
        setError('Please select a folder for the project')
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        // Create project ID from name
        const id = slugify(name.trim())

        // Add to workspace
        addProject({
          id,
          name: name.trim(),
          path: folderPath,
          nodeCount: 0,
          modifiedAt: new Date(),
          description: description.trim() || undefined,
        })

        // Set as active project
        setActiveProject(id)

        // Notify parent
        onCreated?.(id)

        // Close dialog
        onOpenChange(false)
      } catch (err) {
        setError((err as Error).message || 'Failed to create project')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      name,
      description,
      folderPath,
      addProject,
      setActiveProject,
      onCreated,
      onOpenChange,
    ]
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-xl bg-white shadow-2xl',
            'dark:border dark:border-gray-800 dark:bg-gray-900',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            'transition-[transform,opacity] duration-200'
          )}
          style={{ zIndex: Z_MODAL + 1 }}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create New Project
              </Dialog.Title>
              <Dialog.Close
                className={cn(
                  'rounded-md p-2',
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="space-y-4 px-6 py-4">
              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  <AlertCircle
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {error}
                </div>
              )}

              {/* Project Name */}
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Hardware Project"
                  autoComplete="off"
                  className={cn(
                    'w-full rounded-md border border-gray-300 px-3 py-2',
                    'text-sm text-gray-900 placeholder:text-gray-400',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                    'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none',
                    error && !name.trim() && 'border-red-500'
                  )}
                  aria-invalid={error && !name.trim() ? 'true' : undefined}
                  aria-describedby={
                    error && !name.trim() ? 'name-error' : undefined
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="project-description"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={2}
                  className={cn(
                    'w-full resize-none rounded-md border border-gray-300 px-3 py-2',
                    'text-sm text-gray-900 placeholder:text-gray-400',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                    'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                  )}
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label
                  htmlFor="folder-select"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Folder <span className="text-red-500">*</span>
                </label>
                <button
                  id="folder-select"
                  type="button"
                  onClick={handleSelectFolder}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border border-gray-300 px-3 py-2',
                    'text-sm text-gray-700 dark:text-gray-300',
                    'dark:border-gray-700 dark:bg-gray-800',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                    error && !folderPath && 'border-red-500'
                  )}
                >
                  <FolderOpen
                    className="h-4 w-4 text-gray-400"
                    aria-hidden="true"
                  />
                  {folderPath ? (
                    <span className="truncate">{folderPath}</span>
                  ) : (
                    <span className="text-gray-400">Select a folder...</span>
                  )}
                </button>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choose where to store your project files
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Dialog.Close
                className={cn(
                  'rounded-md px-4 py-2',
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
                )}
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'rounded-md bg-blue-600 px-4 py-2',
                  'text-sm font-medium text-white',
                  'hover:bg-blue-700',
                  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
