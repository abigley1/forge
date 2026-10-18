/**
 * Closeouts API Routes
 *
 * - GET /api/projects/:projectId/closeouts            - Recent closeouts (?limit=, default 5, max 50)
 * - GET /api/projects/:projectId/closeouts/:sessionId - One session's closeout
 * - PUT /api/projects/:projectId/closeouts/:sessionId - Record or update a session closeout
 */

import { Router, Request, Response, NextFunction } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import {
  CloseoutRepository,
  CLOSEOUT_CLIENTS,
  EVIDENCE_KINDS,
  type CloseoutEvidence,
  type CloseoutClient,
} from '../db/CloseoutRepository.js'

const MAX_SUMMARY = 4000

interface ProjectParams {
  projectId: string
}

interface SessionParams extends ProjectParams {
  sessionId: string
}

function isEvidence(value: unknown): value is CloseoutEvidence {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (EVIDENCE_KINDS as readonly unknown[]).includes(v.kind) &&
    typeof v.ref === 'string' &&
    v.ref !== '' &&
    (v.note === undefined || typeof v.note === 'string')
  )
}

/**
 * Create the closeouts router (mounted under a project)
 */
export function createCloseoutsRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true })
  const projects = new ProjectRepository(db)
  const closeouts = new CloseoutRepository(db)

  router.use(
    (req: Request<ProjectParams>, res: Response, next: NextFunction) => {
      if (!projects.exists(req.params.projectId)) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      next()
    }
  )

  router.get('/', (req: Request<ProjectParams>, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 5) || 5, 1), 50)
    res.json({ data: closeouts.listRecent(req.params.projectId, limit) })
  })

  router.get('/:sessionId', (req: Request<SessionParams>, res: Response) => {
    const found = closeouts.findBySession(
      req.params.projectId,
      req.params.sessionId
    )
    if (!found) {
      res.status(404).json({ error: 'Closeout not found' })
      return
    }
    res.json({ data: found })
  })

  router.put('/:sessionId', (req: Request<SessionParams>, res: Response) => {
    const {
      client,
      workspace_path,
      summary,
      next_action,
      evidence = [],
      uncertain = [],
    } = req.body ?? {}
    if (
      typeof summary !== 'string' ||
      summary.trim() === '' ||
      summary.length > MAX_SUMMARY
    ) {
      res
        .status(400)
        .json({ error: `summary is required (max ${MAX_SUMMARY} chars)` })
      return
    }
    if (!(CLOSEOUT_CLIENTS as readonly unknown[]).includes(client)) {
      res.status(400).json({
        error: `client must be one of: ${CLOSEOUT_CLIENTS.join(', ')}`,
      })
      return
    }
    if (!Array.isArray(evidence) || !evidence.every(isEvidence)) {
      res.status(400).json({
        error: `evidence must be [{kind, ref, note?}] with kind in: ${EVIDENCE_KINDS.join(', ')}`,
      })
      return
    }
    if (
      !Array.isArray(uncertain) ||
      !uncertain.every((u) => typeof u === 'string')
    ) {
      res.status(400).json({ error: 'uncertain must be an array of strings' })
      return
    }
    const saved = closeouts.upsert({
      project_id: req.params.projectId,
      session_id: req.params.sessionId,
      client: client as CloseoutClient,
      workspace_path:
        typeof workspace_path === 'string' ? workspace_path : null,
      summary: summary.trim(),
      next_action:
        typeof next_action === 'string' && next_action.trim() !== ''
          ? next_action.trim()
          : null,
      evidence,
      uncertain,
    })
    projects.touch(req.params.projectId)
    res.json({ data: saved })
  })

  return router
}
