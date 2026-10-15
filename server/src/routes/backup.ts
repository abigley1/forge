/**
 * Backup API
 *
 * - GET /api/backup - Download a consistent SQLite snapshot of the live database
 */

import { Router, Request, Response } from 'express'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { DatabaseInstance } from '../db/index.js'

/**
 * Create the backup router
 */
export function createBackupRouter(db: DatabaseInstance): Router {
  const router = Router()

  router.get('/', async (_req: Request, res: Response) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-backup-'))
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(dir, `forge-${stamp}.sqlite`)
    try {
      await db.backup(file)
      res.setHeader('Content-Type', 'application/vnd.sqlite3')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="forge-${stamp}.sqlite"`
      )
      res.send(await fs.readFile(file))
    } catch (error) {
      console.error('Error creating backup:', error)
      res.status(500).json({ error: 'Failed to create backup' })
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  return router
}
