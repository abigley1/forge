import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { createDesignProjectsRouter } from './design-projects.js'
import { createPrintQueueRouter } from './print-queue.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
import { emptyPlate } from '../print-queue-model.js'

const plate = (project: string, extra = {}) => ({
  ...emptyPlate,
  name: 'Legs',
  project,
  revision: 'R1',
  parts: [{ name: 'leg', required: 2, onPlate: 1 }],
  artifact: '/tmp/legs.3mf',
  status: 'ready',
  purpose: 'production',
  ...extra,
})

describe('design projects API', () => {
  let db: DatabaseInstance
  let app: express.Application
  beforeEach(() => {
    db = createTestDatabase()
    app = express()
    app.use(express.json())
    app.use('/api/print-queue', createPrintQueueRouter(db))
    app.use('/api/design-projects', createDesignProjectsRouter(db))
  })
  afterEach(() => db.close())

  const create = (project: object) =>
    request(app).post('/api/design-projects').send({ project })
  const addPlate = (version: number, p: object) =>
    request(app).post('/api/print-queue').send({ version, plate: p })

  it('creates a project and summarizes its plates from the queue', async () => {
    await addPlate(0, plate('Rack'))
    await addPlate(1, plate('Loose'))
    const created = await create({
      name: 'rack',
      stage: 'production',
      stageNote: 'R1',
    })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      name: 'rack',
      stage: 'production',
      version: 1,
    })
    const overview = (await request(app).get('/api/design-projects')).body.data
    expect(overview.queueVersion).toBe(2)
    expect(overview.projects[0].summary.production).toEqual({
      printed: 0,
      planned: 2,
      planComplete: true,
    })
    expect(overview.projects[0].plates).toHaveLength(1)
    expect(overview.unassigned).toEqual([{ project: 'Loose', plates: 1 }])
  })

  it('lists projects in pipeline stage order', async () => {
    await create({ name: 'B', stage: 'on-hold' })
    await create({ name: 'A', stage: 'production' })
    await create({ name: 'C', stage: 'designing' })
    const names = (
      await request(app).get('/api/design-projects')
    ).body.data.projects.map((p: { name: string }) => p.name)
    expect(names).toEqual(['C', 'A', 'B'])
  })

  it('rejects duplicate names (case-insensitive) with 409', async () => {
    await create({ name: 'Rack', stage: 'designing' })
    const dup = await create({ name: 'RACK', stage: 'done' })
    expect(dup.status).toBe(409)
  })

  it('updates stage with a version check', async () => {
    const id = (await create({ name: 'Rack', stage: 'designing' })).body.data.id
    const ok = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({
        version: 1,
        project: { name: 'Rack', stage: 'test-printing', stageNote: 'R2 fit' },
      })
    expect(ok.body.data).toMatchObject({
      stage: 'test-printing',
      stageNote: 'R2 fit',
      version: 2,
    })
    const stale = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'Rack', stage: 'done' } })
    expect(stale.status).toBe(409)
    const missing = await request(app)
      .put('/api/design-projects/nope')
      .send({ version: 1, project: { name: 'X', stage: 'done' } })
    expect(missing.status).toBe(404)
  })

  it('rename rewrites matching plates and bumps the queue version atomically', async () => {
    await addPlate(0, plate('rack'))
    await addPlate(1, plate('Other'))
    const id = (await create({ name: 'Rack', stage: 'production' })).body.data
      .id
    const res = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({
        version: 1,
        project: { name: 'Basic 9U rack', stage: 'production' },
      })
    expect(res.status).toBe(200)
    const queue = new PrintQueueRepository(db).read()
    expect(queue.version).toBe(3)
    expect(queue.plates.map((p) => p.project)).toEqual([
      'Basic 9U rack',
      'Other',
    ])
  })

  it('a stage-only edit leaves the queue untouched', async () => {
    await addPlate(0, plate('Rack'))
    const id = (await create({ name: 'Rack', stage: 'production' })).body.data
      .id
    await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'Rack', stage: 'done' } })
    expect(new PrintQueueRepository(db).read().version).toBe(1)
  })

  it('rename into an existing name is 409 and changes nothing', async () => {
    await addPlate(0, plate('Rack'))
    const id = (await create({ name: 'Rack', stage: 'production' })).body.data
      .id
    await create({ name: 'Shelf', stage: 'designing' })
    const res = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'shelf', stage: 'production' } })
    expect(res.status).toBe(409)
    const queue = new PrintQueueRepository(db).read()
    expect(queue.version).toBe(1)
    expect(queue.plates[0].project).toBe('Rack')
    const names = (
      await request(app).get('/api/design-projects')
    ).body.data.projects.map((p: { name: string }) => p.name)
    expect(names.sort()).toEqual(['Rack', 'Shelf'])
  })

  it('validates input with 400', async () => {
    expect((await create({ name: '', stage: 'done' })).status).toBe(400)
    expect((await create({ name: 'A', stage: 'shipping' })).status).toBe(400)
  })
})
