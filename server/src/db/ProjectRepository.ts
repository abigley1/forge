/**
 * Project Repository
 *
 * Handles all database operations for projects.
 */

import type { DatabaseInstance } from './index.js'
import type { ProjectRow } from './schema.js'
import { randomUUID } from 'node:crypto'

/**
 * Project data for creating a new project
 */
export interface CreateProjectData {
  id?: string
  name: string
  description?: string
}

/**
 * Project data for updating an existing project
 */
export interface UpdateProjectData {
  name?: string
  description?: string
}

/**
 * Project with computed statistics
 */
export interface ProjectWithStats extends ProjectRow {
  node_count: number
  task_count: number
  completed_task_count: number
}

/**
 * Repository for project database operations
 */
export class ProjectRepository {
  constructor(private db: DatabaseInstance) {}

  /**
   * Create a new project
   */
  create(data: CreateProjectData): ProjectRow {
    const id = data.id ?? randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, created_at, modified_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(id, data.name, data.description ?? null, now, now)

    return this.findById(id)!
  }

  /**
   * Find a project by ID
   */
  findById(id: string): ProjectRow | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = stmt.get(id) as ProjectRow | undefined
    return row ?? null
  }

  /**
   * Find all projects
   */
  findAll(): ProjectRow[] {
    const stmt = this.db.prepare(
      'SELECT * FROM projects ORDER BY modified_at DESC'
    )
    return stmt.all() as ProjectRow[]
  }

  /**
   * Find all projects with statistics
   */
  findAllWithStats(): ProjectWithStats[] {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        COALESCE(COUNT(n.id), 0) as node_count,
        COALESCE(SUM(CASE WHEN n.type = 'task' THEN 1 ELSE 0 END), 0) as task_count,
        COALESCE(SUM(CASE WHEN n.type = 'task' AND n.status = 'complete' THEN 1 ELSE 0 END), 0) as completed_task_count
      FROM projects p
      LEFT JOIN nodes n ON p.id = n.project_id
      GROUP BY p.id
      ORDER BY p.modified_at DESC
    `)
    return stmt.all() as ProjectWithStats[]
  }

  /**
   * Update a project
   */
  update(id: string, data: UpdateProjectData): ProjectRow | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const updates: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }

    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }

    if (updates.length === 0) {
      return existing
    }

    // Always update modified_at
    updates.push('modified_at = ?')
    values.push(new Date().toISOString())

    // Add ID for WHERE clause
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...values)

    return this.findById(id)!
  }

  /**
   * Delete a project and all its nodes (cascade)
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Check if a project exists
   */
  exists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM projects WHERE id = ?')
    return stmt.get(id) !== undefined
  }

  /**
   * Find project by name
   */
  findByName(name: string): ProjectRow | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE name = ?')
    const row = stmt.get(name) as ProjectRow | undefined
    return row ?? null
  }

  /**
   * Update the modified_at timestamp for a project
   * (called when nodes are modified)
   */
  touch(id: string): void {
    const stmt = this.db.prepare(
      'UPDATE projects SET modified_at = ? WHERE id = ?'
    )
    stmt.run(new Date().toISOString(), id)
  }
}
