import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import { QueueError } from './PrintQueueRepository.js'

export interface ProjectPart {
  id: string
  /** Vault project slug. */
  project: string
  itemId: string | null
  name: string
  quantityNeeded: number
}
export interface PartShortfall {
  name: string
  itemId: string | null
  needed: number
  owned: number
}
export interface ProjectPartInput {
  project: string
  itemId: string | null
  name: string
  quantityNeeded: number
}

interface Row {
  id: string
  project: string
  item_id: string | null
  name: string
  quantity_needed: number
}
const toPart = (r: Row): ProjectPart => ({
  id: r.id,
  project: r.project,
  itemId: r.item_id,
  name: r.name,
  quantityNeeded: r.quantity_needed,
})

function validate(value: unknown): ProjectPartInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new QueueError('Body must be an object.')
  const v = value as Record<string, unknown>
  const text = (field: string, max: number) => {
    const s = typeof v[field] === 'string' ? (v[field] as string).trim() : ''
    if (!s || s.length > max)
      throw new QueueError(`${field}: enter text up to ${max} characters.`)
    return s
  }
  const quantityNeeded = v.quantityNeeded
  if (
    typeof quantityNeeded !== 'number' ||
    !Number.isSafeInteger(quantityNeeded) ||
    quantityNeeded < 1
  )
    throw new QueueError('quantityNeeded: use a whole number of 1 or more.')
  const itemId = v.itemId ?? null
  if (itemId !== null && (typeof itemId !== 'string' || !itemId))
    throw new QueueError('itemId: use an inventory item id or leave it out.')
  return {
    project: text('project', 200),
    itemId,
    name: text('name', 200),
    quantityNeeded,
  }
}

/** Per-project parts lists; shortfall compares needs with owned inventory. */
export class ProjectPartsRepository {
  constructor(private db: DatabaseInstance) {}

  private find(id: string): ProjectPart | undefined {
    const row = this.db
      .prepare('SELECT * FROM project_parts WHERE id=?')
      .get(id) as Row | undefined
    return row && toPart(row)
  }
  private checkItem(itemId: string | null) {
    if (
      itemId !== null &&
      !this.db.prepare('SELECT 1 FROM inventory_items WHERE id=?').get(itemId)
    )
      throw new QueueError(`itemId: no inventory item "${itemId}".`)
  }
  private conflict(error: unknown, p: ProjectPartInput) {
    return (error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ? new QueueError(
          `"${p.name}" is already on the ${p.project} parts list.`,
          409
        )
      : error
  }

  /** Parts in the order they were added; no project means every project. */
  list(project?: string): ProjectPart[] {
    const rows = (
      project === undefined
        ? this.db.prepare('SELECT * FROM project_parts ORDER BY rowid').all()
        : this.db
            .prepare(
              'SELECT * FROM project_parts WHERE project=? COLLATE NOCASE ORDER BY rowid'
            )
            .all(project)
    ) as Row[]
    return rows.map(toPart)
  }

  create(input: unknown): ProjectPart {
    const p = validate(input)
    this.checkItem(p.itemId)
    const id = randomUUID()
    const now = new Date().toISOString()
    try {
      this.db
        .prepare(
          'INSERT INTO project_parts(id,project,item_id,name,quantity_needed,created_at,updated_at) VALUES(?,?,?,?,?,?,?)'
        )
        .run(id, p.project, p.itemId, p.name, p.quantityNeeded, now, now)
    } catch (error) {
      throw this.conflict(error, p)
    }
    return this.find(id)!
  }

  update(id: string, input: unknown): ProjectPart {
    if (!this.find(id)) throw new QueueError('Project part not found.', 404)
    const p = validate(input)
    this.checkItem(p.itemId)
    try {
      this.db
        .prepare(
          'UPDATE project_parts SET project=?, item_id=?, name=?, quantity_needed=?, updated_at=? WHERE id=?'
        )
        .run(
          p.project,
          p.itemId,
          p.name,
          p.quantityNeeded,
          new Date().toISOString(),
          id
        )
    } catch (error) {
      throw this.conflict(error, p)
    }
    return this.find(id)!
  }

  remove(id: string): { id: string } {
    if (
      !this.db.prepare('DELETE FROM project_parts WHERE id=?').run(id).changes
    )
      throw new QueueError('Project part not found.', 404)
    return { id }
  }

  /** Parts whose owned stock is below the need. Only `owned` stock counts. */
  shortfall(project?: string): PartShortfall[] {
    return this.list(project)
      .map((part) => {
        const item = part.itemId
          ? (this.db
              .prepare(
                'SELECT quantity, status FROM inventory_items WHERE id=?'
              )
              .get(part.itemId) as
              | { quantity: number; status: string }
              | undefined)
          : undefined
        return {
          name: part.name,
          itemId: part.itemId,
          needed: part.quantityNeeded,
          owned: item?.status === 'owned' ? item.quantity : 0,
        }
      })
      .filter((row) => row.owned < row.needed)
  }
}
