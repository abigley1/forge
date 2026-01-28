/**
 * Nodes API Routes
 *
 * RESTful endpoints for node management:
 * - GET    /api/projects/:projectId/nodes                    - List nodes
 * - POST   /api/projects/:projectId/nodes                    - Create a node
 * - GET    /api/projects/:projectId/nodes/:id                - Get a node
 * - PUT    /api/projects/:projectId/nodes/:id                - Update a node
 * - DELETE /api/projects/:projectId/nodes/:id                - Delete a node
 * - GET    /api/projects/:projectId/nodes/:id/dependencies   - Get dependencies
 * - POST   /api/projects/:projectId/nodes/:id/dependencies   - Add dependency
 * - DELETE /api/projects/:projectId/nodes/:id/dependencies/:depId - Remove dependency
 * - GET    /api/projects/:projectId/blocked-tasks            - Get blocked tasks
 * - GET    /api/projects/:projectId/critical-path            - Get critical path
 */

import { Router, Request, Response, NextFunction } from 'express'
import { NodeRepository, NodeSearchFilters } from '../db/NodeRepository.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import type { DatabaseInstance } from '../db/index.js'
import type { NodeType } from '../db/schema.js'
import { VALID_NODE_TYPES } from '../db/schema.js'

/** Typed params for project routes */
interface ProjectParams {
  projectId: string
}

/** Typed params for node routes */
interface NodeParams extends ProjectParams {
  id: string
}

/** Typed params for dependency routes */
interface DependencyParams extends NodeParams {
  depId: string
}

/**
 * Create the nodes router
 */
