/**
 * Create Project Dialog Component
 *
 * Dialog for creating a new project with:
 * - Project name input (required)
 * - Description input (optional)
 * - Creates project via server API
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog } from '@/components/ui'
import { useWorkspaceStore } from '@/store'
import { slugify } from '@/lib/project'
import { Z_MODAL } from '@/lib/z-index'
import { api } from '@/lib/api'

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
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Store actions
  const addProject = useWorkspaceStore((state) => state.addProject)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)
  const projects = useWorkspaceStore((state) => state.projects)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setError(null)
      setIsSubmitting(false)
      // Focus name input after a short delay for animation
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [open])

  // Handle form submission
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      // Validate name
      if (!name.trim()) {
        setError('Project name is required')
        nameInputRef.current?.focus()
        return
      }

      // Generate project ID
      const id = slugify(name.trim())

      // Check for duplicate project IDs
      if (projects.some((p) => p.id === id)) {
        setError(
          'A project with this name already exists. Please choose a different name.'
        )
        nameInputRef.current?.focus()
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        // Create project via server API
        const result = await api.createProject({
          id,
          name: name.trim(),
          description: description.trim() || undefined,
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to create project')
        }

        // Add to workspace
        addProject({
          id,
          name: name.trim(),
          path: '', // Server projects don't have local paths
          nodeCount: 0,
          modifiedAt: new Date(),
          description: description.trim() || undefined,
        })

        // Set as active project - this triggers useServerPersistence to load
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
      projects,
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
            'bg-forge-paper w-full max-w-md rounded-xl shadow-2xl',
            'border-forge-border border',
            'dark:border-forge-border-dark dark:bg-forge-paper-dark',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            'transition-[transform,opacity] duration-200'
          )}
          style={{ zIndex: Z_MODAL + 1 }}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-4">
              <Dialog.Title className="text-forge-text dark:text-forge-text-dark text-lg font-semibold">
                Create New Project
              </Dialog.Title>
              <Dialog.Close
                className={cn(
                  'rounded-md p-2',
                  'text-forge-muted hover:text-forge-text dark:text-forge-muted-dark dark:hover:text-forge-text-dark',
                  'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                  'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
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
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1 block font-mono text-xs tracking-wider uppercase"
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
                    'border-forge-border w-full rounded-md border px-3 py-2',
                    'text-forge-text placeholder:text-forge-muted text-sm',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark',
                    'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none',
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
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1 block font-mono text-xs tracking-wider uppercase"
                >
                  Description{' '}
                  <span className="text-forge-muted dark:text-forge-muted-dark">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={2}
                  className={cn(
                    'border-forge-border w-full resize-none rounded-md border px-3 py-2',
                    'text-forge-text placeholder:text-forge-muted text-sm',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark',
                    'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none'
                  )}
                />
              </div>

              {/* Info about storage */}
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-xs">
                Your project will be stored on the server and synced across
                devices.
              </p>
            </div>

            {/* Footer */}
            <div className="border-forge-border dark:border-forge-border-dark flex justify-end gap-3 border-t px-6 py-4">
              <Dialog.Close
                className={cn(
                  'rounded-md px-4 py-2',
                  'text-forge-text dark:text-forge-text-dark text-sm font-medium',
                  'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                  'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
                )}
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className={cn(
                  'bg-forge-accent rounded-md px-4 py-2',
                  'text-sm font-medium text-white',
                  'hover:bg-forge-accent-hover',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
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
