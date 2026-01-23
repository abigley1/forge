/**
 * Project Settings Dialog Component
 *
 * Dialog for editing project settings:
 * - Edit project name
 * - Edit project description
 * - Delete project with confirmation
 */

import { useState, useCallback, useEffect } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog, AlertDialog } from '@/components/ui'
import { useWorkspaceStore, useProjectStore, useNodesStore } from '@/store'
import { Z_MODAL } from '@/lib/z-index'

// ============================================================================
// Types
// ============================================================================

interface ProjectSettingsDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Called when project is deleted */
  onDeleted?: () => void
}

// ============================================================================
// ProjectSettingsDialog Component
// ============================================================================

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  onDeleted,
}: ProjectSettingsDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Store state and actions
  const currentProject = useProjectStore((state) => state.project)
  const updateProject = useWorkspaceStore((state) => state.updateProject)
  const removeProject = useWorkspaceStore((state) => state.removeProject)
  const nodeCount = useNodesStore((state) => state.nodes.size)
  const closeProject = useProjectStore((state) => state.closeProject)

  // Initialize form with current project data
  useEffect(() => {
    if (open && currentProject) {
      setName(currentProject.name)
      setDescription(currentProject.metadata.description || '')
    }
  }, [open, currentProject])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentProject || !name.trim()) return

    setIsSaving(true)

    try {
      // Update workspace store
      updateProject(currentProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })

      // Update project store
      useProjectStore.setState({
        project: {
          ...currentProject,
          name: name.trim(),
          metadata: {
            ...currentProject.metadata,
            description: description.trim() || undefined,
            modifiedAt: new Date(),
          },
        },
      })

      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }, [currentProject, name, description, updateProject, onOpenChange])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!currentProject) return

    // Remove from workspace
    removeProject(currentProject.id)

    // Close current project
    closeProject()

    // Close dialogs
    setShowDeleteConfirm(false)
    onOpenChange(false)

    // Notify parent
    onDeleted?.()
  }, [currentProject, removeProject, closeProject, onOpenChange, onDeleted])

  if (!currentProject) return null

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup
            data-testid="project-settings"
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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Project Settings
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
              {/* Project Name */}
              <div>
                <label
                  htmlFor="settings-project-name"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Name
                </label>
                <input
                  id="settings-project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    'w-full rounded-md border border-gray-300 px-3 py-2',
                    'text-sm text-gray-900 placeholder:text-gray-400',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                    'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                  )}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="settings-project-description"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description
                </label>
                <textarea
                  id="settings-project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={3}
                  className={cn(
                    'w-full resize-none rounded-md border border-gray-300 px-3 py-2',
                    'text-sm text-gray-900 placeholder:text-gray-400',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                    'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                  )}
                />
              </div>

              {/* Project Info */}
              <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Nodes:</strong> {nodeCount}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Path:</strong> {currentProject.path}
                </p>
              </div>

              {/* Danger Zone */}
              <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <h3 className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
                  Danger Zone
                </h3>
                <p className="mb-3 text-sm text-red-700 dark:text-red-400">
                  Deleting a project will remove it from your workspace. Files
                  on disk will not be deleted.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2',
                    'text-sm font-medium text-red-700 dark:text-red-300',
                    'border border-red-300 dark:border-red-800',
                    'hover:bg-red-100 dark:hover:bg-red-900/50',
                    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                  )}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete Project
                </button>
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
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className={cn(
                  'rounded-md bg-blue-600 px-4 py-2',
                  'text-sm font-medium text-white',
                  'hover:bg-blue-700',
                  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: Z_MODAL + 10 }}
          />
          <AlertDialog.Popup
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl',
              'dark:border dark:border-gray-800 dark:bg-gray-900'
            )}
            style={{ zIndex: Z_MODAL + 11 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete Project?
              </AlertDialog.Title>
            </div>

            <AlertDialog.Description className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{currentProject.name}"? This will
              remove it from your workspace. Files on disk will not be affected.
            </AlertDialog.Description>

            <div className="flex justify-end gap-3">
              <AlertDialog.Close
                className={cn(
                  'rounded-md px-4 py-2',
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
                )}
              >
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={handleDelete}
                className={cn(
                  'rounded-md bg-red-600 px-4 py-2',
                  'text-sm font-medium text-white',
                  'hover:bg-red-700',
                  'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none'
                )}
              >
                Delete
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
