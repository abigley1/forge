# 3D Design Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Forge standalone page (`/?tool=3d-design`) listing Andrew's 3D design projects with a declared stage and evidence-based test/production plate counts drawn from the print queue, deployed to the HA add-on with the real queue imported.

**Architecture:** Migration 7 adds a `design_projects` table (declared stage + note, versioned). Print-queue plates gain `purpose` and `testResult`. A pure, dependency-free model (`server/src/design-projects-model.ts`) derives all counts and flags and is shared by server and UI, exactly like `print-queue-model.ts`. A guarded one-time import endpoint moves the Mac queue onto HA.

**Tech Stack:** TypeScript, Express + better-sqlite3 (server), React 19 + Tailwind v4 forge-* tokens (UI), Vitest + supertest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-17-3d-design-homepage-design.md`

## Global Constraints

- Branch `forge-v2`. Commit only files this plan touches (`git commit -- <paths>`); another session works on the same branch. Never stash, reset, or switch branches.
- Don't rewrite migrations 5/6, `server/src/domain/`, the brief endpoint, or print-queue Studio code.
- `SCHEMA_VERSION` goes 6 → 7; migration 7 only creates `design_projects`.
- Stages, exactly: `designing`, `test-printing`, `production`, `done`, `on-hold`.
- Plate `purpose`: `'' | 'test' | 'production'`; `testResult`: `'' | 'pass' | 'fail'`. Missing → `''`.
- Real data only. No sample/demo projects in code, fixtures shipped to users, or empty-state fallbacks.
- "Sliced", "queued", or "ready" never count as printed. Only `printed` counts prints; only `testResult` counts validation.
- API envelope `{success:true,data}` / `{success:false,error}`; 400 validation, 404 missing, 409 stale version / duplicate / non-empty import.
- UI: forge-* tokens, `font-mono uppercase tracking` labels, Inter body, amber (`forge-accent`) only for progress/active marks, no color-only status, ≥44px targets, `h-dvh`, motion only on transform/opacity with `motion-reduce:` respected, no `transition: all`.
- Known failures out of scope: two tests in `src/components/inventory/InventorySidebar.test.tsx`.
- Deploy only with Andrew's explicit go-ahead; ghcr push requires Andrew to re-authenticate Docker first.

## Review Focus

1. **Legacy plates without `purpose`/`testResult`** (all 43 real records) must load, display, edit and save; counting treats them as untagged, never as production. → Task 1 test "legacy plates read back with empty purpose".
2. **Plate `project` text differing only in case/whitespace** from the design project name ("entry shelf " vs "Entry shelf") must link to it. → Task 3 test "matches project names case- and whitespace-insensitively".
3. **Superseded plates with printed copies** must never inflate current counts yet must stay visible. → Task 3 test "superseded printed copies go to earlierRevisionsPrinted only".
4. **Rename colliding with an existing project** must fail with 409 and leave both the project row and plate texts untouched. → Task 4 test "rename into an existing name is 409 and changes nothing".
5. **Import with one invalid plate among many** must write nothing (no partial queue on HA). → Task 2 test "an invalid plate aborts the whole import".

---

### Task 1: Plate `purpose` and `testResult`

**Files:**
- Modify: `server/src/print-queue-model.ts`
- Modify: `server/src/db/PrintQueueRepository.ts` (`read()`)
- Modify: `src/components/print-queue/PlateEditor.tsx`
- Test: `server/src/routes/print-queue.test.ts` (append)
- Test: `src/components/print-queue/PlateEditor.test.tsx` (create)

**Interfaces:**
- Produces: `purposes`, `testResults` (const arrays), `type PlatePurpose`, `type TestResult`, `PrintPlate.purpose`, `PrintPlate.testResult`, `normalizePlate(p): PrintPlate`.

- [ ] **Step 1: Write failing server tests** — append inside `describe('shared print queue', …)` in `server/src/routes/print-queue.test.ts`:

```ts
  it('validates purpose and testResult', () => {
    expect(validatePlate({ ...plate, purpose: 'production' }).purpose).toBe('production')
    expect(validatePlate(plate).purpose).toBe('')
    expect(validatePlate(plate).testResult).toBe('')
    expect(() => validatePlate({ ...plate, purpose: 'prototype' })).toThrow(/purpose/)
    expect(() =>
      validatePlate({ ...plate, purpose: 'production', printed: 1, testResult: 'pass' })
    ).toThrow(/only test plates/)
    expect(() =>
      validatePlate({ ...plate, purpose: 'test', printed: 0, testResult: 'pass' })
    ).toThrow(/printed copy/)
    expect(
      validatePlate({ ...plate, purpose: 'test', printed: 1, testResult: 'fail' }).testResult
    ).toBe('fail')
  })
  it('legacy plates read back with empty purpose and testResult', () => {
    const repo = new PrintQueueRepository(db)
    const { purpose: _p, testResult: _t, ...legacy } = {
      ...validatePlate(plate),
      id: 'legacy-1',
      updatedAt: '2026-10-13T00:00:00.000Z',
    }
    db.prepare('UPDATE print_queue SET version=1, plates=? WHERE id=1').run(
      JSON.stringify([legacy])
    )
    const read = repo.read().plates[0]
    expect(read.purpose).toBe('')
    expect(read.testResult).toBe('')
    expect(read.id).toBe('legacy-1')
  })
```

Add `validatePlate` to the existing import from `'../print-queue-model.js'`.

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/routes/print-queue.test.ts`
Expected: FAIL — `purpose` undefined / no throw.

- [ ] **Step 3: Implement in `server/src/print-queue-model.ts`**

After the `statuses` block add:

```ts
export const purposes = ['', 'test', 'production'] as const
export type PlatePurpose = (typeof purposes)[number]
export const testResults = ['', 'pass', 'fail'] as const
export type TestResult = (typeof testResults)[number]
```

In `interface PrintPlate`, after `status: PrintStatus` add:

```ts
  /** test = fit/test print; production = a plate of the finished design. */
  purpose: PlatePurpose
  /** Only for test plates with at least one printed copy. */
  testResult: TestResult
```

In `emptyPlate` add `purpose: '',` and `testResult: '',` after `status: 'draft',`.

Add after `copiesRemaining`:

```ts
/** Records written before purpose/testResult existed read as untagged. */
export function normalizePlate(plate: PrintPlate): PrintPlate {
  return { ...plate, purpose: plate.purpose ?? '', testResult: plate.testResult ?? '' }
}
```

In `validatePlate`, before `const result: PlateInput = {`:

```ts
  const purpose = p.purpose ?? ''
  if (!purposes.includes(purpose as PlatePurpose))
    throw new Error('purpose: choose test, production, or leave unset.')
  const testResult = p.testResult ?? ''
  if (!testResults.includes(testResult as TestResult))
    throw new Error('testResult: choose pass, fail, or leave unset.')
```

In the `result` literal after `status: p.status as PrintStatus,` add:

```ts
    purpose: purpose as PlatePurpose,
    testResult: testResult as TestResult,
```

Before `return result` add:

```ts
  if (result.testResult && result.purpose !== 'test')
    throw new Error('testResult: only test plates have a pass/fail result.')
  if (result.testResult && result.printed < 1)
    throw new Error('testResult: record a printed copy before a pass/fail result.')
```

- [ ] **Step 4: Normalize on read** — in `server/src/db/PrintQueueRepository.ts`, import `normalizePlate` and change `read()`'s return to:

```ts
    return {
      version: row.version,
      plates: (JSON.parse(row.plates) as PrintPlate[]).map(normalizePlate),
    }
```

(import `type PrintPlate` too).

- [ ] **Step 5: Run server tests**

Run: `cd server && npx vitest run src/routes/print-queue.test.ts && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 6: Write failing PlateEditor test** — create `src/components/print-queue/PlateEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PlateEditor } from './PlateEditor'
import { emptyPlate, type PrintPlate } from '../../../server/src/print-queue-model'

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
  fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'test' } })
  fireEvent.change(screen.getByLabelText('Test result'), { target: { value: 'pass' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save plate' }))
  await vi.waitFor(() => expect(onSave).toHaveBeenCalled())
  expect(onSave.mock.calls[0][0]).toMatchObject({ purpose: 'test', testResult: 'pass' })
})

it('clears testResult when purpose leaves test', () => {
  render(
    <PlateEditor
      plate={{ ...base, purpose: 'test', testResult: 'fail' }}
      onSave={vi.fn()}
      onClose={() => {}}
    />
  )
  fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'production' } })
  expect(screen.queryByLabelText('Test result')).toBeNull()
})
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run src/components/print-queue/PlateEditor.test.tsx`
Expected: FAIL — no element labelled Purpose.

- [ ] **Step 8: Add the fields** — in `PlateEditor.tsx`, after the "Successful copies printed" `<label>` (inside the first `pq-fields` div):

```tsx
                <label>
                  Purpose
                  <select
                    aria-label="Purpose"
                    value={draft.purpose}
                    onChange={(e) => {
                      const purpose = e.target.value as PlateInput['purpose']
                      set('purpose', purpose)
                      if (purpose !== 'test') set('testResult', '')
                    }}
                  >
                    <option value="">Unset</option>
                    <option value="test">Test print</option>
                    <option value="production">Production</option>
                  </select>
                </label>
                {draft.purpose === 'test' && draft.printed > 0 && (
                  <label>
                    Test result
                    <select
                      aria-label="Test result"
                      value={draft.testResult}
                      onChange={(e) =>
                        set('testResult', e.target.value as PlateInput['testResult'])
                      }
                    >
                      <option value="">Awaiting result</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </label>
                )}
