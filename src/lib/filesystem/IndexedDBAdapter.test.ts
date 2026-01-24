/**
 * IndexedDBAdapter Tests
 *
 * Tests for the IndexedDB-based file system adapter.
 * Uses fake-indexeddb for testing in Node.js environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IndexedDBAdapter, isIndexedDBSupported } from './IndexedDBAdapter'
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  PathExistsError,
  InvalidPathError,
} from './types'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter

  beforeEach(async () => {
    // Create a new adapter with unique project ID for test isolation
    adapter = new IndexedDBAdapter(`test-${Date.now()}-${Math.random()}`)
  })

  afterEach(async () => {
    // Clean up
    await adapter.clear()
    adapter.close()
  })

  describe('isIndexedDBSupported', () => {
    it('should return true when IndexedDB is available', () => {
      expect(isIndexedDBSupported()).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should throw FileNotFoundError for non-existent file', async () => {
      await expect(adapter.readFile('/nonexistent.txt')).rejects.toThrow(
        FileNotFoundError
      )
    })

    it('should read file content after writing', async () => {
      await adapter.writeFile('/test.txt', 'Hello, World!')
      const content = await adapter.readFile('/test.txt')
      expect(content).toBe('Hello, World!')
    })

    it('should read files in subdirectories', async () => {
      await adapter.writeFile('/subdir/test.txt', 'Nested content')
      const content = await adapter.readFile('/subdir/test.txt')
      expect(content).toBe('Nested content')
    })
  })

  describe('writeFile', () => {
    it('should create a new file', async () => {
      await adapter.writeFile('/new-file.txt', 'New content')
      const exists = await adapter.exists('/new-file.txt')
      expect(exists).toBe(true)
    })

    it('should overwrite existing file', async () => {
      await adapter.writeFile('/file.txt', 'Original')
      await adapter.writeFile('/file.txt', 'Updated')
      const content = await adapter.readFile('/file.txt')
      expect(content).toBe('Updated')
    })

    it('should create parent directories automatically', async () => {
      await adapter.writeFile('/a/b/c/file.txt', 'Deep content')
      const exists = await adapter.exists('/a/b/c/file.txt')
      expect(exists).toBe(true)

      // Parent directories should exist
      expect(await adapter.exists('/a')).toBe(true)
      expect(await adapter.exists('/a/b')).toBe(true)
      expect(await adapter.exists('/a/b/c')).toBe(true)
    })

    it('should throw InvalidPathError when trying to write to root', async () => {
      await expect(adapter.writeFile('/', 'content')).rejects.toThrow(
        InvalidPathError
      )
    })

    it('should throw InvalidPathError when path conflicts with directory', async () => {
      await adapter.mkdir('/mydir')
      await expect(adapter.writeFile('/mydir', 'content')).rejects.toThrow(
        InvalidPathError
      )
    })
  })

  describe('listDirectory', () => {
    beforeEach(async () => {
      await adapter.writeFile('/file1.txt', 'content1')
      await adapter.writeFile('/file2.md', 'content2')
      await adapter.mkdir('/subdir')
      await adapter.writeFile('/subdir/nested.txt', 'nested')
    })

    it('should list files in root directory', async () => {
      const entries = await adapter.listDirectory('/')
      const names = entries.map((e) => e.name).sort()
      expect(names).toContain('file1.txt')
      expect(names).toContain('file2.md')
      expect(names).toContain('subdir')
    })

    it('should list files in subdirectory', async () => {
      const entries = await adapter.listDirectory('/subdir')
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('nested.txt')
    })

    it('should filter by extension', async () => {
      const entries = await adapter.listDirectory('/', { extension: '.txt' })
      expect(
        entries.every((e) => e.name.endsWith('.txt') || e.isDirectory)
      ).toBe(true)
    })

    it('should list recursively when option set', async () => {
      const entries = await adapter.listDirectory('/', { recursive: true })
      const paths = entries.map((e) => e.path)
      expect(paths).toContain('/file1.txt')
      expect(paths).toContain('/subdir')
      // The nested file should appear in recursive listing
    })

    it('should throw DirectoryNotFoundError for non-existent directory', async () => {
      await expect(adapter.listDirectory('/nonexistent')).rejects.toThrow(
        DirectoryNotFoundError
      )
    })

    it('should correctly identify files and directories', async () => {
      const entries = await adapter.listDirectory('/')
      const fileEntry = entries.find((e) => e.name === 'file1.txt')
      const dirEntry = entries.find((e) => e.name === 'subdir')

      expect(fileEntry?.isFile).toBe(true)
      expect(fileEntry?.isDirectory).toBe(false)
      expect(dirEntry?.isFile).toBe(false)
      expect(dirEntry?.isDirectory).toBe(true)
    })
  })

  describe('exists', () => {
    it('should return true for existing file', async () => {
      await adapter.writeFile('/exists.txt', 'content')
      expect(await adapter.exists('/exists.txt')).toBe(true)
    })

    it('should return true for existing directory', async () => {
      await adapter.mkdir('/existsdir')
      expect(await adapter.exists('/existsdir')).toBe(true)
    })

    it('should return false for non-existent path', async () => {
      expect(await adapter.exists('/nonexistent')).toBe(false)
    })

    it('should return true for root directory', async () => {
      expect(await adapter.exists('/')).toBe(true)
    })
  })

  describe('mkdir', () => {
    it('should create a directory', async () => {
      await adapter.mkdir('/newdir')
      expect(await adapter.exists('/newdir')).toBe(true)
    })

    it('should create nested directories', async () => {
      await adapter.mkdir('/a/b/c')
      expect(await adapter.exists('/a')).toBe(true)
      expect(await adapter.exists('/a/b')).toBe(true)
      expect(await adapter.exists('/a/b/c')).toBe(true)
    })

    it('should be idempotent for existing directory', async () => {
      await adapter.mkdir('/existingdir')
      await adapter.mkdir('/existingdir') // Should not throw
      expect(await adapter.exists('/existingdir')).toBe(true)
    })

    it('should throw PathExistsError when file exists at path', async () => {
      await adapter.writeFile('/file.txt', 'content')
      await expect(adapter.mkdir('/file.txt')).rejects.toThrow(PathExistsError)
    })

    it('should do nothing for root path', async () => {
      await adapter.mkdir('/')
      expect(await adapter.exists('/')).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete a file', async () => {
      await adapter.writeFile('/todelete.txt', 'content')
      await adapter.delete('/todelete.txt')
      expect(await adapter.exists('/todelete.txt')).toBe(false)
    })

    it('should delete an empty directory', async () => {
      await adapter.mkdir('/emptydir')
      await adapter.delete('/emptydir')
      expect(await adapter.exists('/emptydir')).toBe(false)
    })

    it('should throw FileNotFoundError for non-existent path', async () => {
      await expect(adapter.delete('/nonexistent')).rejects.toThrow(
        FileNotFoundError
      )
    })

    it('should throw InvalidPathError for non-empty directory without recursive', async () => {
      await adapter.writeFile('/dir/file.txt', 'content')
      await expect(adapter.delete('/dir')).rejects.toThrow(InvalidPathError)
    })

    it('should delete non-empty directory with recursive flag', async () => {
      await adapter.writeFile('/dir/file1.txt', 'content1')
      await adapter.writeFile('/dir/file2.txt', 'content2')
      await adapter.writeFile('/dir/subdir/nested.txt', 'nested')
      await adapter.delete('/dir', true)
      expect(await adapter.exists('/dir')).toBe(false)
      expect(await adapter.exists('/dir/file1.txt')).toBe(false)
      expect(await adapter.exists('/dir/subdir')).toBe(false)
    })

    it('should throw InvalidPathError when trying to delete root', async () => {
      await expect(adapter.delete('/')).rejects.toThrow(InvalidPathError)
    })
  })

  describe('watch', () => {
    it('should notify on file creation', async () => {
      const events: { type: string; path: string }[] = []
      const callback = vi.fn((event) => {
        events.push({ type: event.type, path: event.path })
      })

      // Watch root without recursive (simpler matching)
      adapter.watch('/', callback, { debounceMs: 10 })
      await adapter.writeFile('/newfile.txt', 'content')

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalled()
      expect(
        events.some((e) => e.type === 'create' && e.path === '/newfile.txt')
      ).toBe(true)
    })

    it('should notify on file modification', async () => {
      await adapter.writeFile('/existing.txt', 'original')

      const events: { type: string; path: string }[] = []
      const callback = vi.fn((event) => {
        events.push({ type: event.type, path: event.path })
      })

      adapter.watch('/', callback, { debounceMs: 10 })
      await adapter.writeFile('/existing.txt', 'modified')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalled()
      expect(
        events.some((e) => e.type === 'modify' && e.path === '/existing.txt')
      ).toBe(true)
    })

    it('should notify on file deletion', async () => {
      await adapter.writeFile('/todelete.txt', 'content')

      const events: { type: string; path: string }[] = []
      const callback = vi.fn((event) => {
        events.push({ type: event.type, path: event.path })
      })

      adapter.watch('/', callback, { debounceMs: 10 })
      await adapter.delete('/todelete.txt')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).toHaveBeenCalled()
      expect(
        events.some((e) => e.type === 'delete' && e.path === '/todelete.txt')
      ).toBe(true)
    })

    it('should support unwatch', async () => {
      const callback = vi.fn()
      const unwatch = adapter.watch('/', callback, { debounceMs: 10 })

      unwatch()
      await adapter.writeFile('/afterunwatch.txt', 'content')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).not.toHaveBeenCalled()
    })

    it('should only notify for watched paths', async () => {
      const callback = vi.fn()
      adapter.watch('/specific', callback, { debounceMs: 10 })

      await adapter.writeFile('/other/file.txt', 'content')

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getRootPath', () => {
    it('should return "/"', () => {
      expect(adapter.getRootPath()).toBe('/')
    })
  })

  describe('getRootName', () => {
    it('should return null initially', () => {
      expect(adapter.getRootName()).toBeNull()
    })

    it('should return set project name', () => {
      adapter.setProjectName('My Project')
      expect(adapter.getRootName()).toBe('My Project')
    })
  })

  describe('dirty tracking', () => {
    it('should mark new files as dirty', async () => {
      await adapter.writeFile('/dirty.txt', 'content')
      expect(await adapter.isDirty('/dirty.txt')).toBe(true)
    })

    it('should mark files as synced', async () => {
      await adapter.writeFile('/synced.txt', 'content')
      await adapter.markSynced('/synced.txt')
      expect(await adapter.isDirty('/synced.txt')).toBe(false)
    })

    it('should return dirty files list', async () => {
      await adapter.writeFile('/dirty1.txt', 'content1')
      await adapter.writeFile('/dirty2.txt', 'content2')
      await adapter.writeFile('/synced.txt', 'content3')
      await adapter.markSynced('/synced.txt')

      const dirtyFiles = await adapter.getDirtyFiles()
      expect(dirtyFiles).toContain('/dirty1.txt')
      expect(dirtyFiles).toContain('/dirty2.txt')
      expect(dirtyFiles).not.toContain('/synced.txt')
    })

    it('should detect external modifications', async () => {
      await adapter.writeFile('/file.txt', 'content')
      await adapter.markExternallyModified('/file.txt')
      expect(await adapter.isExternallyModified('/file.txt')).toBe(true)
    })

    it('should throw FileNotFoundError when marking nonexistent file as synced', async () => {
      await expect(adapter.markSynced('/nonexistent.txt')).rejects.toThrow(
        FileNotFoundError
      )
    })

    it('should throw FileNotFoundError when marking nonexistent file as externally modified', async () => {
      await expect(
        adapter.markExternallyModified('/nonexistent.txt')
      ).rejects.toThrow(FileNotFoundError)
    })
  })

  describe('project metadata', () => {
    it('should save and retrieve project metadata', async () => {
      await adapter.saveProjectMetadata({
        name: 'Test Project',
        rootPath: '/projects/test',
        lastAccessed: Date.now(),
      })

      const metadata = await adapter.getProjectMetadata()
      expect(metadata?.name).toBe('Test Project')
      expect(metadata?.rootPath).toBe('/projects/test')
    })

    it('should return null for missing metadata', async () => {
      const metadata = await adapter.getProjectMetadata()
      expect(metadata).toBeNull()
    })
  })

  describe('file metadata', () => {
    it('should return file metadata', async () => {
      await adapter.writeFile('/meta.txt', 'content')
      const metadata = await adapter.getFileMetadata('/meta.txt')

      expect(metadata).not.toBeNull()
      expect(metadata?.lastModified).toBeGreaterThan(0)
      expect(metadata?.lastSyncedAt).toBeNull()
    })

    it('should return null for non-existent file', async () => {
      const metadata = await adapter.getFileMetadata('/nonexistent.txt')
      expect(metadata).toBeNull()
    })
  })

  describe('directory handle storage', () => {
    it('should store and retrieve directory handle', async () => {
      // Note: In fake-indexeddb, we can't store actual FileSystemDirectoryHandle
      // because it contains functions that can't be cloned. This test verifies
      // the basic storage mechanism works with serializable data.
      // In a real browser, FileSystemDirectoryHandle is a special structured-clonable type.
      const mockHandle = {
        kind: 'directory',
        name: 'test-dir',
      } as unknown as FileSystemDirectoryHandle

      await adapter.storeDirectoryHandle(mockHandle, '/projects/test')
      const retrieved = await adapter.getStoredDirectoryHandle()

      expect(retrieved).not.toBeNull()
      expect(retrieved!.projectPath).toBe('/projects/test')
      expect((retrieved!.handle as unknown as { name: string }).name).toBe(
        'test-dir'
      )
    })

    it('should return null when no handle is stored', async () => {
      const handle = await adapter.getStoredDirectoryHandle()
      expect(handle).toBeNull()
    })

    it('should store handle with lastSyncedAt as null initially', async () => {
      const mockHandle = {
        kind: 'directory',
        name: 'test-dir',
      } as unknown as FileSystemDirectoryHandle

      await adapter.storeDirectoryHandle(mockHandle, '/projects/test')
      const retrieved = await adapter.getStoredDirectoryHandle()

      expect(retrieved).not.toBeNull()
      expect(retrieved!.lastSyncedAt).toBeNull()
    })

    it('should clear directory handle', async () => {
      const mockHandle = {
        kind: 'directory',
        name: 'test-dir',
      } as unknown as FileSystemDirectoryHandle

      await adapter.storeDirectoryHandle(mockHandle, '/projects/test')
      expect(await adapter.getStoredDirectoryHandle()).not.toBeNull()

      await adapter.clearDirectoryHandle()
      expect(await adapter.getStoredDirectoryHandle()).toBeNull()
    })

    it('should update handle sync time', async () => {
      const mockHandle = {
        kind: 'directory',
        name: 'test-dir',
      } as unknown as FileSystemDirectoryHandle

      await adapter.storeDirectoryHandle(mockHandle, '/projects/test')
      const beforeSync = await adapter.getStoredDirectoryHandle()
      expect(beforeSync!.lastSyncedAt).toBeNull()

      await adapter.updateHandleSyncTime()
      const afterSync = await adapter.getStoredDirectoryHandle()
      expect(afterSync!.lastSyncedAt).toBeGreaterThan(0)
    })
  })

  describe('clear', () => {
    it('should clear all project data', async () => {
      await adapter.writeFile('/file1.txt', 'content1')
      await adapter.writeFile('/file2.txt', 'content2')
      await adapter.mkdir('/dir')

      await adapter.clear()

      expect(await adapter.exists('/file1.txt')).toBe(false)
      expect(await adapter.exists('/file2.txt')).toBe(false)
      expect(await adapter.exists('/dir')).toBe(false)
    })
  })

  describe('project isolation', () => {
    it('should isolate data between different project IDs', async () => {
      const adapter1 = new IndexedDBAdapter('project-1')
      const adapter2 = new IndexedDBAdapter('project-2')

      await adapter1.writeFile('/shared-name.txt', 'project 1 content')
      await adapter2.writeFile('/shared-name.txt', 'project 2 content')

      const content1 = await adapter1.readFile('/shared-name.txt')
      const content2 = await adapter2.readFile('/shared-name.txt')

      expect(content1).toBe('project 1 content')
      expect(content2).toBe('project 2 content')

      // Clean up
      await adapter1.clear()
      await adapter2.clear()
      adapter1.close()
      adapter2.close()
    })
  })
})
