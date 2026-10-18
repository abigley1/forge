import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Brief API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let projectId: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-brief-test-'))
    db = createTestDatabase()
    app = createApp({
      config: {
        port: 3000,
        dataDir: tempDir,
        staticDir: tempDir,
        dbPath: ':memory:',
      },
      db,
    }).app
    projectId = (
      await request(app).post('/api/projects').send({
        name: 'Pegboard mounts',
        description: 'Hooks for the shop pegboard',
      })
    ).body.data.id
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('assembles nodes, closeouts, and inventory into one brief', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/nodes`)
      .send({ type: 'task', title: 'Print hook v3', status: 'in_progress' })
    await request(app).put(`/api/projects/${projectId}/closeouts/s1`).send({
      client: 'claude-code',
      summary: 'Tuned clearance to 0.2 mm',
      next_action: 'Print v3',
    })

    const res = await request(app).get(`/api/projects/${projectId}/brief`)
    expect(res.status).toBe(200)
    expect(res.body.data.next_actions[0].title).toBe('Print hook v3')
    expect(res.body.data.last_sessions[0].summary).toBe(
      'Tuned clearance to 0.2 mm'
    )
    expect(res.body.data.markdown).toContain('Hooks for the shop pegboard')
  })

  it('404s for unknown projects', async () => {
    await request(app).get('/api/projects/missing/brief').expect(404)
  })
})
