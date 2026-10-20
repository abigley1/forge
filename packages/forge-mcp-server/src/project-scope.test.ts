import { describe, it, expect, beforeEach } from 'vitest'
import {
  runWithProject,
  requireProjectId,
  setDefaultProjectId,
  getDefaultProjectId,
  endSession,
  withProjectIdParam,
} from './project-scope.js'

describe('project scope', () => {
  beforeEach(() => setDefaultProjectId(null))

  it('prefers the per-call project_id over the default', async () => {
    setDefaultProjectId('default')
    await expect(
      runWithProject({ projectId: 'explicit' }, async () => requireProjectId())
    ).resolves.toBe('explicit')
  })

  it('falls back to the switch_project default', async () => {
    setDefaultProjectId('default')
    await expect(
      runWithProject({}, async () => requireProjectId())
    ).resolves.toBe('default')
  })

  it('isolates concurrent calls', async () => {
    const tick = () => new Promise((r) => setTimeout(r, 5))
    const [a, b] = await Promise.all([
      runWithProject({ projectId: 'a' }, async () => {
        await tick()
        return requireProjectId()
      }),
      runWithProject({ projectId: 'b' }, async () => {
        await tick()
        return requireProjectId()
      }),
    ])
    expect([a, b]).toEqual(['a', 'b'])
  })

  it('throws a helpful error when nothing is set', async () => {
    await expect(
      runWithProject({}, async () => requireProjectId())
    ).rejects.toThrow(/project_id/)
  })

  it('keeps switch_project defaults per HTTP session', async () => {
    setDefaultProjectId('global')
    await runWithProject({ sessionId: 's1' }, async () =>
      setDefaultProjectId('a')
    )
    await runWithProject({ sessionId: 's2' }, async () =>
      setDefaultProjectId('b')
    )

    await expect(
      runWithProject({ sessionId: 's1' }, async () => requireProjectId())
    ).resolves.toBe('a')
    await expect(
      runWithProject({ sessionId: 's2' }, async () => requireProjectId())
    ).resolves.toBe('b')
    // A session that never switched, and stdio, see the process default.
    await expect(
      runWithProject({ sessionId: 's3' }, async () => requireProjectId())
    ).resolves.toBe('global')
    expect(getDefaultProjectId()).toBe('global')

    endSession('s1')
    await expect(
      runWithProject({ sessionId: 's1' }, async () => requireProjectId())
    ).resolves.toBe('global')
    endSession('s2')
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
