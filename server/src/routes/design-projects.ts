import { Router } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { DesignProjectsRepository } from '../db/DesignProjectsRepository.js'
import { respond } from './print-queue.js'

export function createDesignProjectsRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new DesignProjectsRepository(db)
  router.get('/', (_req, res) => respond(res, () => repo.overview()))
  router.post('/', (req, res) =>
    respond(res, () => repo.create(req.body?.project), 201)
  )
  router.put('/:id', (req, res) =>
    respond(res, () =>
      repo.update(req.params.id, req.body?.version, req.body?.project)
    )
  )
  return router
}
