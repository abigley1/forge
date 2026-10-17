/**
 * Workspace Repository
 *
 * Maps working folders and git remotes to Forge projects so agents can
 * resolve "which project is this?" without a mutable selection.
 */

import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import type { WorkspaceLinkRow } from './schema.js'

/**
 * Normalize ssh/https git remotes to host/owner/repo (lowercase, no .git)
 */
export function normalizeGitRemote(remote: string): string {
  const trimmed = remote
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
  const scp = trimmed.match(/^[\w.-]+@([^:/]+):(.+)$/)
  if (scp) return `${scp[1]}/${scp[2]}`.toLowerCase()
  try {
    const url = new URL(trimmed)
    return `${url.hostname}${url.pathname}`.replace(/\/+$/, '').toLowerCase()
  } catch {
    return trimmed.toLowerCase()
  }
}

export function normalizePath(p: string): string {
  const trimmed = p.trim().replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * True when child is parent or nested under it (path-segment boundary aware)
 */
export function isPathWithin(child: string, parent: string): boolean {
  const c = normalizePath(child)
  const p = normalizePath(parent)
  return c === p || c.startsWith(p === '/' ? '/' : `${p}/`)
}

/** Fewest path segments a linked folder may have (blocks "/", "/Users", "~"). */
export const MIN_LINK_PATH_SEGMENTS = 3

/**
 * Null when the path is a safe link target, otherwise the reason it is not
 */
export function linkPathError(p: string): string | null {
  const normalized = normalizePath(p)
  if (!normalized.startsWith('/')) return 'path must be absolute'
  const segments = normalized.split('/').filter(Boolean).length
  if (segments < MIN_LINK_PATH_SEGMENTS)
    return `path is too broad; link a project folder at least ${MIN_LINK_PATH_SEGMENTS} levels deep`
  return null
}

export class WorkspaceRepository {
  constructor(private db: DatabaseInstance) {}

  /**
   * Link a path or git remote to a project; relinking moves it
   */
  link(
    projectId: string,
    kind: WorkspaceLinkRow['kind'],
    rawValue: string
  ): WorkspaceLinkRow {
    const value =
      kind === 'path' ? normalizePath(rawValue) : normalizeGitRemote(rawValue)
    this.db
      .prepare(
        `INSERT INTO workspace_links (id, project_id, kind, value) VALUES (?, ?, ?, ?)
         ON CONFLICT(kind, value) DO UPDATE SET project_id = excluded.project_id`
      )
      .run(randomUUID(), projectId, kind, value)
    return this.db
      .prepare('SELECT * FROM workspace_links WHERE kind = ? AND value = ?')
      .get(kind, value) as WorkspaceLinkRow
  }

  /**
   * Longest linked path containing cwd wins; otherwise an exact git remote match
   */
  resolve(cwd: string, gitRemote?: string): WorkspaceLinkRow | null {
    const paths = this.db
      .prepare(`SELECT * FROM workspace_links WHERE kind = 'path'`)
      .all() as WorkspaceLinkRow[]
    const best = paths
      .filter((link) => isPathWithin(cwd, link.value))
      .sort((a, b) => b.value.length - a.value.length)[0]
    if (best) return best

    if (gitRemote) {
      const match = this.db
        .prepare(
          `SELECT * FROM workspace_links WHERE kind = 'git_remote' AND value = ?`
        )
        .get(normalizeGitRemote(gitRemote)) as WorkspaceLinkRow | undefined
      if (match) return match
    }
    return null
  }

  unlink(id: string): boolean {
    return (
      this.db.prepare('DELETE FROM workspace_links WHERE id = ?').run(id)
        .changes > 0
    )
  }

  list(projectId?: string): WorkspaceLinkRow[] {
    return projectId
      ? (this.db
          .prepare(
            'SELECT * FROM workspace_links WHERE project_id = ? ORDER BY value'
          )
          .all(projectId) as WorkspaceLinkRow[])
      : (this.db
          .prepare('SELECT * FROM workspace_links ORDER BY value')
          .all() as WorkspaceLinkRow[])
  }
}
