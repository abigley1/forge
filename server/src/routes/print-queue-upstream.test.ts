import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
import { emptyPlate } from '../print-queue-model.js'
import { createPrintQueueRouter } from './print-queue.js'
import { createDesignProjectsRouter } from './design-projects.js'
import { createPrintQueueStudioRouter } from './print-queue-studio.js'
import {
  createReadOnlyUpstreamRouter,
  createUpstreamQueue,
  UpstreamError,
} from './print-queue-upstream.js'

const sha = (x: string) => createHash('sha256').update(x).digest('hex')

/** A real Forge queue server standing in for Home Assistant. */
async function startLive(db: DatabaseInstance) {
  const live = express()
  live.use(express.json())
  live.use('/api/print-queue', createPrintQueueRouter(db))
  live.use('/api/design-projects', createDesignProjectsRouter(db))
  const server = await new Promise<Server>((resolve) => {
    const s = live.listen(0, '127.0.0.1', () => resolve(s))
  })
  const { port } = server.address() as AddressInfo
  return { server, apiBase: `http://127.0.0.1:${port}/api` }
}
const stop = (server: Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()))

describe('read-only mirror of the live print queue', () => {
  let liveDb: DatabaseInstance, macDb: DatabaseInstance
  let server: Server, apiBase: string, mac: express.Application
  beforeEach(async () => {
    liveDb = createTestDatabase()
    macDb = createTestDatabase()
    new PrintQueueRepository(liveDb).add(0, {
      ...emptyPlate,
      name: 'live plate',
      project: 'Rack',
      revision: 'R7',
      status: 'draft',
    })
    // The retired Mac copy holds an older, different row.
    new PrintQueueRepository(macDb).add(0, {
      ...emptyPlate,
      name: 'frozen plate',
      project: 'Rack',
      revision: 'R6',
      status: 'draft',
    })
    ;({ server, apiBase } = await startLive(liveDb))
    const upstream = createUpstreamQueue(apiBase)
    mac = express()
    mac.use(express.json())
    mac.use(
      '/api/print-queue',
      createReadOnlyUpstreamRouter(upstream, 'print-queue')
    )
    mac.use(
      '/api/design-projects',
      createReadOnlyUpstreamRouter(upstream, 'design-projects')
    )
  })
  afterEach(async () => {
    if (server.listening) await stop(server)
    liveDb.close()
    macDb.close()
  })

  it('shows the live rows, never the frozen local copy, and names the live page', async () => {
    const result = await request(mac).get('/api/print-queue')
    expect(result.status).toBe(200)
    expect(
      result.body.data.plates.map((p: { name: string }) => p.name)
    ).toEqual(['live plate'])
    expect(result.body.data.version).toBe(
      new PrintQueueRepository(liveDb).read().version
    )
    expect(result.body.data.readOnlySource).toBe(
      `${new URL(apiBase).origin}/?tool=print-queue`
    )
    const projects = await request(mac).get('/api/design-projects')
    expect(projects.status).toBe(200)
    expect(projects.body.data.unassigned).toBeDefined()
  })

  it('refuses every edit and leaves both queues untouched', async () => {
    const live = new PrintQueueRepository(liveDb)
    const frozen = new PrintQueueRepository(macDb)
    const before = { live: live.read(), frozen: frozen.read() }
    const { version, plates } = before.live
    const attempts = [
      request(mac)
        .post('/api/print-queue')
        .send({ version, plate: { ...emptyPlate, name: 'x', project: 'y' } }),
      request(mac)
        .put(`/api/print-queue/${plates[0].id}`)
        .send({ version, plate: plates[0] }),
      request(mac)
        .post('/api/print-queue/reorder')
        .send({ version, ids: [plates[0].id] }),
      request(mac).post('/api/print-queue/import').send({ version, plates }),
      request(mac).delete(`/api/print-queue/${plates[0].id}`),
      request(mac)
        .post('/api/design-projects')
        .send({ project: { name: 'n', stage: 'designing', stageNote: '' } }),
    ]
    for (const attempt of attempts) {
      const result = await attempt
      expect(result.status).toBe(405)
      expect(result.headers.allow).toBe('GET')
      expect(result.body.success).toBe(false)
      expect(result.body.error).toContain('retired, read-only copy')
      expect(result.body.error).toContain(apiBase)
    }
    expect(live.read()).toEqual(before.live)
    expect(frozen.read()).toEqual(before.frozen)
  })

  it('reports the live queue as unreachable instead of falling back', async () => {
    await stop(server)
    const result = await request(mac).get('/api/print-queue')
    expect(result.status).toBe(502)
    expect(result.body.error).toContain('unreachable')
    expect(JSON.stringify(result.body)).not.toContain('frozen plate')
  })
})

