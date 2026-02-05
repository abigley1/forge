/**
 * Node Repository
 *
 * Handles all database operations for nodes, including:
 * - Basic CRUD operations
 * - Tags management
 * - Dependencies management
 * - Component/Decision extra data
 */

import type { DatabaseInstance } from './index.js'
import type {
  NodeRow,
  NodeType,
  ComponentExtraRow,
  DecisionExtraRow,
  TaskExtraRow,
} from './schema.js'
import { VALID_NODE_TYPES } from './schema.js'
import { randomUUID } from 'node:crypto'

/**
 * Full node data including tags, dependencies, and type-specific extras
 */
export interface NodeWithRelations extends NodeRow {
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
 * Data for creating a new node
 */
export interface CreateNodeData {
  id?: string
  project_id: string
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
export interface UpdateNodeData {
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
 * Search filters for finding nodes
 */
export interface NodeSearchFilters {
  type?: NodeType | NodeType[]
  status?: string | string[]
  tags?: string[]
  parent_id?: string | null
  milestone?: string
  query?: string // Full-text search in title and content
}

/**
 * Repository for node database operations
 */
export class NodeRepository {
  constructor(private db: DatabaseInstance) {}

  /**
   * Create a new node with all related data
   */
  create(data: CreateNodeData): NodeWithRelations {
    const id = data.id ?? randomUUID()
    const now = new Date().toISOString()

    // Validate node type
    if (!VALID_NODE_TYPES.includes(data.type)) {
      throw new Error(`Invalid node type: ${data.type}`)
    }

    // Use transaction for atomicity
    const result = this.db.transaction(() => {
      // Insert main node
      const nodeStmt = this.db.prepare(`
        INSERT INTO nodes (id, project_id, type, title, content, status, priority, parent_id, milestone, created_at, modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      nodeStmt.run(
        id,
        data.project_id,
        data.type,
        data.title,
        data.content ?? null,
        data.status ?? null,
        data.priority ?? null,
        data.parent_id ?? null,
        data.milestone ?? null,
        now,
        now
      )

      // Insert tags
      if (data.tags && data.tags.length > 0) {
        const tagStmt = this.db.prepare(
          'INSERT INTO node_tags (node_id, tag) VALUES (?, ?)'
        )
        for (const tag of data.tags) {
          tagStmt.run(id, tag)
        }
      }

      // Insert dependencies
      if (data.depends_on && data.depends_on.length > 0) {
        const depStmt = this.db.prepare(
          'INSERT INTO node_dependencies (node_id, depends_on_id) VALUES (?, ?)'
        )
        for (const depId of data.depends_on) {
          depStmt.run(id, depId)
        }
      }

      // Insert component extras
      if (data.type === 'component') {
        const componentStmt = this.db.prepare(`
          INSERT INTO components_extra (node_id, supplier, part_number, cost, datasheet_url, custom_fields)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        componentStmt.run(
          id,
          data.supplier ?? null,
          data.part_number ?? null,
          data.cost ?? null,
          data.datasheet_url ?? null,
          data.custom_fields ? JSON.stringify(data.custom_fields) : null
        )
      }

      // Insert decision extras
      if (data.type === 'decision') {
        const decisionStmt = this.db.prepare(`
          INSERT INTO decisions_extra (node_id, selected_option, selection_rationale, selected_date, comparison_data)
          VALUES (?, ?, ?, ?, ?)
        `)
        decisionStmt.run(
          id,
          data.selected_option ?? null,
          data.selection_rationale ?? null,
          data.selected_date ?? null,
          data.comparison_data ? JSON.stringify(data.comparison_data) : null
        )
      }

      // Insert task extras
      if (data.type === 'task') {
        const taskStmt = this.db.prepare(`
          INSERT INTO tasks_extra (node_id, checklist)
          VALUES (?, ?)
        `)
        taskStmt.run(id, data.checklist ? JSON.stringify(data.checklist) : null)
      }

      return this.findById(id)!
    })()

    return result
  }

  /**
   * Find a node by ID with all relations
   */
  findById(id: string): NodeWithRelations | null {
    const nodeStmt = this.db.prepare('SELECT * FROM nodes WHERE id = ?')
    const node = nodeStmt.get(id) as NodeRow | undefined

    if (!node) {
      return null
    }

    return this.enrichNode(node)
  }

