import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import type { Express } from 'express'
import { ServerFileSystemAdapter } from '../adapters/ServerFileSystemAdapter.js'

describe('Files API', () => {
  let tempDir: string
  let app: Express
  let adapter: ServerFileSystemAdapter

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-api-test-'))

    const result = createApp({
      port: 3000,
      dataDir: tempDir,
      staticDir: tempDir, // Use temp dir for static too
    })
    app = result.app
    adapter = result.adapter
  })

  afterEach(async () => {
    adapter.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('GET /api/files/*', () => {
    it('reads file contents', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'Hello, World!')

      const response = await request(app).get('/api/files/test.txt')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        path: '/test.txt',
        content: 'Hello, World!',
      })
    })

    it('returns 404 for non-existent file', async () => {
      const response = await request(app).get('/api/files/nonexistent.txt')

      expect(response.status).toBe(404)
      expect(response.body.code).toBe('FILE_NOT_FOUND')
    })

    it('lists directory with ?list=true', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1')
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2')

      const response = await request(app).get('/api/files/?list=true')

      expect(response.status).toBe(200)
      expect(response.body.path).toBe('/')
      expect(response.body.entries).toHaveLength(2)
    })

    it('lists directory recursively with ?list=true&recursive=true', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'))
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1')
      await fs.writeFile(path.join(tempDir, 'subdir', 'nested.txt'), 'nested')

      const response = await request(app).get(
        '/api/files/?list=true&recursive=true'
      )

      expect(response.status).toBe(200)
      expect(response.body.entries.length).toBeGreaterThan(2)
      expect(
        response.body.entries.some(
          (e: { name: string }) => e.name === 'nested.txt'
        )
      ).toBe(true)
    })

    it('handles nested file paths', async () => {
      await fs.mkdir(path.join(tempDir, 'deep', 'nested'), { recursive: true })
      await fs.writeFile(
        path.join(tempDir, 'deep', 'nested', 'file.txt'),
        'deep content'
      )

      const response = await request(app).get('/api/files/deep/nested/file.txt')

      expect(response.status).toBe(200)
      expect(response.body.content).toBe('deep content')
    })
  })

  describe('PUT /api/files/*', () => {
    it('creates new file', async () => {
      const response = await request(app)
        .put('/api/files/new-file.txt')
        .send({ content: 'new content' })

      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        path: '/new-file.txt',
        content: 'new content',
      })

      // Verify file was created
      const content = await fs.readFile(
        path.join(tempDir, 'new-file.txt'),
        'utf-8'
      )
      expect(content).toBe('new content')
    })

    it('updates existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'existing.txt'), 'old content')

      const response = await request(app)
        .put('/api/files/existing.txt')
        .send({ content: 'updated content' })

      expect(response.status).toBe(200)
      expect(response.body.content).toBe('updated content')
    })

    it('creates parent directories', async () => {
      const response = await request(app)
        .put('/api/files/deep/nested/path/file.txt')
        .send({ content: 'deep content' })

      expect(response.status).toBe(201)

      const content = await fs.readFile(
        path.join(tempDir, 'deep', 'nested', 'path', 'file.txt'),
        'utf-8'
      )
      expect(content).toBe('deep content')
    })

    it('returns 400 for missing content field', async () => {
      const response = await request(app)
        .put('/api/files/test.txt')
        .send({ notContent: 'value' })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('INVALID_BODY')
    })

    it('returns 400 for non-string content', async () => {
      const response = await request(app)
        .put('/api/files/test.txt')
        .send({ content: 123 })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('INVALID_BODY')
    })
  })

  describe('DELETE /api/files/*', () => {
    it('deletes file', async () => {
      await fs.writeFile(path.join(tempDir, 'to-delete.txt'), 'content')

      const response = await request(app).delete('/api/files/to-delete.txt')

      expect(response.status).toBe(204)

      // Verify file was deleted
      await expect(
        fs.access(path.join(tempDir, 'to-delete.txt'))
      ).rejects.toThrow()
    })

    it('deletes empty directory', async () => {
      await fs.mkdir(path.join(tempDir, 'empty-dir'))

      const response = await request(app).delete('/api/files/empty-dir')

      expect(response.status).toBe(204)
    })

    it('returns 400 for non-empty directory without recursive', async () => {
      await fs.mkdir(path.join(tempDir, 'non-empty'))
      await fs.writeFile(path.join(tempDir, 'non-empty', 'file.txt'), 'content')

      const response = await request(app).delete('/api/files/non-empty')

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('INVALID_PATH')
    })

    it('deletes non-empty directory with ?recursive=true', async () => {
      await fs.mkdir(path.join(tempDir, 'non-empty'))
      await fs.writeFile(path.join(tempDir, 'non-empty', 'file.txt'), 'content')

      const response = await request(app).delete(
        '/api/files/non-empty?recursive=true'
      )

      expect(response.status).toBe(204)
    })

    it('returns 404 for non-existent file', async () => {
      const response = await request(app).delete('/api/files/nonexistent.txt')

      expect(response.status).toBe(404)
      expect(response.body.code).toBe('FILE_NOT_FOUND')
    })
  })
})
