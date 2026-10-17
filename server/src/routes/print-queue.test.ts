import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { createPrintQueueRouter } from './print-queue.js'
import {
  copiesNeeded,
  copiesRemaining,
  queueTotals,
  emptyPlate,
  validatePlate,
  type PrintPlate,
} from '../print-queue-model.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
const plate = {
  ...emptyPlate,
  name: 'Hooks',
  project: 'Shelf',
  revision: 'R5',
  parts: [{ name: 'hook', required: 4, onPlate: 1 }],
  artifact: '/tmp/hooks.3mf',
  status: 'ready',
}
describe('shared print queue', () => {
  let db: DatabaseInstance
  let app: express.Application
  beforeEach(() => {
    db = createTestDatabase()
    app = express()
    app.use(express.json())
    app.use('/api/print-queue', createPrintQueueRouter(db))
  })
  afterEach(() => db.close())
  it('persists a plate and reopens through another repository without resetting data', async () => {
    const res = await request(app)
      .post('/api/print-queue')
      .send({ version: 0, plate })
    expect(res.status).toBe(201)
    expect(res.body.data.version).toBe(1)
    expect(new PrintQueueRepository(db).read()).toEqual(res.body.data)
    expect((await request(app).get('/api/print-queue')).body.data).toEqual(
      res.body.data
    )
  })
  it('rejects stale edits and invalid reorder atomically; preserves every plate', async () => {
    const a = (
      await request(app).post('/api/print-queue').send({ version: 0, plate })
    ).body.data
    const stale = await request(app)
      .post('/api/print-queue')
      .send({ version: 0, plate })
    expect(stale.status).toBe(409)
    const b = (
      await request(app)
        .post('/api/print-queue')
        .send({ version: 1, plate: { ...plate, name: 'Other' } })
    ).body.data
    const ids = b.plates.map((p: PrintPlate) => p.id)
    expect(
      (
        await request(app)
          .post('/api/print-queue/reorder')
          .send({ version: 2, ids: [ids[0], ids[0]] })
      ).status
    ).toBe(400)
    expect(
      (
        await request(app)
          .post('/api/print-queue/reorder')
          .send({ version: 2, ids: [] })
      ).status
    ).toBe(400)
    const sorted = (
      await request(app)
        .post('/api/print-queue/reorder')
        .send({ version: 2, ids: [...ids].reverse() })
    ).body.data
    expect(sorted.plates.map((p: PrintPlate) => p.id)).toEqual(
      [...ids].reverse()
    )
    expect(
      (
        await request(app)
          .put(`/api/print-queue/${a.plates[0].id}`)
          .send({ version: 2, plate })
      ).status
    ).toBe(409)
    expect(new PrintQueueRepository(db).read().version).toBe(3)
  })
  it('supports every status but never manufactures completed copies', async () => {
    const res = (
      await request(app).post('/api/print-queue').send({ version: 0, plate })
    ).body.data
    const id = res.plates[0].id
    let version = 1
    for (const status of ['draft', 'ready', 'printing', 'failed', 'blocked']) {
      const result = await request(app)
        .put(`/api/print-queue/${id}`)
        .send({ version, plate: { ...plate, status } })
      expect(result.status).toBe(200)
      expect(result.body.data.plates[0].printed).toBe(0)
      version++
    }
    expect(
      (
        await request(app)
          .put(`/api/print-queue/${id}`)
          .send({ version, plate: { ...plate, status: 'done' } })
      ).status
    ).toBe(400)
    expect(
      (
        await request(app)
          .put(`/api/print-queue/${id}`)
          .send({ version, plate: { ...plate, status: 'done', printed: 4 } })
      ).status
    ).toBe(200)
  })
  it.each([
    { printed: -1 },
    { printed: 0.5 },
    { parts: [{ name: 'hook', required: 4, onPlate: 0 }] },
    { parts: [{ name: 'hook', required: 0, onPlate: 1 }] },
    { grams: -2 },
    { minutes: 'unknown' },
    { artifact: 'javascript:alert(1)' },
    { supersededBy: 'R6' },
    { status: 'done' },
    { status: 'bogus' },
    { project: '' },
  ])('rejects malformed plate %j without writing', async (patch) => {
    expect(
      (
        await request(app)
          .post('/api/print-queue')
          .send({ version: 0, plate: { ...plate, ...patch } })
      ).status
    ).toBe(400)
    expect(new PrintQueueRepository(db).read()).toEqual({
      version: 0,
      plates: [],
    })
  })
  it('allows a blocked review placeholder with unknown quantities and blocks obsolete revisions', async () => {
    const p = {
      ...emptyPlate,
      name: 'Review',
      project: 'Caddy',
      revision: 'R3',
      status: 'blocked',
    }
    expect(
      (
        await request(app)
          .post('/api/print-queue')
          .send({ version: 0, plate: p })
      ).status
    ).toBe(201)
    const old = {
      ...plate,
      revision: 'R4',
      status: 'blocked',
      supersededBy: 'R5',
    }
    expect(
      (
        await request(app)
          .post('/api/print-queue')
          .send({ version: 1, plate: old })
      ).status
    ).toBe(201)
  })
  it('calculates mixed part copies, partial totals and unknowns without including superseded work', () => {
    const p = {
      ...plate,
      status: 'draft',
      printed: 1,
      id: 'a',
      updatedAt: '',
      grams: 10,
      minutes: 30,
      parts: [
        { name: 'A', required: 5, onPlate: 2 },
        { name: 'B', required: 7, onPlate: 3 },
      ],
    } as PrintPlate
    expect(copiesNeeded(p)).toBe(3)
    expect(copiesRemaining(p)).toBe(2)
    const unknown = { ...p, id: 'b', grams: null, minutes: null }
    expect(
      queueTotals([
        p,
        unknown,
        { ...p, supersededBy: 'R6' },
        { ...p, status: 'done' },
      ])
    ).toMatchObject({
      grams: 20,
      minutes: 60,
      copies: 4,
      unknownGrams: 2,
      unknownTime: 2,
    })
  })
  it('validates purpose and testResult', () => {
    expect(validatePlate({ ...plate, purpose: 'production' }).purpose).toBe(
      'production'
    )
    expect(validatePlate(plate).purpose).toBe('')
    expect(validatePlate(plate).testResult).toBe('')
    expect(() => validatePlate({ ...plate, purpose: 'prototype' })).toThrow(
      /purpose/
    )
    expect(() =>
      validatePlate({
        ...plate,
        purpose: 'production',
        printed: 1,
        testResult: 'pass',
      })
    ).toThrow(/only test plates/)
    expect(() =>
      validatePlate({
        ...plate,
        purpose: 'test',
        printed: 0,
        testResult: 'pass',
      })
    ).toThrow(/printed copy/)
    expect(
      validatePlate({
        ...plate,
        purpose: 'test',
        printed: 1,
        testResult: 'fail',
      }).testResult
    ).toBe('fail')
  })
  it('legacy plates read back with empty purpose and testResult', () => {
    const repo = new PrintQueueRepository(db)
    const legacy: Record<string, unknown> = {
      ...validatePlate(plate),
      id: 'legacy-1',
      updatedAt: '2026-10-13T00:00:00.000Z',
    }
    delete legacy.purpose
    delete legacy.testResult
    db.prepare('UPDATE print_queue SET version=1, plates=? WHERE id=1').run(
      JSON.stringify([legacy])
    )
    const read = repo.read().plates[0]
    expect(read.purpose).toBe('')
    expect(read.testResult).toBe('')
    expect(read.id).toBe('legacy-1')
  })
})
