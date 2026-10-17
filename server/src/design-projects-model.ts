/** Shared, pure 3D design project model. Stage is declared; every count is
 * derived from recorded print-queue facts. Ready/printing/sliced never count
 * as printed, and only testResult counts as validation. */
import {
  copiesNeeded,
  copiesRemaining,
  type PrintPlate,
} from './print-queue-model.js'

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
export type DesignProjectInput = Pick<
  DesignProject,
  'name' | 'stage' | 'stageNote'
>
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

export interface DesignOverview {
  queueVersion: number
  projects: Array<
    DesignProject & { summary: ProjectSummary; plates: PrintPlate[] }
  >
  unassigned: { project: string; plates: number }[]
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
  return {
    name: p.name.trim(),
    stage: p.stage as DesignStage,
    stageNote: note.trim(),
  }
}

const sum = (plates: PrintPlate[], f: (p: PrintPlate) => number) =>
  plates.reduce((total, p) => total + f(p), 0)
const printed = (p: PrintPlate) => p.printed

export function summarizeProject(
  project: Pick<DesignProject, 'name' | 'stage'>,
  plates: PrintPlate[]
): ProjectSummary {
  const mine = plates.filter((p) => sameProject(p.project, project.name))
  const current = mine.filter((p) => !p.supersededBy)
  const tests = current.filter((p) => p.purpose === 'test')
  const production = current.filter((p) => p.purpose === 'production')
  const summary: ProjectSummary = {
    planned: current.filter(
      (p) => p.status === 'draft' || p.status === 'blocked'
    ).length,
    queued: sum(
      current.filter((p) => p.status === 'ready' || p.status === 'printing'),
      copiesRemaining
    ),
    test: {
      printed: sum(tests, printed),
      passed: sum(
        tests.filter((p) => p.testResult === 'pass'),
        printed
      ),
      failed: sum(
        tests.filter((p) => p.testResult === 'fail'),
        printed
      ),
      awaiting: sum(
        tests.filter((p) => !p.testResult),
        printed
      ),
    },
    production: {
      printed: sum(production, printed),
      planned: sum(production, (p) => copiesNeeded(p)),
      planComplete: production.every((p) => p.parts.length > 0),
    },
    earlierRevisionsPrinted: sum(
      mine.filter((p) => p.supersededBy),
      printed
    ),
    untaggedPrinted: sum(
      current.filter((p) => !p.purpose),
      printed
    ),
    flags: [],
  }
  const flag = (code: FlagCode, message: string) =>
    summary.flags.push({ code, message })
  if (project.stage === 'production' && summary.production.planned === 0)
    flag(
      'production-without-plan',
      'Stage is Production but no production plates are planned.'
    )
  if (summary.untaggedPrinted)
    flag(
      'untagged-prints',
      `${summary.untaggedPrinted} printed copies have no test/production tag.`
    )
  if (summary.test.awaiting)
    flag(
      'tests-awaiting-result',
      `${summary.test.awaiting} test prints are awaiting a pass/fail result.`
    )
  if (
    (project.stage === 'designing' || project.stage === 'test-printing') &&
    production.some((p) => p.status === 'printing' || p.printed > 0)
  )
    flag(
      'production-before-stage',
      `Production plates are printing or printed while the stage is ${stageLabels[project.stage]}.`
    )
  if (
    project.stage === 'done' &&
    summary.production.printed < summary.production.planned
  )
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
