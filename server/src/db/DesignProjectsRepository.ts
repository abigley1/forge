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
    throw new QueueError(
      error instanceof Error ? error.message : 'Invalid project.'
    )
  }
}
const duplicate = (error: unknown, name: string) =>
  (error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    ? new QueueError(`A design project named "${name}" already exists.`, 409)
    : error

/** Declared-stage 3D design projects; counts come from the print queue. */
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
    const row = this.db
      .prepare('SELECT * FROM design_projects WHERE id=?')
      .get(id) as Row | undefined
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
      throw duplicate(error, p.name)
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
          throw duplicate(error, p.name)
        }
        if (p.name !== current.name)
          this.queue.renameProject(current.name, p.name)
        return this.get(id)!
      })
      .immediate()
  }
}
