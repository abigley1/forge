/**
 * Projects API Routes
 *
 * RESTful endpoints for project management:
 * - GET    /api/projects           - List all projects
 * - POST   /api/projects           - Create a new project
 * - GET    /api/projects/:id       - Get a project by ID
 * - PUT    /api/projects/:id       - Update a project
 * - DELETE /api/projects/:id       - Delete a project
 */

import { Router, Request, Response } from 'express'
import { ProjectRepository } from '../db/ProjectRepository.js'
import type { DatabaseInstance } from '../db/index.js'

/**
 * Create the projects router
 */
export function createProjectsRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new ProjectRepository(db)

  /**
   * GET /api/projects
   * List all projects with optional statistics
   */
  router.get('/', (_req: Request, res: Response) => {
    try {
      const includeStats = _req.query.stats === 'true'
      const projects = includeStats ? repo.findAllWithStats() : repo.findAll()
      res.json({ data: projects })
    } catch (error) {
      console.error('Error listing projects:', error)
      res.status(500).json({ error: 'Failed to list projects' })
    }
  })

  /**
   * POST /api/projects
   * Create a new project
   */
  router.post('/', (req: Request, res: Response) => {
    const { id, name, description } = req.body

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' })
      return
    }

    try {
      const project = repo.create({ id, name, description })
      res.status(201).json({ data: project })
    } catch (error) {
      // Handle duplicate project ID (UNIQUE constraint violation)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
      ) {
        // Return existing project instead of error
        const existingProject = repo.findById(id || name)
        if (existingProject) {
          res.status(200).json({ data: existingProject })
          return
        }
        res.status(409).json({ error: 'Project with this ID already exists' })
        return
      }

      console.error('Error creating project:', error)
      res.status(500).json({ error: 'Failed to create project' })
    }
  })

  /**
   * GET /api/projects/:id
   * Get a project by ID
   */
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const project = repo.findById(req.params.id as string)
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      res.json({ data: project })
    } catch (error) {
      console.error('Error getting project:', error)
      res.status(500).json({ error: 'Failed to get project' })
    }
  })

  /**
   * PUT /api/projects/:id
   * Update a project
   */
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const { name, description } = req.body
      const project = repo.update(req.params.id as string, {
        name,
        description,
      })

      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }

      res.json({ data: project })
    } catch (error) {
      console.error('Error updating project:', error)
      res.status(500).json({ error: 'Failed to update project' })
    }
  })

  /**
   * DELETE /api/projects/:id
   * Delete a project and all its nodes
   */
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const deleted = repo.delete(req.params.id as string)
      if (!deleted) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      res.status(204).send()
    } catch (error) {
      console.error('Error deleting project:', error)
      res.status(500).json({ error: 'Failed to delete project' })
    }
  })

  return router
}
