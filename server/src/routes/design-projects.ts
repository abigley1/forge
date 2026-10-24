import { Router, type Request } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { DesignProjectsRepository } from '../db/DesignProjectsRepository.js'
import { respond } from './print-queue.js'

/**
 * Stage and stage note belong to the vault; only its bot may write them.
 * Ownership guard, not authentication; Forge has no auth.
 */
export const VAULT_WRITER_HEADER = 'X-Forge-Writer'
const canWriteStage = (req: Request) =>
  req.get(VAULT_WRITER_HEADER) === 'vault-bot'

export function createDesignProjectsRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new DesignProjectsRepository(db)
  router.get('/', (_req, res) => respond(res, () => repo.overview()))
  router.post('/', (req, res) =>
    respond(res, () => repo.create(req.body?.project, canWriteStage(req)), 201)
  )
  router.put('/:id', (req, res) =>
    respond(res, () =>
      repo.update(
        req.params.id,
        req.body?.version,
        req.body?.project,
        canWriteStage(req)
      )
    )
  )
  return router
}