  /**
   * Find all nodes for a project
   */
  findByProject(
    projectId: string,
    filters?: NodeSearchFilters
  ): NodeWithRelations[] {
    let sql = 'SELECT * FROM nodes WHERE project_id = ?'
    const params: unknown[] = [projectId]

    if (filters) {
      // Type filter
      if (filters.type) {
        const types = Array.isArray(filters.type)
          ? filters.type
          : [filters.type]
        sql += ` AND type IN (${types.map(() => '?').join(', ')})`
        params.push(...types)
      }

      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status]
        sql += ` AND status IN (${statuses.map(() => '?').join(', ')})`
        params.push(...statuses)
      }

      // Parent filter
      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          sql += ' AND parent_id IS NULL'
        } else {
          sql += ' AND parent_id = ?'
          params.push(filters.parent_id)
        }
      }

      // Milestone filter
      if (filters.milestone) {
        sql += ' AND milestone = ?'
        params.push(filters.milestone)
      }

      // Full-text search
      if (filters.query) {
        sql += ' AND (title LIKE ? OR content LIKE ?)'
        const pattern = `%${filters.query}%`
        params.push(pattern, pattern)
      }
    }

    sql += ' ORDER BY modified_at DESC'

    const stmt = this.db.prepare(sql)
    const nodes = stmt.all(...params) as NodeRow[]

    // Filter by tags if specified (requires join or separate query)
    let result = nodes.map((node) => this.enrichNode(node))

    if (filters?.tags && filters.tags.length > 0) {
      result = result.filter((node) =>
        filters.tags!.some((tag) => node.tags.includes(tag))
      )
    }