describe('createUpstreamQueue', () => {
  const reply = (body: unknown, status = 200) =>
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
    ) as unknown as typeof fetch
  const plate = {
    ...emptyPlate,
    id: 'a',
    updatedAt: '2026-10-17T00:00:00.000Z',
    name: 'p',
    project: 'q',
    revision: 'r',
  }

  it.each([
    'ftp://192.168.1.130/api',
    'http://user:pw@192.168.1.130/api',
    'http://192.168.1.130/api?x=1',
    'not a url',
  ])('rejects the upstream setting %s', (value) => {
    expect(() => createUpstreamQueue(value)).toThrow()
  })

  it.each([
    ['an error envelope', { success: false, error: 'x' }, 200],
    ['an HTTP failure', { success: true, data: {} }, 500],
    ['a missing version', { success: true, data: { plates: [] } }, 200],
    [
      'an invalid plate',
      {
        success: true,
        data: { version: 1, plates: [{ ...plate, status: 'nope' }] },
      },
      200,
    ],
    [
      'a plate without an id',
      { success: true, data: { version: 1, plates: [{ ...plate, id: '' }] } },
      200,
    ],
  ])('treats %s as unavailable', async (_label, body, status) => {
    const upstream = createUpstreamQueue('http://ha.test/api', {
      fetch: reply(body, status),
    })
    await expect(upstream.readQueue()).rejects.toBeInstanceOf(UpstreamError)
  })

  it('returns a valid live queue unchanged', async () => {
    const data = { version: 3, plates: [plate] }
    const upstream = createUpstreamQueue('http://ha.test/api/', {
      fetch: reply({ success: true, data }),
    })
    expect(await upstream.readQueue()).toEqual(data)
    expect(upstream.apiBase).toBe('http://ha.test/api')
    expect(upstream.pageUrl).toBe('http://ha.test/?tool=print-queue')
  })
})

describe('Studio handoff validated against the live queue', () => {
  let dir: string, liveDb: DatabaseInstance, macDb: DatabaseInstance
  let server: Server, app: express.Application, id: string
  const launch = vi.fn<(file: string) => Promise<void>>(async () => {})
  const origin = 'http://127.0.0.1:3000'
  const api = '/api/print-queue-studio'
  const browser = (call: request.Test) =>
    call
      .set('Host', '127.0.0.1:3000')
      .set('Origin', origin)
      .set('Sec-Fetch-Site', 'same-origin')
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'forge-studio-live-'))
    liveDb = createTestDatabase()
    // The Mac's own database is empty: eligibility can only come from live rows.
    macDb = createTestDatabase()
    launch.mockClear()
    await writeFile(path.join(dir, 'job.3mf'), 'review project')
    await writeFile(path.join(dir, 'preview.png'), 'preview bytes')
    const p = new PrintQueueRepository(liveDb).add(0, {
      ...emptyPlate,
      name: 'one leg',
      project: 'Rack',
      revision: 'M5',
      status: 'draft',
      material: 'PETG',
      artifact: path.join(dir, 'job.3mf'),
      parts: [{ name: 'leg', required: 1, onPlate: 1 }],
    }).plates[0]
    id = p.id
    const expected = Object.fromEntries(
      ['project', 'revision', 'artifact', 'parts', 'material', 'profile'].map(
        (k) => [k, p[k as keyof typeof p]]
      )
    )
    await writeFile(
      path.join(dir, 'manifest.json'),
      JSON.stringify({
        entries: {
          [id]: {
            expected,
            sourceSha256: sha('review project'),
            projectFile: 'job.3mf',
            projectSha256: sha('review project'),
            previewFile: 'preview.png',
            previewSha256: sha('preview bytes'),
            previewKind: 'Plate layout',
            reason: 'Review before printing.',
          },
        },
      })
    )
    let apiBase: string
    ;({ server, apiBase } = await startLive(liveDb))
    app = express()
    app.use(express.json())
    app.use(
      api,
      createPrintQueueStudioRouter(macDb, {
        manifestPath: path.join(dir, 'manifest.json'),
        origins: [origin],
        readQueue: createUpstreamQueue(apiBase).readQueue,
        launch,
      })
    )
  })
  afterEach(async () => {
    if (server.listening) await stop(server)
    liveDb.close()
    macDb.close()
    await rm(dir, { recursive: true, force: true })
  })
  async function credentials() {
    const session = await browser(request(app).get(api + '/session'))
    const assets = await browser(request(app).get(api + '/assets'))
    return {
      token: session.body.data.token,
      binding: assets.body.data.items[id]?.binding,
    }
  }

  it('opens a plate that exists only on the live queue, without changing it', async () => {
    const live = new PrintQueueRepository(liveDb)
    const before = live.read()
    const { token, binding } = await credentials()
    expect(binding).toMatch(/^[a-f0-9]{64}$/)
    const result = await browser(request(app).post(`${api}/${id}/open`))
      .set('X-Forge-Studio', token)
      .send({ binding })
    expect(result.status).toBe(200)
    expect(launch).toHaveBeenCalledOnce()
    expect(live.read()).toEqual(before)
    expect(new PrintQueueRepository(macDb).read().plates).toEqual([])
  })

  it('invalidates the handoff when the live row drifts from the manifest', async () => {
    const { token, binding } = await credentials()
    const live = new PrintQueueRepository(liveDb)
    const q = live.read()
    live.update(q.version, id, { ...q.plates[0], material: 'PLA' })
    expect(
      (await browser(request(app).get(api + '/assets'))).body.data.items[id]
    ).toBeUndefined()
    const result = await browser(request(app).post(`${api}/${id}/open`))
      .set('X-Forge-Studio', token)
      .send({ binding })
    expect(result.status).toBe(409)
    expect(launch).not.toHaveBeenCalled()
  })

  it('pauses previews and opening while the live queue is unreachable', async () => {
    const { token, binding } = await credentials()
    await stop(server)
    const assets = await browser(request(app).get(api + '/assets'))
    expect(assets.status).toBe(503)
    expect(assets.body.error).toContain('paused')
    expect(
      (await browser(request(app).get(`${api}/${id}/preview?v=${binding}`)))
        .status
    ).toBe(404)
    const open = await browser(request(app).post(`${api}/${id}/open`))
      .set('X-Forge-Studio', token)
      .send({ binding })
    expect(open.status).toBe(409)
    expect(open.body.error).toContain('unreachable')
    expect(launch).not.toHaveBeenCalled()
  })
})
