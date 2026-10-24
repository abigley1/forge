import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { InventoryRepository } from '../db/InventoryRepository.js'
import { createProjectPartsRouter } from './project-parts.js'
import { createDesignProjectsRouter } from './design-projects.js'

describe('project parts API', () => {
  let db: DatabaseInstance
  let app: express.Application
  let opaId: string
  beforeEach(() => {
    db = createTestDatabase()
    app = express()
    app.use(express.json())
    app.use('/api/project-parts', createProjectPartsRouter(db))
    app.use('/api/design-projects', createDesignProjectsRouter(db))
    opaId = new InventoryRepository(db).createItem({
      name: 'OPA380 Transimpedance Amplifier',
      category_id: 'electronics',
      part_number: 'OPA380AIDGKT',
      quantity: 2,
    }).id
  })
  afterEach(() => db.close())

  const add = (part: object) =>
    request(app).post('/api/project-parts').send(part)
  const shortfall = (project: string) =>
    request(app).get('/api/project-parts/shortfall').query({ project })

  it('creates and lists parts by project', async () => {
    const created = await add({
      project: 'muzzle-brake-chronometer',
      itemId: opaId,
      name: 'OPA380',
      quantityNeeded: 2,
    })
    expect(created.status).toBe(201)
    expect(created.body).toEqual({
      success: true,
      data: {
        id: expect.any(String),
        project: 'muzzle-brake-chronometer',
        itemId: opaId,
        name: 'OPA380',
        quantityNeeded: 2,
      },
    })
    await add({
      project: 'muzzle-brake-chronometer',
      name: 'ESP32',
      quantityNeeded: 1,
    })
    await add({ project: 'other', name: 'Screw', quantityNeeded: 4 })

    const list = await request(app)
      .get('/api/project-parts')
      .query({ project: 'muzzle-brake-chronometer' })
    expect(list.status).toBe(200)
    expect(list.body.data.map((p: { name: string }) => p.name)).toEqual([
      'OPA380',
      'ESP32',
    ])
    expect(list.body.data[1].itemId).toBeNull()

    const put = await request(app)
      .put(`/api/project-parts/${created.body.data.id}`)
      .send({
        project: 'muzzle-brake-chronometer',
        itemId: opaId,
        name: 'OPA380',
        quantityNeeded: 3,
      })
    expect(put.body.data.quantityNeeded).toBe(3)
  })

  it('rejects invalid parts and an unknown inventory item', async () => {
    expect(
      (await add({ project: 'p', name: '', quantityNeeded: 1 })).status
    ).toBe(400)
    expect(
      (await add({ project: 'p', name: 'x', quantityNeeded: 0 })).status
    ).toBe(400)
    expect(
      (
        await add({
          project: 'p',
          name: 'x',
          itemId: 'nope',
          quantityNeeded: 1,
        })
      ).status
    ).toBe(400)
    await add({ project: 'p', name: 'x', quantityNeeded: 1 })
    expect(
      (await add({ project: 'P', name: 'X', quantityNeeded: 1 })).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .put('/api/project-parts/nope')
          .send({ project: 'p', name: 'x', quantityNeeded: 1 })
      ).status
    ).toBe(404)
  })

  it('shortfall reports needed minus owned', async () => {
    const created = await add({
      project: 'chrono',
      itemId: opaId,
      name: 'OPA380',
      quantityNeeded: 2,
    })
    // needed 2, owned 2: not listed
    expect((await shortfall('chrono')).body.data).toEqual([])

    await request(app).put(`/api/project-parts/${created.body.data.id}`).send({
      project: 'chrono',
      itemId: opaId,
      name: 'OPA380',
      quantityNeeded: 3,
    })
    expect((await shortfall('chrono')).body.data).toEqual([
      { name: 'OPA380', itemId: opaId, needed: 3, owned: 2 },
    ])

    // A part with no inventory link is always short; wishlist stock is not owned.
    await add({ project: 'chrono', name: 'ESP32', quantityNeeded: 1 })
    const wish = new InventoryRepository(db).createItem({
      name: 'Wish',
      category_id: 'electronics',
      quantity: 5,
      status: 'wishlist',
    }).id
    await add({
      project: 'chrono',
      itemId: wish,
      name: 'Wish',
      quantityNeeded: 1,
    })
    const rows = (await shortfall('chrono')).body.data
    expect(rows).toEqual([
      { name: 'OPA380', itemId: opaId, needed: 3, owned: 2 },
      { name: 'ESP32', itemId: null, needed: 1, owned: 0 },
      { name: 'Wish', itemId: wish, needed: 1, owned: 0 },
    ])
  })

  it('unknown project returns empty list', async () => {
    const list = await request(app)
      .get('/api/project-parts')
      .query({ project: 'nope' })
    expect(list.status).toBe(200)
    expect(list.body).toEqual({ success: true, data: [] })
    expect((await shortfall('nope')).body.data).toEqual([])
  })

  it('deleting inventory unlinks the part instead of removing it', async () => {
    await add({
      project: 'p',
      itemId: opaId,
      name: 'OPA380',
      quantityNeeded: 1,
    })
    new InventoryRepository(db).deleteItem(opaId)
    const list = await request(app)
      .get('/api/project-parts')
      .query({ project: 'p' })
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].itemId).toBeNull()
  })

  it('stage write without vault-bot header is rejected 403', async () => {
    const created = await request(app)
      .post('/api/design-projects')
      .send({ project: { name: 'Rack', stage: 'designing' } })
    expect(created.status).toBe(201)
    const id = created.body.data.id
    const change = {
      version: 1,
      project: { name: 'Rack', stage: 'done', stageNote: 'x' },
    }
    const denied = await request(app)
      .put(`/api/design-projects/${id}`)
      .send(change)
    expect(denied.status).toBe(403)
    expect(denied.body.success).toBe(false)
    const allowed = await request(app)
      .put(`/api/design-projects/${id}`)
      .set('X-Forge-Writer', 'vault-bot')
      .send(change)
    expect(allowed.status).toBe(200)
    expect(allowed.body.data).toMatchObject({
      stage: 'done',
      stageNote: 'x',
      version: 2,
    })
    // Other fields stay writable without the header when stage is unchanged.
    const rename = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({
        version: 2,
        project: { name: 'Rack v2', stage: 'done', stageNote: 'x' },
      })
    expect(rename.status).toBe(200)
    expect(rename.body.data.name).toBe('Rack v2')
  })
})
