import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// We need to test CORS by making actual requests through an Express app
describe('CORS Middleware', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function createTestApp() {
    // Dynamic import to pick up env changes
    const { createCorsMiddleware } = await import('./cors.js')
    const app = express()
    app.use(createCorsMiddleware())
    app.get('/test', (_req, res) => {
      res.json({ ok: true })
    })
    return app
  }

  it('allows requests with no origin', async () => {
    const app = await createTestApp()

    const response = await request(app).get('/test')

    expect(response.status).toBe(200)
  })

  it('allows localhost origins', async () => {
    const app = await createTestApp()

    const origins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:8080',
    ]

    for (const origin of origins) {
      const response = await request(app).get('/test').set('Origin', origin)

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('allows Tailscale .ts.net domains', async () => {
    const app = await createTestApp()

    const origins = [
      'https://my-server.tailnet.ts.net',
      'https://forge.my-tailnet.ts.net',
      'http://home-assistant.tail123.ts.net',
    ]

    for (const origin of origins) {
      const response = await request(app).get('/test').set('Origin', origin)

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('allows custom TAILSCALE_HOSTNAME', async () => {
    process.env.TAILSCALE_HOSTNAME = 'my-custom-host'

    const app = await createTestApp()

    const response = await request(app)
      .get('/test')
      .set('Origin', 'https://my-custom-host:8080')

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://my-custom-host:8080'
    )
  })

  it('rejects unknown origins', async () => {
    const app = await createTestApp()

    const response = await request(app)
      .get('/test')
      .set('Origin', 'https://evil-site.com')

    // CORS rejection results in no Access-Control-Allow-Origin header
    // and potentially an error (depends on cors package behavior)
    expect(response.status).toBe(500) // CORS error
  })

  it('handles preflight OPTIONS requests', async () => {
    const app = await createTestApp()

    const response = await request(app)
      .options('/test')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'PUT')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-methods']).toContain('PUT')
  })
})
