/**
 * SyncService Tests
 *
 * Tests for the bidirectional sync service between IndexedDB and file system.
 * Uses fake-indexeddb and MemoryFileSystemAdapter for isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncService } from './SyncService'
import type { SyncMode, SyncEvent } from './SyncService'
import { IndexedDBAdapter } from './IndexedDBAdapter'
import { MemoryFileSystemAdapter } from './MemoryFileSystemAdapter'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

describe('SyncService', () => {
  let syncService: SyncService
  let indexedDBAdapter: IndexedDBAdapter
  let memoryAdapter: MemoryFileSystemAdapter
  let projectId: string

  beforeEach(async () => {
    // Create unique project ID for test isolation
    projectId = `test-${Date.now()}-${Math.random()}`
    indexedDBAdapter = new IndexedDBAdapter(projectId)
    memoryAdapter = new MemoryFileSystemAdapter()
    syncService = new SyncService(indexedDBAdapter)
  })

  afterEach(async () => {
    syncService.disconnect()
    await indexedDBAdapter.clear()
    indexedDBAdapter.close()
  })

  describe('connection management', () => {
    it('should start in disconnected mode', () => {
      expect(syncService.getMode()).toBe('disconnected')
      expect(syncService.isConnected()).toBe(false)
    })

    it('should connect to file system adapter', () => {
      syncService.connect(memoryAdapter)
      expect(syncService.getMode()).toBe('idle')
      expect(syncService.isConnected()).toBe(true)
    })

    it('should disconnect from file system adapter', () => {
      syncService.connect(memoryAdapter)
      syncService.disconnect()
      expect(syncService.getMode()).toBe('disconnected')
      expect(syncService.isConnected()).toBe(false)
    })

    it('should emit mode-changed event on connect', () => {
      const events: SyncEvent[] = []
      syncService.subscribe((event) => events.push(event))

      syncService.connect(memoryAdapter)

      expect(events).toContainEqual({ type: 'mode-changed', mode: 'idle' })
    })

    it('should emit mode-changed event on disconnect', () => {
      syncService.connect(memoryAdapter)

      const events: SyncEvent[] = []
      syncService.subscribe((event) => events.push(event))

      syncService.disconnect()

      expect(events).toContainEqual({
        type: 'mode-changed',
        mode: 'disconnected',
      })
    })
  })

  describe('subscribe', () => {
    it('should allow subscribing to events', () => {
      const events: SyncEvent[] = []
      const unsubscribe = syncService.subscribe((event) => events.push(event))

      syncService.connect(memoryAdapter)

      expect(events.length).toBeGreaterThan(0)
      unsubscribe()
    })

    it('should allow unsubscribing from events', () => {
      const events: SyncEvent[] = []
      const unsubscribe = syncService.subscribe((event) => events.push(event))

      syncService.connect(memoryAdapter)
      const countAfterConnect = events.length

      unsubscribe()
      syncService.disconnect()

      // Should not receive disconnect event
      expect(events.length).toBe(countAfterConnect)
    })

    it('should handle errors in event listeners gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      syncService.subscribe(() => {
        throw new Error('Listener error')
      })

      // Should not throw
      expect(() => syncService.connect(memoryAdapter)).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('syncToFileSystem', () => {
    it('should return error when not connected', async () => {
      const result = await syncService.syncToFileSystem()

      expect(result.success).toBe(false)
      expect(result.failedNodes[0].error).toBe('Not connected to file system')
    })

    it('should return error when sync is already in progress', async () => {
      syncService.connect(memoryAdapter)

      // Write a file to IndexedDB to make it dirty
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      // Start first sync (don't await)
      const firstSync = syncService.syncToFileSystem()

      // Try to start second sync immediately
      const secondResult = await syncService.syncToFileSystem()

      expect(secondResult.success).toBe(false)
      expect(secondResult.failedNodes[0].error).toBe('Sync already in progress')

      // Clean up first sync
      await firstSync
    })

    it('should sync dirty files to file system', async () => {
      syncService.connect(memoryAdapter)

      // Write files to IndexedDB
      await indexedDBAdapter.writeFile(
        '/tasks/task1.md',
        '---\ntype: task\n---'
      )
      await indexedDBAdapter.writeFile(
        '/notes/note1.md',
        '---\ntype: note\n---'
      )

      const result = await syncService.syncToFileSystem()

      expect(result.success).toBe(true)
      expect(result.syncedNodes.length).toBe(2)

      // Verify files exist in memory adapter
      const task1 = await memoryAdapter.readFile('/tasks/task1.md')
      expect(task1).toBe('---\ntype: task\n---')

      const note1 = await memoryAdapter.readFile('/notes/note1.md')
      expect(note1).toBe('---\ntype: note\n---')
    })

    it('should filter to specific paths when provided', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'task1')
      await indexedDBAdapter.writeFile('/tasks/task2.md', 'task2')
      await indexedDBAdapter.writeFile('/notes/note1.md', 'note1')

      const result = await syncService.syncToFileSystem({
        paths: ['/tasks/task1.md'],
      })

      expect(result.success).toBe(true)
      expect(result.syncedNodes.length).toBe(1)
      expect(result.syncedNodes[0].path).toBe('/tasks/task1.md')
    })

    it('should emit progress events during sync', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'task1')
      await indexedDBAdapter.writeFile('/tasks/task2.md', 'task2')

      const progressEvents: SyncEvent[] = []
      syncService.subscribe((event) => {
        if (event.type === 'sync-progress') {
          progressEvents.push(event)
        }
      })

      await syncService.syncToFileSystem()

      expect(progressEvents.length).toBe(2)
      expect(progressEvents[0]).toMatchObject({
        type: 'sync-progress',
        current: 1,
        total: 2,
      })
    })

    it('should emit sync-started and sync-completed events', async () => {
      syncService.connect(memoryAdapter)

      const events: SyncEvent[] = []
      syncService.subscribe((event) => events.push(event))

      await syncService.syncToFileSystem()

      const types = events.map((e) => e.type)
      expect(types).toContain('sync-started')
      expect(types).toContain('sync-completed')
    })

    it('should mark files as synced after successful sync', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      // Verify file is dirty before sync
      const dirtyBefore = await indexedDBAdapter.getDirtyFiles()
      expect(dirtyBefore).toContain('/tasks/task1.md')

      await syncService.syncToFileSystem()

      // Verify file is no longer dirty after sync
      const dirtyAfter = await indexedDBAdapter.getDirtyFiles()
      expect(dirtyAfter).not.toContain('/tasks/task1.md')
    })

    it('should continue on error when option is set', async () => {
      syncService.connect(memoryAdapter)

      // Create a scenario where one file will fail
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'task1')
      await indexedDBAdapter.writeFile('/tasks/task2.md', 'task2')

      // Mock writeFile to fail for task1
      const originalWrite = memoryAdapter.writeFile.bind(memoryAdapter)
      vi.spyOn(memoryAdapter, 'writeFile').mockImplementation(
        async (path, content) => {
          if (path === '/tasks/task1.md') {
            throw new Error('Write failed')
          }
          return originalWrite(path, content)
        }
      )

      const result = await syncService.syncToFileSystem({
        continueOnError: true,
      })

      expect(result.success).toBe(false)
      expect(result.failedNodes.length).toBe(1)
      expect(result.syncedNodes.length).toBe(1)
      expect(result.syncedNodes[0].path).toBe('/tasks/task2.md')
    })

    it('should stop on first error when continueOnError is false', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'task1')
      await indexedDBAdapter.writeFile('/tasks/task2.md', 'task2')

      // Mock writeFile to always fail
      vi.spyOn(memoryAdapter, 'writeFile').mockRejectedValue(
        new Error('Write failed')
      )

      const result = await syncService.syncToFileSystem({
        continueOnError: false,
      })

      expect(result.success).toBe(false)
      expect(result.failedNodes.length).toBe(1)
      expect(result.syncedNodes.length).toBe(0)
    })

    it('should update last sync result', async () => {
      syncService.connect(memoryAdapter)

      expect(syncService.getLastSyncResult()).toBeNull()

      await syncService.syncToFileSystem()

      const lastResult = syncService.getLastSyncResult()
      expect(lastResult).not.toBeNull()
      expect(lastResult?.completedAt).toBeGreaterThan(0)
    })
  })

  describe('syncFromFileSystem', () => {
    beforeEach(async () => {
      // Set up memory adapter with root path
      await memoryAdapter.mkdir('/project')
      // Set root path by writing and reading
      await memoryAdapter.writeFile('/project/test.txt', 'test')
    })

    it('should return error when not connected', async () => {
      const result = await syncService.syncFromFileSystem()

      expect(result.success).toBe(false)
      expect(result.failedNodes[0].error).toBe('Not connected to file system')
    })

    it('should sync markdown files from file system to IndexedDB', async () => {
      // Create files in memory adapter
      await memoryAdapter.writeFile(
        '/project/tasks/task1.md',
        '---\ntype: task\n---'
      )
      await memoryAdapter.writeFile(
        '/project/notes/note1.md',
        '---\ntype: note\n---'
      )
      // Non-markdown file should be ignored
      await memoryAdapter.writeFile('/project/config.json', '{}')

      syncService.connect(memoryAdapter)
      const result = await syncService.syncFromFileSystem()

      expect(result.success).toBe(true)
      // Only .md files should be synced
      const syncedPaths = result.syncedNodes.map((n) => n.path)
      expect(syncedPaths).toContain('/project/tasks/task1.md')
      expect(syncedPaths).toContain('/project/notes/note1.md')
      expect(syncedPaths).not.toContain('/project/config.json')
    })

    it('should filter to specific paths when provided', async () => {
      await memoryAdapter.writeFile('/project/tasks/task1.md', 'task1')
      await memoryAdapter.writeFile('/project/tasks/task2.md', 'task2')

      syncService.connect(memoryAdapter)
      const result = await syncService.syncFromFileSystem({
        paths: ['/project/tasks/task1.md'],
      })

      expect(result.success).toBe(true)
      expect(result.syncedNodes.length).toBe(1)
      expect(result.syncedNodes[0].path).toBe('/project/tasks/task1.md')
    })

    it('should emit progress events during sync', async () => {
      await memoryAdapter.writeFile('/project/tasks/task1.md', 'task1')
      await memoryAdapter.writeFile('/project/tasks/task2.md', 'task2')

      syncService.connect(memoryAdapter)

      const progressEvents: SyncEvent[] = []
      syncService.subscribe((event) => {
        if (event.type === 'sync-progress') {
          progressEvents.push(event)
        }
      })

      await syncService.syncFromFileSystem()

      expect(progressEvents.length).toBe(2)
    })

    it('should store content in IndexedDB after sync', async () => {
      await memoryAdapter.writeFile(
        '/project/tasks/task1.md',
        '---\ntype: task\n---\nContent here'
      )

      syncService.connect(memoryAdapter)
      await syncService.syncFromFileSystem()

      // Read from IndexedDB to verify
      const content = await indexedDBAdapter.readFile('/project/tasks/task1.md')
      expect(content).toBe('---\ntype: task\n---\nContent here')
    })
  })

  describe('syncNodeToFileSystem', () => {
    it('should return error when not connected', async () => {
      const result = await syncService.syncNodeToFileSystem('/tasks/task1.md')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not connected to file system')
    })

    it('should sync single node to file system', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'task content')

      const result = await syncService.syncNodeToFileSystem('/tasks/task1.md')

      expect(result.success).toBe(true)
      expect(result.path).toBe('/tasks/task1.md')
      expect(result.direction).toBe('toFileSystem')

      // Verify in file system
      const content = await memoryAdapter.readFile('/tasks/task1.md')
      expect(content).toBe('task content')
    })

    it('should mark node as synced after successful sync', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      await syncService.syncNodeToFileSystem('/tasks/task1.md')

      const dirtyFiles = await indexedDBAdapter.getDirtyFiles()
      expect(dirtyFiles).not.toContain('/tasks/task1.md')
    })

    it('should return error result on failure', async () => {
      syncService.connect(memoryAdapter)

      // Try to sync non-existent file
      const result = await syncService.syncNodeToFileSystem('/nonexistent.md')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('syncNodeFromFileSystem', () => {
    it('should return error when not connected', async () => {
      const result = await syncService.syncNodeFromFileSystem('/tasks/task1.md')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not connected to file system')
    })

    it('should sync single node from file system', async () => {
      await memoryAdapter.writeFile('/tasks/task1.md', 'file system content')

      syncService.connect(memoryAdapter)
      const result = await syncService.syncNodeFromFileSystem('/tasks/task1.md')

      expect(result.success).toBe(true)
      expect(result.path).toBe('/tasks/task1.md')
      expect(result.direction).toBe('fromFileSystem')

      // Verify in IndexedDB
      const content = await indexedDBAdapter.readFile('/tasks/task1.md')
      expect(content).toBe('file system content')
    })

    it('should handle file not found gracefully', async () => {
      syncService.connect(memoryAdapter)

      const result = await syncService.syncNodeFromFileSystem('/nonexistent.md')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('mode transitions', () => {
    it('should transition to syncing during sync', async () => {
      syncService.connect(memoryAdapter)

      const modes: SyncMode[] = []
      syncService.subscribe((event) => {
        if (event.type === 'mode-changed') {
          modes.push(event.mode)
        }
      })

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')
      await syncService.syncToFileSystem()

      expect(modes).toContain('syncing')
    })

    it('should transition to idle after successful sync', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')
      await syncService.syncToFileSystem()

      expect(syncService.getMode()).toBe('idle')
    })

    it('should transition to error after failed sync', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      vi.spyOn(memoryAdapter, 'writeFile').mockRejectedValue(
        new Error('Write failed')
      )

      await syncService.syncToFileSystem()

      expect(syncService.getMode()).toBe('error')
    })
  })

  describe('sync result structure', () => {
    it('should include timing information', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      const result = await syncService.syncToFileSystem()

      expect(result.startedAt).toBeDefined()
      expect(result.completedAt).toBeDefined()
      expect(result.completedAt).toBeGreaterThanOrEqual(result.startedAt)
    })

    it('should include synced and failed nodes', async () => {
      syncService.connect(memoryAdapter)

      const result = await syncService.syncToFileSystem()

      expect(Array.isArray(result.syncedNodes)).toBe(true)
      expect(Array.isArray(result.failedNodes)).toBe(true)
    })

    it('should set correct direction on node results', async () => {
      syncService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'content')

      const result = await syncService.syncToFileSystem()

      for (const node of result.syncedNodes) {
        expect(node.direction).toBe('toFileSystem')
      }
    })
  })
})
