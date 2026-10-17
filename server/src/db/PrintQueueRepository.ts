import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import {
  normalizePlate,
  validatePlate,
  type PrintPlate,
  type PrintQueue,
} from '../print-queue-model.js'

export class QueueError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}
export class PrintQueueRepository {
  constructor(private db: DatabaseInstance) {
    // Additive feature storage: safe for both existing and new Forge databases.
    db.exec(`CREATE TABLE IF NOT EXISTS print_queue (
      id INTEGER PRIMARY KEY CHECK(id = 1), version INTEGER NOT NULL,
      plates TEXT NOT NULL CHECK(json_valid(plates))
    ); INSERT OR IGNORE INTO print_queue(id, version, plates) VALUES(1, 0, '[]');`)
  }
  read(): PrintQueue {
    const row = this.db
      .prepare('SELECT version, plates FROM print_queue WHERE id=1')
      .get() as { version: number; plates: string }
    return {
      version: row.version,
      plates: (JSON.parse(row.plates) as PrintPlate[]).map(normalizePlate),
    }
  }
  private change(
    version: unknown,
    mutate: (queue: PrintQueue) => void
  ): PrintQueue {
    return this.db
      .transaction(() => {
        const queue = this.read()
        if (!Number.isSafeInteger(version))
          throw new QueueError('A numeric queue version is required.')
        if (version !== queue.version)
          throw new QueueError(
            'The queue changed elsewhere. Refresh, review the latest version, then retry.',
            409
          )
        mutate(queue)
        queue.version++
        this.db
          .prepare('UPDATE print_queue SET version=?, plates=? WHERE id=1')
          .run(queue.version, JSON.stringify(queue.plates))
        return queue
      })
      .immediate()
  }
  add(version: unknown, plate: unknown): PrintQueue {
    return this.change(version, (q) => {
      if (q.plates.length >= 2000)
        throw new QueueError('Queue limit reached (2000 plates).')
      q.plates.push({
        ...validatePlate(plate),
        id: randomUUID(),
        updatedAt: new Date().toISOString(),
      })
    })
  }
  update(version: unknown, id: string, plate: unknown): PrintQueue {
    return this.change(version, (q) => {
      const index = q.plates.findIndex((p) => p.id === id)
      if (index < 0) throw new QueueError('Plate not found.', 404)
      q.plates[index] = {
        ...validatePlate(plate),
        id,
        updatedAt: new Date().toISOString(),
      }
    })
  }
  reorder(version: unknown, ids: unknown): PrintQueue {
    return this.change(version, (q) => {
      if (
        !Array.isArray(ids) ||
        ids.length !== q.plates.length ||
        new Set(ids).size !== ids.length ||
        ids.some(
          (id) => typeof id !== 'string' || !q.plates.some((p) => p.id === id)
        )
      )
        throw new QueueError('Supply every plate ID exactly once.')
      const byId = new Map(q.plates.map((p) => [p.id, p]))
      q.plates = ids.map((id) => byId.get(id)!)
    })
  }
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
          if (
            typeof r.updatedAt !== 'string' ||
            Number.isNaN(Date.parse(r.updatedAt))
          )
            throw new QueueError(
              `plates[${i}]: updatedAt must be an ISO timestamp.`
            )
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
}
