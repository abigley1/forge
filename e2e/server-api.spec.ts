import { test, expect } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

/**
 * E2E tests for the Forge Express file server.
 *
 * These tests start an actual server instance and test the full HTTP API.
 * They're separate from the unit tests which use supertest for faster execution.
 */

// Note: These tests require the server to be built first.
// In CI, you'd run `cd server && npm run build` before running these tests.
// For now, we use tsx to run the server directly in development.

let serverProcess: ChildProcess | null = null
let tempDir: string
const SERVER_PORT = 3456
const SERVER_URL = `http://localhost:${SERVER_PORT}`

test.describe('Server API E2E', () => {
  test.beforeAll(async () => {
    // Create a temporary data directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-e2e-'))

    // Start the server
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: path.join(process.cwd(), 'server'),
      env: {
        ...process.env,
        PORT: String(SERVER_PORT),
        FORGE_DATA_DIR: tempDir,
        FORGE_STATIC_DIR: tempDir, // Use temp dir (no static files needed for API tests)
      },
      stdio: 'pipe',
    })

    // Wait for server to be ready
    await waitForServer(SERVER_URL, 10000)
  })

  test.afterAll(async () => {
    // Kill the server
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
      serverProcess = null
    }

    // Clean up temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })

  test.describe('Health endpoint', () => {
    test('GET /api/health returns healthy status', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/api/health`)

      expect(response.ok()).toBe(true)
      const body = await response.json()

      expect(body.status).toBe('healthy')
      expect(body.timestamp).toBeDefined()
      expect(body.uptime).toBeGreaterThanOrEqual(0)
      expect(body.checks.dataDir.status).toBe('ok')
      expect(body.checks.dataDir.writable).toBe(true)
    })
  })

  test.describe('Files API - CRUD operations', () => {
    test('PUT creates a new file', async ({ request }) => {
      const response = await request.put(
        `${SERVER_URL}/api/files/test-file.txt`,
        {
          data: { content: 'Hello, E2E World!' },
        }
      )

      expect(response.status()).toBe(201)
      const body = await response.json()
      expect(body.path).toBe('/test-file.txt')
      expect(body.content).toBe('Hello, E2E World!')

      // Verify file can be read back via API
      const readResponse = await request.get(
        `${SERVER_URL}/api/files/test-file.txt`
      )
      expect(readResponse.ok()).toBe(true)
      const readBody = await readResponse.json()
      expect(readBody.content).toBe('Hello, E2E World!')
    })

    test('GET reads file content', async ({ request }) => {
      // First create a file via API
      await request.put(`${SERVER_URL}/api/files/readable.txt`, {
        data: { content: 'Read me!' },
      })

      const response = await request.get(`${SERVER_URL}/api/files/readable.txt`)

      expect(response.ok()).toBe(true)
      const body = await response.json()
      expect(body.path).toBe('/readable.txt')
      expect(body.content).toBe('Read me!')
    })

    test('GET returns 404 for non-existent file', async ({ request }) => {
      const response = await request.get(
        `${SERVER_URL}/api/files/does-not-exist.txt`
      )

      expect(response.status()).toBe(404)
      const body = await response.json()
      expect(body.code).toBe('FILE_NOT_FOUND')
    })

    test('PUT updates existing file', async ({ request }) => {
      // First create a file via API
      await request.put(`${SERVER_URL}/api/files/updatable.txt`, {
        data: { content: 'Original content' },
      })

      const response = await request.put(
        `${SERVER_URL}/api/files/updatable.txt`,
        {
          data: { content: 'Updated content' },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.content).toBe('Updated content')

      // Verify via API read
      const readResponse = await request.get(
        `${SERVER_URL}/api/files/updatable.txt`
      )
      const readBody = await readResponse.json()
      expect(readBody.content).toBe('Updated content')
    })

    test('DELETE removes a file', async ({ request }) => {
      // First create a file via API
      await request.put(`${SERVER_URL}/api/files/deletable.txt`, {
        data: { content: 'Delete me' },
      })

      const response = await request.delete(
        `${SERVER_URL}/api/files/deletable.txt`
      )

      expect(response.status()).toBe(204)

      // Verify file is gone via API (should return 404)
      const getResponse = await request.get(
        `${SERVER_URL}/api/files/deletable.txt`
      )
      expect(getResponse.status()).toBe(404)
    })

    test('DELETE returns 404 for non-existent file', async ({ request }) => {
      const response = await request.delete(`${SERVER_URL}/api/files/ghost.txt`)

      expect(response.status()).toBe(404)
    })
  })

  test.describe('Files API - Directory operations', () => {
    test('GET with ?list=true lists directory contents', async ({
      request,
    }) => {
      // Create some files via API
      await request.put(`${SERVER_URL}/api/files/list-test-1.txt`, {
        data: { content: 'content1' },
      })
      await request.put(`${SERVER_URL}/api/files/list-test-2.txt`, {
        data: { content: 'content2' },
      })
      // Create a file in a subdirectory (implicitly creates directory)
      await request.put(`${SERVER_URL}/api/files/list-test-dir/nested.txt`, {
        data: { content: 'nested' },
      })

      const response = await request.get(`${SERVER_URL}/api/files/?list=true`)

      expect(response.ok()).toBe(true)
      const body = await response.json()
      expect(body.path).toBe('/')
      expect(Array.isArray(body.entries)).toBe(true)

      // Should have at least our test files
      const names = body.entries.map((e: { name: string }) => e.name)
      expect(names).toContain('list-test-1.txt')
      expect(names).toContain('list-test-2.txt')
      expect(names).toContain('list-test-dir')
    })

    test('PUT creates parent directories automatically', async ({
      request,
    }) => {
      const response = await request.put(
        `${SERVER_URL}/api/files/deep/nested/path/file.txt`,
        {
          data: { content: 'Deeply nested' },
        }
      )

      expect(response.status()).toBe(201)

      // Verify file can be read back via API
      const readResponse = await request.get(
        `${SERVER_URL}/api/files/deep/nested/path/file.txt`
      )
      expect(readResponse.ok()).toBe(true)
      const body = await readResponse.json()
      expect(body.content).toBe('Deeply nested')
    })

    test('DELETE with ?recursive=true removes directory with contents', async ({
      request,
    }) => {
      // Create a directory with files via API
      await request.put(`${SERVER_URL}/api/files/to-remove/file1.txt`, {
        data: { content: 'content1' },
      })
      await request.put(`${SERVER_URL}/api/files/to-remove/file2.txt`, {
        data: { content: 'content2' },
      })

      const response = await request.delete(
        `${SERVER_URL}/api/files/to-remove?recursive=true`
      )

      expect(response.status()).toBe(204)

      // Verify directory is gone via API (should return 404)
      const listResponse = await request.get(
        `${SERVER_URL}/api/files/to-remove?list=true`
      )
      expect(listResponse.status()).toBe(404)
    })
  })

  test.describe('Files API - Edge cases', () => {
    test('PUT with invalid body returns 400', async ({ request }) => {
      const response = await request.put(
        `${SERVER_URL}/api/files/invalid.txt`,
        {
          data: { notContent: 'oops' },
        }
      )

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('INVALID_BODY')
    })

    test('handles special characters in filenames', async ({ request }) => {
      const response = await request.put(
        `${SERVER_URL}/api/files/file with spaces.txt`,
        {
          data: { content: 'Spaces are fun' },
        }
      )

      expect(response.status()).toBe(201)

      // Read it back
      const readResponse = await request.get(
        `${SERVER_URL}/api/files/file with spaces.txt`
      )
      expect(readResponse.ok()).toBe(true)
      const body = await readResponse.json()
      expect(body.content).toBe('Spaces are fun')
    })

    test('handles UTF-8 content', async ({ request }) => {
      const unicodeContent = 'Hello 世界! 🚀 Привет мир!'

      const response = await request.put(
        `${SERVER_URL}/api/files/unicode.txt`,
        {
          data: { content: unicodeContent },
        }
      )

      expect(response.status()).toBe(201)

      const readResponse = await request.get(
        `${SERVER_URL}/api/files/unicode.txt`
      )
      const body = await readResponse.json()
      expect(body.content).toBe(unicodeContent)
    })
  })

  test.describe('CORS configuration', () => {
    test('allows requests from localhost', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/api/health`, {
        headers: {
          Origin: 'http://localhost:5173',
        },
      })

      expect(response.ok()).toBe(true)
      // CORS headers should be present
      const corsHeader = response.headers()['access-control-allow-origin']
      expect(corsHeader).toBeTruthy()
    })

    test('allows requests from Tailscale domains', async ({ request }) => {
      const response = await request.get(`${SERVER_URL}/api/health`, {
        headers: {
          Origin: 'https://my-machine.tailnet-name.ts.net',
        },
      })

      expect(response.ok()).toBe(true)
    })
  })
})

/**
 * Wait for the server to be ready by polling the health endpoint
 */
async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now()
  const healthUrl = `${url}/api/health`

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms`)
}
