import { Router, type Request, type Response } from 'express'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version?: string
  uptime: number
  checks: {
    dataDir: {
      status: 'ok' | 'error'
      path: string
      writable: boolean
      error?: string
    }
  }
}

/**
 * Create health check router
 */
export function createHealthRouter(dataDir: string): Router {
  const router = Router()
  const startTime = Date.now()

  router.get('/', async (_req: Request, res: Response) => {
    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: {
        dataDir: {
          status: 'ok',
          path: dataDir,
          writable: false,
        },
      },
    }

    // Try to read version.json if it exists
    try {
      const versionPath = path.join(process.cwd(), 'dist', 'version.json')
      const versionData = await fs.readFile(versionPath, 'utf-8')
      const version = JSON.parse(versionData)
      response.version = version.version || version.gitHash
    } catch {
      // Version file not available, that's okay
    }

    // Check data directory accessibility
    try {
      await fs.access(dataDir)

      // Check if writable by attempting to create a temp file
      const testFile = path.join(dataDir, '.health-check-test')
      try {
        await fs.writeFile(testFile, 'test')
        await fs.unlink(testFile)
        response.checks.dataDir.writable = true
      } catch {
        response.checks.dataDir.writable = false
        response.status = 'degraded'
      }
    } catch (error) {
      response.checks.dataDir.status = 'error'
      response.checks.dataDir.error =
        error instanceof Error ? error.message : 'Unknown error'
      response.status = 'unhealthy'
    }

    const statusCode = response.status === 'unhealthy' ? 503 : 200
    res.status(statusCode).json(response)
  })

  return router
}
