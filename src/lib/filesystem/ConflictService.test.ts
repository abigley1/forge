/**
 * ConflictService Tests
 *
 * Tests for the conflict detection and resolution service.
 * Uses fake-indexeddb and MemoryFileSystemAdapter for isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConflictService } from './ConflictService'
import type { Conflict, ConflictEvent } from './ConflictService'
import { IndexedDBAdapter } from './IndexedDBAdapter'
import { MemoryFileSystemAdapter } from './MemoryFileSystemAdapter'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

describe('ConflictService', () => {
  let conflictService: ConflictService
  let indexedDBAdapter: IndexedDBAdapter
  let memoryAdapter: MemoryFileSystemAdapter
  let projectId: string

  beforeEach(async () => {
    projectId = `test-${Date.now()}-${Math.random()}`
    indexedDBAdapter = new IndexedDBAdapter(projectId)
    memoryAdapter = new MemoryFileSystemAdapter()
    conflictService = new ConflictService(indexedDBAdapter)
  })

  afterEach(async () => {
    conflictService.disconnect()
    await indexedDBAdapter.clear()
    indexedDBAdapter.close()
  })

  describe('connection management', () => {
    it('should start disconnected', () => {
      expect(conflictService.isConnected()).toBe(false)
    })

    it('should connect to file system adapter', () => {
      conflictService.connect(memoryAdapter)
      expect(conflictService.isConnected()).toBe(true)
    })

    it('should disconnect from file system adapter', () => {
      conflictService.connect(memoryAdapter)
      conflictService.disconnect()
      expect(conflictService.isConnected()).toBe(false)
    })
  })

  describe('detectConflicts', () => {
    it('should return error when not connected', async () => {
      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Not connected to file system')
    })

    it('should detect no conflicts when no dirty files exist', async () => {
      conflictService.connect(memoryAdapter)

      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should detect no conflict when file is dirty but not externally modified', async () => {
      conflictService.connect(memoryAdapter)

      // Write file to IndexedDB (makes it dirty)
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local content')

      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should detect conflict when file is dirty AND externally modified', async () => {
      conflictService.connect(memoryAdapter)

      // Write file to IndexedDB (makes it dirty)
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local content')

      // Mark as externally modified
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')

      // Write different content to file system
      await memoryAdapter.writeFile('/tasks/task1.md', 'external content')

      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].path).toBe('/tasks/task1.md')
      expect(result.conflicts[0].localContent).toBe('local content')
      expect(result.conflicts[0].externalContent).toBe('external content')
      expect(result.conflicts[0].status).toBe('pending')
    })

    it('should not detect conflict when contents are identical', async () => {
      conflictService.connect(memoryAdapter)

      // Write same content to both
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'same content')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'same content')

      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should handle externally deleted files as conflict with empty external content', async () => {
      conflictService.connect(memoryAdapter)

      // Write file to IndexedDB only (simulating external deletion)
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local content')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      // Don't write to memoryAdapter - file doesn't exist externally

      const result = await conflictService.detectConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].localContent).toBe('local content')
      expect(result.conflicts[0].externalContent).toBe('')
    })

    it('should detect conflicts only for specified paths', async () => {
      conflictService.connect(memoryAdapter)

      // Set up two potential conflicts
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local 1')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external 1')

      await indexedDBAdapter.writeFile('/tasks/task2.md', 'local 2')
      await indexedDBAdapter.markExternallyModified('/tasks/task2.md')
      await memoryAdapter.writeFile('/tasks/task2.md', 'external 2')

      // Only check task1
      const result = await conflictService.detectConflicts(['/tasks/task1.md'])

      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].path).toBe('/tasks/task1.md')
      expect(result.checkedPaths).toEqual(['/tasks/task1.md'])
    })

    it('should emit conflict-detected event for each conflict', async () => {
      conflictService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external')

      const events: ConflictEvent[] = []
      conflictService.subscribe((event) => events.push(event))

      await conflictService.detectConflicts()

      const conflictEvents = events.filter(
        (e) => e.type === 'conflict-detected'
      )
      expect(conflictEvents).toHaveLength(1)
    })

    it('should emit detection-started and detection-completed events', async () => {
      conflictService.connect(memoryAdapter)

      const events: ConflictEvent[] = []
      conflictService.subscribe((event) => events.push(event))

      await conflictService.detectConflicts(['/test.md'])

      const types = events.map((e) => e.type)
      expect(types).toContain('detection-started')
      expect(types).toContain('detection-completed')
    })
  })

  describe('resolveConflict', () => {
    let conflict: Conflict

    beforeEach(async () => {
      conflictService.connect(memoryAdapter)

      // Set up a conflict
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local content')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external content')

      const result = await conflictService.detectConflicts()
      conflict = result.conflicts[0]
    })

    it('should resolve with keepLocal strategy', async () => {
      const result = await conflictService.resolveConflict(
        conflict.id,
        'keepLocal'
      )

      expect(result.success).toBe(true)
      expect(result.conflict.status).toBe('resolved')
      expect(result.conflict.resolution).toBe('keepLocal')

      // File system should have local content
      const fsContent = await memoryAdapter.readFile('/tasks/task1.md')
      expect(fsContent).toBe('local content')
    })

    it('should resolve with keepExternal strategy', async () => {
      const result = await conflictService.resolveConflict(
        conflict.id,
        'keepExternal'
      )

      expect(result.success).toBe(true)
      expect(result.conflict.status).toBe('resolved')
      expect(result.conflict.resolution).toBe('keepExternal')

      // IndexedDB should have external content
      const idbContent = await indexedDBAdapter.readFile('/tasks/task1.md')
      expect(idbContent).toBe('external content')
    })

    it('should resolve with merge strategy and custom content', async () => {
      const mergedContent = 'merged content combining both'

      const result = await conflictService.resolveConflict(
        conflict.id,
        'merge',
        mergedContent
      )

      expect(result.success).toBe(true)
      expect(result.conflict.status).toBe('resolved')
      expect(result.conflict.resolution).toBe('merge')

      // Both should have merged content
      const idbContent = await indexedDBAdapter.readFile('/tasks/task1.md')
      const fsContent = await memoryAdapter.readFile('/tasks/task1.md')
      expect(idbContent).toBe(mergedContent)
      expect(fsContent).toBe(mergedContent)
    })

    it('should fail merge without merged content', async () => {
      const result = await conflictService.resolveConflict(conflict.id, 'merge')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Merged content required for merge resolution')
    })

    it('should return error for non-existent conflict', async () => {
      const result = await conflictService.resolveConflict(
        'non-existent-id',
        'keepLocal'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Conflict not found')
    })

    it('should remove conflict from pending after resolution', async () => {
      await conflictService.resolveConflict(conflict.id, 'keepLocal')

      const pending = conflictService.getPendingConflicts()
      expect(pending).toHaveLength(0)
    })

    it('should add resolution to history', async () => {
      await conflictService.resolveConflict(conflict.id, 'keepLocal')

      const history = conflictService.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].conflictId).toBe(conflict.id)
      expect(history[0].resolution).toBe('keepLocal')
    })

    it('should emit conflict-resolved event', async () => {
      const events: ConflictEvent[] = []
      conflictService.subscribe((event) => events.push(event))

      await conflictService.resolveConflict(conflict.id, 'keepLocal')

      const resolvedEvents = events.filter(
        (e) => e.type === 'conflict-resolved'
      )
      expect(resolvedEvents).toHaveLength(1)
    })
  })

  describe('resolveAllConflicts', () => {
    beforeEach(async () => {
      conflictService.connect(memoryAdapter)

      // Set up multiple conflicts
      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local 1')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external 1')

      await indexedDBAdapter.writeFile('/tasks/task2.md', 'local 2')
      await indexedDBAdapter.markExternallyModified('/tasks/task2.md')
      await memoryAdapter.writeFile('/tasks/task2.md', 'external 2')

      await conflictService.detectConflicts()
    })

    it('should resolve all conflicts with keepLocal', async () => {
      const results = await conflictService.resolveAllConflicts('keepLocal')

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.success)).toBe(true)
      expect(conflictService.getPendingConflicts()).toHaveLength(0)
    })

    it('should resolve all conflicts with keepExternal', async () => {
      const results = await conflictService.resolveAllConflicts('keepExternal')

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it('should not auto-resolve with merge strategy', async () => {
      const results = await conflictService.resolveAllConflicts('merge')

      expect(results).toHaveLength(2)
      expect(results.every((r) => !r.success)).toBe(true)
      expect(results[0].error).toBe('Cannot auto-resolve with merge strategy')
    })
  })

  describe('skipConflict', () => {
    it('should mark conflict as skipped and remove from pending', async () => {
      conflictService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external')

      const result = await conflictService.detectConflicts()
      const conflict = result.conflicts[0]

      const skipped = conflictService.skipConflict(conflict.id)

      expect(skipped).toBe(true)
      expect(conflictService.getPendingConflicts()).toHaveLength(0)
    })

    it('should return false for non-existent conflict', () => {
      const skipped = conflictService.skipConflict('non-existent')
      expect(skipped).toBe(false)
    })
  })

  describe('history management', () => {
    it('should maintain history of resolved conflicts', async () => {
      conflictService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external')

      const result = await conflictService.detectConflicts()
      await conflictService.resolveConflict(result.conflicts[0].id, 'keepLocal')

      const history = conflictService.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].path).toBe('/tasks/task1.md')
    })

    it('should clear history', async () => {
      conflictService.connect(memoryAdapter)

      await indexedDBAdapter.writeFile('/tasks/task1.md', 'local')
      await indexedDBAdapter.markExternallyModified('/tasks/task1.md')
      await memoryAdapter.writeFile('/tasks/task1.md', 'external')

      const result = await conflictService.detectConflicts()
      await conflictService.resolveConflict(result.conflicts[0].id, 'keepLocal')

      conflictService.clearHistory()

      expect(conflictService.getHistory()).toHaveLength(0)
    })
  })

  describe('subscribe', () => {
    it('should allow subscribing to events', async () => {
      conflictService.connect(memoryAdapter)

      const events: ConflictEvent[] = []
      conflictService.subscribe((event) => events.push(event))

      await conflictService.detectConflicts(['/test.md'])

      expect(events.length).toBeGreaterThan(0)
    })

    it('should allow unsubscribing from events', async () => {
      conflictService.connect(memoryAdapter)

      const events: ConflictEvent[] = []
      const unsubscribe = conflictService.subscribe((event) =>
        events.push(event)
      )

      await conflictService.detectConflicts(['/test1.md'])
      const countBefore = events.length

      unsubscribe()
      await conflictService.detectConflicts(['/test2.md'])

      expect(events.length).toBe(countBefore)
    })

    it('should handle errors in event listeners gracefully', async () => {
      conflictService.connect(memoryAdapter)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      conflictService.subscribe(() => {
        throw new Error('Listener error')
      })

      // Should not throw
      await expect(
        conflictService.detectConflicts(['/test.md'])
      ).resolves.toBeDefined()

      consoleSpy.mockRestore()
    })
  })
})
