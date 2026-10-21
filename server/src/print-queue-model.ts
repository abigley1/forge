/** Shared, pure queue model. Required quantities are allocated to this plate row,
 * not repeated project-wide totals. Only successful full-plate copies count. */
export const statuses = [
  'draft',
  'ready',
  'printing',
  'done',
  'failed',
  'blocked',
] as const
export type PrintStatus = (typeof statuses)[number]
export const purposes = ['', 'test', 'production'] as const
export type PlatePurpose = (typeof purposes)[number]
export const testResults = ['', 'pass', 'fail'] as const
export type TestResult = (typeof testResults)[number]
export interface PlatePart {
  name: string
  required: number
  onPlate: number
}
export interface PrintPlate {
  id: string
  name: string
  project: string
  revision: string
  parts: PlatePart[]
  printed: number
  status: PrintStatus
  /** test = fit/test print; production = a plate of the finished design. */
  purpose: PlatePurpose
  /** Only for test plates with at least one printed copy. */
  testResult: TestResult
  material: string
  color: string
  profile: string
  grams: number | null
  minutes: number | null
  artifact: string
  supersededBy: string
  notes: string
  updatedAt: string
}
export type PlateInput = Omit<PrintPlate, 'id' | 'updatedAt'>
export interface PrintQueue {
  version: number
  plates: PrintPlate[]
  /** Set by a read-only mirror (the Mac); the live queue page to edit instead. */
  readOnlySource?: string
}
export function copiesNeeded(plate: Pick<PrintPlate, 'parts'>): number {
  return Math.max(
    0,
    ...plate.parts.map((p) => Math.ceil(p.required / p.onPlate))
  )
}
export function copiesRemaining(plate: PrintPlate): number {
  return Math.max(0, copiesNeeded(plate) - plate.printed)
}
/** Records written before purpose/testResult existed read as untagged. */
export function normalizePlate(plate: PrintPlate): PrintPlate {
  return {
    ...plate,
    purpose: plate.purpose ?? '',
    testResult: plate.testResult ?? '',
  }
}
export function queueTotals(plates: PrintPlate[]) {
  const active = plates.filter((p) => !p.supersededBy && p.status !== 'done')
  let grams = 0,
    minutes = 0,
    unknownGrams = 0,
    unknownTime = 0,
    copies = 0
  for (const plate of active) {
    const remaining = copiesRemaining(plate)
    copies += remaining
    if (remaining && plate.grams === null) unknownGrams += remaining
    else grams += (plate.grams ?? 0) * remaining
    if (remaining && plate.minutes === null) unknownTime += remaining
    else minutes += (plate.minutes ?? 0) * remaining
  }
  return {
    grams,
    minutes,
    unknownGrams,
    unknownTime,
    copies,
    unplanned: active.filter((p) => !p.parts.length).length,
  }
}
export const emptyPlate: PlateInput = {
  name: '',
  project: '',
  revision: '',
  parts: [],
  printed: 0,
  status: 'draft',
  purpose: '',
  testResult: '',
  material: '',
  color: '',
  profile: '',
  grams: null,
  minutes: null,
  artifact: '',
  supersededBy: '',
  notes: '',
}
export function validatePlate(value: unknown): PlateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Plate must be an object.')
  const p = value as Record<string, unknown>
  const text = (key: string, required = false) => {
    const v = p[key] ?? ''
    if (typeof v !== 'string' || v.length > 10000 || (required && !v.trim()))
      throw new Error(
        `${key}: enter valid text${required ? ' (required)' : ''}.`
      )
    return v.trim()
  }
  const integer = (v: unknown, min: number, label: string) => {
    if (
      typeof v !== 'number' ||
      !Number.isSafeInteger(v) ||
      v < min ||
      v > 100000
    )
      throw new Error(`${label}: enter a whole number from ${min} to 100000.`)
    return v
  }
  if (!Array.isArray(p.parts) || p.parts.length > 200)
    throw new Error('parts: use an array of up to 200 parts.')
  const parts = p.parts.map((v: unknown): PlatePart => {
    if (!v || typeof v !== 'object') throw new Error('parts: invalid part.')
    const part = v as Record<string, unknown>
    if (
      typeof part.name !== 'string' ||
      !part.name.trim() ||
      part.name.length > 200
    )
      throw new Error('parts: each part needs a name.')
    return {
      name: part.name.trim(),
      required: integer(part.required, 1, 'required'),
      onPlate: integer(part.onPlate, 1, 'onPlate'),
    }
  })
  const estimate = (key: string) => {
    const v = p[key] ?? null
    if (
      v !== null &&
      (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000000)
    )
      throw new Error(`${key}: use a nonnegative number or null for unknown.`)
    return v as number | null
  }
  if (!statuses.includes(p.status as PrintStatus))
    throw new Error('status: choose a supported status.')
  const purpose = p.purpose ?? ''
  if (!purposes.includes(purpose as PlatePurpose))
    throw new Error('purpose: choose test, production, or leave unset.')
  const testResult = p.testResult ?? ''
  if (!testResults.includes(testResult as TestResult))
    throw new Error('testResult: choose pass, fail, or leave unset.')
  const result: PlateInput = {
    name: text('name', true),
    project: text('project', true),
    revision: text('revision', true),
    parts,
    printed: integer(p.printed, 0, 'printed'),
    status: p.status as PrintStatus,
    purpose: purpose as PlatePurpose,
    testResult: testResult as TestResult,
    material: text('material'),
    color: text('color'),
    profile: text('profile'),
    grams: estimate('grams'),
    minutes: estimate('minutes'),
    artifact: text('artifact'),
    supersededBy: text('supersededBy'),
    notes: text('notes'),
  }
  if (result.artifact && !/^(https?:\/\/|\/)/i.test(result.artifact))
    throw new Error('artifact: use an absolute local path or an http(s) link.')
  if (result.supersededBy && result.status !== 'blocked')
    throw new Error('Superseded plates must stay blocked.')
  if (
    ['ready', 'printing', 'done'].includes(result.status) &&
    (!parts.length || !result.artifact)
  )
    throw new Error(
      'Ready, printing and done plates need parts and an artifact.'
    )
  if (result.status === 'done' && result.printed < copiesNeeded(result))
    throw new Error(
      'Done requires all needed copies to be recorded as printed.'
    )
  if (
    ['ready', 'printing'].includes(result.status) &&
    result.printed >= copiesNeeded(result)
  )
    throw new Error(
      'All copies are already printed. Use done or increase required quantities.'
    )
  if (result.testResult && result.purpose !== 'test')
    throw new Error('testResult: only test plates have a pass/fail result.')
  if (result.testResult && result.printed < 1)
    throw new Error(
      'testResult: record a printed copy before a pass/fail result.'
    )
  return result
}
