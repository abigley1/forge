/**
 * Brief API Routes
 *
 * - GET /api/projects/:projectId/brief - Compact project brief for agents and humans
 */

import { Router, Request, Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import { NodeRepository } from '../db/NodeRepository.js'
import { CloseoutRepository } from '../db/CloseoutRepository.js'
import { InventoryRepository } from '../db/InventoryRepository.js'
import { buildBrief } from '../domain/brief.js'

/**
 * Create the brief router (mounted under a project)
 */
export function createBriefRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true })
  const projects = new ProjectRepository(db)
  const nodes = new NodeRepository(db)
  const closeouts = new CloseoutRepository(db)
  const inventory = new InventoryRepository(db)

  router.get('/', (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const project = projects.findById(req.params.projectId)
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      const brief = buildBrief({
        now: new Date(),
        project,
        nodes: nodes.findByProject(project.id).map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          status: n.status,
          priority: n.priority,
          modified_at: n.modified_at,
          depends_on: n.depends_on,
          part_number: n.part_number ?? null,
        })),
        closeouts: closeouts.listRecent(project.id, 2),
        inventory: inventory.listWithPartNumbers(),
      })
      res.json({ data: brief })
    } catch (error) {
      console.error('Error building brief:', error)
      res.status(500).json({ error: 'Failed to build brief' })
    }
  })

  return router
}
