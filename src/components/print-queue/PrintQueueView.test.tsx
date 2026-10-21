import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PrintQueueView } from './PrintQueueView'
import {
  emptyPlate,
  type PrintPlate,
  type PrintQueue,
} from '../../../server/src/print-queue-model'

const plate: PrintPlate = {
  ...emptyPlate,
  id: 'p1',
  updatedAt: '2026-10-17T00:00:00.000Z',
  name: 'Leg plate',
  project: 'Rack',
  revision: 'R7',
  status: 'ready',
  artifact: '/tmp/leg.3mf',
  parts: [{ name: 'leg', required: 2, onPlate: 1 }],
}
const serve = (queue: PrintQueue) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: !url.includes('print-queue-studio'),
      json: async () =>
        url.includes('print-queue-studio')
          ? { success: false, error: 'not configured' }
          : { success: true, data: queue },
    }))
  )

afterEach(() => vi.unstubAllGlobals())

it('is view-only when the queue is a mirror of the live queue', async () => {
  serve({
    version: 44,
    plates: [plate],
    readOnlySource: 'http://192.168.1.130:8099/?tool=print-queue',
  })
  render(<PrintQueueView onBack={() => {}} />)
  expect(await screen.findByText('Leg plate')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'the live queue' })).toHaveAttribute(
    'href',
    'http://192.168.1.130:8099/?tool=print-queue'
  )
  expect(
    screen.getByText(/Live from Home Assistant · version 44/)
  ).toBeVisible()
  for (const name of [
    /add plate/i,
    /^edit$/i,
    /record 1 printed/i,
    /drag/i,
    /move/i,
  ])
    expect(screen.queryByRole('button', { name })).toBeNull()
})

it('keeps editing controls on the live queue itself', async () => {
  serve({ version: 44, plates: [plate] })
  render(<PrintQueueView onBack={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Leg plate' })).toBeVisible()
  expect(screen.getByRole('button', { name: /add plate/i })).toBeVisible()
  expect(
    screen.getByRole('button', { name: /record 1 printed/i })
  ).toBeVisible()
  expect(screen.queryByRole('link', { name: 'the live queue' })).toBeNull()
})
