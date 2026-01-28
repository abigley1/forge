import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import type { Express } from 'express'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'

describe('Projects API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-projects-test-'))
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
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('GET /api/projects', () => {
    it('returns empty array when no projects', async () => {
      const response = await request(app).get('/api/projects')

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
    })

    it('returns all projects', async () => {
      // Create some projects
      await request(app).post('/api/projects').send({ name: 'Project 1' })
      await request(app).post('/api/projects').send({ name: 'Project 2' })

      const response = await request(app).get('/api/projects')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(2)
    })

    it('includes stats when stats=true', async () => {
      // Create a project with nodes
      const projectRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' })
      const projectId = projectRes.body.data.id

      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 1', status: 'pending' })
      await request(app)
        .post(`/api/projects/${projectId}/nodes`)
        .send({ type: 'task', title: 'Task 2', status: 'complete' })

      const response = await request(app).get('/api/projects?stats=true')

      expect(response.status).toBe(200)
      expect(response.body.data[0].node_count).toBe(2)
      expect(response.body.data[0].task_count).toBe(2)
      expect(response.body.data[0].completed_task_count).toBe(1)
    })
  })

  describe('POST /api/projects', () => {
    it('creates a project with name only', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'My Project' })

      expect(response.status).toBe(201)
      expect(response.body.data.name).toBe('My Project')
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.created_at).toBeDefined()
    })

    it('creates a project with description', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'My Project', description: 'A test project' })

      expect(response.status).toBe(201)
      expect(response.body.data.description).toBe('A test project')
    })

    it('creates a project with custom ID', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ id: 'custom-id', name: 'My Project' })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBe('custom-id')
    })

    it('returns 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ description: 'No name' })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Name is required')
    })
  })

  describe('GET /api/projects/:id', () => {
    it('returns a project by ID', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
      const projectId = createRes.body.data.id

      const response = await request(app).get(`/api/projects/${projectId}`)

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(projectId)
      expect(response.body.data.name).toBe('Test')
    })

    it('returns 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/non-existent')

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/projects/:id', () => {
    it('updates project name', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Original' })
      const projectId = createRes.body.data.id

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ name: 'Updated' })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Updated')
    })

    it('updates project description', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
      const projectId = createRes.body.data.id

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ description: 'New description' })

      expect(response.status).toBe(200)
      expect(response.body.data.description).toBe('New description')
    })

    it('returns 404 for non-existent project', async () => {
      const response = await request(app)
        .put('/api/projects/non-existent')
        .send({ name: 'Test' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/projects/:id', () => {
    it('deletes a project', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .send({ name: 'To Delete' })
      const projectId = createRes.body.data.id

      const deleteRes = await request(app).delete(`/api/projects/${projectId}`)
      expect(deleteRes.status).toBe(204)

      const getRes = await request(app).get(`/api/projects/${projectId}`)
      expect(getRes.status).toBe(404)
    })

    it('returns 404 for non-existent project', async () => {
      const response = await request(app).delete('/api/projects/non-existent')

      expect(response.status).toBe(404)
    })
  })
})
