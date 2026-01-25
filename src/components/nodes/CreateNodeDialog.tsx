/**
 * CreateNodeDialog Component
 *
 * A dialog for creating new nodes with type selection, title input, and optional template.
 * Can be triggered via keyboard shortcut (Ctrl/Cmd+Shift+N) or programmatically.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, Loader2 } from 'lucide-react'

import { Dialog, Button, useToast } from '@/components/ui'
import {
  parseLink,
  SUPPORTED_SUPPLIERS,
  type PartialComponentData,
} from '@/lib/supplier-parser'
import { useUndoableAddNode, useHotkey, formatHotkey } from '@/hooks'
import { useNodesStore } from '@/store/useNodesStore'
import { useTemplatesStore } from '@/store/useTemplatesStore'
import { generateNodeId } from '@/lib/project'
import { cn } from '@/lib/utils'
import {
  NodeType,
  createNodeDates,
  type ForgeNode,
  type DecisionNode,
  type ComponentNode,
  type TaskNode,
  type NoteNode,
  type SubsystemNode,
  type AssemblyNode,
  type ModuleNode,
} from '@/types/nodes'
import type { TemplateFrontmatter } from '@/types/templates'
import { NODE_TYPE_ICON_CONFIG, getNodeTypeLabel } from './config'

// ============================================================================
// Types
// ============================================================================

export interface CreateNodeDialogProps {
  /** Whether the dialog is open (controlled) */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Initial node type to select */
  defaultType?: NodeType
  /** Callback after node is created */
  onNodeCreated?: (node: ForgeNode) => void
  /** Whether to enable the Ctrl+Shift+N hotkey */
  enableHotkey?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new node with the given parameters and optional frontmatter from template
 */
function createNode(
  type: NodeType,
  title: string,
  content: string,
  id: string,
  frontmatter?: TemplateFrontmatter
): ForgeNode {
  const dates = createNodeDates()

  const baseNode = {
    id,
    title,
    tags: frontmatter?.tags ?? [],
    dates,
    content,
  }

  switch (type) {
    case NodeType.Decision:
      return {
        ...baseNode,
        type: NodeType.Decision,
        status: frontmatter?.status ?? 'pending',
        selected: null,
        options: [],
        criteria: [],
        rationale: null,
        selectedDate: null,
        parent: null,
      } satisfies DecisionNode

    case NodeType.Component:
      return {
        ...baseNode,
        type: NodeType.Component,
        status: frontmatter?.componentStatus ?? 'considering',
        cost: frontmatter?.cost ?? null,
        supplier: frontmatter?.supplier ?? null,
        partNumber: frontmatter?.partNumber ?? null,
        customFields: {},
        parent: null,
      } satisfies ComponentNode

    case NodeType.Task:
      return {
        ...baseNode,
        type: NodeType.Task,
        status: frontmatter?.taskStatus ?? 'pending',
        priority: frontmatter?.priority ?? 'medium',
        dependsOn: [],
        blocks: [],
        checklist: [],
        parent: null,
      } satisfies TaskNode

    case NodeType.Note:
      return {
        ...baseNode,
        type: NodeType.Note,
        parent: null,
      } satisfies NoteNode

    case NodeType.Subsystem:
      return {
        ...baseNode,
        type: NodeType.Subsystem,
        status: 'planning',
      } satisfies SubsystemNode

    case NodeType.Assembly:
      return {
        ...baseNode,
        type: NodeType.Assembly,
        status: 'planning',
        parent: null,
      } satisfies AssemblyNode

    case NodeType.Module:
      return {
        ...baseNode,
        type: NodeType.Module,
        status: 'planning',
        parent: null,
      } satisfies ModuleNode
  }
}

// ============================================================================
// Component
// ============================================================================