export function createNodesRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true }) // mergeParams to access :projectId
  const nodeRepo = new NodeRepository(db)
  const projectRepo = new ProjectRepository(db)

  /**
   * Middleware to verify project exists
   */
  router.use(
    (req: Request<ProjectParams>, res: Response, next: NextFunction) => {
      const projectId = req.params.projectId
      if (!projectRepo.exists(projectId)) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      next()
    }
  )

  /**
   * GET /api/projects/:projectId/nodes
   * List all nodes for a project with optional filters
   */
  router.get('/', (req: Request<ProjectParams>, res: Response) => {
    try {
      const projectId = req.params.projectId
      const filters: NodeSearchFilters = {}

      // Parse query parameters for filtering
      if (req.query.type) {
        const types = String(req.query.type).split(',') as NodeType[]
        filters.type = types.length === 1 ? types[0] : types
      }

      if (req.query.status) {
        const statuses = String(req.query.status).split(',')
        filters.status = statuses.length === 1 ? statuses[0] : statuses
      }

      if (req.query.tags) {
        filters.tags = String(req.query.tags).split(',')
      }

      if (req.query.parent_id !== undefined) {
        filters.parent_id =
          req.query.parent_id === 'null' ? null : String(req.query.parent_id)
      }

      if (req.query.milestone) {
        filters.milestone = String(req.query.milestone)
      }

      if (req.query.q) {
        filters.query = String(req.query.q)
      }

      const nodes = nodeRepo.findByProject(projectId, filters)
      res.json({ data: nodes })
    } catch (error) {
      console.error('Error listing nodes:', error)
      res.status(500).json({ error: 'Failed to list nodes' })
    }
  })

  /**
   * POST /api/projects/:projectId/nodes
   * Create a new node
   */
  router.post('/', (req: Request<ProjectParams>, res: Response) => {
    try {
      const projectId = req.params.projectId
      const {
        id,
        type,
        title,
        content,
        status,
        priority,
        parent_id,
        milestone,
        tags,
        depends_on,
        supplier,
        part_number,
        cost,
        datasheet_url,
        selected_option,
        selection_rationale,
        comparison_data,
      } = req.body

      // Validate required fields
      if (!type || !VALID_NODE_TYPES.includes(type)) {
        res.status(400).json({
          error: `Invalid node type. Must be one of: ${VALID_NODE_TYPES.join(', ')}`,
        })
        return
      }

      if (!title || typeof title !== 'string') {
        res.status(400).json({ error: 'Title is required' })
        return
      }

      // Validate parent exists if specified
      if (parent_id) {
        const parent = nodeRepo.findById(parent_id)
        if (!parent) {
          res.status(400).json({ error: 'Parent node not found' })
          return
        }
        if (parent.project_id !== projectId) {
          res.status(400).json({
            error: 'Parent node must be in the same project',
          })
          return
        }
      }

      // Validate dependencies exist
      if (depends_on && Array.isArray(depends_on)) {
        for (const depId of depends_on) {
          const dep = nodeRepo.findById(depId)
          if (!dep) {
            res.status(400).json({ error: `Dependency not found: ${depId}` })
            return
          }
        }
      }

      const node = nodeRepo.create({
        id,
        project_id: projectId,
        type,
        title,
        content,
        status,
        priority,
        parent_id,
        milestone,
        tags,
        depends_on,
        supplier,
        part_number,
        cost,
        datasheet_url,
        selected_option,
        selection_rationale,
        comparison_data,
      })

      // Touch project to update modified_at
      projectRepo.touch(projectId)

      res.status(201).json({ data: node })
    } catch (error) {
      console.error('Error creating node:', error)
      res.status(500).json({ error: 'Failed to create node' })
    }
  })

  /**
   * GET /api/projects/:projectId/nodes/:id
   * Get a single node by ID
   */
  router.get('/:id', (req: Request<NodeParams>, res: Response) => {
    try {
      const { projectId, id } = req.params
      const node = nodeRepo.findById(id)

      if (!node) {
        res.status(404).json({ error: 'Node not found' })
        return
      }

      // Verify node belongs to this project
      if (node.project_id !== projectId) {
        res.status(404).json({ error: 'Node not found in this project' })
        return
      }

      res.json({ data: node })
    } catch (error) {
      console.error('Error getting node:', error)
      res.status(500).json({ error: 'Failed to get node' })
    }
  })

  /**
   * PUT /api/projects/:projectId/nodes/:id
   * Update a node
   */
  router.put('/:id', (req: Request<NodeParams>, res: Response) => {
    try {
      const { projectId, id: nodeId } = req.params

      // Verify node exists and belongs to this project
      const existing = nodeRepo.findById(nodeId)
      if (!existing) {
        res.status(404).json({ error: 'Node not found' })
        return
      }
      if (existing.project_id !== projectId) {
        res.status(404).json({ error: 'Node not found in this project' })
        return
      }

      const {
        title,
        content,
        status,
        priority,
        parent_id,
        milestone,
        tags,
        depends_on,
        supplier,
        part_number,
        cost,
        datasheet_url,
        selected_option,
        selection_rationale,
        comparison_data,
      } = req.body

      // Validate parent if being changed
      if (parent_id !== undefined && parent_id !== null) {
        const parent = nodeRepo.findById(parent_id)
        if (!parent) {
          res.status(400).json({ error: 'Parent node not found' })
          return
        }
        if (parent.project_id !== projectId) {
          res.status(400).json({
            error: 'Parent node must be in the same project',
          })
          return
        }
        // Prevent circular parent references
        if (parent_id === nodeId) {
          res.status(400).json({ error: 'Node cannot be its own parent' })
          return
        }
      }

      // Validate dependencies if being changed
      if (depends_on !== undefined && Array.isArray(depends_on)) {
        for (const depId of depends_on) {
          const dep = nodeRepo.findById(depId)
          if (!dep) {
            res.status(400).json({ error: `Dependency not found: ${depId}` })
            return
          }
          // Check for cycles
          if (nodeRepo.wouldCreateCycle(nodeId, depId)) {
            res.status(400).json({
              error: `Adding dependency on ${depId} would create a cycle`,
            })
            return
          }
        }
      }

      const node = nodeRepo.update(nodeId, {
        title,
        content,
        status,
        priority,
        parent_id,
        milestone,
        tags,
        depends_on,
        supplier,
        part_number,
        cost,
        datasheet_url,
        selected_option,
        selection_rationale,
        comparison_data,
      })

      // Touch project to update modified_at
      projectRepo.touch(projectId)

      res.json({ data: node })
    } catch (error) {
      console.error('Error updating node:', error)
      res.status(500).json({ error: 'Failed to update node' })
    }
  })

  /**
   * DELETE /api/projects/:projectId/nodes/:id
   * Delete a node
   */
  router.delete('/:id', (req: Request<NodeParams>, res: Response) => {
    try {
      const { projectId, id: nodeId } = req.params

      // Verify node exists and belongs to this project
      const existing = nodeRepo.findById(nodeId)
      if (!existing) {
        res.status(404).json({ error: 'Node not found' })
        return
      }
      if (existing.project_id !== projectId) {
        res.status(404).json({ error: 'Node not found in this project' })
        return
      }

      nodeRepo.delete(nodeId)

      // Touch project to update modified_at
      projectRepo.touch(projectId)

      res.status(204).send()
    } catch (error) {
      console.error('Error deleting node:', error)
      res.status(500).json({ error: 'Failed to delete node' })
    }
  })

  /**
   * GET /api/projects/:projectId/nodes/:id/dependencies
   * Get all dependencies for a node
   */
  router.get('/:id/dependencies', (req: Request<NodeParams>, res: Response) => {
    try {
      const { projectId, id: nodeId } = req.params

      // Verify node exists and belongs to this project
      const node = nodeRepo.findById(nodeId)
      if (!node) {
        res.status(404).json({ error: 'Node not found' })
        return
      }
      if (node.project_id !== projectId) {
        res.status(404).json({ error: 'Node not found in this project' })
        return
      }

      const dependencies = nodeRepo.getDependencies(nodeId)
      const dependents = nodeRepo.getDependents(nodeId)

      res.json({
        data: {
          depends_on: dependencies,
          depended_on_by: dependents,
        },
      })
    } catch (error) {
      console.error('Error getting dependencies:', error)
      res.status(500).json({ error: 'Failed to get dependencies' })
    }
  })

  /**
   * POST /api/projects/:projectId/nodes/:id/dependencies
   * Add a dependency to a node
   */
  router.post(
    '/:id/dependencies',
    (req: Request<NodeParams>, res: Response) => {
      try {
        const { projectId, id: nodeId } = req.params
        const { depends_on_id } = req.body

        if (!depends_on_id) {
          res.status(400).json({ error: 'depends_on_id is required' })
          return
        }

        // Verify both nodes exist and belong to this project
        const node = nodeRepo.findById(nodeId)
        if (!node) {
          res.status(404).json({ error: 'Node not found' })
          return
        }
        if (node.project_id !== projectId) {
          res.status(404).json({ error: 'Node not found in this project' })
          return
        }

        const dependency = nodeRepo.findById(depends_on_id)
        if (!dependency) {
          res.status(404).json({ error: 'Dependency node not found' })
          return
        }

        // Check for cycles
        if (nodeRepo.wouldCreateCycle(nodeId, depends_on_id)) {
          res
            .status(400)
            .json({ error: 'Adding this dependency would create a cycle' })
          return
        }

        nodeRepo.addDependency(nodeId, depends_on_id)

        // Touch project to update modified_at
        projectRepo.touch(projectId)

        res.status(201).json({ data: { node_id: nodeId, depends_on_id } })
      } catch (error) {
        console.error('Error adding dependency:', error)
        res.status(500).json({ error: 'Failed to add dependency' })
      }
    }
  )

  /**
   * DELETE /api/projects/:projectId/nodes/:id/dependencies/:depId
   * Remove a dependency from a node
   */
  router.delete(
    '/:id/dependencies/:depId',
    (req: Request<DependencyParams>, res: Response) => {
      try {
        const { projectId, id: nodeId, depId } = req.params

        // Verify node exists and belongs to this project
        const node = nodeRepo.findById(nodeId)
        if (!node) {
          res.status(404).json({ error: 'Node not found' })
          return
        }
        if (node.project_id !== projectId) {
          res.status(404).json({ error: 'Node not found in this project' })
          return
        }

        const removed = nodeRepo.removeDependency(nodeId, depId)
        if (!removed) {
          res.status(404).json({ error: 'Dependency not found' })
          return
        }

        // Touch project to update modified_at
        projectRepo.touch(projectId)

        res.status(204).send()
      } catch (error) {
        console.error('Error removing dependency:', error)
        res.status(500).json({ error: 'Failed to remove dependency' })
      }
    }
  )

  return router
}

