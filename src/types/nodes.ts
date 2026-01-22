/**
 * Node Type System for Forge
 *
 * Defines TypeScript types for all node types (Decision, Component, Task, Note)
 * with type guards for runtime type narrowing.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Enum of all node types in the system
 */
export const NodeType = {
  Decision: 'decision',
  Component: 'component',
  Task: 'task',
  Note: 'note',
} as const

export type NodeType = (typeof NodeType)[keyof typeof NodeType]

// ============================================================================
// Status Types
// ============================================================================

export type DecisionStatus = 'pending' | 'selected'

export type ComponentStatus = 'selected' | 'considering' | 'rejected'

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'complete'

export type TaskPriority = 'high' | 'medium' | 'low'

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Dates associated with a node
 */
export interface NodeDates {
  created: Date
  modified: Date
}

/**
 * A single option in a decision comparison table
 */
export interface DecisionOption {
  id: string
  name: string
  /** Values for each criterion, keyed by criterion id */
  values: Record<string, string | number>
}

/**
 * A criterion used to evaluate decision options
 */
export interface DecisionCriterion {
  id: string
  name: string
  /** Weight from 0-10, used in scoring */
  weight: number
  /** Optional unit (e.g., "Nm", "V", "$") */
  unit?: string
}

/**
 * A checklist item in a task node
 */
export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

// ============================================================================
// Base Node Interface
// ============================================================================

/**
 * Base interface for all node types
 */
export interface BaseNode {
  /** Unique identifier (slug-based) */
  id: string
  /** Discriminator field for type narrowing */
  type: NodeType
  /** Display title of the node */
  title: string
  /** Tags for categorization and filtering */
  tags: string[]
  /** Creation and modification timestamps */
  dates: NodeDates
  /** Markdown content body */
  content: string
}

// ============================================================================
// Specific Node Types
// ============================================================================

/**
 * Decision node for comparing options and making choices
 */
export interface DecisionNode extends BaseNode {
  type: typeof NodeType.Decision
  /** Current status of the decision */
  status: DecisionStatus
  /** ID of the selected option (null if not yet decided) */
  selected: string | null
  /** Options being compared */
  options: DecisionOption[]
  /** Criteria for evaluation */
  criteria: DecisionCriterion[]
}

/**
 * Component node for tracking parts and materials
 */
export interface ComponentNode extends BaseNode {
  type: typeof NodeType.Component
  /** Current status of the component */
  status: ComponentStatus
  /** Cost in base currency (null if unknown) */
  cost: number | null
  /** Supplier name or identifier */
  supplier: string | null
  /** Part number or SKU */
  partNumber: string | null
  /** Custom fields for specs (e.g., torque, voltage, weight) */
  customFields: Record<string, string | number>
}

/**
 * Task node for tracking work items with dependencies
 */
export interface TaskNode extends BaseNode {
  type: typeof NodeType.Task
  /** Current status of the task */
  status: TaskStatus
  /** Priority level */
  priority: TaskPriority
  /** IDs of nodes this task depends on (must complete before this) */
  dependsOn: string[]
  /** IDs of nodes this task blocks (waiting on this) */
  blocks: string[]
  /** Subtasks as a checklist */
  checklist: ChecklistItem[]
  /** Optional milestone for grouping related tasks */
  milestone?: string
}

/**
 * Note node for freeform documentation
 */
export interface NoteNode extends BaseNode {
  type: typeof NodeType.Note
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Discriminated union of all node types
 * Use type guards to narrow to specific types
 */
export type ForgeNode = DecisionNode | ComponentNode | TaskNode | NoteNode

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for DecisionNode
 */
export function isDecisionNode(node: ForgeNode): node is DecisionNode {
  return node.type === NodeType.Decision
}

/**
 * Type guard for ComponentNode
 */
export function isComponentNode(node: ForgeNode): node is ComponentNode {
  return node.type === NodeType.Component
}

/**
 * Type guard for TaskNode
 */
export function isTaskNode(node: ForgeNode): node is TaskNode {
  return node.type === NodeType.Task
}

/**
 * Type guard for NoteNode
 */
export function isNoteNode(node: ForgeNode): node is NoteNode {
  return node.type === NodeType.Note
}

// ============================================================================
// Factory Helpers
// ============================================================================

/**
 * Creates a new node dates object with current timestamp
 */
export function createNodeDates(): NodeDates {
  const now = new Date()
  return {
    created: now,
    modified: now,
  }
}

/**
 * Creates a new checklist item
 */
export function createChecklistItem(text: string): ChecklistItem {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
  }
}

/**
 * Creates a new decision option
 */
export function createDecisionOption(name: string): DecisionOption {
  return {
    id: crypto.randomUUID(),
    name,
    values: {},
  }
}

/**
 * Creates a new decision criterion
 */
export function createDecisionCriterion(
  name: string,
  weight: number = 5,
  unit?: string
): DecisionCriterion {
  return {
    id: crypto.randomUUID(),
    name,
    weight,
    unit,
  }
}
