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
import { buttonClass, labelClass } from './styles'

/** 3D design homepage: declared stage per project, counts from the queue. */
export function DesignProjectsView({
  onBack,
  onOpenQueue,
}: {
  onBack: () => void
  onOpenQueue: () => void
}) {
  const [data, setData] = useState<DesignOverview | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<DesignStage | null>(null)
  const [addError, setAddError] = useState('')
  const editing = useRef(new Set<string>())

  // State is set in promise callbacks, never synchronously in the effect.
  const load = useCallback(
    () =>
      designRequest<DesignOverview>().then(
        (next) => {
          setData(next)
          setError('')
        },
        (e: unknown) =>
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load 3D design projects.'
          )
      ),
    []
  )

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && editing.current.size === 0)
        void load()
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [load])

  const addProject = async (name: string) => {
    setAddError('')
    try {
      await designRequest('POST', '', {
        project: { name, stage: 'designing', stageNote: '' },
      })
      await load()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not add project.')
    }
  }

  const visible = designStages.filter((s) => !filter || s === filter)

  return (
    <div className="bg-forge-paper dark:bg-forge-paper-dark h-dvh overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <nav
          aria-label="Breadcrumb"
          className={cn(
            labelClass,
            'text-forge-text-secondary dark:text-forge-text-secondary-dark mb-4 flex items-center gap-1'
          )}
        >
          <button
            type="button"
            onClick={onBack}
            className="hover:text-forge-accent focus-visible:ring-forge-accent min-h-11 uppercase focus-visible:ring-2 focus-visible:outline-none"
          >
            Forge
          </button>
          <span aria-hidden="true">/</span>
          <span>3D Design</span>
        </nav>
        <div className="flex items-center justify-between gap-3">
          <h1
            className={cn(
              labelClass,
              'text-forge-text dark:text-forge-text-dark text-lg'
            )}
          >
            3D Design
          </h1>
          <button
            type="button"
            className={cn(buttonClass, 'inline-flex items-center gap-2')}
            onClick={() => void load()}
          >
            <RefreshCw aria-hidden="true" className="size-4" /> Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="border-forge-border dark:border-forge-border-dark mt-6 rounded-lg border p-4 text-sm"
          >
            <p className="text-forge-text dark:text-forge-text-dark">
              Could not load 3D design projects: {error}
            </p>
            <button
              type="button"
              className={cn(buttonClass, 'mt-3')}
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        )}
        {!data && !error && (
          <p
            role="status"
            className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-6 text-sm"
          >
            Loading…
          </p>
        )}

        {data && (
          <>
            <div
              role="group"
              aria-label="Filter by stage"
              className="mt-6 flex flex-wrap gap-2"
            >
              {designStages.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  aria-pressed={filter === stage}
                  onClick={() => setFilter(filter === stage ? null : stage)}
                  className={cn(
                    buttonClass,
                    filter === stage &&
                      'border-forge-accent text-forge-accent dark:border-forge-accent-dark dark:text-forge-accent-dark'
                  )}
                >
                  {stageLabels[stage]} ·{' '}
                  {data.projects.filter((p) => p.stage === stage).length}
                </button>
              ))}
            </div>

            {data.projects.length === 0 && (
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-6 text-sm">
                No 3D design projects registered yet. Add one from the queue
                projects below.
              </p>
            )}

            {visible.map((stage) => {
              const projects = data.projects.filter((p) => p.stage === stage)
              if (!projects.length) return null
              return (
                <section key={stage} className="mt-8">
                  <h2
                    className={cn(
                      labelClass,
                      'text-forge-text-secondary dark:text-forge-text-secondary-dark mb-3'
                    )}
                  >
                    {stageLabels[stage]}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((p) => (
                      <ProjectCard
                        key={`${p.id}:${p.version}`}
                        project={p}
                        onOpenQueue={onOpenQueue}
                        onEditingChange={(on) => {
                          if (on) editing.current.add(p.id)
                          else editing.current.delete(p.id)
                        }}
                        onSave={async (input) => {
                          await designRequest('PUT', `/${p.id}`, {
                            version: p.version,
                            project: input,
                          })
                          editing.current.delete(p.id)
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
                <h2
                  className={cn(
                    labelClass,
                    'text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1'
                  )}
                >
                  Unassigned plates
                </h2>
                <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-3 text-sm">
                  Print-queue projects with no 3D design project yet.
                </p>
                <ul className="space-y-2">
                  {data.unassigned.map((u) => (
                    <li
                      key={u.project}
                      className="flex min-w-0 items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-forge-text dark:text-forge-text-dark min-w-0 flex-1 truncate">
                        {u.project}
                      </span>
                      <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark shrink-0">
                        {u.plates} plates
                      </span>
                      <button
                        type="button"
                        className={cn(buttonClass, 'shrink-0')}
                        aria-label={`Add ${u.project} as project`}
                        onClick={() => void addProject(u.project)}
                      >
                        Add as project
                      </button>
                    </li>
                  ))}
                </ul>
                {addError && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-red-700 dark:text-red-400"
                  >
                    {addError}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