/**
 * Create the project-level analytics routes (blocked-tasks, critical-path)
 */
export function createProjectAnalyticsRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true })
  const nodeRepo = new NodeRepository(db)
  const projectRepo = new ProjectRepository(db)

  /**
   * Middleware to verify project exists
   */
  router.use(
    (req: Request<ProjectParams>, res: Response, next: NextFunction) => {
      const projectId = req.params.projectId
      if (!projectRepo.exists(projectId)) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      next()
    }
  )

  /**
   * GET /api/projects/:projectId/blocked-tasks
   * Get all tasks that are blocked by incomplete dependencies
   */
  router.get('/blocked-tasks', (req: Request<ProjectParams>, res: Response) => {
    try {
      const projectId = req.params.projectId
      const blockedTasks = nodeRepo.getBlockedTasks(projectId)
      res.json({ data: blockedTasks })
    } catch (error) {
      console.error('Error getting blocked tasks:', error)
      res.status(500).json({ error: 'Failed to get blocked tasks' })
    }
  })

  /**
   * GET /api/projects/:projectId/critical-path
   * Get the critical path (longest chain of incomplete tasks)
   */
  router.get('/critical-path', (req: Request<ProjectParams>, res: Response) => {
    try {
      const projectId = req.params.projectId
      const criticalPath = nodeRepo.getCriticalPath(projectId)
      res.json({ data: criticalPath })
    } catch (error) {
      console.error('Error getting critical path:', error)
      res.status(500).json({ error: 'Failed to get critical path' })
    }
  })

  return router
}
