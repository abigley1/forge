/**
 * Workspaces API Routes
 *
 * - POST /api/workspaces/resolve - Resolve a working folder / git remote to a project
 * - POST /api/workspaces/links   - Link a folder and/or git remote to a project
 * - GET  /api/workspaces/links   - List links (optionally ?project_id=)
 */

import { Router, Request, Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import type { WorkspaceLinkRow } from '../db/schema.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import { WorkspaceRepository } from '../db/WorkspaceRepository.js'

const MAX_CANDIDATES = 8

/**
 * Create the workspaces router
 */
export function createWorkspacesRouter(db: DatabaseInstance): Router {
  const router = Router()
  const projects = new ProjectRepository(db)
  const workspaces = new WorkspaceRepository(db)

  router.post('/resolve', (req: Request, res: Response) => {
    const { cwd, git_remote } = req.body ?? {}
    if (typeof cwd !== 'string' || cwd === '') {
      res.status(400).json({ error: 'cwd is required' })
      return
    }
    const link = workspaces.resolve(
      cwd,
      typeof git_remote === 'string' ? git_remote : undefined
    )
    const project = link ? projects.findById(link.project_id) : null
    if (link && project) {
      res.json({
        data: { project, match: { kind: link.kind, value: link.value } },
      })
      return
    }
    const candidates = projects
      .findAll()
      .sort((a, b) => b.modified_at.localeCompare(a.modified_at))
      .slice(0, MAX_CANDIDATES)
    res.json({ data: { project: null, candidates } })
  })

  router.post('/links', (req: Request, res: Response) => {
    const { project_id, path, git_remote } = req.body ?? {}
    if (typeof project_id !== 'string' || !projects.exists(project_id)) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    if (typeof path !== 'string' && typeof git_remote !== 'string') {
      res.status(400).json({ error: 'Provide path and/or git_remote' })
      return
    }
    const created: WorkspaceLinkRow[] = []
    if (typeof path === 'string')
      created.push(workspaces.link(project_id, 'path', path))
    if (typeof git_remote === 'string')
      created.push(workspaces.link(project_id, 'git_remote', git_remote))
    res.status(201).json({ data: created })
  })

  router.get('/links', (req: Request, res: Response) => {
    const projectId =
      typeof req.query.project_id === 'string'
        ? req.query.project_id
        : undefined
    res.json({ data: workspaces.list(projectId) })
  })

  return router
}