```

- [ ] **Step 9: Run tests and type-check**

Run: `npx vitest run src/components/print-queue && npm run type-check`
Expected: PASS (type-check may show only the pre-existing inventory errors; nothing new).

- [ ] **Step 10: Commit**

```bash
git add server/src/print-queue-model.ts server/src/db/PrintQueueRepository.ts server/src/routes/print-queue.test.ts src/components/print-queue/PlateEditor.tsx src/components/print-queue/PlateEditor.test.tsx
git commit -m "feat(print-queue): plate purpose (test/production) and test result" -- server/src/print-queue-model.ts server/src/db/PrintQueueRepository.ts server/src/routes/print-queue.test.ts src/components/print-queue/PlateEditor.tsx src/components/print-queue/PlateEditor.test.tsx
```

---

### Task 2: One-time queue import

**Files:**
- Modify: `server/src/db/PrintQueueRepository.ts` (add `importQueue`)
- Modify: `server/src/routes/print-queue.ts` (route + export `respond`)
- Test: `server/src/routes/print-queue.test.ts` (append)

**Interfaces:**
- Consumes: `validatePlate`, `normalizePlate` (Task 1).
- Produces: `PrintQueueRepository.importQueue(version: unknown, plates: unknown): PrintQueue`; `POST /api/print-queue/import`; `export function respond(res, operation, status?)` from `routes/print-queue.ts`.

- [ ] **Step 1: Write failing tests** (append in the same describe):

```ts
  const exported = (id: string, extra = {}) => ({
    ...validatePlate(plate),
    id,
    updatedAt: '2026-10-13T20:13:56.000Z',
    ...extra,
  })
  it('imports a full queue verbatim into an empty queue', async () => {
    const plates = [
      exported('b', { printed: 4, status: 'done' }),
      exported('a', { name: 'Second' }),
    ]
    const res = await request(app).post('/api/print-queue/import').send({ version: 0, plates })
    expect(res.status).toBe(200)
    expect(res.body.data.version).toBe(1)
    expect(res.body.data.plates.map((p: PrintPlate) => p.id)).toEqual(['b', 'a'])
    expect(res.body.data.plates[0]).toMatchObject({ printed: 4, updatedAt: '2026-10-13T20:13:56.000Z' })
  })
  it('refuses import into a non-empty queue', async () => {
    await request(app).post('/api/print-queue').send({ version: 0, plate })
    const res = await request(app)
      .post('/api/print-queue/import')
      .send({ version: 0, plates: [exported('x')] })
    expect(res.status).toBe(409)
    expect(new PrintQueueRepository(db).read().plates).toHaveLength(1)
  })
  it('an invalid plate aborts the whole import', async () => {
    const res = await request(app)
      .post('/api/print-queue/import')
      .send({ version: 0, plates: [exported('ok'), exported('bad', { status: 'nope' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/plates\[1\]/)
    expect(new PrintQueueRepository(db).read()).toEqual({ version: 0, plates: [] })
  })
  it('rejects duplicate or missing ids and bad timestamps', async () => {
    for (const plates of [
      [exported('d'), exported('d')],
      [{ ...exported('e'), id: '' }],
      [exported('f', { updatedAt: 'yesterday' })],
    ]) {
      const res = await request(app).post('/api/print-queue/import').send({ version: 0, plates })
      expect(res.status).toBe(400)
    }
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/routes/print-queue.test.ts`
Expected: FAIL — 404 on `/import`.

- [ ] **Step 3: Implement `importQueue`** in `PrintQueueRepository` (after `reorder`):

```ts
  /** One-time move of an existing queue (e.g. the Mac queue onto HA).
   * Only into an empty queue; keeps IDs, order, printed counts and timestamps. */
  importQueue(version: unknown, plates: unknown): PrintQueue {
    return this.db
      .transaction(() => {
        const queue = this.read()
        if (version !== 0 || queue.version !== 0 || queue.plates.length)
          throw new QueueError(
            'Import only works on an empty queue (version 0, no plates).',
            409
          )
        if (!Array.isArray(plates) || !plates.length || plates.length > 2000)
          throw new QueueError('plates: supply 1 to 2000 plates.')
        const ids = new Set<string>()
        const imported = plates.map((raw: unknown, i): PrintPlate => {
          const r = (raw ?? {}) as Record<string, unknown>
          if (typeof r.id !== 'string' || !r.id.trim() || ids.has(r.id))
            throw new QueueError(`plates[${i}]: needs a unique, non-empty id.`)
          ids.add(r.id)
          if (typeof r.updatedAt !== 'string' || Number.isNaN(Date.parse(r.updatedAt)))
            throw new QueueError(`plates[${i}]: updatedAt must be an ISO timestamp.`)
          try {
            return { ...validatePlate(r), id: r.id, updatedAt: r.updatedAt }
          } catch (error) {
            throw new QueueError(
              `plates[${i}] (${String(r.name)}): ${error instanceof Error ? error.message : 'invalid'}`
            )
          }
        })
        this.db
          .prepare('UPDATE print_queue SET version=1, plates=? WHERE id=1')
          .run(JSON.stringify(imported))
        return { version: 1, plates: imported }
      })
      .immediate()
  }
```

- [ ] **Step 4: Route** — in `routes/print-queue.ts`, move the `respond` arrow out of `createPrintQueueRouter` as an exported function (same body), and add before `router.put('/:id'…)`:

```ts
  router.post('/import', (req, res) =>
    respond(res, () => repo.importQueue(req.body?.version, req.body?.plates))
  )
```

```ts
export function respond(res: Response, operation: () => unknown, status = 200) {
  try {
    res.status(status).json({ success: true, data: operation() })
  } catch (error) {
    res.status(error instanceof QueueError ? error.status : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Queue operation failed.',
    })
  }
}
```

- [ ] **Step 5: Run tests**

Run: `cd server && npx vitest run src/routes/print-queue.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(print-queue): guarded one-time import into an empty queue" -- server/src/db/PrintQueueRepository.ts server/src/routes/print-queue.ts server/src/routes/print-queue.test.ts
```

---

### Task 3: Pure design-projects model

**Files:**
- Create: `server/src/design-projects-model.ts`
- Create: `server/src/design-projects-model.test.ts`
- Modify: `forge/Dockerfile` (copy the model into the frontend build stage)

**Interfaces:**
- Consumes: `copiesNeeded`, `copiesRemaining`, `type PrintPlate` from `./print-queue-model.js`.
- Produces:
  - `designStages`, `type DesignStage`, `stageLabels: Record<DesignStage, string>`
  - `interface DesignProject { id; name; stage: DesignStage; stageNote; version: number; createdAt; updatedAt }`
  - `type DesignProjectInput = Pick<DesignProject, 'name' | 'stage' | 'stageNote'>`
  - `validateDesignProject(value: unknown): DesignProjectInput`
  - `sameProject(a: string, b: string): boolean`
  - `interface ProjectFlag { code: FlagCode; message: string }`
  - `interface ProjectSummary { planned; queued; test: {printed; passed; failed; awaiting}; production: {printed; planned; planComplete: boolean}; earlierRevisionsPrinted; untaggedPrinted; flags: ProjectFlag[] }`
  - `summarizeProject(project: Pick<DesignProject,'name'|'stage'>, plates: PrintPlate[]): ProjectSummary`
  - `unassignedPlates(projects: Pick<DesignProject,'name'>[], plates: PrintPlate[]): { project: string; plates: number }[]`

- [ ] **Step 1: Write failing tests** — `server/src/design-projects-model.test.ts`:

```ts
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
const rack = { name: 'Rack', stage: 'production' as const }

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
    const s = summarizeProject(rack, [plate({ purpose: 'production', status: 'printing' })])
    expect(s.production.printed).toBe(0)
  })
  it('placeholder production plates make the plan incomplete', () => {
    const s = summarizeProject(rack, [
      plate({ purpose: 'production', parts: [], status: 'blocked', artifact: '' }),
    ])
    expect(s.production).toEqual({ printed: 0, planned: 0, planComplete: false })
  })
  it('splits test prints into passed, failed and awaiting', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'test-printing' }, [
      plate({ purpose: 'test', printed: 1, status: 'done', parts: [{ name: 'a', required: 1, onPlate: 1 }], testResult: 'pass' }),
      plate({ purpose: 'test', printed: 1, status: 'done', parts: [{ name: 'b', required: 1, onPlate: 1 }], testResult: 'fail' }),
      plate({ purpose: 'test', printed: 1, status: 'done', parts: [{ name: 'c', required: 1, onPlate: 1 }] }),
    ])
    expect(s.test).toEqual({ printed: 3, passed: 1, failed: 1, awaiting: 1 })
    expect(s.flags.map((f) => f.code)).toEqual(['tests-awaiting-result'])
  })
  it('superseded printed copies go to earlierRevisionsPrinted only', () => {
    const s = summarizeProject(rack, [
      plate({ purpose: 'production', printed: 1, status: 'blocked', supersededBy: 'R2' }),
      plate({ purpose: 'production', printed: 0, status: 'draft' }),
    ])
    expect(s.earlierRevisionsPrinted).toBe(1)
    expect(s.production).toEqual({ printed: 0, planned: 2, planComplete: true })
  })
  it('flags untagged prints and treats them as neither test nor production', () => {
    const s = summarizeProject(rack, [plate({ printed: 2, status: 'done' })])
    expect(s.untaggedPrinted).toBe(2)
    expect(s.production.printed).toBe(0)
    expect(s.flags.map((f) => f.code)).toContain('untagged-prints')
    expect(s.flags.map((f) => f.code)).toContain('production-without-plan')
  })
  it('flags production printing before the stage says so', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'designing' }, [
      plate({ purpose: 'production', status: 'printing' }),
    ])
    expect(s.flags.map((f) => f.code)).toEqual(['production-before-stage'])
  })
  it('flags done with remaining production copies', () => {
    const s = summarizeProject({ name: 'Rack', stage: 'done' }, [
      plate({ purpose: 'production', printed: 1, status: 'ready' }),
    ])
    expect(s.flags.map((f) => f.code)).toEqual(['done-with-remaining'])
  })
  it('matches project names case- and whitespace-insensitively', () => {
    const s = summarizeProject(rack, [
      plate({ project: ' rack ', purpose: 'production', printed: 2, status: 'done' }),
      plate({ project: 'Other', purpose: 'production', printed: 2, status: 'done' }),
    ])
    expect(s.production.printed).toBe(2)
  })
})

