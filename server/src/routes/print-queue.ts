import { Router, type Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { PrintQueueRepository, QueueError } from '../db/PrintQueueRepository.js'
/** Forge {success, data} envelope; QueueError carries its HTTP status. */
export function respond(res: Response, operation: () => unknown, status = 200) {
  try {
    res.status(status).json({ success: true, data: operation() })
  } catch (error) {
    res.status(error instanceof QueueError ? error.status : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Queue operation failed.',
    })
  }
}
export function createPrintQueueRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new PrintQueueRepository(db)
  router.get('/', (_req, res) => respond(res, () => repo.read()))
  router.post('/', (req, res) =>
    respond(res, () => repo.add(req.body?.version, req.body?.plate), 201)
  )
  router.post('/reorder', (req, res) =>
    respond(res, () => repo.reorder(req.body?.version, req.body?.ids))
  )
  router.post('/import', (req, res) =>
    respond(res, () => repo.importQueue(req.body?.version, req.body?.plates))
  )
  router.put('/:id', (req, res) =>
    respond(res, () =>
      repo.update(req.body?.version, req.params.id, req.body?.plate)
    )
  )
  return router
}
