import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Workspaces API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let projectId: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-ws-test-'))
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
      await request(app).post('/api/projects').send({ name: 'Pegboard mounts' })
    ).body.data.id
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('returns candidates for an unlinked folder', async () => {
    const res = await request(app)
      .post('/api/workspaces/resolve')
      .send({ cwd: '/Users/a/Documents/Codex/2026-10-15/task-3' })
    expect(res.status).toBe(200)
    expect(res.body.data.project).toBeNull()
    expect(
      res.body.data.candidates.map((p: { name: string }) => p.name)
    ).toContain('Pegboard mounts')
  })

  it('links a folder and then resolves it', async () => {
    await request(app)
      .post('/api/workspaces/links')
      .send({
        project_id: projectId,
        path: '/Users/a/Documents/Codex/2026-10-15/task-3',
      })
      .expect(201)
    const res = await request(app)
      .post('/api/workspaces/resolve')
      .send({
        cwd: '/Users/a/Documents/Codex/2026-10-15/task-3/pegboard-mounts',
      })
    expect(res.body.data.project.id).toBe(projectId)
    expect(res.body.data.match).toEqual({
      kind: 'path',
      value: '/Users/a/Documents/Codex/2026-10-15/task-3',
    })
  })

  it('validates link requests', async () => {
    await request(app)
      .post('/api/workspaces/links')
      .send({ project_id: projectId })
      .expect(400)
    await request(app)
      .post('/api/workspaces/links')
      .send({ project_id: 'nope', path: '/x' })
      .expect(404)
    await request(app).post('/api/workspaces/resolve').send({}).expect(400)
  })
})
