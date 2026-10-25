import { Router, type Request } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectPartsRepository } from '../db/ProjectPartsRepository.js'
import { respond } from './print-queue.js'

/** `?project=<vault slug>`; absent means every project. */
const projectQuery = (req: Request) =>
  typeof req.query.project === 'string' ? req.query.project : undefined

/**
 * Per-project parts lists (workshop data, keyed by vault project slug).
 * - GET    /api/project-parts?project=<slug>
 * - GET    /api/project-parts/shortfall?project=<slug>
 * - POST   /api/project-parts              {project, itemId?, name, quantityNeeded}
 * - PUT    /api/project-parts/:id          same body
 * - DELETE /api/project-parts/:id
 */
export function createProjectPartsRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new ProjectPartsRepository(db)
  router.get('/', (req, res) =>
    respond(res, () => repo.list(projectQuery(req)))
  )
  router.get('/shortfall', (req, res) =>
    respond(res, () => repo.shortfall(projectQuery(req)))
  )
  router.post('/', (req, res) => respond(res, () => repo.create(req.body), 201))
  router.put('/:id', (req, res) =>
    respond(res, () => repo.update(req.params.id, req.body))
  )
  router.delete('/:id', (req, res) =>
    respond(res, () => repo.remove(req.params.id))
  )
  return router
}
