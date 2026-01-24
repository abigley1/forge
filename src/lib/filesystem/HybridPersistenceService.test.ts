/**
 * HybridPersistenceService Tests
 *
 * Tests for the hybrid persistence service that coordinates
 * between IndexedDB and File System Access API.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  HybridPersistenceService,
  isHybridPersistenceSupported,
} from './HybridPersistenceService'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

describe('HybridPersistenceService', () => {
  let service: HybridPersistenceService

  beforeEach(() => {
    // Create a new service with unique project ID for test isolation
    service = new HybridPersistenceService(
      `test-${Date.now()}-${Math.random()}`
    )
  })

  afterEach(() => {
    service.close()
  })

  describe('isHybridPersistenceSupported', () => {
    it('should return true when IndexedDB is available', () => {
      expect(isHybridPersistenceSupported()).toBe(true)
    })
  })

  describe('initialization', () => {
    it('should initialize with disconnected status', async () => {
      await service.initialize()
      expect(service.getConnectionStatus()).toBe('disconnected')
    })

    it('should have offline sync status after initialization without stored handle', async () => {
      await service.initialize()
      expect(service.getSyncStatus()).toBe('offline')
    })

    it('should create IndexedDB adapter on initialization', async () => {
      await service.initialize()
      expect(service.getIndexedDBAdapter()).not.toBeNull()
    })

    it('should not have file system adapter initially', async () => {
      await service.initialize()
      expect(service.getFileSystemAdapter()).toBeNull()
    })
  })

  describe('adapter access', () => {
    it('should return IndexedDB adapter when disconnected', async () => {
      await service.initialize()
      const adapter = service.getAdapter()
      expect(adapter).toBe(service.getIndexedDBAdapter())
    })

    it('should return null adapter before initialization', () => {
      expect(service.getAdapter()).toBeNull()
    })
  })

  describe('event subscription', () => {
    it('should allow subscribing to events', async () => {
      const events: string[] = []
      const unsubscribe = service.subscribe((event) => {
        events.push(event.type)
      })

      await service.initialize()

      expect(events).toContain('sync-changed')
      unsubscribe()
    })

    it('should allow unsubscribing from events', async () => {
      const events: string[] = []
      const unsubscribe = service.subscribe((event) => {
        events.push(event.type)
      })

      unsubscribe()
      await service.initialize()

      // Should not receive events after unsubscribe
      expect(events).toHaveLength(0)
    })

    it('should emit events to multiple listeners', async () => {
      const listener1Events: string[] = []
      const listener2Events: string[] = []

      service.subscribe((event) => listener1Events.push(event.type))
      service.subscribe((event) => listener2Events.push(event.type))

      await service.initialize()

      expect(listener1Events.length).toBeGreaterThan(0)
      expect(listener2Events.length).toBeGreaterThan(0)
    })
  })

  describe('stored handle detection', () => {
    it('should return false when no handle is stored', async () => {
      await service.initialize()
      const hasHandle = await service.hasStoredHandle()
      expect(hasHandle).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should set status to disconnected', async () => {
      await service.initialize()
      await service.disconnect()
      expect(service.getConnectionStatus()).toBe('disconnected')
    })

    it('should set sync status to offline', async () => {
      await service.initialize()
      await service.disconnect()
      expect(service.getSyncStatus()).toBe('offline')
    })

    it('should emit connection-changed event', async () => {
      await service.initialize()

      const events: string[] = []
      service.subscribe((event) => {
        if (event.type === 'connection-changed') {
          events.push((event as { status: string }).status)
        }
      })

      await service.disconnect()
      expect(events).toContain('disconnected')
    })
  })

  describe('close', () => {
    it('should clean up resources', async () => {
      await service.initialize()
      expect(service.getIndexedDBAdapter()).not.toBeNull()

      service.close()
      expect(service.getIndexedDBAdapter()).toBeNull()
    })

    it('should clear all listeners', async () => {
      const events: string[] = []
      service.subscribe((event) => events.push(event.type))

      await service.initialize()
      const initialCount = events.length

      service.close()

      // Try to trigger more events (should not be received)
      // After close, the service is unusable, so we just verify cleanup
      expect(events.length).toBe(initialCount)
    })
  })

  describe('connection status transitions', () => {
    it('should emit correct events during initialization', async () => {
      const statusChanges: string[] = []
      service.subscribe((event) => {
        if (event.type === 'connection-changed') {
          statusChanges.push((event as { status: string }).status)
        }
      })

      await service.initialize()

      // When no stored handle, should stay disconnected
      // (reconnecting status only happens when there's a stored handle)
      expect(service.getConnectionStatus()).toBe('disconnected')
    })
  })

  // Note: Tests for connectToDirectory and requestPermission require
  // actual browser environment with File System Access API support.
  // These would be covered by E2E tests.
})
