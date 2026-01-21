/**
 * CreateNodeDialog Component
 *
 * A dialog for creating new nodes with type selection, title input, and optional template.
 * Can be triggered via keyboard shortcut (Ctrl/Cmd+Shift+N) or programmatically.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

import { Dialog, Button } from '@/components/ui'
import { useUndoableAddNode, useHotkey, formatHotkey } from '@/hooks'
import { useNodesStore } from '@/store/useNodesStore'
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
} from '@/types/nodes'
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

/** Template definition for node creation */
interface NodeTemplate {
  id: string
  name: string
  description: string
  /** Initial content for the node */
  content?: string
}

// ============================================================================
// Templates
// ============================================================================

/** Basic templates for each node type */
const NODE_TEMPLATES: Record<NodeType, NodeTemplate[]> = {
  [NodeType.Decision]: [
    {
      id: 'blank',
      name: 'Blank Decision',
      description: 'Start with an empty decision',
    },
    {
      id: 'component-selection',
      name: 'Component Selection',
      description: 'Compare components or parts',
      content: `## Context

Describe the problem or need this decision addresses.

## Options

List the options being considered.

## Criteria

What factors matter for this decision?

## Conclusion

Document the final decision and rationale.
`,
    },
    {
      id: 'design-choice',
      name: 'Design Choice',
      description: 'Evaluate design alternatives',
      content: `## Background

What design challenge are you solving?

## Alternatives

1. Option A
2. Option B
3. Option C

## Analysis

Compare the tradeoffs of each alternative.

## Decision

Selected approach and reasoning.
`,
    },
  ],
  [NodeType.Component]: [
    {
      id: 'blank',
      name: 'Blank Component',
      description: 'Start with an empty component',
    },
    {
      id: 'electronic',
      name: 'Electronic Part',
      description: 'Template for electronic components',
      content: `## Specifications

- Voltage:
- Current:
- Package:

## Datasheet

[Link to datasheet]

## Notes

`,
    },
    {
      id: 'mechanical',
      name: 'Mechanical Part',
      description: 'Template for mechanical parts',
      content: `## Dimensions

- Length:
- Width:
- Height:
- Weight:

## Material

## Notes

`,
    },
  ],
  [NodeType.Task]: [
    {
      id: 'blank',
      name: 'Blank Task',
      description: 'Start with an empty task',
    },
    {
      id: 'with-checklist',
      name: 'Task with Checklist',
      description: 'Task with subtasks',
      content: `## Description

What needs to be done?

## Checklist

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Notes

`,
    },
  ],
  [NodeType.Note]: [
    {
      id: 'blank',
      name: 'Blank Note',
      description: 'Start with an empty note',
    },
    {
      id: 'research',
      name: 'Research Note',
      description: 'Document research findings',
      content: `## Summary

Brief overview of the topic.

## Key Findings

- Finding 1
- Finding 2

## Sources

- [Source 1]()
- [Source 2]()

## Related

Link to related nodes.
`,
    },
  ],
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new node with the given parameters
 */
function createNode(
  type: NodeType,
  title: string,
  content: string,
  id: string
): ForgeNode {
  const dates = createNodeDates()

  const baseNode = {
    id,
    title,
    tags: [],
    dates,
    content,
  }

  switch (type) {
    case NodeType.Decision:
      return {
        ...baseNode,
        type: NodeType.Decision,
        status: 'pending',
        selected: null,
        options: [],
        criteria: [],
      } satisfies DecisionNode

    case NodeType.Component:
      return {
        ...baseNode,
        type: NodeType.Component,
        status: 'considering',
        cost: null,
        supplier: null,
        partNumber: null,
        customFields: {},
      } satisfies ComponentNode

    case NodeType.Task:
      return {
        ...baseNode,
        type: NodeType.Task,
        status: 'pending',
        priority: 'medium',
        dependsOn: [],
        blocks: [],
        checklist: [],
      } satisfies TaskNode

    case NodeType.Note:
      return {
        ...baseNode,
        type: NodeType.Note,
      } satisfies NoteNode
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

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const addNode = useUndoableAddNode()
  const nodes = useNodesStore((state) => state.nodes)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedType(defaultType)
      setTitle('')
      setSelectedTemplateId('blank')
      setIsSubmitting(false)
      // Focus title input after dialog animation
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [open, defaultType])

  // Update template selection when type changes
  useEffect(() => {
    setSelectedTemplateId('blank')
  }, [selectedType])

  // Get available templates for selected type
  const availableTemplates = NODE_TEMPLATES[selectedType]

  // Get selected template
  const selectedTemplate = availableTemplates.find(
    (t) => t.id === selectedTemplateId
  )

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

        // Get content from template
        const content = selectedTemplate?.content || ''

        // Create the node
        const node = createNode(selectedType, trimmedTitle, content, nodeId)

        // Add to store (with undo support)
        addNode(node)

        // Set as active node
        setActiveNode(node.id)

        // Notify parent
        onNodeCreated?.(node)

        // Close dialog
        setOpen(false)
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
      addNode,
      setActiveNode,
      onNodeCreated,
      setOpen,
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
              {selectedTemplate && selectedTemplate.id !== 'blank' && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            {/* Footer */}
            <Dialog.Footer>
              <Dialog.Close>Cancel</Dialog.Close>
              <Button type="submit" disabled={!title.trim() || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </Dialog.Footer>
          </form>

          {/* Keyboard shortcut hint */}
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
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
