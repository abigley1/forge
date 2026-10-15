import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Backup API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-backup-test-'))
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
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('returns a restorable SQLite snapshot containing current data', async () => {
    await request(app)
      .post('/api/projects')
      .send({ name: 'Desk risers' })
      .expect(201)

    const res = await request(app)
      .get('/api/backup')
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="forge-.*\.sqlite"/
    )
    const restoredPath = path.join(tempDir, 'restored.sqlite')
    await fs.writeFile(restoredPath, res.body as Buffer)
    const restored = new Database(restoredPath, { readonly: true })
    const names = restored.prepare('SELECT name FROM projects').all() as Array<{
      name: string
    }>
    restored.close()
    expect(names.map((n) => n.name)).toContain('Desk risers')
  })
})
