/**
 * Runtime Validation with Zod
 *
 * Provides Zod schemas for validating node frontmatter data
 * and a validateNode() function that returns a Result type.
 */

import { z } from 'zod'
import { NodeType } from '../types/nodes'
import type { ForgeNode } from '../types/nodes'

// ============================================================================
// Result Type
// ============================================================================

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: 'INVALID_TYPE' | 'MISSING_FIELD' | 'INVALID_VALUE' | 'PARSE_ERROR'
  /** Human-readable error message */
  message: string
  /** Path to the invalid field (e.g., "status", "options[0].name") */
  path?: string
  /** All validation issues (for multiple errors) */
  issues?: Array<{
    path: string
    message: string
  }>
}

/**
 * Result type for validation operations
 * Either success with the validated node, or failure with error details
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError }

// ============================================================================
// Helper Schemas
// ============================================================================

/**
 * Schema for optional date with default to current time
 */
const optionalDateSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return new Date()
  if (val instanceof Date) return val
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}, z.date())

/**
 * Schema for string arrays with default empty array
 */
const stringArraySchema = z.array(z.string()).default([])

/**
 * Schema for DecisionOption
 */
const decisionOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.record(z.union([z.string(), z.number()])).default({}),
  linkedNodeId: z.string().optional(),
})

/**
 * Schema for DecisionCriterion
 */
const decisionCriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(10).default(5),
  unit: z.string().optional(),
})

/**
 * Schema for ChecklistItem
 */
const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean().default(false),
})

// ============================================================================
// Node Type Schemas
// ============================================================================

/**
 * Base node schema (shared fields)
 */
const baseNodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  title: z.string().min(1, 'Title is required'),
  tags: stringArraySchema,
  content: z.string().default(''),
})

/**
 * Node dates schema
 */
const nodeDatesSchema = z.object({
  created: optionalDateSchema,
  modified: optionalDateSchema,
})

/**
 * Decision status values
 */
const decisionStatusSchema = z.enum(['pending', 'selected'])

/**
 * Component status values
 */
const componentStatusSchema = z.enum(['selected', 'considering', 'rejected'])

/**
 * Task status values
 */
const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'blocked',
  'complete',
])

/**
 * Task priority values
 */
const taskPrioritySchema = z.enum(['high', 'medium', 'low'])

/**
 * Schema for nullable date (parses from string/Date or null)
 */
const nullableDateSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return null
  if (val instanceof Date) return val
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return null
}, z.date().nullable())

/**
 * Decision node frontmatter schema
 */
export const decisionNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Decision),
  status: decisionStatusSchema.default('pending'),
  selected: z.string().nullable().default(null),
  options: z.array(decisionOptionSchema).default([]),
  criteria: z.array(decisionCriterionSchema).default([]),
  rationale: z.string().nullable().default(null),
  selectedDate: nullableDateSchema.default(null),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  parent: z.string().nullable().default(null),
})

/**
 * Component node frontmatter schema
 */
export const componentNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Component),
  status: componentStatusSchema.default('considering'),
  cost: z.number().nullable().default(null),
  supplier: z.string().nullable().default(null),
  partNumber: z.string().nullable().default(null),
  customFields: z.record(z.union([z.string(), z.number()])).default({}),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  parent: z.string().nullable().default(null),
})

/**
 * Task node frontmatter schema
 */
export const taskNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Task),
  status: taskStatusSchema.default('pending'),
  priority: taskPrioritySchema.default('medium'),
  dependsOn: stringArraySchema,
  blocks: stringArraySchema,
  checklist: z.array(checklistItemSchema).default([]),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  milestone: z.string().optional(),
  parent: z.string().nullable().default(null),
})

/**
 * Note node frontmatter schema
 */
export const noteNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Note),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  parent: z.string().nullable().default(null),
})

/**
 * Subsystem node schema
 */

/**
 * Container status schema - used by Subsystem, Assembly, and Module nodes
 */
export const containerStatusSchema = z.enum([
  'planning',
  'in_progress',
  'complete',
  'on_hold',
])

export const subsystemNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Subsystem),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  status: containerStatusSchema.default('planning'),
  requirements: z.array(z.string()).optional(),
})

/**
 * Assembly node schema
 */
export const assemblyNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Assembly),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  status: containerStatusSchema.default('planning'),
  requirements: z.array(z.string()).optional(),
  parent: z.string().nullable().default(null),
})

/**
 * Module node schema
 */
export const moduleNodeSchema = baseNodeSchema.extend({
  type: z.literal(NodeType.Module),
  dates: nodeDatesSchema.default({ created: new Date(), modified: new Date() }),
  status: containerStatusSchema.default('planning'),
  requirements: z.array(z.string()).optional(),
  parent: z.string().nullable().default(null),
})

