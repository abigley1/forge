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
  Subsystem: 'subsystem',
  Assembly: 'assembly',
  Module: 'module',
} as const

export type NodeType = (typeof NodeType)[keyof typeof NodeType]

// ============================================================================
// Status Types
// ============================================================================

export type DecisionStatus = 'pending' | 'selected'

export type ComponentStatus = 'selected' | 'considering' | 'rejected'

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'complete'

export type TaskPriority = 'high' | 'medium' | 'low'

export type ContainerStatus =
  | 'planning'
  | 'in_progress'
  | 'complete'
  | 'on_hold'

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
  /** Optional link to a Component node - when set, option syncs from component */
  linkedNodeId?: string
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
  /** Rationale for the selected option (null if not yet decided) */
  rationale: string | null
  /** Timestamp when the decision was selected (null if not yet decided) */
  selectedDate: Date | null
  /** ID of parent container node (Subsystem, Assembly, or Module) */
  parent: string | null
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
  /** ID of parent container node (Subsystem, Assembly, or Module) */
  parent: string | null
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
  /** ID of parent container node (Subsystem, Assembly, or Module) */
  parent: string | null
}

/**
 * Note node for freeform documentation
 */
export interface NoteNode extends BaseNode {
  type: typeof NodeType.Note
  /** ID of parent container node (Subsystem, Assembly, or Module) */
  parent: string | null
}

/**
 * Base interface for container nodes (Subsystem, Assembly, Module)
 * Container nodes organize and group other nodes hierarchically
 */
interface BaseContainerNode extends BaseNode {
  /** Current status of the container */
  status: ContainerStatus
  /** Optional requirements that this container needs to fulfill */
  requirements?: string[]
}

/**
 * Subsystem node for high-level organizational grouping
 * A subsystem represents a major functional area of a project (e.g., "Propulsion", "Power", "Control")
 */
export interface SubsystemNode extends BaseContainerNode {
  type: typeof NodeType.Subsystem
}

/**
 * Assembly node for grouping physical components
 * An assembly represents a collection of parts that form a functional unit (e.g., "Motor Assembly", "Frame Assembly")
 */
export interface AssemblyNode extends BaseContainerNode {
  type: typeof NodeType.Assembly
  /** Optional parent container (Subsystem, Assembly, or Module) */
  parent: string | null
}

/**
 * Module node for grouping related functionality
 * A module represents a logical grouping of related features or components (e.g., "User Interface Module", "Sensor Module")
 */
export interface ModuleNode extends BaseContainerNode {
  type: typeof NodeType.Module
  /** Optional parent container (Subsystem, Assembly, or Module) */
  parent: string | null
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Discriminated union of all node types
 * Use type guards to narrow to specific types
 */
export type ForgeNode =
  | DecisionNode
  | ComponentNode
  | TaskNode
  | NoteNode
  | SubsystemNode
  | AssemblyNode
  | ModuleNode

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

/**
 * Type guard for SubsystemNode
 */
export function isSubsystemNode(node: ForgeNode): node is SubsystemNode {
  return node.type === NodeType.Subsystem
}

/**
 * Type guard for AssemblyNode
 */
export function isAssemblyNode(node: ForgeNode): node is AssemblyNode {
  return node.type === NodeType.Assembly
}

/**
 * Type guard for ModuleNode
 */
export function isModuleNode(node: ForgeNode): node is ModuleNode {
  return node.type === NodeType.Module
}

/**
 * Type guard for any container node (Subsystem, Assembly, or Module)
 */
export function isContainerNode(
  node: ForgeNode
): node is SubsystemNode | AssemblyNode | ModuleNode {
  return (
    node.type === NodeType.Subsystem ||
    node.type === NodeType.Assembly ||
    node.type === NodeType.Module
  )
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
export function createDecisionOption(
  name: string,
  linkedNodeId?: string
): DecisionOption {
  return {
    id: crypto.randomUUID(),
    name,
    values: {},
    ...(linkedNodeId && { linkedNodeId }),
  }
}

/**
 * Create a decision option linked to a component node
 */
export function createLinkedDecisionOption(
  componentNode: ComponentNode
): DecisionOption {
  return {
    id: crypto.randomUUID(),
    name: componentNode.title,
    values: {},
    linkedNodeId: componentNode.id,
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

/**
 * Creates a new decision node with sensible defaults
 */
export function createDecisionNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<DecisionNode, 'type'>>
): DecisionNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Decision,
    title,
    tags: [],
    dates,
    content: '',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    parent: null,
    ...overrides,
  }
}

/**
 * Creates a new subsystem node with sensible defaults
 */
export function createSubsystemNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<SubsystemNode, 'type'>>
): SubsystemNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Subsystem,
    title,
    tags: [],
    dates,
    content: '',
    status: 'planning',
    ...overrides,
  }
}

/**
 * Creates a new assembly node with sensible defaults
 */
export function createAssemblyNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<AssemblyNode, 'type'>>
): AssemblyNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Assembly,
    title,
    tags: [],
    dates,
    content: '',
    status: 'planning',
    parent: null,
    ...overrides,
  }
}

/**
 * Creates a new module node with sensible defaults
 */
export function createModuleNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<ModuleNode, 'type'>>
): ModuleNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Module,
    title,
    tags: [],
    dates,
    content: '',
    status: 'planning',
    parent: null,
    ...overrides,
  }
}

/**
 * Creates a new component node with sensible defaults
 */
export function createComponentNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<ComponentNode, 'type'>>
): ComponentNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Component,
    title,
    tags: [],
    dates,
    content: '',
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
    parent: null,
    ...overrides,
  }
}

/**
 * Creates a new task node with sensible defaults
 */
export function createTaskNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<TaskNode, 'type'>>
): TaskNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Task,
    title,
    tags: [],
    dates,
    content: '',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
    ...overrides,
  }
}

/**
 * Creates a new note node with sensible defaults
 */
export function createNoteNode(
  id: string,
  title: string,
  overrides?: Partial<Omit<NoteNode, 'type'>>
): NoteNode {
  const dates = createNodeDates()
  return {
    id,
    type: NodeType.Note,
    title,
    tags: [],
    dates,
    content: '',
    parent: null,
    ...overrides,
  }
}
