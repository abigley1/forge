import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DesignProjectsView } from './DesignProjectsView'
import type { DesignOverview } from '../../../server/src/design-projects-model'

const summary: DesignOverview['projects'][number]['summary'] = {
  planned: 0,
  queued: 0,
  test: { printed: 0, passed: 0, failed: 0, awaiting: 0 },
  production: { printed: 3, planned: 4, planComplete: true },
  earlierRevisionsPrinted: 0,
  untaggedPrinted: 0,
  flags: [
    {
      code: 'untagged-prints',
      message: '2 printed copies have no test/production tag.',
    },
  ],
}
const overview: DesignOverview = {
  queueVersion: 5,
  projects: [
    {
      id: 'r',
      name: 'Basic 9U rack',
      stage: 'production',
      stageNote: 'One leg left',
      version: 1,
      createdAt: '',
      updatedAt: '',
      summary,
      plates: [],
    },
  ],
  unassigned: [{ project: 'Completed prints', plates: 2 }],
}
const ok = (data: unknown) => ({
  ok: true,
  json: async () => ({ success: true, data }),
})
const view = () =>
  render(<DesignProjectsView onBack={() => {}} onOpenQueue={() => {}} />)

afterEach(() => vi.unstubAllGlobals())

it('renders projects grouped by stage with evidence headline, flags and unassigned plates', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(overview)))
  view()
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  expect(
    within(card).getByText('3 / 4 production plates printed')
  ).toBeInTheDocument()
  expect(within(card).getByText('One leg left')).toBeInTheDocument()
  expect(within(card).getByText(/no test\/production tag/)).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Production', level: 2 })
  ).toBeInTheDocument()
  expect(screen.getByText('Completed prints')).toBeInTheDocument()
})

it('shows an error with Retry instead of an empty page', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'DB locked' }),
    })
    .mockResolvedValueOnce(ok(overview))
  vi.stubGlobal('fetch', fetchMock)
  view()
  expect(await screen.findByRole('alert')).toHaveTextContent('DB locked')
  expect(screen.queryByText(/no 3d design projects/i)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('article', { name: 'Basic 9U rack' })
  ).toBeInTheDocument()
})

it('shows an explicit empty state and lets you add a queue project', async () => {
  const empty: DesignOverview = {
    queueVersion: 1,
    projects: [],
    unassigned: [{ project: 'Pipe corral', plates: 2 }],
  }
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(ok(empty))
    .mockResolvedValueOnce(ok({ id: 'n' }))
    .mockResolvedValue(ok(empty))
  vi.stubGlobal('fetch', fetchMock)
  view()
  expect(
    await screen.findByText(/no 3d design projects registered/i)
  ).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Add Pipe corral as project' })
  )
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  const [, init] = fetchMock.mock.calls[1]
  expect(init.method).toBe('POST')
  expect(JSON.parse(init.body)).toEqual({
    project: { name: 'Pipe corral', stage: 'designing', stageNote: '' },
  })
})

it('changes stage with the project version and shows 409 inline', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(ok(overview))
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: 'This project changed elsewhere.',
      }),
    })
  vi.stubGlobal('fetch', fetchMock)
  view()
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  fireEvent.click(within(card).getByRole('button', { name: 'Change stage' }))
  fireEvent.change(within(card).getByLabelText('Stage'), {
    target: { value: 'done' },
  })
  fireEvent.click(within(card).getByRole('button', { name: 'Save stage' }))
  expect(await within(card).findByRole('alert')).toHaveTextContent(
    'changed elsewhere'
  )
  const [url, init] = fetchMock.mock.calls[1]
  expect(url).toMatch(/\/design-projects\/r$/)
  expect(JSON.parse(init.body)).toMatchObject({
    version: 1,
    project: { stage: 'done' },
  })
  expect(within(card).getByLabelText('Stage')).toHaveValue('done')
})

it('lists a project’s plates with purpose and printed of needed', async () => {
  const withPlates: DesignOverview = {
    ...overview,
    projects: [
      {
        ...overview.projects[0],
        plates: [
          {
            id: 'p',
            name: 'Fit test',
            project: 'Basic 9U rack',
            revision: 'R4',
            parts: [{ name: 'cup', required: 1, onPlate: 1 }],
            printed: 1,
            status: 'done',
            purpose: 'test',
            testResult: 'pass',
            material: '',
            color: '',
            profile: '',
            grams: null,
            minutes: null,
            artifact: '/tmp/a.3mf',
            supersededBy: '',
            notes: '',
            updatedAt: '',
          },
        ],
      },
    ],
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(withPlates)))
  view()
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  fireEvent.click(within(card).getByRole('button', { name: /plates \(1\)/i }))
  const row = within(card).getByRole('row', { name: /fit test/i })
  expect(row).toHaveTextContent('Test · pass')
  expect(row).toHaveTextContent('1 / 1')
})

it('keeps auto-refreshing after a card is hidden while its form is open', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  try {
    const fetchMock = vi.fn().mockResolvedValue(ok(overview))
    vi.stubGlobal('fetch', fetchMock)
    view()
    const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
    fireEvent.click(within(card).getByRole('button', { name: 'Change stage' }))
    fireEvent.click(screen.getByRole('button', { name: /^Done ·/ }))
    expect(screen.queryByRole('article', { name: 'Basic 9U rack' })).toBeNull()
    const before = fetchMock.mock.calls.length
    vi.advanceTimersByTime(15_000)
    expect(fetchMock.mock.calls.length).toBe(before + 1)
  } finally {
    vi.useRealTimers()
  }
})

it('after a 409, Refresh keeps the edits and Save uses the new version', async () => {
  const newer = {
    ...overview,
    projects: [{ ...overview.projects[0], version: 2 }],
  }
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(ok(overview))
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ success: false, error: 'changed elsewhere' }),
    })
    .mockResolvedValueOnce(ok(newer))
    .mockResolvedValueOnce(ok({ id: 'r' }))
    .mockResolvedValue(ok(newer))
  vi.stubGlobal('fetch', fetchMock)
  view()
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  fireEvent.click(within(card).getByRole('button', { name: 'Change stage' }))
  fireEvent.change(within(card).getByLabelText('Stage'), {
    target: { value: 'done' },
  })
  fireEvent.click(within(card).getByRole('button', { name: 'Save stage' }))
  await within(card).findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  const fresh = screen.getByRole('article', { name: 'Basic 9U rack' })
  expect(within(fresh).getByLabelText('Stage')).toHaveValue('done')
  fireEvent.click(within(fresh).getByRole('button', { name: 'Save stage' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
  expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({
    version: 2,
    project: { stage: 'done' },
  })
})
