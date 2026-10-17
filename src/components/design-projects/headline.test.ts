import { expect, it } from 'vitest'
import { headline } from './headline'
import type { ProjectSummary } from '../../../server/src/design-projects-model'

const s = (over: Partial<ProjectSummary> = {}): ProjectSummary => ({
  planned: 0,
  queued: 0,
  test: { printed: 0, passed: 0, failed: 0, awaiting: 0 },
  production: { printed: 0, planned: 0, planComplete: true },
  earlierRevisionsPrinted: 0,
  untaggedPrinted: 0,
  flags: [],
  ...over,
})

it('production shows printed of planned, with "at least" when incomplete', () => {
  expect(
    headline(
      'production',
      s({ production: { printed: 3, planned: 4, planComplete: true } })
    )
  ).toBe('3 / 4 production plates printed')
  expect(
    headline(
      'production',
      s({ production: { printed: 1, planned: 2, planComplete: false } })
    )
  ).toBe('1 / at least 2 production plates printed')
})
it('test printing lists results', () => {
  expect(
    headline(
      'test-printing',
      s({ test: { printed: 2, passed: 1, failed: 0, awaiting: 1 } })
    )
  ).toBe('2 test prints · 1 passed · 0 failed · 1 awaiting result')
})
it('designing shows planned plates or no prints yet', () => {
  expect(headline('designing', s())).toBe('No prints yet')
  expect(headline('designing', s({ planned: 4 }))).toBe('4 plates planned')
})
it('done shows production total; on-hold shows the most advanced fact', () => {
  expect(
    headline(
      'done',
      s({ production: { printed: 2, planned: 2, planComplete: true } })
    )
  ).toBe('2 production plates printed')
  expect(headline('on-hold', s({ planned: 3 }))).toBe('3 plates planned')
  expect(
    headline(
      'on-hold',
      s({ test: { printed: 1, passed: 0, failed: 0, awaiting: 1 }, planned: 3 })
    )
  ).toBe('1 test prints · 0 passed · 0 failed · 1 awaiting result')
  expect(
    headline(
      'on-hold',
      s({ production: { printed: 0, planned: 2, planComplete: true } })
    )
  ).toBe('0 / 2 production plates printed')
})
it('never says "No prints yet" while printed copies exist', () => {
  expect(headline('designing', s({ untaggedPrinted: 2 }))).toBe(
    '2 printed copies (2 untagged)'
  )
  expect(headline('on-hold', s({ untaggedPrinted: 1, planned: 3 }))).toBe(
    '1 printed copies (1 untagged)'
  )
  expect(
    headline(
      'designing',
      s({ production: { printed: 1, planned: 2, planComplete: true } })
    )
  ).toBe('1 printed copies')
  expect(headline('designing', s({ earlierRevisionsPrinted: 2 }))).toBe(
    '2 printed on superseded or archived plates'
  )
})