    return result
  }

  /**
   * Update a node
   */
  update(id: string, data: UpdateNodeData): NodeWithRelations | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    return this.db.transaction(() => {
      const updates: string[] = []
      const values: unknown[] = []

      // Build dynamic update query
      const fields: Array<[keyof UpdateNodeData, string]> = [
        ['title', 'title'],
        ['content', 'content'],
        ['status', 'status'],
        ['priority', 'priority'],
        ['parent_id', 'parent_id'],
        ['milestone', 'milestone'],
      ]

      for (const [key, column] of fields) {
        if (data[key] !== undefined) {
          updates.push(`${column} = ?`)
          values.push(data[key])
        }
      }

      if (updates.length > 0) {
        updates.push('modified_at = ?')
        values.push(new Date().toISOString())
        values.push(id)

        const stmt = this.db.prepare(
          `UPDATE nodes SET ${updates.join(', ')} WHERE id = ?`
        )
        stmt.run(...values)
      }

      // Update tags
      if (data.tags !== undefined) {
        this.db.prepare('DELETE FROM node_tags WHERE node_id = ?').run(id)
        if (data.tags.length > 0) {
          const tagStmt = this.db.prepare(
            'INSERT INTO node_tags (node_id, tag) VALUES (?, ?)'
          )
          for (const tag of data.tags) {
            tagStmt.run(id, tag)
          }
        }
      }

      // Update dependencies
      if (data.depends_on !== undefined) {
        this.db
          .prepare('DELETE FROM node_dependencies WHERE node_id = ?')
          .run(id)
        if (data.depends_on.length > 0) {
          const depStmt = this.db.prepare(
            'INSERT INTO node_dependencies (node_id, depends_on_id) VALUES (?, ?)'
          )
          for (const depId of data.depends_on) {
            depStmt.run(id, depId)
          }
        }
      }

      // Update component extras
      if (existing.type === 'component') {
        const componentFields: Array<[keyof UpdateNodeData, string, boolean]> =
          [
            ['supplier', 'supplier', false],
            ['part_number', 'part_number', false],
            ['cost', 'cost', false],
            ['datasheet_url', 'datasheet_url', false],
            ['custom_fields', 'custom_fields', true], // needs JSON stringify
          ]

        const componentUpdates: string[] = []
        const componentValues: unknown[] = []

        for (const [key, column, isJson] of componentFields) {
          if (data[key] !== undefined) {
            componentUpdates.push(`${column} = ?`)
            componentValues.push(
              isJson && data[key] !== null
                ? JSON.stringify(data[key])
                : data[key]
            )
          }
        }

        if (componentUpdates.length > 0) {
          componentValues.push(id)
          this.db
            .prepare(
              `UPDATE components_extra SET ${componentUpdates.join(', ')} WHERE node_id = ?`
            )
            .run(...componentValues)
        }
      }

      // Update decision extras
      if (existing.type === 'decision') {
        const decisionFields: Array<[keyof UpdateNodeData, string, boolean]> = [
          ['selected_option', 'selected_option', false],
          ['selection_rationale', 'selection_rationale', false],
          ['selected_date', 'selected_date', false],
          ['comparison_data', 'comparison_data', true], // needs JSON stringify
        ]

        const decisionUpdates: string[] = []
        const decisionValues: unknown[] = []

        for (const [key, column, isJson] of decisionFields) {
          if (data[key] !== undefined) {
            decisionUpdates.push(`${column} = ?`)
            decisionValues.push(
              isJson && data[key] !== null
                ? JSON.stringify(data[key])
                : data[key]
            )
          }
        }

        if (decisionUpdates.length > 0) {
          decisionValues.push(id)
          this.db
            .prepare(
              `UPDATE decisions_extra SET ${decisionUpdates.join(', ')} WHERE node_id = ?`
            )
            .run(...decisionValues)
        }
      }

      // Update task extras
      if (existing.type === 'task' && data.checklist !== undefined) {
        this.db
          .prepare('UPDATE tasks_extra SET checklist = ? WHERE node_id = ?')
          .run(
            data.checklist !== null ? JSON.stringify(data.checklist) : null,
            id
          )
      }

      return this.findById(id)!
    })()
  }

  /**
   * Delete a node
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM nodes WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Add a dependency to a node
   * @returns true if dependency was added, false if it already exists or references invalid nodes
   * @throws Error for unexpected database errors
   */
  addDependency(nodeId: string, dependsOnId: string): boolean {
    try {
      const stmt = this.db.prepare(
        'INSERT OR IGNORE INTO node_dependencies (node_id, depends_on_id) VALUES (?, ?)'
      )
      stmt.run(nodeId, dependsOnId)
      this.touchNode(nodeId)
      return true
    } catch (error) {
      // Only catch expected SQLite constraint violations
      const sqliteError = error as { code?: string }
      if (
        sqliteError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        sqliteError.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        return false
      }
      // Rethrow unexpected errors
      throw error
    }
  }

  /**
   * Remove a dependency from a node
   */
  removeDependency(nodeId: string, dependsOnId: string): boolean {
    const stmt = this.db.prepare(
      'DELETE FROM node_dependencies WHERE node_id = ? AND depends_on_id = ?'
    )
    const result = stmt.run(nodeId, dependsOnId)
    if (result.changes > 0) {
      this.touchNode(nodeId)
      return true
    }
    return false
  }

  /**
   * Get all dependencies for a node
   */
  getDependencies(nodeId: string): string[] {
    const stmt = this.db.prepare(
      'SELECT depends_on_id FROM node_dependencies WHERE node_id = ?'
    )
    const rows = stmt.all(nodeId) as Array<{ depends_on_id: string }>
    return rows.map((r) => r.depends_on_id)
  }

  /**
   * Get all dependents (nodes that depend on this node)
   */
  getDependents(nodeId: string): string[] {
    const stmt = this.db.prepare(
      'SELECT node_id FROM node_dependencies WHERE depends_on_id = ?'
    )
    const rows = stmt.all(nodeId) as Array<{ node_id: string }>
    return rows.map((r) => r.node_id)
  }

  /**
   * Get blocked tasks (tasks with incomplete dependencies)
   */
  getBlockedTasks(projectId: string): NodeWithRelations[] {
    // A task is blocked if any of its dependencies are incomplete (status != 'complete')
    const sql = `
      SELECT DISTINCT n.*
      FROM nodes n
      INNER JOIN node_dependencies nd ON n.id = nd.node_id
      INNER JOIN nodes dep ON nd.depends_on_id = dep.id
      WHERE n.project_id = ?
        AND n.type = 'task'
        AND (n.status IS NULL OR n.status != 'complete')
        AND (dep.status IS NULL OR dep.status != 'complete')
    `
    const stmt = this.db.prepare(sql)
    const nodes = stmt.all(projectId) as NodeRow[]
    return nodes.map((node) => this.enrichNode(node))
  }

  /**
   * Get critical path (longest chain of incomplete tasks)
   */
  getCriticalPath(projectId: string): NodeWithRelations[] {
    // Get all incomplete tasks with their dependencies
    const tasksStmt = this.db.prepare(`
      SELECT id, status FROM nodes
      WHERE project_id = ? AND type = 'task' AND (status IS NULL OR status != 'complete')
    `)
    const tasks = tasksStmt.all(projectId) as Array<{
      id: string
      status: string | null
    }>

    if (tasks.length === 0) {
      return []
    }

    // Build adjacency list
    const taskIds = new Set(tasks.map((t) => t.id))
    const depsStmt = this.db.prepare(`
      SELECT node_id, depends_on_id FROM node_dependencies
      WHERE node_id IN (${Array(taskIds.size).fill('?').join(',')})
    `)
    const deps = depsStmt.all(...taskIds) as Array<{
      node_id: string
      depends_on_id: string
    }>

    // Filter deps to only include incomplete tasks
    const adjacency = new Map<string, string[]>()
    for (const task of tasks) {
      adjacency.set(task.id, [])
    }
    for (const dep of deps) {
      if (taskIds.has(dep.depends_on_id)) {
        adjacency.get(dep.node_id)?.push(dep.depends_on_id)
      }
    }

    // Find longest path using DFS with memoization
    const memo = new Map<string, string[]>()
    const visited = new Set<string>()

    const findLongestPath = (nodeId: string): string[] => {
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!
      }

      if (visited.has(nodeId)) {
        // Cycle detected, return empty to avoid infinite loop
        return []
      }

      visited.add(nodeId)
      const dependencies = adjacency.get(nodeId) ?? []

      let longestPath: string[] = []
      for (const depId of dependencies) {
        const path = findLongestPath(depId)
        if (path.length > longestPath.length) {
          longestPath = path
        }
      }

      visited.delete(nodeId)
      const result = [...longestPath, nodeId]
      memo.set(nodeId, result)
      return result
    }

    // Find the longest path across all tasks
    let criticalPath: string[] = []
    for (const task of tasks) {
      const path = findLongestPath(task.id)
      if (path.length > criticalPath.length) {
        criticalPath = path
      }
    }

    // Return nodes in order
    return criticalPath.map((id) => this.findById(id)!).filter(Boolean)
  }

  /**
   * Check if adding a dependency would create a cycle
   */
  wouldCreateCycle(nodeId: string, dependsOnId: string): boolean {
    // Check if dependsOnId transitively depends on nodeId
    const visited = new Set<string>()
    const stack = [dependsOnId]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (current === nodeId) {
        return true
      }
      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      const deps = this.getDependencies(current)
      stack.push(...deps)
    }

    return false
  }

  /**
   * Safely parse JSON, returning null on error
   * Logs a warning if parsing fails to aid debugging corrupted data
   */
  private safeJsonParse<T>(json: string | null, fieldName: string): T | null {
    if (!json) return null
    try {
      return JSON.parse(json) as T
    } catch (error) {
      console.warn(
        `[NodeRepository] Failed to parse ${fieldName} JSON:`,
        error instanceof Error ? error.message : 'Unknown error'
      )
      return null
    }
  }

  /**
   * Enrich a node row with tags, dependencies, and type-specific extras
   */
  private enrichNode(node: NodeRow): NodeWithRelations {
    // Get tags
    const tagsStmt = this.db.prepare(
      'SELECT tag FROM node_tags WHERE node_id = ?'
    )
    const tagRows = tagsStmt.all(node.id) as Array<{ tag: string }>
    const tags = tagRows.map((r) => r.tag)

    // Get dependencies
    const deps = this.getDependencies(node.id)

    const enriched: NodeWithRelations = {
      ...node,
      tags,
      depends_on: deps,
    }

    // Get component extras
    if (node.type === 'component') {
      const componentStmt = this.db.prepare(
        'SELECT * FROM components_extra WHERE node_id = ?'
      )
      const component = componentStmt.get(node.id) as
        | ComponentExtraRow
        | undefined
      if (component) {
        enriched.supplier = component.supplier
        enriched.part_number = component.part_number
        enriched.cost = component.cost
        enriched.datasheet_url = component.datasheet_url
        enriched.custom_fields = this.safeJsonParse<
          Record<string, string | number>
        >(component.custom_fields, 'custom_fields')
      }
    }

    // Get decision extras
    if (node.type === 'decision') {
      const decisionStmt = this.db.prepare(
        'SELECT * FROM decisions_extra WHERE node_id = ?'
      )
      const decision = decisionStmt.get(node.id) as DecisionExtraRow | undefined
      if (decision) {
        enriched.selected_option = decision.selected_option
        enriched.selection_rationale = decision.selection_rationale
        enriched.selected_date = decision.selected_date
        enriched.comparison_data = this.safeJsonParse<unknown>(
          decision.comparison_data,
          'comparison_data'
        )
      }
    }

    // Get task extras
    if (node.type === 'task') {
      const taskStmt = this.db.prepare(
        'SELECT * FROM tasks_extra WHERE node_id = ?'
      )
      const task = taskStmt.get(node.id) as TaskExtraRow | undefined
      if (task) {
        enriched.checklist = this.safeJsonParse<unknown[]>(
          task.checklist,
          'checklist'
        )
      }
    }

    return enriched
  }

  /**
   * Update the modified_at timestamp for a node
   */
  private touchNode(id: string): void {
    const stmt = this.db.prepare(
      'UPDATE nodes SET modified_at = ? WHERE id = ?'
    )
    stmt.run(new Date().toISOString(), id)
  }
}
