import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Factory,
  FlaskConical,
  PauseCircle,
  PencilRuler,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { copiesNeeded } from '../../../server/src/print-queue-model'
import {
  stageLabels,
  type DesignOverview,
  type DesignProjectInput,
  type DesignStage,
} from '../../../server/src/design-projects-model'
import { headline } from './headline'
import { buttonClass, labelClass } from './styles'

type Project = DesignOverview['projects'][number]
const stageIcon: Record<DesignStage, LucideIcon> = {
  designing: PencilRuler,
  'test-printing': FlaskConical,
  production: Factory,
  done: CheckCircle2,
  'on-hold': PauseCircle,
}
const fieldClass =
  'border-forge-border dark:border-forge-border-dark text-forge-text dark:text-forge-text-dark min-h-11 rounded-md border bg-transparent px-2 font-sans text-sm normal-case tracking-normal'

function purposeText(p: Project['plates'][number]) {
  if (p.purpose === 'test')
    return p.testResult ? `Test · ${p.testResult}` : 'Test'
  return p.purpose === 'production' ? 'Production' : 'Untagged'
}

export function ProjectCard({
  project,
  onSave,
  onEditingChange,
  onOpenQueue,
}: {
  project: Project
  onSave: (input: DesignProjectInput) => Promise<void>
  onEditingChange: (editing: boolean) => void
  onOpenQueue: () => void
}) {
  const { summary } = project
  const Icon = stageIcon[project.stage]
  const [editing, setEditing] = useState(false)
  const [showPlates, setShowPlates] = useState(false)
  const [draftName, setDraftName] = useState(project.name)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // A card hidden by a filter while its form is open must not keep pausing
  // the page's auto-refresh.
  const editingChange = useRef(onEditingChange)
  editingChange.current = onEditingChange
  useEffect(() => () => editingChange.current(false), [])
  const toggleEditing = (next: boolean) => {
    setEditing(next)
    onEditingChange(next)
    setError('')
    if (next) setDraftName(project.name)
  }
  const showProgress =
    project.stage === 'production' || summary.production.planned > 0
  const fraction =
    summary.production.planned > 0
      ? Math.min(1, summary.production.printed / summary.production.planned)
      : 0
  const facts = [
    summary.queued > 0 && `${summary.queued} copies queued`,
    summary.planned > 0 && `${summary.planned} plates planned, not ready`,
    summary.earlierRevisionsPrinted > 0 &&
      `${summary.earlierRevisionsPrinted} printed on earlier revisions`,
  ].filter((f): f is string => typeof f === 'string')

  return (
    <article
      aria-label={project.name}
      className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark min-w-0 rounded-lg border p-4"
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="text-forge-text dark:text-forge-text-dark min-w-0 truncate text-base font-semibold">
          {project.name}
        </h3>
        <span
          className={cn(
            labelClass,
            'text-forge-text-secondary dark:text-forge-text-secondary-dark inline-flex shrink-0 items-center gap-1'
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {stageLabels[project.stage]}
        </span>
      </header>
      {project.stageNote && (
        <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-1 text-sm">
          {project.stageNote}
        </p>
      )}
      <p className="text-forge-muted dark:text-forge-muted-dark mt-1 text-xs">
        Stage and note: edited in the vault.
      </p>
      <p className="text-forge-text dark:text-forge-text-dark mt-3 font-mono text-sm">
        {headline(project.stage, summary)}
      </p>
      {showProgress && (
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
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
      )}
      {facts.length > 0 && (
        <ul className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-3 space-y-0.5 text-sm">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {summary.flags.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {summary.flags.map((f) => (
            <li
              key={f.code}
              className="text-forge-text dark:text-forge-text-dark flex items-start gap-2"
            >
              <AlertTriangle
                aria-hidden="true"
                className="text-forge-accent dark:text-forge-accent-dark mt-0.5 size-4 shrink-0"
              />
              <span>
                <span className="sr-only">Warning: </span>
                {f.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          aria-expanded={editing}
          onClick={() => toggleEditing(!editing)}
        >
          Rename
        </button>
        <button
          type="button"
          className={cn(buttonClass, 'inline-flex items-center gap-1')}
          aria-expanded={showPlates}
          onClick={() => setShowPlates((v) => !v)}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 transition-transform duration-150 motion-reduce:transition-none',
              showPlates && 'rotate-180'
            )}
          />
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
              await onSave({
                name: draftName,
                stage: project.stage,
                stageNote: project.stageNote,
              })
              toggleEditing(false)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Save failed.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <label
            className={cn(
              labelClass,
              'text-forge-text-secondary dark:text-forge-text-secondary-dark grid gap-1'
            )}
          >
            Name
            <input
              autoComplete="off"
              required
              maxLength={200}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error} Your edits are kept; refresh to see the latest.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => toggleEditing(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                buttonClass,
                'border-forge-accent text-forge-accent dark:border-forge-accent-dark dark:text-forge-accent-dark'
              )}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      )}
      {showPlates && (
        <div className="mt-4 min-w-0">
          {project.plates.length === 0 ? (
            <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm">
              No plates in the print queue for this project.
            </p>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead
                  className={cn(
                    labelClass,
                    'text-forge-text-secondary dark:text-forge-text-secondary-dark'
                  )}
                >
                  <tr>
                    <th className="py-1 font-medium">Plate</th>
                    <th className="font-medium">Rev</th>
                    <th className="font-medium">Purpose</th>
                    <th className="font-medium">Status</th>
                    <th className="text-right font-medium">Printed</th>
                  </tr>
                </thead>
                <tbody className="text-forge-text dark:text-forge-text-dark">
                  {project.plates.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        p.supersededBy &&
                          'text-forge-text-secondary dark:text-forge-text-secondary-dark'
                      )}
                    >
                      <td className="py-1 pr-2">
                        {p.name}
                        {p.supersededBy && ' (superseded)'}
                      </td>
                      <td className="pr-2">{p.revision}</td>
                      <td className="pr-2">{purposeText(p)}</td>
                      <td className="pr-2">{p.status}</td>
                      <td className="text-right font-mono">
                        {p.printed} / {copiesNeeded(p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            className={cn(buttonClass, 'mt-3')}
            onClick={onOpenQueue}
          >
            Open in print queue
          </button>
        </div>
      )}
    </article>
  )
}
