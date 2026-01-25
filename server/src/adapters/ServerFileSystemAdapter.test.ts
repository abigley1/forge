import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  ServerFileSystemAdapter,
  FileNotFoundError,
  DirectoryNotFoundError,
  InvalidPathError,
} from './ServerFileSystemAdapter.js'

describe('ServerFileSystemAdapter', () => {
  let tempDir: string
  let adapter: ServerFileSystemAdapter

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-test-'))
    adapter = new ServerFileSystemAdapter(tempDir)
  })

  afterEach(async () => {
    // Clean up temporary directory
    adapter.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('readFile', () => {
    it('reads file contents', async () => {
      const content = 'Hello, World!'
      await fs.writeFile(path.join(tempDir, 'test.txt'), content)

      const result = await adapter.readFile('/test.txt')
      expect(result).toBe(content)
    })

    it('throws FileNotFoundError for non-existent file', async () => {
      await expect(adapter.readFile('/nonexistent.txt')).rejects.toThrow(
        FileNotFoundError
      )
    })

    it('throws InvalidPathError when reading directory as file', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'))

      await expect(adapter.readFile('/subdir')).rejects.toThrow(
        InvalidPathError
      )
    })

    it('handles nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'deep', 'nested'), { recursive: true })
      await fs.writeFile(
        path.join(tempDir, 'deep', 'nested', 'file.txt'),
        'nested content'
      )

      const result = await adapter.readFile('/deep/nested/file.txt')
      expect(result).toBe('nested content')
    })
  })

  describe('writeFile', () => {
    it('creates new file', async () => {
      await adapter.writeFile('/new-file.txt', 'new content')

      const content = await fs.readFile(
        path.join(tempDir, 'new-file.txt'),
        'utf-8'
      )
      expect(content).toBe('new content')
    })

    it('overwrites existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'existing.txt'), 'old content')

      await adapter.writeFile('/existing.txt', 'new content')

      const content = await fs.readFile(
        path.join(tempDir, 'existing.txt'),
        'utf-8'
      )
      expect(content).toBe('new content')
    })

    it('creates parent directories automatically', async () => {
      await adapter.writeFile('/deep/nested/path/file.txt', 'deep content')

      const content = await fs.readFile(
        path.join(tempDir, 'deep', 'nested', 'path', 'file.txt'),
        'utf-8'
      )
      expect(content).toBe('deep content')
    })
  })

  describe('listDirectory', () => {
    beforeEach(async () => {
      // Set up test directory structure
      await fs.mkdir(path.join(tempDir, 'subdir'))
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1')
      await fs.writeFile(path.join(tempDir, 'file2.md'), 'content2')
      await fs.writeFile(path.join(tempDir, 'subdir', 'nested.txt'), 'nested')
    })

    it('lists directory contents', async () => {
      const entries = await adapter.listDirectory('/')

      expect(entries).toHaveLength(3)
      expect(entries.map((e) => e.name).sort()).toEqual([
        'file1.txt',
        'file2.md',
        'subdir',
      ])
    })

    it('includes file/directory flags', async () => {
      const entries = await adapter.listDirectory('/')

      const fileEntry = entries.find((e) => e.name === 'file1.txt')
      expect(fileEntry?.isFile).toBe(true)
      expect(fileEntry?.isDirectory).toBe(false)

      const dirEntry = entries.find((e) => e.name === 'subdir')
      expect(dirEntry?.isFile).toBe(false)
      expect(dirEntry?.isDirectory).toBe(true)
    })

    it('filters by extension', async () => {
      const entries = await adapter.listDirectory('/', { extension: '.txt' })

      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('file1.txt')
    })

    it('lists recursively', async () => {
      const entries = await adapter.listDirectory('/', { recursive: true })

      expect(entries.length).toBeGreaterThan(3)
      expect(entries.some((e) => e.name === 'nested.txt')).toBe(true)
    })

    it('throws DirectoryNotFoundError for non-existent directory', async () => {
      await expect(adapter.listDirectory('/nonexistent')).rejects.toThrow(
        DirectoryNotFoundError
      )
    })

    it('throws InvalidPathError when listing file as directory', async () => {
      await expect(adapter.listDirectory('/file1.txt')).rejects.toThrow(
        InvalidPathError
      )
    })
  })

  describe('exists', () => {
    it('returns true for existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'exists.txt'), 'content')

      expect(await adapter.exists('/exists.txt')).toBe(true)
    })

    it('returns true for existing directory', async () => {
      await fs.mkdir(path.join(tempDir, 'exists-dir'))

      expect(await adapter.exists('/exists-dir')).toBe(true)
    })

    it('returns false for non-existent path', async () => {
      expect(await adapter.exists('/nonexistent')).toBe(false)
    })
  })

  describe('mkdir', () => {
    it('creates directory', async () => {
      await adapter.mkdir('/new-dir')

      const stat = await fs.stat(path.join(tempDir, 'new-dir'))
      expect(stat.isDirectory()).toBe(true)
    })

    it('creates nested directories', async () => {
      await adapter.mkdir('/deep/nested/dir')

      const stat = await fs.stat(path.join(tempDir, 'deep', 'nested', 'dir'))
      expect(stat.isDirectory()).toBe(true)
    })

    it('is idempotent for existing directory', async () => {
      await fs.mkdir(path.join(tempDir, 'existing-dir'))

      // Should not throw
      await adapter.mkdir('/existing-dir')

      const stat = await fs.stat(path.join(tempDir, 'existing-dir'))
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('delete', () => {
    it('deletes file', async () => {
      await fs.writeFile(path.join(tempDir, 'to-delete.txt'), 'content')

      await adapter.delete('/to-delete.txt')

      await expect(
        fs.access(path.join(tempDir, 'to-delete.txt'))
      ).rejects.toThrow()
    })

    it('deletes empty directory', async () => {
      await fs.mkdir(path.join(tempDir, 'empty-dir'))

      await adapter.delete('/empty-dir')

      await expect(fs.access(path.join(tempDir, 'empty-dir'))).rejects.toThrow()
    })

    it('throws when deleting non-empty directory without recursive flag', async () => {
      await fs.mkdir(path.join(tempDir, 'non-empty'))
      await fs.writeFile(path.join(tempDir, 'non-empty', 'file.txt'), 'content')

      await expect(adapter.delete('/non-empty')).rejects.toThrow(
        InvalidPathError
      )
    })

    it('deletes non-empty directory with recursive flag', async () => {
      await fs.mkdir(path.join(tempDir, 'non-empty'))
      await fs.writeFile(path.join(tempDir, 'non-empty', 'file.txt'), 'content')

      await adapter.delete('/non-empty', true)

      await expect(fs.access(path.join(tempDir, 'non-empty'))).rejects.toThrow()
    })

    it('throws FileNotFoundError for non-existent path', async () => {
      await expect(adapter.delete('/nonexistent')).rejects.toThrow(
        FileNotFoundError
      )
    })
  })

  describe('path traversal prevention', () => {
    it('rejects path traversal attempts', async () => {
      await expect(adapter.readFile('/../../../etc/passwd')).rejects.toThrow(
        InvalidPathError
      )
    })

    it('rejects encoded path traversal', async () => {
      await expect(
        adapter.readFile('/..%2F..%2F..%2Fetc%2Fpasswd')
      ).rejects.toThrow()
    })
  })

  describe('getRootPath', () => {
    it('returns the absolute root path', () => {
      expect(adapter.getRootPath()).toBe(path.resolve(tempDir))
    })
  })

  describe('getRootName', () => {
    it('returns the root directory name', () => {
      const name = adapter.getRootName()
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
    })
  })
})
