/**
 * Forge MCP Server Types
 *
 * These types mirror the main Forge application types for use in the MCP server.
 */

import { z } from 'zod'

// ============================================================================
// Node Types
// ============================================================================

export type NodeType =
  | 'decision'
  | 'component'
  | 'task'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

export const NODE_TYPES: NodeType[] = [
  'decision',
  'component',
  'task',
  'note',
  'subsystem',
  'assembly',
  'module',
]

// Status types for different node categories
export type TaskStatus = 'pending' | 'in_progress' | 'complete' | 'blocked'
export type DecisionStatus = 'pending' | 'selected' | 'superseded'
export type ComponentStatus = 'pending' | 'ordered' | 'received' | 'installed'
export type ContainerStatus =
  | 'planning'
  | 'in_progress'
  | 'complete'
  | 'on_hold'

export type Priority = 'high' | 'medium' | 'low'

// ============================================================================
// Base Node Interface
// ============================================================================

export interface NodeDates {
  created: string
  modified: string
}

export interface BaseNode {
  id: string
  type: NodeType
  title: string
  tags: string[]
  dates: NodeDates
  content: string
  parent?: string // For linking to container nodes
}

// ============================================================================
// Specific Node Types
// ============================================================================

export interface TaskNode extends BaseNode {
  type: 'task'
  status: TaskStatus
  priority: Priority
  dependsOn: string[]
  blocks: string[]
  checklist: ChecklistItem[]
  milestone?: string
}

export interface ChecklistItem {
  text: string
  completed: boolean
}

export interface DecisionNode extends BaseNode {
  type: 'decision'
  status: DecisionStatus
  selected?: string
  options: DecisionOption[]
  criteria: DecisionCriterion[]
}

export interface DecisionOption {
  id: string
  name: string
  values: Record<string, string | number>
}

export interface DecisionCriterion {
  id: string
  name: string
  weight: number
  unit?: string
}

export interface ComponentNode extends BaseNode {
  type: 'component'
  status: ComponentStatus
  cost?: number
  supplier?: string
  partNumber?: string
  supplierUrl?: string
  customFields: Record<string, string>
}

export interface NoteNode extends BaseNode {
  type: 'note'
}

export interface SubsystemNode extends BaseNode {
  type: 'subsystem'
  status: ContainerStatus
  description?: string
  requirements?: string[]
}

export interface AssemblyNode extends BaseNode {
  type: 'assembly'
  status: ContainerStatus
  description?: string
  requirements?: string[]
}

export interface ModuleNode extends BaseNode {
  type: 'module'
  status: ContainerStatus
  description?: string
  requirements?: string[]
}

// Discriminated union of all node types
export type ForgeNode =
  | TaskNode
  | DecisionNode
  | ComponentNode
  | NoteNode
  | SubsystemNode
  | AssemblyNode
  | ModuleNode

// ============================================================================
// Project Types
// ============================================================================

export interface ProjectMetadata {
  name: string
  description?: string
  createdAt: string
  modifiedAt: string
}

export interface Project {
  id: string
  name: string
  path: string
  metadata: ProjectMetadata
  nodes: Map<string, ForgeNode>
}

// ============================================================================
// Zod Schemas for Tool Validation
// ============================================================================

export const NodeTypeSchema = z.enum([
  'decision',
  'component',
  'task',
  'note',
  'subsystem',
  'assembly',
  'module',
])

export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'complete',
  'blocked',
])

export const DecisionStatusSchema = z.enum([
  'pending',
  'selected',
  'superseded',
])

export const ComponentStatusSchema = z.enum([
  'pending',
  'ordered',
  'received',
  'installed',
])

export const ContainerStatusSchema = z.enum([
  'planning',
  'in_progress',
  'complete',
  'on_hold',
])

export const PrioritySchema = z.enum(['high', 'medium', 'low'])

// Schema for creating a new node
export const CreateNodeInputSchema = z.object({
  type: NodeTypeSchema,
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  parent: z.string().optional(),
  // Type-specific fields (optional, defaults applied based on type)
  status: z.string().optional(),
  priority: PrioritySchema.optional(),
  dependsOn: z.array(z.string()).optional(),
  cost: z.number().optional(),
  supplier: z.string().optional(),
  partNumber: z.string().optional(),
})

export type CreateNodeInput = z.infer<typeof CreateNodeInputSchema>

// Schema for updating a node
export const UpdateNodeInputSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parent: z.string().optional(),
  status: z.string().optional(),
  priority: PrioritySchema.optional(),
  dependsOn: z.array(z.string()).optional(),
  cost: z.number().optional(),
  supplier: z.string().optional(),
  partNumber: z.string().optional(),
})

export type UpdateNodeInput = z.infer<typeof UpdateNodeInputSchema>

// Schema for searching nodes
export const SearchNodesInputSchema = z.object({
  query: z.string().optional(),
  type: NodeTypeSchema.optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parent: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
})

export type SearchNodesInput = z.infer<typeof SearchNodesInputSchema>

// Schema for deleting a node
export const DeleteNodeInputSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
})

export type DeleteNodeInput = z.infer<typeof DeleteNodeInputSchema>

// ============================================================================
// Type Guards
// ============================================================================

export function isTaskNode(node: ForgeNode): node is TaskNode {
  return node.type === 'task'
}

export function isDecisionNode(node: ForgeNode): node is DecisionNode {
  return node.type === 'decision'
}

export function isComponentNode(node: ForgeNode): node is ComponentNode {
  return node.type === 'component'
}

export function isNoteNode(node: ForgeNode): node is NoteNode {
  return node.type === 'note'
}

export function isSubsystemNode(node: ForgeNode): node is SubsystemNode {
  return node.type === 'subsystem'
}

export function isAssemblyNode(node: ForgeNode): node is AssemblyNode {
  return node.type === 'assembly'
}

export function isModuleNode(node: ForgeNode): node is ModuleNode {
  return node.type === 'module'
}

export function isContainerNode(
  node: ForgeNode
): node is SubsystemNode | AssemblyNode | ModuleNode {
  return (
    node.type === 'subsystem' ||
    node.type === 'assembly' ||
    node.type === 'module'
  )
}