/**
 * Union schema for any node type
 */
export const forgeNodeSchema = z.discriminatedUnion('type', [
  decisionNodeSchema,
  componentNodeSchema,
  taskNodeSchema,
  noteNodeSchema,
  subsystemNodeSchema,
  assemblyNodeSchema,
  moduleNodeSchema,
])

// ============================================================================
// Frontmatter Validation Schemas
// ============================================================================

/**
 * Schema for validating raw frontmatter data (before conversion to ForgeNode)
 * Uses snake_case for depends_on as it appears in frontmatter
 */
const baseFrontmatterSchema = z.object({
  type: z.enum([
    'decision',
    'component',
    'task',
    'note',
    'subsystem',
    'assembly',
    'module',
  ]),
  tags: z.array(z.string()).optional(),
  created: z.union([z.string(), z.date(), z.number()]).optional(),
  modified: z.union([z.string(), z.date(), z.number()]).optional(),
})

/**
 * Decision frontmatter schema
 */
export const decisionFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('decision'),
  status: decisionStatusSchema.optional(),
  selected: z.string().nullable().optional(),
  options: z.array(decisionOptionSchema).optional(),
  criteria: z.array(decisionCriterionSchema).optional(),
  rationale: z.string().nullable().optional(),
  selected_date: z
    .union([z.string(), z.date(), z.number()])
    .nullable()
    .optional(),
  parent: z.string().nullable().optional(),
})

/**
 * Component frontmatter schema
 */
export const componentFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('component'),
  status: componentStatusSchema.optional(),
  cost: z.number().nullable().optional(),
  supplier: z.string().nullable().optional(),
  partNumber: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
})

/**
 * Task frontmatter schema (uses snake_case depends_on from files)
 */
export const taskFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('task'),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  depends_on: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  milestone: z.string().optional(),
  parent: z.string().nullable().optional(),
})

/**
 * Note frontmatter schema
 */
export const noteFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('note'),
  parent: z.string().nullable().optional(),
})

/**
 * Subsystem frontmatter schema
 */
export const subsystemFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('subsystem'),
  status: containerStatusSchema.optional().default('planning'),
  requirements: z.array(z.string()).optional(),
})

/**
 * Assembly frontmatter schema
 */
export const assemblyFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('assembly'),
  status: containerStatusSchema.optional().default('planning'),
  requirements: z.array(z.string()).optional(),
})

/**
 * Module frontmatter schema
 */
export const moduleFrontmatterSchema = baseFrontmatterSchema.extend({
  type: z.literal('module'),
  status: containerStatusSchema.optional().default('planning'),
  requirements: z.array(z.string()).optional(),
})

/**
 * Union of all frontmatter schemas
 */
export const frontmatterSchema = z.discriminatedUnion('type', [
  decisionFrontmatterSchema,
  componentFrontmatterSchema,
  taskFrontmatterSchema,
  noteFrontmatterSchema,
  subsystemFrontmatterSchema,
  assemblyFrontmatterSchema,
  moduleFrontmatterSchema,
])

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Converts Zod errors to ValidationError format
 */
function zodErrorToValidationError(error: z.ZodError): ValidationError {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  const firstIssue = issues[0]
  const code =
    error.issues[0]?.code === 'invalid_type'
      ? 'INVALID_TYPE'
      : error.issues[0]?.code === 'invalid_enum_value'
        ? 'INVALID_VALUE'
        : 'PARSE_ERROR'

  return {
    code,
    message: firstIssue?.message || 'Validation failed',
    path: firstIssue?.path,
    issues,
  }
}

/**
 * Validates raw frontmatter data and returns a validated frontmatter object
 *
 * @param data - Raw frontmatter data from parsed markdown
 * @returns ValidationResult with typed frontmatter or error details
 */
export function validateFrontmatter(
  data: Record<string, unknown>
): ValidationResult<z.infer<typeof frontmatterSchema>> {
  const result = frontmatterSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, error: zodErrorToValidationError(result.error) }
}

/**
 * Validates and converts raw data to a ForgeNode
 *
 * Takes raw frontmatter data plus id, title, and content, and validates
 * it against the appropriate schema based on the type field.
 *
 * @param data - Raw data including frontmatter fields, id, title, content
 * @returns ValidationResult<ForgeNode> with the validated node or error details
 *
 * @example
 * ```ts
 * const result = validateNode({
 *   id: 'my-task',
 *   type: 'task',
 *   title: 'My Task',
 *   status: 'pending',
 *   priority: 'high',
 *   content: 'Task description...',
 *   tags: ['important'],
 * })
 *
 * if (result.success) {
 *   console.log(result.data) // TaskNode
 * } else {
 *   console.error(result.error.message)
 * }
 * ```
 */
