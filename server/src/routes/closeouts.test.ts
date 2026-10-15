import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Closeouts API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let base: string

  const closeout = {
    client: 'codex',
    workspace_path: '/Users/a/Documents/Codex/2026-10-15/task-3',
    summary: 'Redesigned pegboard hook with 0.2 mm clearance; sliced plate 2.',
    next_action: 'Print plate 2 and test fit on the pegboard.',
    evidence: [{ kind: 'file', ref: 'pegboard-mounts/hook-v3.3mf' }],
    uncertain: ['Fit not physically tested'],
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-closeout-test-'))
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
    const projectId = (
      await request(app).post('/api/projects').send({ name: 'Pegboard mounts' })
    ).body.data.id
    base = `/api/projects/${projectId}/closeouts`
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('records and reads back a closeout', async () => {
    const res = await request(app).put(`${base}/sess-1`).send(closeout)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ session_id: 'sess-1', ...closeout })
    const got = await request(app).get(`${base}/sess-1`)
    expect(got.body.data.uncertain).toEqual(['Fit not physically tested'])
  })

  it('upserts on session_id instead of duplicating', async () => {
    await request(app).put(`${base}/sess-1`).send(closeout).expect(200)
    await request(app)
      .put(`${base}/sess-1`)
      .send({ ...closeout, summary: 'Updated after second pass.' })
      .expect(200)
    const list = await request(app).get(base)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].summary).toBe('Updated after second pass.')
  })

  it('lists newest first and honors limit', async () => {
    await request(app).put(`${base}/older`).send(closeout)
    await new Promise((r) => setTimeout(r, 5))
    await request(app).put(`${base}/newer`).send(closeout)
    const list = await request(app).get(`${base}?limit=1`)
    expect(
      list.body.data.map((c: { session_id: string }) => c.session_id)
    ).toEqual(['newer'])
  })

  it('validates input', async () => {
    await request(app)
      .put(`${base}/s`)
      .send({ ...closeout, summary: '' })
      .expect(400)
    await request(app)
      .put(`${base}/s`)
      .send({ ...closeout, client: 'cursor' })
      .expect(400)
    await request(app)
      .put(`${base}/s`)
      .send({ ...closeout, evidence: [{ kind: 'vibes', ref: 'x' }] })
      .expect(400)
    await request(app)
      .put(`${base}/s`)
      .send({ ...closeout, uncertain: 'nope' })
      .expect(400)
    await request(app)
      .put(`/api/projects/missing/closeouts/s`)
      .send(closeout)
      .expect(404)
  })
})
