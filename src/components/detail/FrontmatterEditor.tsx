/**
 * FrontmatterEditor - Type-aware frontmatter field editor
 *
 * Renders appropriate fields based on node type:
 * - Decision: status, selected option
 * - Component: status, cost, supplier, part number, custom fields
 * - Task: status, priority, depends-on, checklist
 * - Note: (no additional fields)
 */

import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  NodeType,
  isDecisionNode,
  isComponentNode,
  isTaskNode,
  type ForgeNode,
  type DecisionNode,
  type ComponentNode,
  type TaskNode,
  type ChecklistItem,
  type TaskPriority,
} from '@/types'
import { NodeTitleEditor } from './NodeTitleEditor'
import { StatusSelect } from './StatusSelect'
import { TagInput } from './TagInput'
import { PrioritySelector } from './PrioritySelector'
import { ChecklistEditor } from './ChecklistEditor'
import { ComponentFields } from './ComponentFields'
import { DependencyEditor } from './DependencyEditor'
import { MilestoneSelector, extractMilestones } from './MilestoneSelector'

export interface FrontmatterEditorProps {
  /** The node being edited */
  node: ForgeNode
  /** Called when node fields change */
  onChange: (updates: Partial<ForgeNode>) => void
  /** Available tags for autocomplete */
  availableTags?: string[]
  /** All available nodes (for dependency editor) */
  availableNodes?: Map<string, ForgeNode>
  /** Called when clicking a node to navigate to it */
  onNavigate?: (nodeId: string) => void
  /** Whether this is a new node (for auto-focus) */
  isNewNode?: boolean
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Optional class name */
  className?: string
}

/**
 * Renders appropriate frontmatter fields based on node type
 */
export function FrontmatterEditor({
  node,
  onChange,
  availableTags = [],
  availableNodes = new Map(),
  onNavigate,
  isNewNode = false,
  disabled = false,
  className,
}: FrontmatterEditorProps) {
  // Title change handler
  const handleTitleChange = useCallback(
    (title: string) => {
      onChange({ title })
    },
    [onChange]
  )

  // Tags change handler
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      onChange({ tags })
    },
    [onChange]
  )

  // Status change handler (type-safe for each node type)
  const handleStatusChange = useCallback(
    (status: string) => {
      onChange({ status } as Partial<ForgeNode>)
    },
    [onChange]
  )

  // Decision-specific handlers
  const handleDecisionChange = useCallback(
    (updates: Partial<DecisionNode>) => {
      onChange(updates as Partial<ForgeNode>)
    },
    [onChange]
  )

  // Component-specific handlers
  const handleComponentChange = useCallback(
    (updates: Partial<ComponentNode>) => {
      onChange(updates as Partial<ForgeNode>)
    },
    [onChange]
  )

  // Task-specific handlers
  const handlePriorityChange = useCallback(
    (priority: TaskPriority) => {
      onChange({ priority } as Partial<ForgeNode>)
    },
    [onChange]
  )

  const handleChecklistChange = useCallback(
    (checklist: ChecklistItem[]) => {
      onChange({ checklist } as Partial<ForgeNode>)
    },
    [onChange]
  )

  const handleDependsOnChange = useCallback(
    (dependsOn: string[]) => {
      onChange({ dependsOn } as Partial<ForgeNode>)
    },
    [onChange]
  )

  const handleMilestoneChange = useCallback(
    (milestone: string | undefined) => {
      onChange({ milestone } as Partial<ForgeNode>)
    },
    [onChange]
  )

  // Extract available milestones from task nodes
  const availableMilestones = useMemo(() => {
    const taskNodes = Array.from(availableNodes.values()).filter(isTaskNode)
    return extractMilestones(taskNodes)
  }, [availableNodes])

  // Calculate which nodes are blocked by this node (have this node in their dependsOn)
  const blockedByThis = useMemo(() => {
    const blocked: string[] = []
    for (const [id, n] of availableNodes) {
      if (isTaskNode(n) && n.dependsOn.includes(node.id)) {
        blocked.push(id)
      }
    }
    return blocked
  }, [availableNodes, node.id])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Title - always shown */}
      <NodeTitleEditor
        value={node.title}
        onChange={handleTitleChange}
        focusOnMount={isNewNode}
      />

      {/* Tags - always shown */}
      <TagInput
        value={node.tags}
        onChange={handleTagsChange}
        suggestions={availableTags}
        disabled={disabled}
      />

      {/* Status - shown for all except Note */}
      {node.type !== NodeType.Note && (
        <StatusSelect
          value={(node as DecisionNode | ComponentNode | TaskNode).status}
          onChange={handleStatusChange}
          nodeType={node.type}
          disabled={disabled}
        />
      )}

      {/* Decision-specific fields */}
      {isDecisionNode(node) && (
        <DecisionFields
          node={node}
          onChange={handleDecisionChange}
          disabled={disabled}
        />
      )}

      {/* Component-specific fields */}
      {isComponentNode(node) && (
        <ComponentFields
          cost={node.cost}
          supplier={node.supplier}
          partNumber={node.partNumber}
          customFields={node.customFields}
          onChange={handleComponentChange}
          disabled={disabled}
        />
      )}

      {/* Task-specific fields */}
      {isTaskNode(node) && (
        <TaskFields
          node={node}
          onPriorityChange={handlePriorityChange}
          onChecklistChange={handleChecklistChange}
          onDependsOnChange={handleDependsOnChange}
          onMilestoneChange={handleMilestoneChange}
          availableNodes={availableNodes}
          availableMilestones={availableMilestones}
          blockedByThis={blockedByThis}
          onNavigate={onNavigate}
          disabled={disabled}
        />
      )}
    </div>
  )
}