describe('unassignedPlates', () => {
  it('lists queue project names with no design project, with counts', () => {
    expect(
      unassignedPlates([{ name: 'rack' }], [
        plate({ project: 'Rack' }),
        plate({ project: 'Completed prints' }),
        plate({ project: 'Completed prints' }),
      ])
    ).toEqual([{ project: 'Completed prints', plates: 2 }])
  })
})

describe('validateDesignProject', () => {
  it('accepts a trimmed name, a known stage and an optional note', () => {
    expect(validateDesignProject({ name: ' Rack ', stage: 'on-hold' })).toEqual({
      name: 'Rack',
      stage: 'on-hold',
      stageNote: '',
    })
  })
  it('rejects empty names, unknown stages and long notes', () => {
    expect(() => validateDesignProject({ name: ' ', stage: 'done' })).toThrow(/name/)
    expect(() => validateDesignProject({ name: 'A', stage: 'shipping' })).toThrow(/stage/)
    expect(() =>
      validateDesignProject({ name: 'A', stage: 'done', stageNote: 'x'.repeat(501) })
    ).toThrow(/stageNote/)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/design-projects-model.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `server/src/design-projects-model.ts`:

```ts
/** Shared, pure 3D design project model. Stage is declared; every count is
 * derived from recorded print-queue facts. Ready/printing/sliced never count
 * as printed, and only testResult counts as validation. */
import { copiesNeeded, copiesRemaining, type PrintPlate } from './print-queue-model.js'

export const designStages = [
  'designing',
  'test-printing',
  'production',
  'done',
  'on-hold',
] as const
export type DesignStage = (typeof designStages)[number]
export const stageLabels: Record<DesignStage, string> = {
  designing: 'Designing',
  'test-printing': 'Test printing',
  production: 'Production',
  done: 'Done',
  'on-hold': 'On hold',
}
export interface DesignProject {
  id: string
  name: string
  stage: DesignStage
  stageNote: string
  version: number
  createdAt: string
  updatedAt: string
}
export type DesignProjectInput = Pick<DesignProject, 'name' | 'stage' | 'stageNote'>
export type FlagCode =
  | 'production-without-plan'
  | 'untagged-prints'
  | 'tests-awaiting-result'
  | 'production-before-stage'
  | 'done-with-remaining'
export interface ProjectFlag {
  code: FlagCode
  message: string
}
export interface ProjectSummary {
  planned: number
  queued: number
  test: { printed: number; passed: number; failed: number; awaiting: number }
  production: { printed: number; planned: number; planComplete: boolean }
  earlierRevisionsPrinted: number
  untaggedPrinted: number
  flags: ProjectFlag[]
}

export const sameProject = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

export function validateDesignProject(value: unknown): DesignProjectInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Project must be an object.')
  const p = value as Record<string, unknown>
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200)
    throw new Error('name: enter a project name (up to 200 characters).')
  if (!designStages.includes(p.stage as DesignStage))
    throw new Error(`stage: choose one of ${designStages.join(', ')}.`)
  const note = p.stageNote ?? ''
  if (typeof note !== 'string' || note.length > 500)
    throw new Error('stageNote: use text up to 500 characters.')
  return { name: p.name.trim(), stage: p.stage as DesignStage, stageNote: note.trim() }
}

const sum = (plates: PrintPlate[], f: (p: PrintPlate) => number) =>
  plates.reduce((total, p) => total + f(p), 0)

export function summarizeProject(
  project: Pick<DesignProject, 'name' | 'stage'>,
  plates: PrintPlate[]
): ProjectSummary {
  const mine = plates.filter((p) => sameProject(p.project, project.name))
  const current = mine.filter((p) => !p.supersededBy)
  const tests = current.filter((p) => p.purpose === 'test')
  const production = current.filter((p) => p.purpose === 'production')
  const printed = (p: PrintPlate) => p.printed
  const summary: ProjectSummary = {
    planned: current.filter((p) => p.status === 'draft' || p.status === 'blocked').length,
    queued: sum(
      current.filter((p) => p.status === 'ready' || p.status === 'printing'),
      copiesRemaining
    ),
    test: {
      printed: sum(tests, printed),
      passed: sum(tests.filter((p) => p.testResult === 'pass'), printed),
      failed: sum(tests.filter((p) => p.testResult === 'fail'), printed),
      awaiting: sum(tests.filter((p) => !p.testResult), printed),
    },
    production: {
      printed: sum(production, printed),
      planned: sum(production, (p) => copiesNeeded(p)),
      planComplete: production.every((p) => p.parts.length > 0),
    },
    earlierRevisionsPrinted: sum(mine.filter((p) => p.supersededBy), printed),
    untaggedPrinted: sum(current.filter((p) => !p.purpose), printed),
    flags: [],
  }
  const flag = (code: FlagCode, message: string) => summary.flags.push({ code, message })
  if (project.stage === 'production' && summary.production.planned === 0)
    flag('production-without-plan', 'Stage is Production but no production plates are planned.')
  if (summary.untaggedPrinted)
    flag('untagged-prints', `${summary.untaggedPrinted} printed copies have no test/production tag.`)
  if (summary.test.awaiting)
    flag('tests-awaiting-result', `${summary.test.awaiting} test prints are awaiting a pass/fail result.`)
  if (
    (project.stage === 'designing' || project.stage === 'test-printing') &&
    production.some((p) => p.status === 'printing' || p.printed > 0)
  )
    flag(
      'production-before-stage',
      `Production plates are printing or printed while the stage is ${stageLabels[project.stage]}.`
    )
  if (project.stage === 'done' && summary.production.printed < summary.production.planned)
    flag(
      'done-with-remaining',
      `Stage is Done but ${summary.production.planned - summary.production.printed} production copies remain.`
    )
  return summary
}

export function unassignedPlates(
  projects: Pick<DesignProject, 'name'>[],
  plates: PrintPlate[]
): { project: string; plates: number }[] {
  const counts = new Map<string, number>()
  for (const p of plates) {
    if (projects.some((d) => sameProject(d.name, p.project))) continue
    counts.set(p.project, (counts.get(p.project) ?? 0) + 1)
  }
  return [...counts].map(([project, count]) => ({ project, plates: count }))
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/design-projects-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Dockerfile** — in `forge/Dockerfile` after line `COPY server/src/print-queue-model.ts ./server/src/print-queue-model.ts` add:

```dockerfile
COPY server/src/design-projects-model.ts ./server/src/design-projects-model.ts
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(design): pure 3D design project model with evidence-based counts" -- server/src/design-projects-model.ts server/src/design-projects-model.test.ts forge/Dockerfile
```

(`git add` the two new files first.)

---

### Task 4: Migration 7, repository and API

**Files:**
- Modify: `server/src/db/schema.ts` (SQL + `SCHEMA_VERSION = 7` + include in `CREATE_TABLES_SQL`)
- Modify: `server/src/db/index.ts` (migration 6 → 7)
- Modify: `server/src/db/PrintQueueRepository.ts` (add `renameProject`)
- Create: `server/src/db/DesignProjectsRepository.ts`
- Create: `server/src/routes/design-projects.ts`
- Modify: `server/src/index.ts` (mount router)
- Test: `server/src/db/migrations.test.ts` (append), `server/src/routes/design-projects.test.ts` (create)

**Interfaces:**
- Consumes: Task 3 model; `respond` and `QueueError` (Task 2); `PrintQueueRepository`.
- Produces:
  - `PrintQueueRepository.renameProject(from: string, to: string): number` (plates changed; bumps version iff > 0)
  - `DesignProjectsRepository` with `overview(): DesignOverview`, `create(input: unknown): DesignProject`, `update(id: string, version: unknown, input: unknown): DesignProject`
  - `interface DesignOverview { queueVersion: number; projects: Array<DesignProject & { summary: ProjectSummary; plates: PrintPlate[] }>; unassigned: { project: string; plates: number }[] }` — exported from `design-projects-model.ts` (add it there in this task).
  - `GET/POST /api/design-projects`, `PUT /api/design-projects/:id`

- [ ] **Step 1: Failing migration test** — append to `server/src/db/migrations.test.ts`:

```ts
describe('migration 6 -> 7', () => {
  afterEach(() => resetDatabase())

  it('creates design_projects on upgraded databases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'forge-migration-7-'))
    const dbPath = join(dir, 'forge.sqlite')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO schema_version (version) VALUES (6);
    `)
    legacy.close()
    const db = initializeDatabase({ dbPath })
    const cols = (
      db.prepare('PRAGMA table_info(design_projects)').all() as Array<{ name: string }>
    ).map((c) => c.name)
    expect(cols).toEqual(['id', 'name', 'stage', 'stage_note', 'version', 'created_at', 'updated_at'])
    expect(
      (db.prepare('SELECT MAX(version) v FROM schema_version').get() as { v: number }).v
    ).toBe(7)
    resetDatabase()
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/db/migrations.test.ts`
Expected: FAIL — no such table.

- [ ] **Step 3: Schema + migration** — in `schema.ts` set `SCHEMA_VERSION = 7`, add:

```ts
export const DESIGN_PROJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS design_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  stage TEXT NOT NULL CHECK(stage IN ('designing','test-printing','production','done','on-hold')),
  stage_note TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`
```

and change `CREATE_TABLES_SQL` to `BASE_TABLES_SQL + AGENT_LOOP_TABLES_SQL + DESIGN_PROJECTS_TABLE_SQL`. In `index.ts` import `DESIGN_PROJECTS_TABLE_SQL` and append to the migrations array after the 5 → 6 entry:

```ts
    // Migration 6 -> 7: 3D design projects (declared stage per project)
    (db: DatabaseInstance) => {
      db.exec(DESIGN_PROJECTS_TABLE_SQL)
    },
```

Run: `cd server && npx vitest run src/db/migrations.test.ts` → PASS.

- [ ] **Step 4: Failing API tests** — create `server/src/routes/design-projects.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { createDesignProjectsRouter } from './design-projects.js'
import { createPrintQueueRouter } from './print-queue.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
import { emptyPlate } from '../print-queue-model.js'

const plate = (project: string, extra = {}) => ({
  ...emptyPlate,
  name: 'Legs',
  project,
  revision: 'R1',
  parts: [{ name: 'leg', required: 2, onPlate: 1 }],
  artifact: '/tmp/legs.3mf',
  status: 'ready',
  purpose: 'production',
  ...extra,
})

describe('design projects API', () => {
  let db: DatabaseInstance
  let app: express.Application
  beforeEach(() => {
    db = createTestDatabase()
    app = express()
    app.use(express.json())
    app.use('/api/print-queue', createPrintQueueRouter(db))
    app.use('/api/design-projects', createDesignProjectsRouter(db))
  })
  afterEach(() => db.close())

  const create = (project: object) =>
    request(app).post('/api/design-projects').send({ project })

  it('creates a project and summarizes its plates from the queue', async () => {
    await request(app).post('/api/print-queue').send({ version: 0, plate: plate('Rack') })
    await request(app).post('/api/print-queue').send({ version: 1, plate: plate('Loose') })
    const created = await create({ name: 'rack', stage: 'production', stageNote: 'R1' })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'rack', stage: 'production', version: 1 })
    const overview = (await request(app).get('/api/design-projects')).body.data
    expect(overview.queueVersion).toBe(2)
    expect(overview.projects[0].summary.production).toEqual({ printed: 0, planned: 2, planComplete: true })
    expect(overview.projects[0].plates).toHaveLength(1)
    expect(overview.unassigned).toEqual([{ project: 'Loose', plates: 1 }])
  })

  it('rejects duplicate names (case-insensitive) with 409', async () => {
    await create({ name: 'Rack', stage: 'designing' })
    const dup = await create({ name: 'RACK', stage: 'done' })
    expect(dup.status).toBe(409)
  })

  it('updates stage with a version check', async () => {
    const id = (await create({ name: 'Rack', stage: 'designing' })).body.data.id
    const ok = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'Rack', stage: 'test-printing', stageNote: 'R2 fit' } })
    expect(ok.body.data).toMatchObject({ stage: 'test-printing', stageNote: 'R2 fit', version: 2 })
    const stale = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'Rack', stage: 'done' } })
    expect(stale.status).toBe(409)
    expect((await request(app).put('/api/design-projects/nope').send({ version: 1, project: { name: 'X', stage: 'done' } })).status).toBe(404)
  })

  it('rename rewrites matching plates and bumps the queue version atomically', async () => {
    await request(app).post('/api/print-queue').send({ version: 0, plate: plate(' rack ') })
    await request(app).post('/api/print-queue').send({ version: 1, plate: plate('Other') })
    const id = (await create({ name: 'Rack', stage: 'production' })).body.data.id
    const res = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'Basic 9U rack', stage: 'production' } })
    expect(res.status).toBe(200)
    const queue = new PrintQueueRepository(db).read()
    expect(queue.version).toBe(3)
    expect(queue.plates.map((p) => p.project)).toEqual(['Basic 9U rack', 'Other'])
  })

  it('rename into an existing name is 409 and changes nothing', async () => {
    await request(app).post('/api/print-queue').send({ version: 0, plate: plate('Rack') })
    const id = (await create({ name: 'Rack', stage: 'production' })).body.data.id
    await create({ name: 'Shelf', stage: 'designing' })
    const res = await request(app)
      .put(`/api/design-projects/${id}`)
      .send({ version: 1, project: { name: 'shelf', stage: 'production' } })
    expect(res.status).toBe(409)
    const queue = new PrintQueueRepository(db).read()
    expect(queue).toMatchObject({ version: 1 })
    expect(queue.plates[0].project).toBe('Rack')
    const names = (await request(app).get('/api/design-projects')).body.data.projects.map(
      (p: { name: string }) => p.name
    )
    expect(names.sort()).toEqual(['Rack', 'Shelf'])
  })

  it('validates input with 400', async () => {
    expect((await create({ name: '', stage: 'done' })).status).toBe(400)
    expect((await create({ name: 'A', stage: 'shipping' })).status).toBe(400)
  })
})
```

Run: `cd server && npx vitest run src/routes/design-projects.test.ts` → FAIL (module not found).

- [ ] **Step 5: `renameProject`** in `PrintQueueRepository` (after `importQueue`):

```ts
  /** Rewrites `project` on plates matching `from` (case/space-insensitive).
   * Used inside a design-project rename transaction. Returns plates changed. */
  renameProject(from: string, to: string): number {
    return this.db.transaction(() => {
      const queue = this.read()
      const key = from.trim().toLowerCase()
      let changed = 0
      const now = new Date().toISOString()
      queue.plates = queue.plates.map((p) => {
        if (p.project.trim().toLowerCase() !== key || p.project === to) return p
        changed++
        return { ...p, project: to, updatedAt: now }
      })
      if (changed)
        this.db
          .prepare('UPDATE print_queue SET version=?, plates=? WHERE id=1')
          .run(queue.version + 1, JSON.stringify(queue.plates))
      return changed
    })()
  }
