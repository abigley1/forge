import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApp } from '../../../server/src/index.js'
import { createTestDatabase } from '../../../server/src/db/index.js'
import { createApiClient } from './api-client.js'

describe('agent-loop API client (real Forge server)', () => {
  let server: Server
  let tempDir: string
  let client: ReturnType<typeof createApiClient>

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-mcp-loop-'))
    const db = createTestDatabase()
    const { app } = createApp({
      config: {
        port: 0,
        dataDir: tempDir,
        staticDir: tempDir,
        dbPath: ':memory:',
      },
      db,
    })
    server = app.listen(0)
    const { port } = server.address() as AddressInfo
    client = createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` })
  })

  afterAll(async () => {
    server.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('links, resolves, briefs, and records a closeout', async () => {
    const project = await client.createProject({ name: 'Jumper organizer' })
    if (!project.success) throw new Error(project.error)
    const id = project.data.id

    const unresolved = await client.resolveWorkspace(
      '/Users/a/Documents/Codex/2026-10-15/task-4'
    )
    expect(unresolved.success && unresolved.data.project).toBeNull()

    await client.linkWorkspace({
      project_id: id,
      path: '/Users/a/Documents/Codex/2026-10-15/task-4',
    })
    const resolved = await client.resolveWorkspace(
      '/Users/a/Documents/Codex/2026-10-15/task-4/jumper-organizer'
    )
    expect(resolved.success && resolved.data.project?.id).toBe(id)

    const saved = await client.recordCloseout(id, 'sess-9', {
      client: 'codex',
      summary: 'Added divider insert',
    })
    expect(saved.success).toBe(true)

    const brief = await client.getBrief(id)
    expect(brief.success && brief.data.markdown).toContain(
      'Added divider insert'
    )
  })
})
