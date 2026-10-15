import { describe, it, expect } from 'vitest'
import {
  normalizeStatus,
  isDependencyResolved,
  STATUS_BY_TYPE,
} from './nodeRules.js'

describe('normalizeStatus', () => {
  it('accepts canonical statuses', () => {
    expect(normalizeStatus('task', 'in_progress')).toEqual({
      ok: true,
      status: 'in_progress',
    })
    expect(normalizeStatus('decision', 'selected')).toEqual({
      ok: true,
      status: 'selected',
    })
    expect(normalizeStatus('module', 'on_hold')).toEqual({
      ok: true,
      status: 'on_hold',
    })
  })

  it('maps legacy aliases seen in live data to canonical values', () => {
    expect(normalizeStatus('decision', 'open')).toEqual({
      ok: true,
      status: 'pending',
    })
    expect(normalizeStatus('decision', 'decided')).toEqual({
      ok: true,
      status: 'selected',
    })
    expect(normalizeStatus('component', 'evaluating')).toEqual({
      ok: true,
      status: 'considering',
    })
    expect(normalizeStatus('component', 'specified')).toEqual({
      ok: true,
      status: 'selected',
    })
  })

  it('treats missing status as not provided', () => {
    expect(normalizeStatus('task', undefined)).toEqual({
      ok: true,
      status: undefined,
    })
    expect(normalizeStatus('task', null)).toEqual({
      ok: true,
      status: undefined,
    })
  })

  it('rejects unknown statuses with the allowed list', () => {
    const result = normalizeStatus('task', 'invalid-review-status')
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error).toContain('pending, in_progress, blocked, complete')
  })

  it('rejects any status on notes', () => {
    expect(normalizeStatus('note', 'pending').ok).toBe(false)
  })

  it('rejects non-string statuses', () => {
    expect(normalizeStatus('task', 3).ok).toBe(false)
  })
})

describe('isDependencyResolved', () => {
  it('resolves tasks only when complete', () => {
    expect(isDependencyResolved('task', 'complete')).toBe(true)
    expect(isDependencyResolved('task', 'in_progress')).toBe(false)
    expect(isDependencyResolved('task', null)).toBe(false)
  })

  it('resolves decisions only when selected', () => {
    expect(isDependencyResolved('decision', 'selected')).toBe(true)
    expect(isDependencyResolved('decision', 'pending')).toBe(false)
  })

  it('never blocks on components, notes, or containers', () => {
    expect(isDependencyResolved('component', 'considering')).toBe(true)
    expect(isDependencyResolved('note', null)).toBe(true)
    expect(isDependencyResolved('subsystem', 'planning')).toBe(true)
  })

  it('matches the frontend status unions', () => {
    expect(STATUS_BY_TYPE.task).toEqual([
      'pending',
      'in_progress',
      'blocked',
      'complete',
    ])
    expect(STATUS_BY_TYPE.decision).toEqual(['pending', 'selected'])
    expect(STATUS_BY_TYPE.component).toEqual([
      'selected',
      'considering',
      'rejected',
    ])
    expect(STATUS_BY_TYPE.assembly).toEqual([
      'planning',
      'in_progress',
      'complete',
      'on_hold',
    ])
  })
})
