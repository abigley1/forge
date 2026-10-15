import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApp } from '../../../server/src/index.js'
import { createTestDatabase } from '../../../server/src/db/index.js'
import { sessionStart, stop, type HookDeps } from './hooks.js'

describe('forge hooks', () => {
  let server: Server
  let apiUrl: string
  let projectId: string
  let workDir: string
  let deps: HookDeps

  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-srv-'))
    const { app } = createApp({
      config: { port: 0, dataDir: tmp, staticDir: tmp, dbPath: ':memory:' },
      db: createTestDatabase(),
    })
    server = app.listen(0)
    apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
    const res = await fetch(`${apiUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Monitor wall mount',
        description: 'VESA wall mount, PETG',
      }),
    })
    projectId = ((await res.json()) as { data: { id: string } }).data.id
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-work-'))
    deps = {
      apiUrl,
      client: 'codex',
      stateDir: await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-state-')),
    }
  })

  const link = () =>
    fetch(`${apiUrl}/workspaces/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, path: workDir }),
    })

  it('injects the brief and session instructions for a linked folder', async () => {
    await link()
    const out = await sessionStart({ session_id: 's1', cwd: workDir }, deps)
    expect(out).toContain('# Forge brief: Monitor wall mount')
    expect(out).toContain(`project_id="${projectId}"`)
    expect(out).toContain('session_id="s1"')
  })

  it('lists candidate projects for an unlinked folder', async () => {
    const out = await sessionStart({ session_id: 's2', cwd: workDir }, deps)
    expect(out).toContain('not linked')
    expect(out).toContain('Monitor wall mount')
    expect(out).toContain('link_workspace')
  })

  it('fails open when Forge is unreachable', async () => {
    const started = Date.now()
    const down = { ...deps, apiUrl: 'http://127.0.0.1:1/api', timeoutMs: 500 }
    expect(await sessionStart({ session_id: 's3', cwd: workDir }, down)).toBe(
      ''
    )
    expect(await stop({ session_id: 's3', cwd: workDir }, down)).toEqual({})
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('does not block when nothing changed in the workspace', async () => {
    await link()
    await sessionStart({ session_id: 's4', cwd: workDir }, deps)
    expect(await stop({ session_id: 's4', cwd: workDir }, deps)).toEqual({})
  })

  it('blocks once after workspace changes, then not again until the next change', async () => {
    await link()
    await sessionStart({ session_id: 's5', cwd: workDir }, deps)
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'mount-v2.scad'), 'cube(10);')

    const first = await stop({ session_id: 's5', cwd: workDir }, deps)
    expect(first).toMatchObject({ decision: 'block' })
    if ('reason' in first) expect(first.reason).toContain('record_closeout')

    expect(await stop({ session_id: 's5', cwd: workDir }, deps)).toEqual({})

    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'mount-v3.scad'), 'cube(12);')
    expect(await stop({ session_id: 's5', cwd: workDir }, deps)).toMatchObject({
      decision: 'block',
    })
  })

  it('does not block when stop_hook_active', async () => {
    await link()
    await sessionStart({ session_id: 's6', cwd: workDir }, deps)
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(
      await stop(
        { session_id: 's6', cwd: workDir, stop_hook_active: true },
        deps
      )
    ).toEqual({})
  })

  it('does not block for unlinked folders', async () => {
    await sessionStart({ session_id: 's7', cwd: workDir }, deps)
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(await stop({ session_id: 's7', cwd: workDir }, deps)).toEqual({})
  })

  it('picks up a folder linked mid-session', async () => {
    await sessionStart({ session_id: 's8', cwd: workDir }, deps)
    await link()
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(await stop({ session_id: 's8', cwd: workDir }, deps)).toMatchObject({
      decision: 'block',
    })
  })

  it('keeps the baseline across resume/compact so earlier edits still prompt', async () => {
    await link()
    await sessionStart({ session_id: 's9', cwd: workDir }, deps)
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'bracket.scad'), 'cube(5);')
    await sessionStart(
      { session_id: 's9', cwd: workDir, source: 'compact' },
      deps
    )
    expect(await stop({ session_id: 's9', cwd: workDir }, deps)).toMatchObject({
      decision: 'block',
    })
  })
})
