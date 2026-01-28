import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import type { Express } from 'express'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'

describe('Nodes API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let projectId: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-nodes-test-'))
    db = createTestDatabase()

    const result = createApp({
      config: {
        port: 3000,
        dataDir: tempDir,
        staticDir: tempDir,
        dbPath: ':memory:',
      },
      db,
    })
    app = result.app

    // Create a project for testing
    const projectRes = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' })
    projectId = projectRes.body.data.id
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('GET /api/projects/:projectId/nodes', () => {
    it('returns empty array when no nodes', async () => {
      const response = await request(app).get(
        `/api/projects/${projectId}/nodes`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
    })

    it('returns all nodes for a project', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 1' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'note', title: 'Note 1' })

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(2)
    })

    it('filters by type', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 1' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'note', title: 'Note 1' })

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes?type=task`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].type).toBe('task')
    })

    it('filters by status', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 1', status: 'pending' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 2', status: 'complete' })

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes?status=complete`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].status).toBe('complete')
    })

    it('filters by query', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Important Task' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Other Task' })

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes?q=Important`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].title).toBe('Important Task')
    })

    it('returns 404 for non-existent project', async () => {
      const response = await request(app).get(
        '/api/projects/non-existent/nodes'
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/projects/:projectId/nodes', () => {
    it('creates a basic node', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'New Task' })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.title).toBe('New Task')
      expect(response.body.data.type).toBe('task')
      expect(response.body.data.tags).toEqual([])
      expect(response.body.data.depends_on).toEqual([])
    })

    it('creates a node with tags', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({
          type: 'task',
          title: 'Tagged Task',
          tags: ['urgent', 'review'],
        })

      expect(response.status).toBe(201)
      expect(response.body.data.tags).toHaveLength(2)
      expect(response.body.data.tags).toContain('urgent')
      expect(response.body.data.tags).toContain('review')
    })

    it('creates a node with dependencies', async () => {
      const dep = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Dependency' })
      const depId = dep.body.data.id

      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Dependent', depends_on: [depId] })

      expect(response.status).toBe(201)
      expect(response.body.data.depends_on).toEqual([depId])
    })

    it('creates a component with extras', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({
          type: 'component',
          title: 'Motor',
          supplier: 'DigiKey',
          part_number: 'ABC-123',
          cost: 19.99,
        })

      expect(response.status).toBe(201)
      expect(response.body.data.supplier).toBe('DigiKey')
      expect(response.body.data.part_number).toBe('ABC-123')
      expect(response.body.data.cost).toBe(19.99)
    })

    it('returns 400 for invalid node type', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'invalid', title: 'Test' })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Invalid node type')
    })

    it('returns 400 for missing title', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task' })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Title is required')
    })
  })

  describe('GET /api/projects/:projectId/nodes/:id', () => {
    it('returns a node by ID', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Test Task' })
      const nodeId = createRes.body.data.id

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes/${nodeId}`
      )

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(nodeId)
      expect(response.body.data.title).toBe('Test Task')
    })

    it('returns 404 for non-existent node', async () => {
      const response = await request(app).get(
        `/api/projects/${projectId}/nodes/non-existent`
      )

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/projects/:projectId/nodes/:id', () => {
    it('updates node title', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Original' })
      const nodeId = createRes.body.data.id

      const response = await request(app)
        .put(`/api/projects/${projectId}/nodes/${nodeId}`)
        .send({ title: 'Updated' })

      expect(response.status).toBe(200)
      expect(response.body.data.title).toBe('Updated')
    })

    it('updates node status', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task', status: 'pending' })
      const nodeId = createRes.body.data.id

      const response = await request(app)
        .put(`/api/projects/${projectId}/nodes/${nodeId}`)
        .send({ status: 'complete' })

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('complete')
    })

    it('updates node tags', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task', tags: ['old'] })
      const nodeId = createRes.body.data.id

      const response = await request(app)
        .put(`/api/projects/${projectId}/nodes/${nodeId}`)
        .send({ tags: ['new1', 'new2'] })

      expect(response.status).toBe(200)
      expect(response.body.data.tags).toEqual(['new1', 'new2'])
    })

    it('returns 404 for non-existent node', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}/nodes/non-existent`)
        .send({ title: 'Test' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/projects/:projectId/nodes/:id', () => {
    it('deletes a node', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'To Delete' })
      const nodeId = createRes.body.data.id

      const deleteRes = await request(app).delete(
        `/api/projects/${projectId}/nodes/${nodeId}`
      )
      expect(deleteRes.status).toBe(204)

      const getRes = await request(app).get(
        `/api/projects/${projectId}/nodes/${nodeId}`
      )
      expect(getRes.status).toBe(404)
    })

    it('returns 404 for non-existent node', async () => {
      const response = await request(app).delete(
        `/api/projects/${projectId}/nodes/non-existent`
      )

      expect(response.status).toBe(404)
    })
  })

  describe('Dependencies API', () => {
    it('adds a dependency', async () => {
      const dep = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Dependency' })
      const node = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Node' })

      const response = await request(app)
        .post(
          `/api/projects/${projectId}/nodes/${node.body.data.id}/dependencies`
        )
        .send({ depends_on_id: dep.body.data.id })

      expect(response.status).toBe(201)
    })

    it('gets dependencies', async () => {
      const dep = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Dependency' })
      const node = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Node', depends_on: [dep.body.data.id] })

      const response = await request(app).get(
        `/api/projects/${projectId}/nodes/${node.body.data.id}/dependencies`
      )

      expect(response.status).toBe(200)
      expect(response.body.data.depends_on).toContain(dep.body.data.id)
      expect(response.body.data.depended_on_by).toEqual([])
    })

    it('removes a dependency', async () => {
      const dep = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Dependency' })
      const node = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Node', depends_on: [dep.body.data.id] })

      const response = await request(app).delete(
        `/api/projects/${projectId}/nodes/${node.body.data.id}/dependencies/${dep.body.data.id}`
      )

      expect(response.status).toBe(204)
    })

    it('prevents cyclic dependencies', async () => {
      const a = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'A' })
      const b = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'B', depends_on: [a.body.data.id] })

      // Try to make A depend on B (would create cycle)
      const response = await request(app)
        .post(`/api/projects/${projectId}/nodes/${a.body.data.id}/dependencies`)
        .send({ depends_on_id: b.body.data.id })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('cycle')
    })
  })

  describe('Analytics API', () => {
    it('gets blocked tasks', async () => {
      const blocking = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Blocking', status: 'pending' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({
          type: 'task',
          title: 'Blocked',
          status: 'pending',
          depends_on: [blocking.body.data.id],
        })

      const response = await request(app).get(
        `/api/projects/${projectId}/blocked-tasks`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].title).toBe('Blocked')
    })

    it('gets critical path', async () => {
      // Create chain A -> B -> C
      const a = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'A', status: 'pending' })
      const b = await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({
          type: 'task',
          title: 'B',
          status: 'pending',
          depends_on: [a.body.data.id],
        })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({
          type: 'task',
          title: 'C',
          status: 'pending',
          depends_on: [b.body.data.id],
        })

      const response = await request(app).get(
        `/api/projects/${projectId}/critical-path`
      )

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(3)
      expect(response.body.data[0].title).toBe('A')
      expect(response.body.data[1].title).toBe('B')
      expect(response.body.data[2].title).toBe('C')
    })
  })
})