export function CreateNodeDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultType = NodeType.Note,
  onNodeCreated,
  enableHotkey = true,
}: CreateNodeDialogProps) {
  // Internal open state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      controlledOnOpenChange?.(newOpen)
    },
    [isControlled, controlledOnOpenChange]
  )

  // Form state
  const [selectedType, setSelectedType] = useState<NodeType>(defaultType)
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Import from link state
  const [showImportLink, setShowImportLink] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] =
    useState<PartialComponentData | null>(null)

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null)
  const importUrlInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const addNode = useUndoableAddNode()
  const nodes = useNodesStore((state) => state.nodes)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)
  const { error: showError } = useToast()

  // Get templates from store
  const getTemplatesForType = useTemplatesStore(
    (state) => state.getTemplatesForType
  )

  // Get available templates for selected type
  const availableTemplates = getTemplatesForType(selectedType)

  // Get the default template ID (first one is always blank)
  const defaultTemplateId = availableTemplates[0]?.id ?? ''

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedType(defaultType)
      setTitle('')
      // Reset to default template for the type
      const templates = getTemplatesForType(defaultType)
      setSelectedTemplateId(templates[0]?.id ?? '')
      setIsSubmitting(false)
      // Reset import state
      setShowImportLink(false)
      setImportUrl('')
      setImportError(null)
      setIsImporting(false)
      setImportPreview(null)
      // Focus title input after dialog animation
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [open, defaultType, getTemplatesForType])

  // Update template selection when type changes
  useEffect(() => {
    setSelectedTemplateId(defaultTemplateId)
  }, [selectedType, defaultTemplateId])

  // Get selected template
  const selectedTemplate = availableTemplates.find(
    (t) => t.id === selectedTemplateId
  )

  // Handle import from link
  const handleImportLink = useCallback(async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL')
      return
    }

    setImportError(null)
    setIsImporting(true)

    const result = await parseLink(importUrl.trim())

    if (!result.success) {
      setImportError(result.error.message)
      setIsImporting(false)
      return
    }

    // Set preview data
    setImportPreview(result.data)
    // Pre-fill title if available
    if (result.data.title) {
      setTitle(result.data.title)
    } else if (result.data.partNumber) {
      setTitle(result.data.partNumber)
    }
    setIsImporting(false)
  }, [importUrl])

  // Clear import state when switching away from component type
  useEffect(() => {
    if (selectedType !== NodeType.Component) {
      setShowImportLink(false)
      setImportUrl('')
      setImportError(null)
      setImportPreview(null)
    }
  }, [selectedType])

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const trimmedTitle = title.trim()
      if (!trimmedTitle || isSubmitting) return

      setIsSubmitting(true)

      try {
        // Generate unique ID
        const existingIds = new Set(nodes.keys())
        const nodeId = generateNodeId(trimmedTitle, existingIds)

        // Get content and frontmatter from template
        const content = selectedTemplate?.content || ''
        const frontmatter = selectedTemplate?.frontmatter

        // Create the node
        const node = createNode(
          selectedType,
          trimmedTitle,
          content,
          nodeId,
          frontmatter
        )

        // If we imported from a link, add the supplier data to component node
        if (selectedType === NodeType.Component && importPreview) {
          const componentNode = node as ComponentNode
          if (importPreview.supplier) {
            componentNode.supplier = importPreview.supplier
          }
          if (importPreview.partNumber) {
            componentNode.partNumber = importPreview.partNumber
          }
          if (importPreview.price !== null) {
            componentNode.cost = importPreview.price
          }
          // Store supplier URL in custom fields
          if (importPreview.supplierUrl) {
            componentNode.customFields = {
              ...componentNode.customFields,
              supplierUrl: importPreview.supplierUrl,
            }
          }
          // Add description to content if available
          if (importPreview.description) {
            componentNode.content =
              importPreview.description + '\n\n' + componentNode.content
          }
        }

        // Add to store (with undo support)
        addNode(node)

        // Set as active node
        setActiveNode(node.id)

        // Notify parent
        onNodeCreated?.(node)

        // Close dialog
        setOpen(false)
      } catch (err) {
        // Show error toast - don't close dialog so user can retry
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        showError({
          title: 'Failed to create node',
          description: message,
        })
        console.error('Node creation failed:', err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title,
      isSubmitting,
      nodes,
      selectedType,
      selectedTemplate,
      importPreview,
      addNode,
      setActiveNode,
      onNodeCreated,
      setOpen,
      showError,
    ]
  )

  // Handle keyboard shortcut
  useHotkey(
    'n',
    () => {
      setOpen(true)
    },
    {
      ctrl: true,
      shift: true,
      enabled: enableHotkey && !open,
      preventDefault: true,
    }
  )

  // Node type options
  const nodeTypes = Object.values(NodeType) as NodeType[]

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="max-w-md">
          <Dialog.Title>Create New Node</Dialog.Title>
          <Dialog.Description>
            Choose a type and enter a title for your new node.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Node Type Selector */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </legend>
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Node type"
              >
                {nodeTypes.map((type) => {
                  const config = NODE_TYPE_ICON_CONFIG[type]
                  const Icon = config.icon
                  const isSelected = selectedType === type

                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border-2 px-3 py-2.5',
                        'text-sm font-medium transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                        'dark:focus-visible:ring-gray-300',
                        isSelected
                          ? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4', config.color)}
                        aria-hidden="true"
                      />
                      <span className="text-gray-900 dark:text-gray-100">
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* Title Input */}
            <div>
              <label
                htmlFor="node-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Title
              </label>
              <input
                ref={titleInputRef}
                id="node-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border px-3 py-2',
                  'text-gray-900 placeholder-gray-500',
                  'border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500',
                  'focus-visible:outline-none',
                  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400',
                  'dark:focus:border-gray-500 dark:focus:ring-gray-500'
                )}
                placeholder={`My ${getNodeTypeLabel(selectedType)}`}
                autoComplete="off"
                required
              />
            </div>

            {/* Template Selector */}
            <div>
              <label
                htmlFor="node-template"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Template
              </label>
              <select
                id="node-template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border px-3 py-2',
                  'bg-white text-gray-900',
                  'border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500',
                  'focus-visible:outline-none',
                  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
                )}
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {selectedTemplate && !selectedTemplate.id.endsWith('-blank') && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Import from Link - Only for Component type */}
            {selectedType === NodeType.Component && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                {!showImportLink ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportLink(true)
                      setTimeout(() => importUrlInputRef.current?.focus(), 100)
                    }}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5',
                      'text-sm font-medium text-gray-600 dark:text-gray-400',
                      'border-gray-300 hover:border-gray-400 hover:text-gray-700',
                      'dark:border-gray-600 dark:hover:border-gray-500 dark:hover:text-gray-300',
                      'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                      'dark:focus-visible:ring-gray-300'
                    )}
                  >
                    <Link className="h-4 w-4" aria-hidden="true" />
                    Import from Link
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Import from Link
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowImportLink(false)
                          setImportUrl('')
                          setImportError(null)
                          setImportPreview(null)
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* URL Input */}
                    <div className="flex gap-2">
                      <input
                        ref={importUrlInputRef}
                        type="url"
                        value={importUrl}
                        onChange={(e) => {
                          setImportUrl(e.target.value)
                          setImportError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleImportLink()
                          }
                        }}
                        className={cn(
                          'flex-1 rounded-md border px-3 py-2',
                          'text-sm text-gray-900 placeholder-gray-500',
                          'border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500',
                          'focus-visible:outline-none',
                          'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400'
                        )}
                        placeholder="Paste supplier URL..."
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        onClick={handleImportLink}
                        disabled={isImporting || !importUrl.trim()}
                        className="shrink-0"
                      >
                        {isImporting ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-label="Loading"
                          />
                        ) : (
                          'Import'
                        )}
                      </Button>
                    </div>

                    {/* Supported suppliers hint */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Supported:{' '}
                      {SUPPORTED_SUPPLIERS.map(
                        (s) => s.charAt(0).toUpperCase() + s.slice(1)
                      ).join(', ')}
                    </p>

                    {/* Error message */}
                    {importError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {importError}
                      </p>
                    )}

                    {/* Import Preview */}
                    {importPreview && (
                      <div
                        data-testid="import-preview"
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="space-y-2 text-sm">
                          {importPreview.supplier && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Supplier:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {importPreview.supplier}
                              </span>
                            </div>
                          )}
                          {importPreview.partNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Part #:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {importPreview.partNumber}
                              </span>
                            </div>
                          )}
                          {importPreview.price !== null && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Price:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                ${importPreview.price.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {importPreview.manufacturer && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Manufacturer:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {importPreview.manufacturer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <Dialog.Footer>
              <Dialog.Close>Cancel</Dialog.Close>
              <Button type="submit" disabled={!title.trim() || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </Dialog.Footer>
          </form>

          {/* Keyboard shortcut hint */}
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Keyboard shortcut:{' '}
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {formatHotkey('N', { ctrl: true, shift: true })}
            </kbd>
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
