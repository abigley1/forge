/**
 * API Types for Forge Server
 *
 * Type definitions for all API requests and responses.
 * These types mirror the server's database schema.
 */

/**
 * Node types supported by Forge
 */
export type NodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

/**
 * Project data from API
 */
export interface ApiProject {
  id: string
  name: string
  description: string | null
  created_at: string
  modified_at: string
}

/**
 * Project with statistics
 */
export interface ApiProjectWithStats extends ApiProject {
  node_count: number
  task_count: number
  completed_task_count: number
}

/**
 * Node data from API (includes all type-specific fields)
 */
export interface ApiNode {
  id: string
  project_id: string
  type: NodeType
  title: string
  content: string | null
  status: string | null
  priority: string | null
  parent_id: string | null
  milestone: string | null
  created_at: string
  modified_at: string
  tags: string[]
  depends_on: string[]
  // Component extras
  supplier?: string | null
  part_number?: string | null
  cost?: number | null
  datasheet_url?: string | null
  custom_fields?: Record<string, string | number> | null
  // Decision extras
  selected_option?: string | null
  selection_rationale?: string | null
  selected_date?: string | null
  comparison_data?: unknown | null
  // Task extras
  checklist?: unknown[] | null
}

/**
 * Data for creating a new project
 */
export interface CreateProjectInput {
  id?: string
  name: string
  description?: string
}

/**
 * Data for updating a project
 */
export interface UpdateProjectInput {
  name?: string
  description?: string
}

/**
 * Data for creating a new node
 */
export interface CreateNodeInput {
  id?: string
  type: NodeType
  title: string
  content?: string
  status?: string
  priority?: string
  parent_id?: string
  milestone?: string
  tags?: string[]
  depends_on?: string[]
  // Component extras
  supplier?: string
  part_number?: string
  cost?: number
  datasheet_url?: string
  custom_fields?: Record<string, string | number>
  // Decision extras
  selected_option?: string
  selection_rationale?: string
  selected_date?: string
  comparison_data?: unknown
  // Task extras
  checklist?: unknown[]
}

/**
 * Data for updating a node
 */
export interface UpdateNodeInput {
  title?: string
  content?: string
  status?: string
  priority?: string
  parent_id?: string | null
  milestone?: string | null
  tags?: string[]
  depends_on?: string[]
  // Component extras
  supplier?: string | null
  part_number?: string | null
  cost?: number | null
  datasheet_url?: string | null
  custom_fields?: Record<string, string | number> | null
  // Decision extras
  selected_option?: string | null
  selection_rationale?: string | null
  selected_date?: string | null
  comparison_data?: unknown | null
  // Task extras
  checklist?: unknown[] | null
}

/**
 * Filters for listing nodes
 */
export interface NodeFilters {
  type?: NodeType | NodeType[]
  status?: string | string[]
  tags?: string[]
  parent_id?: string | null
  milestone?: string
  q?: string // Full-text search query
}

/**
 * Dependencies info for a node
 */
export interface NodeDependencies {
  depends_on: string[]
  depended_on_by: string[]
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T
}

/**
 * API error response
 */
export interface ApiError {
  error: string
  code?: string
}

/**
 * Result type for API operations
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