export function validateNode(
  data: Record<string, unknown>
): ValidationResult<ForgeNode> {
  // Check for required type field first
  if (!data.type) {
    return {
      success: false,
      error: {
        code: 'MISSING_FIELD',
        message: 'Missing required field: type',
        path: 'type',
      },
    }
  }

  // Validate type is a known value
  const validTypes = [
    'decision',
    'component',
    'task',
    'note',
    'subsystem',
    'assembly',
    'module',
  ]
  if (!validTypes.includes(data.type as string)) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: `Invalid node type: ${data.type}. Must be one of: ${validTypes.join(', ')}`,
        path: 'type',
      },
    }
  }

  // Check for required id field
  if (!data.id || (typeof data.id === 'string' && data.id.trim() === '')) {
    return {
      success: false,
      error: {
        code: 'MISSING_FIELD',
        message: 'Missing required field: id',
        path: 'id',
      },
    }
  }

  // Check for required title field
  if (
    !data.title ||
    (typeof data.title === 'string' && data.title.trim() === '')
  ) {
    return {
      success: false,
      error: {
        code: 'MISSING_FIELD',
        message: 'Missing required field: title',
        path: 'title',
      },
    }
  }

  // Transform snake_case fields to camelCase
  const transformedData = { ...data }
  if (data.type === 'task' && 'depends_on' in data) {
    transformedData.dependsOn = data.depends_on
    delete transformedData.depends_on
  }
  if (data.type === 'decision' && 'selected_date' in data) {
    transformedData.selectedDate = data.selected_date
    delete transformedData.selected_date
  }

  // Add dates if not present
  if (!transformedData.dates) {
    const now = new Date()
    const created =
      transformedData.created instanceof Date
        ? transformedData.created
        : transformedData.created
          ? new Date(transformedData.created as string | number)
          : now
    const modified =
      transformedData.modified instanceof Date
        ? transformedData.modified
        : transformedData.modified
          ? new Date(transformedData.modified as string | number)
          : now

    transformedData.dates = {
      created: isNaN(created.getTime()) ? now : created,
      modified: isNaN(modified.getTime()) ? now : modified,
    }
  }

  // Remove flat created/modified if dates object exists
  if (transformedData.dates) {
    delete transformedData.created
    delete transformedData.modified
  }

  // Validate against the full node schema
  const result = forgeNodeSchema.safeParse(transformedData)

  if (result.success) {
    return { success: true, data: result.data as ForgeNode }
  }

  return { success: false, error: zodErrorToValidationError(result.error) }
}

/**
 * Validates if data can be parsed as a valid DecisionNode
 *
 * @returns true if data validates as a DecisionNode
 */
export function isValidDecisionNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Decision
}

/**
 * Validates if data can be parsed as a valid ComponentNode
 *
 * @returns true if data validates as a ComponentNode
 */
export function isValidComponentNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Component
}

/**
 * Validates if data can be parsed as a valid TaskNode
 *
 * @returns true if data validates as a TaskNode
 */
export function isValidTaskNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Task
}

/**
 * Validates if data can be parsed as a valid NoteNode
 *
 * @returns true if data validates as a NoteNode
 */
export function isValidNoteNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Note
}

/**
 * Validates if data can be parsed as a valid SubsystemNode
 *
 * @returns true if data validates as a SubsystemNode
 */
export function isValidSubsystemNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Subsystem
}

/**
 * Validates if data can be parsed as a valid AssemblyNode
 *
 * @returns true if data validates as an AssemblyNode
 */
export function isValidAssemblyNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Assembly
}

/**
 * Validates if data can be parsed as a valid ModuleNode
 *
 * @returns true if data validates as a ModuleNode
 */
export function isValidModuleNode(data: Record<string, unknown>): boolean {
  const result = validateNode(data)
  return result.success && result.data.type === NodeType.Module
}

// ============================================================================
// Exported Types (for convenience)
// ============================================================================

export type DecisionFrontmatter = z.infer<typeof decisionFrontmatterSchema>
export type ComponentFrontmatter = z.infer<typeof componentFrontmatterSchema>
export type TaskFrontmatter = z.infer<typeof taskFrontmatterSchema>
export type NoteFrontmatter = z.infer<typeof noteFrontmatterSchema>
export type SubsystemFrontmatter = z.infer<typeof subsystemFrontmatterSchema>
export type AssemblyFrontmatter = z.infer<typeof assemblyFrontmatterSchema>
export type ModuleFrontmatter = z.infer<typeof moduleFrontmatterSchema>
export type Frontmatter = z.infer<typeof frontmatterSchema>
