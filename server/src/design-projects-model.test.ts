import { describe, expect, it } from 'vitest'
import { emptyPlate, type PrintPlate } from './print-queue-model.js'
import {
  summarizeProject,
  unassignedPlates,
  validateDesignProject,
} from './design-projects-model.js'

let n = 0
const plate = (over: Partial<PrintPlate>): PrintPlate => ({
  ...emptyPlate,
  id: `p${++n}`,
  updatedAt: '2026-10-13T00:00:00.000Z',
  name: 'plate',
  project: 'Rack',
  revision: 'R1',
  parts: [{ name: 'leg', required: 2, onPlate: 1 }],
  artifact: '/tmp/a.3mf',
  ...over,
})
const one = [{ name: 'a', required: 1, onPlate: 1 }]
const rack = { name: 'Rack', stage: 'production' as const }
const codes = (s: ReturnType<typeof summarizeProject>) =>
  s.flags.map((f) => f.code)

describe('summarizeProject', () => {
  it('counts production plates printed vs planned from printed copies only', () => {
    const s = summarizeProject(rack, [
      plate({ purpose: 'production', printed: 2, status: 'done' }),
      plate({ purpose: 'production', printed: 0, status: 'ready' }),
      plate({ purpose: 'production', printed: 0, status: 'draft' }),
    ])
    expect(s.production).toEqual({ printed: 2, planned: 6, planComplete: true })
    expect(s.queued).toBe(2)
    expect(s.planned).toBe(1)
    expect(s.flags).toEqual([])
  })
  it('a ready or printing plate never counts as printed', () => {
    const s = summarizeProject(rack, [
      plate({ purpose: 'production', status: 'printing' }),
    ])
    expect(s.production.printed).toBe(0)
  })
  it('placeholder production plates make the plan incomplete', () => {
    const s = summarizeProject(rack, [
      plate({
        purpose: 'production',
        parts: [],
        status: 'blocked',
        artifact: '',
      }),
    ])
    expect(s.production).toEqual({
      printed: 0,
      planned: 0,
      planComplete: false,
    })
  })
  it('splits test prints into passed, failed and awaiting', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'test-printing' }, [
      plate({
        purpose: 'test',
        printed: 1,
        status: 'done',
        parts: one,
        testResult: 'pass',
      }),
      plate({
        purpose: 'test',
        printed: 1,
        status: 'done',
        parts: one,
        testResult: 'fail',
      }),
      plate({ purpose: 'test', printed: 1, status: 'done', parts: one }),
    ])
    expect(s.test).toEqual({ printed: 3, passed: 1, failed: 1, awaiting: 1 })
    expect(codes(s)).toEqual(['tests-awaiting-result'])
  })
  it('superseded printed copies go to earlierRevisionsPrinted only', () => {
    const s = summarizeProject(rack, [
      plate({
        purpose: 'production',
        printed: 1,
        status: 'blocked',
        supersededBy: 'R2',
      }),
      plate({ purpose: 'production', printed: 0, status: 'draft' }),
    ])
    expect(s.earlierRevisionsPrinted).toBe(1)
    expect(s.production).toEqual({ printed: 0, planned: 2, planComplete: true })
  })
  it('flags untagged prints and treats them as neither test nor production', () => {
    const s = summarizeProject(rack, [plate({ printed: 2, status: 'done' })])
    expect(s.untaggedPrinted).toBe(2)
    expect(s.production.printed).toBe(0)
    expect(codes(s)).toContain('untagged-prints')
    expect(codes(s)).toContain('production-without-plan')
  })
  it('flags production printing before the stage says so', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'designing' }, [
      plate({ purpose: 'production', status: 'printing' }),
    ])
    expect(codes(s)).toEqual(['production-before-stage'])
  })
  it('flags done with remaining production copies', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'done' }, [
      plate({ purpose: 'production', printed: 1, status: 'ready' }),
    ])
    expect(codes(s)).toEqual(['done-with-remaining'])
  })
  it('matches project names case- and whitespace-insensitively', () => {
    const s = summarizeProject(rack, [
      plate({
        project: ' rack ',
        purpose: 'production',
        printed: 2,
        status: 'done',
      }),
      plate({
        project: 'Other',
        purpose: 'production',
        printed: 2,
        status: 'done',
      }),
    ])
    expect(s.production.printed).toBe(2)
  })
})

describe('unassignedPlates', () => {
  it('lists queue project names with no design project, with counts', () => {
    expect(
      unassignedPlates(
        [{ name: 'rack' }],
        [
          plate({ project: 'Rack' }),
          plate({ project: 'Completed prints' }),
          plate({ project: 'Completed prints' }),
        ]
      )
    ).toEqual([{ project: 'Completed prints', plates: 2 }])
  })
})

describe('validateDesignProject', () => {
  it('accepts a trimmed name, a known stage and an optional note', () => {
    expect(validateDesignProject({ name: ' Rack ', stage: 'on-hold' })).toEqual(
      { name: 'Rack', stage: 'on-hold', stageNote: '' }
    )
  })
  it('rejects empty names, unknown stages and long notes', () => {
    expect(() => validateDesignProject({ name: ' ', stage: 'done' })).toThrow(
      /name/
    )
    expect(() =>
      validateDesignProject({ name: 'A', stage: 'shipping' })
    ).toThrow(/stage/)
    expect(() =>
      validateDesignProject({
        name: 'A',
        stage: 'done',
        stageNote: 'x'.repeat(501),
      })
    ).toThrow(/stageNote/)
  })
})
