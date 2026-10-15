import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
import { emptyPlate } from '../print-queue-model.js'
import { createPrintQueueStudioRouter } from './print-queue-studio.js'
const sha = (x: string) => createHash('sha256').update(x).digest('hex')
describe('local Studio handoff boundary', () => {
  let dir: string,
    db: DatabaseInstance,
    app: express.Application,
    repo: PrintQueueRepository,
    id: string
  const launch = vi.fn<(file: string) => Promise<void>>(async () => {})
  const origin = 'http://127.0.0.1:3000'
  const browser = (call: request.Test) =>
    call
      .set('Host', '127.0.0.1:3000')
      .set('Origin', origin)
      .set('Sec-Fetch-Site', 'same-origin')
  const api = '/api/print-queue-studio'
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'forge-studio-'))
    db = createTestDatabase()
    repo = new PrintQueueRepository(db)
    launch.mockClear()
    await writeFile(path.join(dir, 'job.3mf'), 'review project')
    await writeFile(path.join(dir, 'preview.png'), 'preview bytes')
    const p = repo.add(0, {
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
    app = express()
    app.use(express.json())
    app.use(
      api,
      createPrintQueueStudioRouter(db, {
        manifestPath: path.join(dir, 'manifest.json'),
        origins: [origin],
        launch,
      })
    )
  })
  afterEach(async () => {
    db.close()
    await rm(dir, { recursive: true, force: true })
  })
  async function credentials() {
    const session = await browser(request(app).get(api + '/session'))
    const assets = await browser(request(app).get(api + '/assets'))
    return {
      token: session.body.data.token,
      binding: assets.body.data.items[id].binding,
    }
  }
  it('opens only a hash-checked copy and never changes counts/status', async () => {
    const { token, binding } = await credentials()
    const before = repo.read()
    const result = await browser(request(app).post(`${api}/${id}/open`))
      .set('X-Forge-Studio', token)
      .send({ binding })
    expect(result.status).toBe(200)
    expect(launch).toHaveBeenCalledOnce()
    const copy = launch.mock.calls[0][0]
    expect(copy).not.toBe(path.join(dir, 'job.3mf'))
    expect(await readFile(copy, 'utf8')).toBe('review project')
    expect(repo.read()).toEqual(before)
    expect(
      (
        await browser(request(app).post(`${api}/${id}/open`))
          .set('X-Forge-Studio', token)
          .send({ binding })
      ).status
    ).toBe(409)
  })
  it.each([
    'http://evil.test',
    'http://localhost.evil.test',
    'null',
    'http://127.0.0.1:4000',
  ])('rejects cross-origin %s before exposing a token', async (origin) => {
    const result = await request(app)
      .get(api + '/session')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', origin)
    expect(result.status).toBe(403)
    expect(launch).not.toHaveBeenCalled()
  })
  it('rejects absent browser context, forged host, cross-site images, missing/wrong token and arbitrary path body', async () => {
    expect(
      (
        await request(app)
          .get(api + '/session')
          .set('Host', '127.0.0.1:3000')
      ).status
    ).toBe(403)
    expect(
      (
        await browser(request(app).get(api + '/session')).set(
          'Host',
          'evil.test'
        )
      ).status
    ).toBe(403)
    expect(
      (
        await browser(request(app).get(`${api}/${id}/preview`)).set(
          'Sec-Fetch-Site',
          'cross-site'
        )
      ).status
    ).toBe(403)
    const { token, binding } = await credentials()
    expect(
      (await browser(request(app).post(`${api}/${id}/open`)).send({ binding }))
        .status
    ).toBe(403)
    expect(
      (
        await browser(request(app).post(`${api}/${id}/open`))
          .set('X-Forge-Studio', 'a'.repeat(64))
          .send({ binding })
      ).status
    ).toBe(403)
    expect(
      (
        await browser(request(app).post(`${api}/${id}/open`))
          .set('X-Forge-Studio', token)
          .send({ binding, path: '/tmp/other.3mf' })
      ).status
    ).toBe(400)
    expect(launch).not.toHaveBeenCalled()
  })
  it('invalidates preview and open after a revision/quantity change', async () => {
    const { token, binding } = await credentials()
    const q = repo.read()
    repo.update(q.version, id, { ...q.plates[0], revision: 'new' })
    expect(
      (await browser(request(app).get(api + '/assets'))).body.data.items[id]
    ).toBeUndefined()
    expect(
      (await browser(request(app).get(`${api}/${id}/preview?v=${binding}`)))
        .status
    ).toBe(404)
    expect(
      (
        await browser(request(app).post(`${api}/${id}/open`))
          .set('X-Forge-Studio', token)
          .send({ binding })
      ).status
    ).toBe(409)
    expect(launch).not.toHaveBeenCalled()
  })
  it('rejects altered source bytes and a preview symlink outside the approved folder', async () => {
    const { token, binding } = await credentials()
    const outside = path.join(tmpdir(), `forge-preview-${id}.png`)
    await writeFile(outside, 'preview bytes')
    try {
      await rm(path.join(dir, 'preview.png'))
      await symlink(outside, path.join(dir, 'preview.png'))
      expect(
        (await browser(request(app).get(`${api}/${id}/preview?v=${binding}`)))
          .status
      ).toBe(404)
      await writeFile(path.join(dir, 'job.3mf'), 'changed')
      expect(
        (
          await browser(request(app).post(`${api}/${id}/open`))
            .set('X-Forge-Studio', token)
            .send({ binding })
        ).status
      ).toBe(409)
      expect(launch).not.toHaveBeenCalled()
    } finally {
      await rm(outside)
    }
  })
  it('rejects superseded, printing, done, unknown IDs and stale binding', async () => {
    const { token, binding } = await credentials()
    expect(
      (
        await browser(request(app).post(`${api}/${id}/open`))
          .set('X-Forge-Studio', token)
          .send({ binding: 'stale' })
      ).status
    ).toBe(409)
    for (const status of ['printing', 'done', 'blocked']) {
      const q = repo.read()
      repo.update(q.version, id, {
        ...q.plates[0],
        status,
        printed: status === 'done' ? 1 : 0,
        supersededBy: status === 'blocked' ? 'newer' : '',
      })
      expect(
        (
          await browser(request(app).post(`${api}/${id}/open`))
            .set('X-Forge-Studio', token)
            .send({ binding })
        ).status
      ).toBe(409)
    }
    expect(
      (
        await browser(request(app).post(`${api}/unknown/open`))
          .set('X-Forge-Studio', token)
          .send({ binding })
      ).status
    ).toBe(409)
    expect(launch).not.toHaveBeenCalled()
  })
  it('serves a current validated preview without exposing arbitrary files', async () => {
    const { binding } = await credentials()
    const result = await browser(
      request(app).get(`${api}/${id}/preview?v=${binding}`)
    )
    expect(result.status).toBe(200)
    expect(result.headers['content-type']).toContain('image/png')
    expect(result.headers['cross-origin-resource-policy']).toBe('same-origin')
    expect(
      (await browser(request(app).get(`${api}/${id}/preview?v=old`))).status
    ).toBe(409)
  })
})