// ============================================================================
// Decision-specific fields
// ============================================================================

interface DecisionFieldsProps {
  node: DecisionNode
  onChange: (updates: Partial<DecisionNode>) => void
  disabled?: boolean
}

function DecisionFields({ node, onChange, disabled }: DecisionFieldsProps) {
  const handleSelectedChange = useCallback(
    (selected: string) => {
      onChange({ selected: selected || null })
    },
    [onChange]
  )

  // Only show selected option dropdown if there are options
  if (node.options.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No options defined yet. Add options in the comparison table to select
          a winner.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="decision-selected"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Selected Option
      </label>
      <select
        id="decision-selected"
        value={node.selected || ''}
        onChange={(e) => handleSelectedChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full rounded-md border border-gray-300 px-3 py-2',
          'text-sm text-gray-900',
          'focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
          'dark:focus:ring-gray-300'
        )}
      >
        <option value="">None selected</option>
        {node.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// ============================================================================
// Task-specific fields
// ============================================================================

interface TaskFieldsProps {
  node: TaskNode
  onPriorityChange: (priority: TaskPriority) => void
  onChecklistChange: (checklist: ChecklistItem[]) => void
  onDependsOnChange: (dependsOn: string[]) => void
  onMilestoneChange: (milestone: string | undefined) => void
  availableNodes: Map<string, ForgeNode>
  availableMilestones: string[]
  blockedByThis: string[]
  onNavigate?: (nodeId: string) => void
  disabled?: boolean
}

function TaskFields({
  node,
  onPriorityChange,
  onChecklistChange,
  onDependsOnChange,
  onMilestoneChange,
  availableNodes,
  availableMilestones,
  blockedByThis,
  onNavigate,
  disabled,
}: TaskFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Priority */}
      <PrioritySelector
        value={node.priority}
        onChange={onPriorityChange}
        disabled={disabled}
      />

      {/* Milestone */}
      <MilestoneSelector
        value={node.milestone}
        onChange={onMilestoneChange}
        suggestions={availableMilestones}
        disabled={disabled}
      />

      {/* Dependencies */}
      <DependencyEditor
        nodeId={node.id}
        value={node.dependsOn}
        onChange={onDependsOnChange}
        availableNodes={availableNodes}
        blockedByThis={blockedByThis}
        onNavigate={onNavigate}
        disabled={disabled}
      />

      {/* Checklist */}
      <ChecklistEditor
        value={node.checklist}
        onChange={onChecklistChange}
        disabled={disabled}
      />
    </div>
  )
}