```

- [ ] **Step 6: Overview type** — append to `server/src/design-projects-model.ts`:

```ts
export interface DesignOverview {
  queueVersion: number
  projects: Array<DesignProject & { summary: ProjectSummary; plates: PrintPlate[] }>
  unassigned: { project: string; plates: number }[]
}
```

- [ ] **Step 7: Repository** — create `server/src/db/DesignProjectsRepository.ts`:

```ts
import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import { PrintQueueRepository, QueueError } from './PrintQueueRepository.js'
import {
  designStages,
  sameProject,
  summarizeProject,
  unassignedPlates,
  validateDesignProject,
  type DesignOverview,
  type DesignProject,
  type DesignStage,
} from '../design-projects-model.js'

interface Row {
  id: string
  name: string
  stage: DesignStage
  stage_note: string
  version: number
  created_at: string
  updated_at: string
}
const toProject = (r: Row): DesignProject => ({
  id: r.id,
  name: r.name,
  stage: r.stage,
  stageNote: r.stage_note,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
const validate = (input: unknown) => {
  try {
    return validateDesignProject(input)
  } catch (error) {
    throw new QueueError(error instanceof Error ? error.message : 'Invalid project.')
  }
}
const isUnique = (error: unknown) =>
  (error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE'

export class DesignProjectsRepository {
  private queue: PrintQueueRepository
  constructor(private db: DatabaseInstance) {
    this.queue = new PrintQueueRepository(db)
  }
  private rows(): DesignProject[] {
    return (this.db.prepare('SELECT * FROM design_projects').all() as Row[])
      .map(toProject)
      .sort(
        (a, b) =>
          designStages.indexOf(a.stage) - designStages.indexOf(b.stage) ||
          a.name.localeCompare(b.name)
      )
  }
  private get(id: string): DesignProject | undefined {
    const row = this.db.prepare('SELECT * FROM design_projects WHERE id=?').get(id) as Row | undefined
    return row && toProject(row)
  }
  overview(): DesignOverview {
    const { version, plates } = this.queue.read()
    const projects = this.rows()
    return {
      queueVersion: version,
      projects: projects.map((p) => ({
        ...p,
        summary: summarizeProject(p, plates),
        plates: plates.filter((plate) => sameProject(plate.project, p.name)),
      })),
      unassigned: unassignedPlates(projects, plates),
    }
  }
  create(input: unknown): DesignProject {
    const p = validate(input)
    const id = randomUUID()
    const now = new Date().toISOString()
    try {
      this.db
        .prepare(
          'INSERT INTO design_projects(id,name,stage,stage_note,version,created_at,updated_at) VALUES(?,?,?,?,1,?,?)'
        )
        .run(id, p.name, p.stage, p.stageNote, now, now)
    } catch (error) {
      if (isUnique(error))
        throw new QueueError(`A design project named "${p.name}" already exists.`, 409)
      throw error
    }
    return this.get(id)!
  }
  update(id: string, version: unknown, input: unknown): DesignProject {
    return this.db
      .transaction(() => {
        const current = this.get(id)
        if (!current) throw new QueueError('Design project not found.', 404)
        if (version !== current.version)
          throw new QueueError(
            'This project changed elsewhere. Refresh, review, then retry.',
            409
          )
        const p = validate(input)
        try {
          this.db
            .prepare(
              'UPDATE design_projects SET name=?, stage=?, stage_note=?, version=version+1, updated_at=? WHERE id=?'
            )
            .run(p.name, p.stage, p.stageNote, new Date().toISOString(), id)
        } catch (error) {
          if (isUnique(error))
            throw new QueueError(`A design project named "${p.name}" already exists.`, 409)
          throw error
        }
        if (p.name !== current.name) this.queue.renameProject(current.name, p.name)
        return this.get(id)!
      })
      .immediate()
  }
}
```

- [ ] **Step 8: Router** — create `server/src/routes/design-projects.ts`:

```ts
import { Router } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { DesignProjectsRepository } from '../db/DesignProjectsRepository.js'
import { respond } from './print-queue.js'

export function createDesignProjectsRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new DesignProjectsRepository(db)
  router.get('/', (_req, res) => respond(res, () => repo.overview()))
  router.post('/', (req, res) => respond(res, () => repo.create(req.body?.project), 201))
  router.put('/:id', (req, res) =>
    respond(res, () => repo.update(req.params.id, req.body?.version, req.body?.project))
  )
  return router
}
```

Mount in `server/src/index.ts` right after the `/api/print-queue` line:

```ts
  app.use('/api/design-projects', createDesignProjectsRouter(db))
```

with `import { createDesignProjectsRouter } from './routes/design-projects.js'`.

- [ ] **Step 9: Run the whole server suite + type-check**

Run: `cd server && npm test && npx tsc --noEmit -p .`
Expected: all PASS (any test asserting schema version 6 must be updated to 7 in this step).

- [ ] **Step 10: Commit**

```bash
git commit -m "feat(server): design_projects (migration 7) with stage API and atomic rename" -- server/src/db/schema.ts server/src/db/index.ts server/src/db/migrations.test.ts server/src/db/PrintQueueRepository.ts server/src/db/DesignProjectsRepository.ts server/src/routes/design-projects.ts server/src/routes/design-projects.test.ts server/src/index.ts server/src/design-projects-model.ts
```

---

### Task 5: 3D Design homepage UI

**Files:**
- Create: `src/components/design-projects/api.ts`
- Create: `src/components/design-projects/headline.ts` + `headline.test.ts`
- Create: `src/components/design-projects/ProjectCard.tsx`
- Create: `src/components/design-projects/DesignProjectsView.tsx` + `DesignProjectsView.test.tsx`

**Interfaces:**
- Consumes: `DesignOverview`, `DesignProject`, `ProjectSummary`, `designStages`, `stageLabels`, `type DesignStage` (Task 3/4); `copiesNeeded` from print-queue model; `getDefaultBaseUrl` from `@/lib/api/client`.
- Produces: `DesignProjectsView({ onBack, onOpenQueue }: { onBack: () => void; onOpenQueue: () => void })`; `headline(stage, summary): string`.

- [ ] **Step 1: Failing headline tests** — `src/components/design-projects/headline.test.ts`:

```ts
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
  expect(headline('production', s({ production: { printed: 3, planned: 4, planComplete: true } })))
    .toBe('3 / 4 production plates printed')
  expect(headline('production', s({ production: { printed: 1, planned: 2, planComplete: false } })))
    .toBe('1 / at least 2 production plates printed')
})
it('test printing lists results', () => {
  expect(headline('test-printing', s({ test: { printed: 2, passed: 1, failed: 0, awaiting: 1 } })))
    .toBe('2 test prints · 1 passed · 0 failed · 1 awaiting result')
})
it('designing shows planned plates or no prints yet', () => {
  expect(headline('designing', s())).toBe('No prints yet')
  expect(headline('designing', s({ planned: 4 }))).toBe('4 plates planned')
})
it('done shows production total; on-hold shows the most advanced fact', () => {
  expect(headline('done', s({ production: { printed: 2, planned: 2, planComplete: true } })))
    .toBe('2 production plates printed')
  expect(headline('on-hold', s({ planned: 3 }))).toBe('3 plates planned')
  expect(headline('on-hold', s({ test: { printed: 1, passed: 0, failed: 0, awaiting: 1 }, planned: 3 })))
    .toBe('1 test prints · 0 passed · 0 failed · 1 awaiting result')
})
```

Run: `npx vitest run src/components/design-projects/headline.test.ts` → FAIL.

- [ ] **Step 2: Implement** `headline.ts`:

```ts
import type { DesignStage, ProjectSummary } from '../../../server/src/design-projects-model'

