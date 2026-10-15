import { describe, it, expect, beforeEach } from 'vitest'
import {
  runWithProject,
  requireProjectId,
  setDefaultProjectId,
  withProjectIdParam,
} from './project-scope.js'

describe('project scope', () => {
  beforeEach(() => setDefaultProjectId(null))

  it('prefers the per-call project_id over the default', async () => {
    setDefaultProjectId('default')
    await expect(
      runWithProject('explicit', async () => requireProjectId())
    ).resolves.toBe('explicit')
  })

  it('falls back to the switch_project default', async () => {
    setDefaultProjectId('default')
    await expect(
      runWithProject(undefined, async () => requireProjectId())
    ).resolves.toBe('default')
  })

  it('isolates concurrent calls', async () => {
    const tick = () => new Promise((r) => setTimeout(r, 5))
    const [a, b] = await Promise.all([
      runWithProject('a', async () => {
        await tick()
        return requireProjectId()
      }),
      runWithProject('b', async () => {
        await tick()
        return requireProjectId()
      }),
    ])
    expect([a, b]).toEqual(['a', 'b'])
  })

  it('throws a helpful error when nothing is set', async () => {
    await expect(
      runWithProject(undefined, async () => requireProjectId())
    ).rejects.toThrow(/project_id/)
  })

  it('adds project_id only to scoped tools', () => {
    const scoped = withProjectIdParam({
      name: 'get_node',
      description: '',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
    })
    const global = withProjectIdParam({
      name: 'list_projects',
      description: '',
      inputSchema: { type: 'object', properties: {} },
    })
    expect(Object.keys(scoped.inputSchema.properties ?? {})).toEqual([
      'project_id',
      'id',
    ])
    expect(global.inputSchema.properties).toEqual({})
  })
})
