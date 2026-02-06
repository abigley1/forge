/**
 * Project Settings Dialog Component
 *
 * Dialog for editing project settings:
 * - Edit project name
 * - Edit project description
 * - Save to folder (export to file system)
 * - Delete project with confirmation
 */

import { useState, useCallback, useEffect } from 'react'
import { X, Trash2, AlertTriangle, FolderOutput, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog, AlertDialog, useToast } from '@/components/ui'
import { useWorkspaceStore, useProjectStore, useNodesStore } from '@/store'
import { Z_MODAL } from '@/lib/z-index'
import {
  exportProjectToFolder,
  isFileSystemAccessSupported,
} from '@/lib/export'

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
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const toast = useToast()

  // Store state and actions
  const currentProject = useProjectStore((state) => state.project)
  const updateProject = useWorkspaceStore((state) => state.updateProject)
  const removeProject = useWorkspaceStore((state) => state.removeProject)
  const nodes = useNodesStore((state) => state.nodes)
  const nodeCount = nodes.size
  const closeProject = useProjectStore((state) => state.closeProject)

  // Check if File System Access API is supported
  const canExportToFolder = isFileSystemAccessSupported()

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

  // Handle export to folder
  const handleExportToFolder = useCallback(async () => {
    if (!currentProject) return

    setIsExporting(true)

    try {
      const result = await exportProjectToFolder(nodes, currentProject.name, {
        id: currentProject.id,
        description: currentProject.metadata.description,
        createdAt: currentProject.metadata.createdAt,
        modifiedAt: currentProject.metadata.modifiedAt,
        nodeOrder: currentProject.metadata.nodeOrder,
        nodePositions: currentProject.metadata.nodePositions,
      })

      if (result.success) {
        toast.success({
          title: 'Export Complete',
          description: `Saved ${result.fileCount} file${result.fileCount !== 1 ? 's' : ''} to ${result.directoryName || 'folder'}`,
        })
      } else if (result.error === 'Export cancelled') {
        // User cancelled - no toast needed
      } else {
        toast.error({
          title: 'Export Failed',
          description: result.error || 'An unknown error occurred',
        })
      }
    } catch (error) {
      toast.error({
        title: 'Export Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      })
    } finally {
      setIsExporting(false)
    }
  }, [currentProject, nodes, toast])

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
              'bg-forge-paper w-full max-w-md rounded-xl shadow-2xl',
              'border-forge-border border',
              'dark:border-forge-border-dark dark:bg-forge-paper-dark',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
              'transition-[transform,opacity] duration-200'
            )}
            style={{ zIndex: Z_MODAL + 1 }}
          >
            {/* Header */}
            <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-4">
              <Dialog.Title className="text-forge-text dark:text-forge-text-dark text-lg font-semibold">
                Project Settings
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
              {/* Project Name */}
              <div>
                <label
                  htmlFor="settings-project-name"
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1 block font-mono text-xs tracking-wider uppercase"
                >
                  Project Name
                </label>
                <input
                  id="settings-project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    'border-forge-border w-full rounded-md border px-3 py-2',
                    'text-forge-text placeholder:text-forge-muted text-sm',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark',
                    'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none',
                    'dark:focus:border-forge-accent-dark dark:focus:ring-forge-accent-dark'
                  )}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="settings-project-description"
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1 block font-mono text-xs tracking-wider uppercase"
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
                    'border-forge-border w-full resize-none rounded-md border px-3 py-2',
                    'text-forge-text placeholder:text-forge-muted text-sm',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark',
                    'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none',
                    'dark:focus:border-forge-accent-dark dark:focus:ring-forge-accent-dark'
                  )}
                />
              </div>

              {/* Project Info */}
              <div className="bg-forge-surface dark:bg-forge-surface-dark rounded-md px-3 py-2">
                <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm">
                  <strong>Nodes:</strong> {nodeCount}
                </p>
              </div>

              {/* Export to Folder */}
              <div className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark rounded-md border p-4">
                <h3 className="text-forge-text dark:text-forge-text-dark mb-2 text-sm font-medium">
                  Save to Folder
                </h3>
                <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-3 text-sm">
                  Export your project as markdown files to a folder on your
                  computer. This creates a git-friendly directory structure.
                </p>
                <button
                  type="button"
                  onClick={handleExportToFolder}
                  disabled={isExporting || !canExportToFolder}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2',
                    'text-sm font-medium',
                    'bg-forge-accent text-white',
                    'hover:bg-forge-accent-hover',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
                  )}
                  title={
                    !canExportToFolder
                      ? 'File System Access API not supported in this browser'
                      : undefined
                  }
                >
                  {isExporting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FolderOutput className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isExporting ? 'Saving...' : 'Save to Folder'}
                </button>
                {!canExportToFolder && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Not supported in this browser. Try Chrome, Edge, or Opera.
                  </p>
                )}
              </div>

              {/* Danger Zone */}
              <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <h3 className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
                  Danger Zone
                </h3>
                <p className="mb-3 text-sm text-red-700 dark:text-red-400">
                  Deleting a project will remove it from your browser storage.
                  Use "Save to Folder" first to keep a backup.
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
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className={cn(
                  'bg-forge-accent rounded-md px-4 py-2',
                  'text-sm font-medium text-white',
                  'hover:bg-forge-accent-hover',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
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
              'bg-forge-paper w-full max-w-sm rounded-xl p-6 shadow-2xl',
              'border-forge-border border',
              'dark:border-forge-border-dark dark:bg-forge-paper-dark'
            )}
            style={{ zIndex: Z_MODAL + 11 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialog.Title className="text-forge-text dark:text-forge-text-dark text-lg font-semibold">
                Delete Project?
              </AlertDialog.Title>
            </div>

            <AlertDialog.Description className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-6 text-sm">
              Are you sure you want to delete "{currentProject.name}"? This will
              remove it from your browser storage. Make sure you've saved a
              backup using "Save to Folder" if needed.
            </AlertDialog.Description>

            <div className="flex justify-end gap-3">
              <AlertDialog.Close
                className={cn(
                  'rounded-md px-4 py-2',
                  'text-forge-text dark:text-forge-text-dark text-sm font-medium',
                  'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                  'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
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
