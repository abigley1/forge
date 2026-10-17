import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PlateEditor } from './PlateEditor'
import {
  emptyPlate,
  type PrintPlate,
} from '../../../server/src/print-queue-model'

const base: PrintPlate = {
  ...emptyPlate,
  id: 'p1',
  updatedAt: '2026-10-13T00:00:00.000Z',
  name: 'Fit test',
  project: 'Pipe corral',
  revision: 'R4',
  parts: [{ name: 'cup', required: 1, onPlate: 1 }],
  printed: 1,
  status: 'done',
  artifact: '/tmp/fit.3mf',
}

it('shows Test result only for printed test plates and saves the tags', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<PlateEditor plate={base} onSave={onSave} onClose={() => {}} />)
  expect(screen.queryByLabelText('Test result')).toBeNull()
  fireEvent.change(screen.getByLabelText('Purpose'), {
    target: { value: 'test' },
  })
  fireEvent.change(screen.getByLabelText('Test result'), {
    target: { value: 'pass' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save plate' }))
  await vi.waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave.mock.calls[0][0]).toMatchObject({
    purpose: 'test',
    testResult: 'pass',
  })
})

it('clears testResult when purpose leaves test', () => {
  render(
    <PlateEditor
      plate={{ ...base, purpose: 'test', testResult: 'fail' }}
      onSave={vi.fn()}
      onClose={() => {}}
    />
  )
  expect(screen.getByLabelText('Test result')).toHaveValue('fail')
  fireEvent.change(screen.getByLabelText('Purpose'), {
    target: { value: 'production' },
  })
  expect(screen.queryByLabelText('Test result')).toBeNull()
})

it('keeps a set test result visible after printed drops to 0 so it can be cleared', () => {
  render(
    <PlateEditor
      plate={{ ...base, purpose: 'test', testResult: 'fail' }}
      onSave={vi.fn()}
      onClose={() => {}}
    />
  )
  fireEvent.change(screen.getByLabelText('Successful copies printed'), {
    target: { value: '0' },
  })
  const result = screen.getByLabelText('Test result')
  fireEvent.change(result, { target: { value: '' } })
  expect(screen.queryByLabelText('Test result')).toBeNull()
})
