import type {
  DesignStage,
  ProjectSummary,
} from '../../../server/src/design-projects-model'

const productionLine = (s: ProjectSummary) =>
  `${s.production.printed} / ${s.production.planComplete ? '' : 'at least '}${s.production.planned} production plates printed`
const testLine = (s: ProjectSummary) =>
  `${s.test.printed} test prints · ${s.test.passed} passed · ${s.test.failed} failed · ${s.test.awaiting} awaiting result`
/** Never claims "No prints yet" while any printed copy is on record. */
const plannedLine = (s: ProjectSummary) => {
  const printed = s.test.printed + s.production.printed + s.untaggedPrinted
  if (printed)
    return `${printed} printed copies${s.untaggedPrinted ? ` (${s.untaggedPrinted} untagged)` : ''}`
  if (s.planned) return `${s.planned} plates planned`
  if (s.earlierRevisionsPrinted)
    return `${s.earlierRevisionsPrinted} printed on superseded or archived plates`
  return 'No prints yet'
}

/** One evidence-based line per card, chosen by the declared stage. */
export function headline(stage: DesignStage, s: ProjectSummary): string {
  if (stage === 'production') return productionLine(s)
  if (stage === 'test-printing') return testLine(s)
  if (stage === 'done')
    return `${s.production.printed} production plates printed`
  if (stage === 'designing') return plannedLine(s)
  if (s.production.printed || s.production.planned) return productionLine(s)
  if (s.test.printed) return testLine(s)
  return plannedLine(s)
}