const productionLine = (s: ProjectSummary) =>
  `${s.production.printed} / ${s.production.planComplete ? '' : 'at least '}${s.production.planned} production plates printed`
const testLine = (s: ProjectSummary) =>
  `${s.test.printed} test prints · ${s.test.passed} passed · ${s.test.failed} failed · ${s.test.awaiting} awaiting result`
const plannedLine = (s: ProjectSummary) =>
  s.planned ? `${s.planned} plates planned` : 'No prints yet'

/** One evidence-based line per card, chosen by the declared stage. */
export function headline(stage: DesignStage, s: ProjectSummary): string {
  if (stage === 'production') return productionLine(s)
  if (stage === 'test-printing') return testLine(s)
  if (stage === 'done') return `${s.production.printed} production plates printed`
  if (stage === 'designing') return plannedLine(s)
  if (s.production.printed || s.production.planned) return productionLine(s)
  if (s.test.printed) return testLine(s)
  return plannedLine(s)
}
```

Run → PASS.

- [ ] **Step 3: API helper** — `src/components/design-projects/api.ts`:

```ts
import { getDefaultBaseUrl } from '@/lib/api/client'

export async function designRequest<T>(method = 'GET', path = '', body?: unknown): Promise<T> {
  const response = await fetch(`${getDefaultBaseUrl()}/design-projects${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = await response.json()
  if (!response.ok || !result.success)
    throw new Error(result.error || `Request failed (HTTP ${response.status}).`)
  return result.data as T
}
```

- [ ] **Step 4: Failing view tests** — `src/components/design-projects/DesignProjectsView.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DesignProjectsView } from './DesignProjectsView'
import type { DesignOverview } from '../../../server/src/design-projects-model'

const summary = {
  planned: 0, queued: 0,
  test: { printed: 0, passed: 0, failed: 0, awaiting: 0 },
  production: { printed: 3, planned: 4, planComplete: true },
  earlierRevisionsPrinted: 0, untaggedPrinted: 0,
  flags: [{ code: 'untagged-prints' as const, message: '2 printed copies have no test/production tag.' }],
}
const overview: DesignOverview = {
  queueVersion: 5,
  projects: [
    { id: 'r', name: 'Basic 9U rack', stage: 'production', stageNote: 'One leg left', version: 1,
      createdAt: '', updatedAt: '', summary, plates: [] },
  ],
  unassigned: [{ project: 'Completed prints', plates: 2 }],
}
const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) })

afterEach(() => vi.unstubAllGlobals())

it('renders projects grouped by stage with evidence headline, flags and unassigned plates', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(overview)))
  render(<DesignProjectsView onBack={() => {}} onOpenQueue={() => {}} />)
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  expect(within(card).getByText('3 / 4 production plates printed')).toBeInTheDocument()
  expect(within(card).getByText('One leg left')).toBeInTheDocument()
  expect(within(card).getByText(/no test\/production tag/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /production/i, level: 2 })).toBeInTheDocument()
  expect(screen.getByText('Completed prints')).toBeInTheDocument()
})

it('shows an error with Retry instead of an empty page', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ success: false, error: 'DB locked' }) })
    .mockResolvedValueOnce(ok(overview))
  vi.stubGlobal('fetch', fetchMock)
  render(<DesignProjectsView onBack={() => {}} onOpenQueue={() => {}} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('DB locked')
  expect(screen.queryByText(/no 3d design projects/i)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByRole('article', { name: 'Basic 9U rack' })).toBeInTheDocument()
})

it('shows an explicit empty state and lets you add a queue project', async () => {
  const empty: DesignOverview = { queueVersion: 1, projects: [], unassigned: [{ project: 'Pipe corral', plates: 2 }] }
  const fetchMock = vi.fn().mockResolvedValueOnce(ok(empty)).mockResolvedValueOnce(ok({ id: 'n' })).mockResolvedValue(ok(empty))
  vi.stubGlobal('fetch', fetchMock)
  render(<DesignProjectsView onBack={() => {}} onOpenQueue={() => {}} />)
  expect(await screen.findByText(/no 3d design projects registered/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add Pipe corral as project' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  const [, init] = fetchMock.mock.calls[1]
  expect(init.method).toBe('POST')
  expect(JSON.parse(init.body)).toEqual({ project: { name: 'Pipe corral', stage: 'designing', stageNote: '' } })
})

it('changes stage with the project version and shows 409 inline', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(ok(overview))
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ success: false, error: 'This project changed elsewhere.' }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<DesignProjectsView onBack={() => {}} onOpenQueue={() => {}} />)
  const card = await screen.findByRole('article', { name: 'Basic 9U rack' })
  fireEvent.click(within(card).getByRole('button', { name: 'Change stage' }))
  fireEvent.change(within(card).getByLabelText('Stage'), { target: { value: 'done' } })
  fireEvent.click(within(card).getByRole('button', { name: 'Save stage' }))
  expect(await within(card).findByRole('alert')).toHaveTextContent('changed elsewhere')
  const [url, init] = fetchMock.mock.calls[1]
  expect(url).toMatch(/\/design-projects\/r$/)
  expect(JSON.parse(init.body)).toMatchObject({ version: 1, project: { stage: 'done' } })
  expect(within(card).getByLabelText('Stage')).toHaveValue('done')
})
```

Run: `npx vitest run src/components/design-projects` → FAIL.

- [ ] **Step 5: `ProjectCard.tsx`**:

```tsx
import { useState } from 'react'
import { AlertTriangle, ChevronDown, Circle, CheckCircle2, FlaskConical, Factory, PauseCircle, PencilRuler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { copiesNeeded } from '../../../server/src/print-queue-model'
import {
  designStages,
  stageLabels,
  type DesignOverview,
  type DesignStage,
} from '../../../server/src/design-projects-model'
import { headline } from './headline'

type Project = DesignOverview['projects'][number]
const stageIcon: Record<DesignStage, typeof Circle> = {
  designing: PencilRuler,
  'test-printing': FlaskConical,
  production: Factory,
  done: CheckCircle2,
  'on-hold': PauseCircle,
}
const label = 'font-mono text-xs font-medium tracking-[0.08em] uppercase'
const button =
  'min-h-11 rounded-md border border-forge-border px-3 font-mono text-xs uppercase tracking-[0.08em] text-forge-text hover:border-forge-accent focus-visible:ring-2 focus-visible:ring-forge-accent focus-visible:outline-none dark:border-forge-border-dark dark:text-forge-text-dark'

export function ProjectCard({
  project,
  onSave,
  onEditingChange,
  onOpenQueue,
}: {
  project: Project
  onSave: (input: { name: string; stage: DesignStage; stageNote: string }) => Promise<void>
  onEditingChange: (editing: boolean) => void
  onOpenQueue: () => void
}) {
  const { summary } = project
  const Icon = stageIcon[project.stage]
  const [editing, setEditing] = useState(false)
  const [showPlates, setShowPlates] = useState(false)
  const [draft, setDraft] = useState({ name: project.name, stage: project.stage, stageNote: project.stageNote })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toggleEditing = (next: boolean) => {
    setEditing(next)
    onEditingChange(next)
    setError('')
    if (next) setDraft({ name: project.name, stage: project.stage, stageNote: project.stageNote })
  }
  const pct =
    summary.production.planned > 0
      ? Math.min(100, (summary.production.printed / summary.production.planned) * 100)
      : 0
  const facts = [
    summary.queued && `${summary.queued} copies queued`,
    summary.planned && `${summary.planned} plates planned, not ready`,
    summary.earlierRevisionsPrinted && `${summary.earlierRevisionsPrinted} printed on earlier revisions`,
  ].filter(Boolean) as string[]

  return (
    <article
      aria-label={project.name}
      className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark rounded-lg border p-4"
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="text-forge-text dark:text-forge-text-dark min-w-0 truncate text-base font-semibold">
          {project.name}
        </h3>
        <span className={cn(label, 'text-forge-text-secondary dark:text-forge-text-secondary-dark inline-flex shrink-0 items-center gap-1')}>
          <Icon aria-hidden="true" className="size-4" />
          {stageLabels[project.stage]}
        </span>
      </header>
      {project.stageNote && (
        <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-1 text-sm">{project.stageNote}</p>
      )}
      <p className="text-forge-text dark:text-forge-text-dark mt-3 font-mono text-sm">
        {headline(project.stage, summary)}
      </p>
      {(project.stage === 'production' || summary.production.planned > 0) && (
        <div
          role="progressbar"
          aria-label="Production plates printed"
          aria-valuemin={0}
          aria-valuemax={summary.production.planned}
          aria-valuenow={summary.production.printed}
          className="bg-forge-border-subtle dark:bg-forge-border-subtle-dark mt-2 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-forge-accent dark:bg-forge-accent-dark h-full origin-left transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      )}
      {facts.length > 0 && (
        <ul className="text-forge-muted dark:text-forge-muted-dark mt-3 space-y-0.5 text-sm">
          {facts.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {summary.flags.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {summary.flags.map((f) => (
            <li key={f.code} className="text-forge-text dark:text-forge-text-dark flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="text-forge-muted mt-0.5 size-4 shrink-0" />
              <span><span className="sr-only">Warning: </span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => toggleEditing(!editing)}>
          Change stage
        </button>
        <button
          type="button"
          className={cn(button, 'inline-flex items-center gap-1')}
          aria-expanded={showPlates}
          onClick={() => setShowPlates((v) => !v)}
        >
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform duration-150 motion-reduce:transition-none', showPlates && 'rotate-180')} />
          Plates ({project.plates.length})
        </button>
      </div>
      {editing && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await onSave(draft)
              toggleEditing(false)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className={cn(label, 'text-forge-muted dark:text-forge-muted-dark grid gap-1')}>
            Name
            <input
              autoComplete="off"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="border-forge-border dark:border-forge-border-dark text-forge-text dark:text-forge-text-dark min-h-11 rounded-md border bg-transparent px-2 font-sans text-sm normal-case"
            />
          </label>
          <label className={cn(label, 'text-forge-muted dark:text-forge-muted-dark grid gap-1')}>
            Stage
            <select
              value={draft.stage}
              onChange={(e) => setDraft({ ...draft, stage: e.target.value as DesignStage })}
              className="border-forge-border dark:border-forge-border-dark text-forge-text dark:text-forge-text-dark min-h-11 rounded-md border bg-transparent px-2 font-sans text-sm normal-case"
            >
              {designStages.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
            </select>
          </label>
          <label className={cn(label, 'text-forge-muted dark:text-forge-muted-dark grid gap-1')}>
            Stage note
            <input
              autoComplete="off"
              maxLength={500}
              value={draft.stageNote}
              onChange={(e) => setDraft({ ...draft, stageNote: e.target.value })}
              className="border-forge-border dark:border-forge-border-dark text-forge-text dark:text-forge-text-dark min-h-11 rounded-md border bg-transparent px-2 font-sans text-sm normal-case"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error} Your edits are kept; refresh to see the latest.</p>}
          <div className="flex gap-2">
            <button type="button" className={button} disabled={busy} onClick={() => toggleEditing(false)}>Cancel</button>
            <button type="submit" className={cn(button, 'border-forge-accent text-forge-accent')} disabled={busy}>
              {busy ? 'Saving…' : 'Save stage'}
            </button>
          </div>
        </form>
      )}
      {showPlates && (
        <div className="mt-4">
          {project.plates.length === 0 ? (
            <p className="text-forge-muted dark:text-forge-muted-dark text-sm">No plates in the print queue for this project.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className={cn(label, 'text-forge-muted dark:text-forge-muted-dark')}>
                <tr><th className="py-1 font-medium">Plate</th><th className="font-medium">Rev</th><th className="font-medium">Purpose</th><th className="font-medium">Status</th><th className="text-right font-medium">Printed</th></tr>
              </thead>
              <tbody className="text-forge-text dark:text-forge-text-dark">
                {project.plates.map((p) => (
                  <tr key={p.id} className={cn(p.supersededBy && 'text-forge-muted dark:text-forge-muted-dark')}>
                    <td className="max-w-0 truncate py-1 pr-2">{p.name}{p.supersededBy && ' (superseded)'}</td>
                    <td className="pr-2">{p.revision}</td>
                    <td className="pr-2">{p.purpose ? (p.purpose === 'test' ? `Test${p.testResult ? ` · ${p.testResult}` : ''}` : 'Production') : 'Untagged'}</td>
                    <td className="pr-2">{p.status}</td>
                    <td className="text-right font-mono">{p.printed} / {copiesNeeded(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button type="button" className={cn(button, 'mt-3')} onClick={onOpenQueue}>Open in print queue</button>
        </div>
      )}
    </article>
  )
}
```

(If any `forge-surface`/`forge-border-subtle` token name doesn't exist in `src/index.css` `@theme`, substitute the nearest existing token — check with `grep -n "color-forge" src/index.css`.)

- [ ] **Step 6: `DesignProjectsView.tsx`**:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  designStages,
  stageLabels,
  type DesignOverview,
  type DesignStage,
} from '../../../server/src/design-projects-model'
import { designRequest } from './api'
import { ProjectCard } from './ProjectCard'

const label = 'font-mono text-xs font-medium tracking-[0.1em] uppercase'
const button =
  'min-h-11 rounded-md border border-forge-border px-3 font-mono text-xs uppercase tracking-[0.08em] text-forge-text hover:border-forge-accent focus-visible:ring-2 focus-visible:ring-forge-accent focus-visible:outline-none dark:border-forge-border-dark dark:text-forge-text-dark'

export function DesignProjectsView({ onBack, onOpenQueue }: { onBack: () => void; onOpenQueue: () => void }) {
  const [data, setData] = useState<DesignOverview | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<DesignStage | null>(null)
  const [addError, setAddError] = useState('')
  const editing = useRef(new Set<string>())

  const load = useCallback(async () => {
    try {
      setData(await designRequest<DesignOverview>())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load 3D design projects.')
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && editing.current.size === 0) void load()
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [load])

  const addProject = async (name: string) => {
    setAddError('')
    try {
      await designRequest('POST', '', { project: { name, stage: 'designing', stageNote: '' } })
      await load()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not add project.')
    }
  }

  const counts = designStages.map((s) => ({ stage: s, count: data?.projects.filter((p) => p.stage === s).length ?? 0 }))
  const visible = designStages.filter((s) => !filter || s === filter)

  return (
    <div className="bg-forge-paper dark:bg-forge-paper-dark flex h-dvh flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <nav aria-label="Breadcrumb" className={cn(label, 'text-forge-muted dark:text-forge-muted-dark mb-4')}>
          <button type="button" onClick={onBack} className="hover:text-forge-accent min-h-11 focus-visible:ring-2 focus-visible:ring-forge-accent focus-visible:outline-none">
            Forge
          </button>
          <span aria-hidden="true"> / </span>
          <span>3D Design</span>
        </nav>
        <div className="flex items-center justify-between gap-3">
          <h1 className={cn(label, 'text-forge-text dark:text-forge-text-dark text-lg')}>3D Design</h1>
          <button type="button" className={cn(button, 'inline-flex items-center gap-2')} onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className="size-4" /> Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="border-forge-border dark:border-forge-border-dark mt-6 rounded-lg border p-4 text-sm">
            <p className="text-forge-text dark:text-forge-text-dark">Could not load 3D design projects: {error}</p>
            <button type="button" className={cn(button, 'mt-3')} onClick={() => void load()}>Retry</button>
          </div>
        )}
        {!data && !error && <p className="text-forge-muted dark:text-forge-muted-dark mt-6 text-sm" role="status">Loading…</p>}

        {data && (
          <>
            <div role="group" aria-label="Filter by stage" className="mt-6 flex flex-wrap gap-2">
              {counts.map(({ stage, count }) => (
                <button
                  key={stage}
                  type="button"
                  aria-pressed={filter === stage}
                  onClick={() => setFilter(filter === stage ? null : stage)}
                  className={cn(button, filter === stage && 'border-forge-accent text-forge-accent')}
                >
                  {stageLabels[stage]} · {count}
                </button>
              ))}
            </div>

            {data.projects.length === 0 && (
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-6 text-sm">
                No 3D design projects registered yet. Add one from the queue projects below.
              </p>
            )}

            {visible.map((stage) => {
              const projects = data.projects.filter((p) => p.stage === stage)
              if (!projects.length) return null
              return (
                <section key={stage} className="mt-8">
                  <h2 className={cn(label, 'text-forge-muted dark:text-forge-muted-dark mb-3')}>{stageLabels[stage]}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onOpenQueue={onOpenQueue}
                        onEditingChange={(on) => (on ? editing.current.add(p.id) : editing.current.delete(p.id))}
                        onSave={async (input) => {
                          await designRequest('PUT', `/${p.id}`, { version: p.version, project: input })
                          await load()
                        }}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {data.unassigned.length > 0 && (
              <section className="mt-10">
                <h2 className={cn(label, 'text-forge-muted dark:text-forge-muted-dark mb-3')}>Unassigned plates</h2>
                <ul className="space-y-2">
                  {data.unassigned.map((u) => (
                    <li key={u.project} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-forge-text dark:text-forge-text-dark min-w-0 truncate">{u.project}</span>
                      <span className="text-forge-muted dark:text-forge-muted-dark shrink-0">{u.plates} plates</span>
                      <button type="button" className={button} aria-label={`Add ${u.project} as project`} onClick={() => void addProject(u.project)}>
                        Add as project
                      </button>
                    </li>
                  ))}
                </ul>
                {addError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">{addError}</p>}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/components/design-projects`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/design-projects
git commit -m "feat(ui): 3D design homepage with stage groups, evidence counts and flags" -- src/components/design-projects
```

---

### Task 6: App wiring (landing button + `?tool=3d-design`)

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (append)

**Interfaces:**
- Consumes: `DesignProjectsView` (Task 5).

- [ ] **Step 1: Failing test** — append to `src/App.test.tsx` inside `describe('App', …)`:

```tsx
  it('opens the 3D Design tool from ?tool=3d-design', async () => {
    window.history.replaceState(null, '', '/?tool=3d-design')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { queueVersion: 0, projects: [], unassigned: [] } }),
      })
    )
    renderWithProviders(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: '3D Design' })).toBeInTheDocument()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('has a 3D Design button on the landing page', async () => {
    renderWithProviders(<App />)
    expect(await screen.findByRole('button', { name: '3D Design' })).toBeInTheDocument()
  })
```

Run: `npx vitest run src/App.test.tsx` → FAIL.

- [ ] **Step 2: Implement** in `src/App.tsx`:
  - `import { DesignProjectsView } from '@/components/design-projects/DesignProjectsView'`
  - `standaloneTool` type → `'inventory' | 'print-queue' | '3d-design' | null`; initializer:
    ```ts
    >(() => {
      const tool = new URLSearchParams(window.location.search).get('tool')
      return tool === 'print-queue' || tool === '3d-design' ? tool : null
    })
    ```
  - Add a helper inside `App` and use it everywhere the welcome screen is rendered:
    ```ts
    const openTool = (tool: 'print-queue' | '3d-design') => {
      setStandaloneTool(tool)
      window.history.replaceState(null, '', `?tool=${tool}`)
    }
    ```
    Replace both `onOpenPrintQueue={() => {…}}` bodies with `onOpenPrintQueue={() => openTool('print-queue')}` and add `onOpenDesign={() => openTool('3d-design')}`.
  - Before the `if (standaloneTool === 'print-queue')` branch:
    ```tsx
    if (standaloneTool === '3d-design') {
      return (
        <DesignProjectsView
          onBack={() => {
            setStandaloneTool(null)
            window.history.replaceState(null, '', window.location.pathname)
          }}
          onOpenQueue={() => openTool('print-queue')}
        />
      )
    }
    ```
  - `WelcomeScreen` props gain `onOpenDesign: () => void`; in the Tools zone, above the Print queue button, add a button with the same classes as the Print queue button whose text is `3D Design` and `onClick={onOpenDesign}`.

- [ ] **Step 3: Run tests + lint + type-check**

Run: `npx vitest run src/App.test.tsx src/components/design-projects src/components/print-queue && npm run type-check && npx eslint src/App.tsx src/components/design-projects src/components/print-queue/PlateEditor.tsx`
Expected: PASS; no new type or lint errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(app): 3D Design standalone tool on the landing page and ?tool=3d-design" -- src/App.tsx src/App.test.tsx
```

---

### Task 7: Agent CLI and docs

**Files:**
- Create: `scripts/design-projects.mjs`
- Modify: `docs/PRINT_QUEUE.md` (new section)

- [ ] **Step 1: CLI** — `scripts/design-projects.mjs`:

```js
#!/usr/bin/env node
/** Agent-friendly client for 3D design projects. Reads before each write; never retries a 409. */
const base = (process.env.FORGE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
const [command = 'list', ...args] = process.argv.slice(2)
async function request(method = 'GET', suffix = '', body) {
  const response = await fetch(`${base}/design-projects${suffix}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok || !result.success) throw new Error(result.error || `HTTP ${response.status}`)
  return result.data
}
try {
  if (command === 'list') {
    console.log(JSON.stringify(await request(), null, 2))
  } else if (command === 'add') {
    const [name, stage, stageNote = ''] = args
    console.log(JSON.stringify(await request('POST', '', { project: { name, stage, stageNote } }), null, 2))
  } else if (command === 'stage' || command === 'rename') {
    const [id, value, stageNote] = args
    const current = (await request()).projects.find((p) => p.id === id)
    if (!current) throw new Error('Design project ID not found.')
    const project = { name: current.name, stage: current.stage, stageNote: current.stageNote }
    if (command === 'stage') {
      project.stage = value
      if (stageNote !== undefined) project.stageNote = stageNote
    } else project.name = value
    console.log(JSON.stringify(await request('PUT', `/${id}`, { version: current.version, project }), null, 2))
  } else {
    throw new Error('Usage: design-projects.mjs list | add NAME STAGE [NOTE] | stage ID STAGE [NOTE] | rename ID NEW_NAME')
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
```

- [ ] **Step 2: Docs** — append to `docs/PRINT_QUEUE.md`:

```markdown
## 3D Design homepage

Open Forge → **3D Design**, or bookmark `/?tool=3d-design`. Each 3D design project has
a **declared stage** (designing, test-printing, production, done, on-hold) and a note.
Counts come only from print-queue facts:

- Tag each plate's **Purpose** (Test print / Production) in the plate editor. Untagged
  printed plates are flagged, never guessed.
- For a printed test plate, set **Test result** (pass/fail). Printed is not validated.
- Production shows printed copies out of copies needed on current production plates;
  "at least" means a production plate has no parts yet. Superseded plates' prints are
  shown as earlier-revision history and never count toward the current plan.
- Plates link to a project by matching `project` text (case/space-insensitive).
  Renaming a project rewrites matching plates atomically.

| Method | Path | JSON body |
|---|---|---|
| GET | `/api/design-projects` | none → `{queueVersion, projects[{…, summary, plates}], unassigned}` |
| POST | `/api/design-projects` | `{ "project": {name, stage, stageNote} }` |
| PUT | `/api/design-projects/:id` | `{ "version": N, "project": {name, stage, stageNote} }` |
| POST | `/api/print-queue/import` | `{ "version": 0, "plates": [full plates] }` — only into an empty queue |

```sh
node scripts/design-projects.mjs list
node scripts/design-projects.mjs add "Pipe corral" test-printing "R4 fit test printed"
node scripts/design-projects.mjs stage PROJECT_ID production "R6 plates released"
node scripts/design-projects.mjs rename PROJECT_ID "Basic 9U rack"
```
```

Also add `purpose` and `testResult` to the example new-plate JSON in that file (`"purpose": "production", "testResult": ""`).

- [ ] **Step 3: Commit**

```bash
git add scripts/design-projects.mjs
git commit -m "docs: 3D design homepage, API and CLI" -- scripts/design-projects.mjs docs/PRINT_QUEUE.md
```

---

### Task 8: Local end-to-end verification on a copy of the real queue

No code. Never open the Mac original read-write.

- [ ] **Step 1: Build** — `npm run build && npm run build --prefix server`.
- [ ] **Step 2: Copy the real DB** — `sqlite3 ~/Documents/Codex/2026-10-14/task-3/runtime/forge.sqlite ".backup '$SCRATCH/forge-copy.sqlite'"` (online backup; safe while the Mac server runs).
- [ ] **Step 3: Run against the copy** in the background — `FORGE_DB_PATH=$SCRATCH/forge-copy.sqlite FORGE_HOST=127.0.0.1 PORT=3107 FORGE_STATIC_DIR=$PWD/dist node server/dist/index.js`. Confirm log says "Migrating database from version 6 to 7" (or from its actual version).
- [ ] **Step 4: Apply §7 to the copy** with the CLI (`FORGE_API_URL=http://127.0.0.1:3107/api`), moving the five "Completed prints" plates via `scripts/print-queue.mjs edit` (patch `{"project": "…"}`) and tagging purposes via `edit` patches `{"purpose": "…"}`.
- [ ] **Step 5: Check** — `GET /api/design-projects` totals: 43 plates, 7 printed records, printed sums unchanged from the original queue; open `http://127.0.0.1:3107/?tool=3d-design` in the browser pane at desktop and mobile width, screenshot light/dark, check 409 path by editing a stage in two tabs.
- [ ] **Step 6: Full suites** — `npm test -- --run` (only the two known InventorySidebar failures allowed) and `npm test --prefix server`.
- [ ] **Step 7: Stop the 3107 server.**

### Task 9: Rollout to the HA add-on (requires Andrew's go-ahead at each gated step)

- [ ] **Step 1:** Reconfirm §7 with Andrew (the spec marks it to be reconfirmed).
- [ ] **Step 2 (gate):** Andrew re-authenticates Docker to ghcr; coordinate the version with the other forge-v2 session (its 0.0.7 bump is uncommitted in `forge/config.yaml`).
- [ ] **Step 3:** Back up HA DB: `ssh root@192.168.1.130` → locate add-on data dir (`/mnt/data/supervisor/addons/data/a58add88_forge/`), `cp forge.sqlite forge.sqlite.pre-design-$(date +%Y%m%d%H%M)`; also `scp` a copy to `~/forge-backups/`.
- [ ] **Step 4 (gate):** `docker buildx build --platform linux/amd64,linux/arm64 -f forge/Dockerfile -t ghcr.io/abigley1/forge:<ver> --push .` then `ssh root@192.168.1.130 ha addons update a58add88_forge`.
- [ ] **Step 5:** Verify `GET http://192.168.1.130:8099/api/print-queue` returns JSON `{version:0, plates:[]}` and `/api/design-projects` returns `{projects:[]}`.
- [ ] **Step 6 (gate):** Import: `curl -s http://127.0.0.1:3000/api/print-queue | jq '{version:0, plates:.data.plates}' > $SCRATCH/import.json` then `curl -s -X POST -H 'Content-Type: application/json' --data @$SCRATCH/import.json http://192.168.1.130:8099/api/print-queue/import`. Compare IDs/order/printed with the Mac read.
- [ ] **Step 7:** Apply confirmed §7 against HA with `FORGE_API_URL=http://192.168.1.130:8099/api`.
- [ ] **Step 8:** Read back and open `http://192.168.1.130:8099/?tool=3d-design` in the browser pane; screenshot for Andrew.
- [ ] **Step 9:** Leave a hand-over note in the shared notes folder: Mac queue frozen (do not edit there), Studio handoff re-pointing is a follow-up.
