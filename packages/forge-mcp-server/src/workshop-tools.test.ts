import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApp } from '../../../server/src/index.js'
import { createTestDatabase } from '../../../server/src/db/index.js'
import { createApiClient } from './api-client.js'
import { callWorkshopTool, workshopTools } from './workshop-tools.js'

const data = (result: { content: Array<{ text: string }> }) =>
  JSON.parse(result.content[0].text)
const slug = 'muzzle-brake-chronometer'

describe('workshop tools', () => {
  let server: Server
  let tempDir: string
  let client: ReturnType<typeof createApiClient>

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-mcp-workshop-'))
    const { app } = createApp({
      config: {
        port: 0,
        dataDir: tempDir,
        staticDir: tempDir,
        dbPath: ':memory:',
      },
      db: createTestDatabase(),
    })
    server = app.listen(0)
    const { port } = server.address() as AddressInfo
    client = createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` })
  })
  afterAll(async () => {
    server.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('exposes inventory and project-parts tools, not project tracking', () => {
    const names = workshopTools.map((t) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'search_inventory',
        'add_inventory_item',
        'update_inventory_quantity',
        'list_project_parts',
        'project_parts_shortfall',
        'upsert_project_part',
      ])
    )
    for (const gone of [
      'list_projects',
      'switch_project',
      'create_node',
      'update_node',
      'get_node',
      'search_nodes',
      'get_brief',
      'record_closeout',
      'resolve_workspace',
      'link_workspace',
      'find_components',
    ])
      expect(names).not.toContain(gone)
    // Parts tools take the vault slug, never a scoped Forge project id.
    expect(JSON.stringify(workshopTools)).not.toContain('project_id')
  })

  it('upserts a part, then reports it in the shortfall until stock covers it', async () => {
    const added = data(
      await callWorkshopTool(client, 'add_inventory_item', {
        name: 'OPA380',
        category_id: 'electronics',
        part_number: 'OPA380AIDGKT',
        quantity: 2,
      })
    )
    const itemId = added.item.id

    const first = data(
      await callWorkshopTool(client, 'upsert_project_part', {
        project: slug,
        name: 'OPA380',
        quantity_needed: 2,
        item_id: itemId,
      })
    )
    expect(first).toMatchObject({ success: true, created: true })
    expect(
      data(
        await callWorkshopTool(client, 'project_parts_shortfall', {
          project: slug,
        })
      ).shortfall
    ).toEqual([])

    const second = data(
      await callWorkshopTool(client, 'upsert_project_part', {
        project: slug,
        name: 'opa380',
        quantity_needed: 3,
        item_id: itemId,
      })
    )
    expect(second).toMatchObject({ created: false })
    expect(second.part.id).toBe(first.part.id)
    expect(
      data(
        await callWorkshopTool(client, 'project_parts_shortfall', {
          project: slug,
        })
      ).shortfall
    ).toEqual([{ name: 'OPA380', itemId, needed: 3, owned: 2 }])
    expect(
      data(
        await callWorkshopTool(client, 'list_project_parts', { project: slug })
      ).count
    ).toBe(1)
  })

  it('rejects bad input and unknown tools', async () => {
    await expect(
      callWorkshopTool(client, 'upsert_project_part', {
        project: 'p',
        name: 'x',
      })
    ).rejects.toThrow('quantity_needed is required')
    await expect(callWorkshopTool(client, 'get_brief', {})).rejects.toThrow(
      'Unknown tool'
    )
  })
})
