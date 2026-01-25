import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import type { Express } from 'express'
import { ServerFileSystemAdapter } from '../adapters/ServerFileSystemAdapter.js'

describe('Health API', () => {
  let tempDir: string
  let app: Express
  let adapter: ServerFileSystemAdapter

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-health-test-'))

    const result = createApp({
      port: 3000,
      dataDir: tempDir,
      staticDir: tempDir,
    })
    app = result.app
    adapter = result.adapter
  })

  afterEach(async () => {
    adapter.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('GET /api/health', () => {
    it('returns healthy status', async () => {
      const response = await request(app).get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('healthy')
    })

    it('includes timestamp', async () => {
      const response = await request(app).get('/api/health')

      expect(response.body.timestamp).toBeDefined()
      expect(new Date(response.body.timestamp).getTime()).not.toBeNaN()
    })

    it('includes uptime', async () => {
      const response = await request(app).get('/api/health')

      expect(typeof response.body.uptime).toBe('number')
      expect(response.body.uptime).toBeGreaterThanOrEqual(0)
    })

    it('includes data directory check', async () => {
      const response = await request(app).get('/api/health')

      expect(response.body.checks.dataDir).toBeDefined()
      expect(response.body.checks.dataDir.status).toBe('ok')
      expect(response.body.checks.dataDir.path).toBe(tempDir)
      expect(response.body.checks.dataDir.writable).toBe(true)
    })

    it('returns degraded when data dir not writable', async () => {
      // Make temp dir read-only
      await fs.chmod(tempDir, 0o444)

      try {
        const response = await request(app).get('/api/health')

        // Should still be reachable but degraded
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('degraded')
        expect(response.body.checks.dataDir.writable).toBe(false)
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(tempDir, 0o755)
      }
    })
  })
})
