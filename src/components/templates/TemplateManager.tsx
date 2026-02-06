/**
 * TemplateManager Component
 *
 * Provides a UI for managing node templates - listing, creating, editing,
 * deleting, and duplicating templates.
 */

import { useState, useCallback } from 'react'
import { Copy, Edit2, Plus, Trash2, FileText, Lock } from 'lucide-react'

import { Dialog, Button, AlertDialog, useToast } from '@/components/ui'
import { useTemplatesStore } from '@/store/useTemplatesStore'
import { cn } from '@/lib/utils'
import { NodeType } from '@/types/nodes'
import type { NodeTemplate, CreateTemplateInput } from '@/types/templates'
import { NODE_TYPE_ICON_CONFIG } from '@/components/nodes/config'

// ============================================================================
// Types
// ============================================================================

export interface TemplateManagerProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Optional filter to only show templates of a specific type */
  filterType?: NodeType
}

interface TemplateFormData {
  name: string
  description: string
  type: NodeType
  content: string
}

// ============================================================================
// Sub-components
// ============================================================================

interface TemplateListItemProps {
  template: NodeTemplate
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

function TemplateListItem({
  template,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateListItemProps) {
  const config = NODE_TYPE_ICON_CONFIG[template.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        'border-forge-border dark:border-forge-border-dark',
        'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
        'transition-colors motion-reduce:transition-none'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          'bg-forge-surface dark:bg-forge-surface-dark'
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-forge-text dark:text-forge-text-dark truncate text-sm font-medium">
            {template.name}
          </h3>
          {template.isBuiltIn && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                'bg-forge-surface text-forge-text-secondary text-xs',
                'dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark'
              )}
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Built-in
            </span>
          )}
        </div>
        <p className="text-forge-muted dark:text-forge-muted-dark mt-0.5 truncate text-sm">
          {template.description}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          className={cn(
            'text-forge-muted flex min-h-[44px] min-w-[44px] items-center justify-center rounded',
            'hover:bg-forge-surface hover:text-forge-text',
            'dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark',
            'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
            'dark:focus-visible:ring-forge-accent-dark'
          )}
          aria-label={`Duplicate ${template.name}`}
        >
          <Copy className="h-4 w-4" />
        </button>
        {!template.isBuiltIn && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400',
                'hover:bg-gray-100 hover:text-gray-600',
                'dark:hover:bg-gray-800 dark:hover:text-gray-300',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
                'dark:focus-visible:ring-gray-300'
              )}
              aria-label={`Edit ${template.name}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'text-forge-muted flex min-h-[44px] min-w-[44px] items-center justify-center rounded',
                'hover:bg-red-50 hover:text-red-600',
                'dark:hover:bg-red-950/20 dark:hover:text-red-400',
                'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                'dark:focus-visible:ring-forge-accent-dark'
              )}
              aria-label={`Delete ${template.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Template Form Dialog
// ============================================================================

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: NodeTemplate
  onSave: (data: TemplateFormData) => void
  mode: 'create' | 'edit'
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  mode,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name ?? '',
    description: template?.description ?? '',
    type: template?.type ?? NodeType.Note,
    content: template?.content ?? '',
  })

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.name.trim()) return
      onSave(formData)
      onOpenChange(false)
    },
    [formData, onSave, onOpenChange]
  )

  // Reset form when template changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && template) {
        setFormData({
          name: template.name,
          description: template.description,
          type: template.type,
          content: template.content ?? '',
        })
      } else if (newOpen) {
        setFormData({
          name: '',
          description: '',
          type: NodeType.Note,
          content: '',
        })
      }
      onOpenChange(newOpen)
    },
    [template, onOpenChange]
  )

  const nodeTypes = Object.values(NodeType) as NodeType[]

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="max-w-lg">
          <Dialog.Title>
            {mode === 'create' ? 'Create Template' : 'Edit Template'}
          </Dialog.Title>
          <Dialog.Description>
            {mode === 'create'
              ? 'Create a new template for quick node creation.'
              : 'Update the template details.'}
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="template-name"
                className="text-forge-text-secondary dark:text-forge-text-secondary-dark block font-mono text-xs tracking-wider uppercase"
              >
                Name
              </label>
              <input
                id="template-name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className={cn(
                  'mt-1 block w-full rounded-md border px-3 py-2',
                  'text-forge-text placeholder-forge-muted',
                  'border-forge-border focus:border-forge-accent focus:ring-forge-accent focus:ring-1',
                  'focus-visible:outline-none',
                  'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark dark:placeholder-forge-muted-dark'
                )}
                placeholder="My Template"
                required
                autoComplete="off"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="template-description"
                className="text-forge-text-secondary dark:text-forge-text-secondary-dark block font-mono text-xs tracking-wider uppercase"
              >
                Description
              </label>
              <input
                id="template-description"
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={cn(
                  'mt-1 block w-full rounded-md border px-3 py-2',
                  'text-forge-text placeholder-forge-muted',
                  'border-forge-border focus:border-forge-accent focus:ring-forge-accent focus:ring-1',
                  'focus-visible:outline-none',
                  'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark dark:placeholder-forge-muted-dark'
                )}
                placeholder="Brief description of this template"
                autoComplete="off"
              />
            </div>

            {/* Type (only for create mode) */}
            {mode === 'create' && (
              <div>
                <label
                  htmlFor="template-type"
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark block font-mono text-xs tracking-wider uppercase"
                >
                  Node Type
                </label>
                <select
                  id="template-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as NodeType,
                    }))
                  }
                  className={cn(
                    'mt-1 block w-full rounded-md border px-3 py-2',
                    'bg-forge-paper text-forge-text',
                    'border-forge-border focus:border-forge-accent focus:ring-forge-accent focus:ring-1',
                    'focus-visible:outline-none',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark'
                  )}
                >
                  {nodeTypes.map((type) => {
                    const config = NODE_TYPE_ICON_CONFIG[type]
                    return (
                      <option key={type} value={type}>
                        {config.label}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Content */}
            <div>
              <label
                htmlFor="template-content"
                className="text-forge-text-secondary dark:text-forge-text-secondary-dark block font-mono text-xs tracking-wider uppercase"
              >
                Initial Content (Markdown)
              </label>
              <textarea
                id="template-content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={8}
                className={cn(
                  'mt-1 block w-full rounded-md border px-3 py-2',
                  'font-mono text-sm',
                  'text-forge-text placeholder-forge-muted',
                  'border-forge-border focus:border-forge-accent focus:ring-forge-accent focus:ring-1',
                  'focus-visible:outline-none',
                  'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark dark:placeholder-forge-muted-dark'
                )}
                placeholder="## Section&#10;&#10;Your template content here..."
              />
            </div>

            <Dialog.Footer>
              <Dialog.Close>Cancel</Dialog.Close>
              <Button type="submit" disabled={!formData.name.trim()}>
                {mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateManager({
  open,
  onOpenChange,
  filterType,
}: TemplateManagerProps) {
  // Store
  const getTemplatesForType = useTemplatesStore(
    (state) => state.getTemplatesForType
  )
  const getCustomTemplates = useTemplatesStore(
    (state) => state.getCustomTemplates
  )
  const addTemplate = useTemplatesStore((state) => state.addTemplate)
  const updateTemplate = useTemplatesStore((state) => state.updateTemplate)
  const deleteTemplate = useTemplatesStore((state) => state.deleteTemplate)
  const duplicateTemplate = useTemplatesStore(
    (state) => state.duplicateTemplate
  )

  // UI state
  const [selectedType, setSelectedType] = useState<NodeType | 'all'>(
    filterType ?? 'all'
  )
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTemplate, setEditingTemplate] = useState<
    NodeTemplate | undefined
  >(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<
    NodeTemplate | undefined
  >(undefined)

  // Toast
  const { success, error: showError } = useToast()

  // Get templates based on filter
  const templates =
    selectedType === 'all'
      ? [
          ...getTemplatesForType(NodeType.Decision),
          ...getTemplatesForType(NodeType.Component),
          ...getTemplatesForType(NodeType.Task),
          ...getTemplatesForType(NodeType.Note),
        ]
      : getTemplatesForType(selectedType)

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingTemplate(undefined)
    setFormMode('create')
    setFormDialogOpen(true)
  }, [])

  const handleEdit = useCallback((template: NodeTemplate) => {
    setEditingTemplate(template)
    setFormMode('edit')
    setFormDialogOpen(true)
  }, [])

  const handleDelete = useCallback((template: NodeTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }, [])

  const handleDuplicate = useCallback(
    (template: NodeTemplate) => {
      const duplicated = duplicateTemplate(template.id)
      if (duplicated) {
        success({
          title: 'Template duplicated',
          description: `Created "${duplicated.name}"`,
        })
      } else {
        showError({
          title: 'Failed to duplicate',
          description: 'Could not duplicate the template',
        })
      }
    },
    [duplicateTemplate, success, showError]
  )

  const handleSave = useCallback(
    (data: TemplateFormData) => {
      if (formMode === 'create') {
        const input: CreateTemplateInput = {
          name: data.name,
          description: data.description,
          type: data.type,
          content: data.content || undefined,
        }
        const created = addTemplate(input)
        success({
          title: 'Template created',
          description: `Created "${created.name}"`,
        })
      } else if (editingTemplate) {
        const updated = updateTemplate(editingTemplate.id, {
          name: data.name,
          description: data.description,
          content: data.content || undefined,
        })
        if (updated) {
          success({
            title: 'Template updated',
            description: `Updated "${data.name}"`,
          })
        } else {
          showError({
            title: 'Failed to update',
            description:
              'Could not update the template. It may have been deleted.',
          })
        }
      }
    },
    [formMode, editingTemplate, addTemplate, updateTemplate, success, showError]
  )

  const handleConfirmDelete = useCallback(() => {
    if (templateToDelete) {
      const deleted = deleteTemplate(templateToDelete.id)
      if (deleted) {
        success({
          title: 'Template deleted',
          description: `Deleted "${templateToDelete.name}"`,
        })
      } else {
        showError({
          title: 'Failed to delete',
          description: 'Could not delete the template',
        })
      }
      setDeleteDialogOpen(false)
      setTemplateToDelete(undefined)
    }
  }, [templateToDelete, deleteTemplate, success, showError])

  const nodeTypes = Object.values(NodeType) as NodeType[]
  const customTemplateCount = getCustomTemplates().length

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className="max-w-2xl">
            <Dialog.Title>Template Manager</Dialog.Title>
            <Dialog.Description>
              Manage templates for quick node creation. Custom templates can be
              edited or deleted. Built-in templates can be duplicated.
            </Dialog.Description>

            {/* Header with filter and create button */}
            <div className="mt-4 flex items-center justify-between gap-4">
              {/* Type filter */}
              {!filterType && (
                <select
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as NodeType | 'all')
                  }
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm',
                    'bg-forge-paper text-forge-text',
                    'border-forge-border focus:border-forge-accent focus:ring-forge-accent focus:ring-1',
                    'focus-visible:outline-none',
                    'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark'
                  )}
                  aria-label="Filter by type"
                >
                  <option value="all">All Types</option>
                  {nodeTypes.map((type) => {
                    const config = NODE_TYPE_ICON_CONFIG[type]
                    return (
                      <option key={type} value={type}>
                        {config.label}
                      </option>
                    )
                  })}
                </select>
              )}

              <Button onClick={handleCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                New Template
              </Button>
            </div>

            {/* Template list */}
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="text-forge-muted dark:text-forge-muted-dark h-10 w-10" />
                  <p className="text-forge-muted dark:text-forge-muted-dark mt-2 text-sm">
                    No templates found
                  </p>
                </div>
              ) : (
                templates.map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => handleDelete(template)}
                    onDuplicate={() => handleDuplicate(template)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <Dialog.Footer>
              <p className="text-forge-muted dark:text-forge-muted-dark mr-auto text-sm">
                {templates.length} template{templates.length !== 1 ? 's' : ''} (
                {customTemplateCount} custom)
              </p>
              <Dialog.Close>Close</Dialog.Close>
            </Dialog.Footer>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Form dialog for create/edit */}
      <TemplateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        template={editingTemplate}
        onSave={handleSave}
        mode={formMode}
      />

      {/* Delete confirmation */}
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete Template</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete "{templateToDelete?.name}"? This
              action cannot be undone.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <AlertDialog.Close>Cancel</AlertDialog.Close>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
