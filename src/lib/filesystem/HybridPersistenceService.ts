/**
 * Hybrid Persistence Service
 *
 * Manages the coordination between IndexedDB storage and File System Access API.
 * Provides automatic reconnection, handle persistence, and sync status tracking.
 */

import { IndexedDBAdapter, isIndexedDBSupported } from './IndexedDBAdapter'
import {
  BrowserFileSystemAdapter,
  isFileSystemAccessSupported,
} from './BrowserFileSystemAdapter'
import type { FileSystemAdapter } from './types'

/** Connection status for the hybrid persistence layer */
export type ConnectionStatus =
  | 'disconnected' // No file system connection
  | 'connecting' // Attempting to connect
  | 'connected' // Connected to file system
  | 'reconnecting' // Trying to restore previous connection
  | 'permission-needed' // Have stored handle but need permission

/** Sync status for data synchronization */
export type SyncStatus =
  | 'idle' // No sync in progress
  | 'syncing' // Currently syncing
  | 'synced' // All changes synced
  | 'error' // Sync failed
  | 'offline' // Working offline (IndexedDB only)

/** Event types for the persistence service */
export type PersistenceEvent =
  | { type: 'connection-changed'; status: ConnectionStatus }
  | { type: 'sync-changed'; status: SyncStatus }
  | { type: 'permission-request'; handle: FileSystemDirectoryHandle }
  | { type: 'error'; message: string }

/** Callback type for persistence events */
export type PersistenceEventCallback = (event: PersistenceEvent) => void

/**
 * Service that coordinates between IndexedDB and File System Access API
 */
export class HybridPersistenceService {
  private indexedDBAdapter: IndexedDBAdapter | null = null
  private fileSystemAdapter: BrowserFileSystemAdapter | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private syncStatus: SyncStatus = 'idle'
  private listeners: Set<PersistenceEventCallback> = new Set()
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * Initialize the service - creates IndexedDB adapter and checks for stored handle
   */
  async initialize(): Promise<void> {
    if (!isIndexedDBSupported()) {
      this.emitEvent({ type: 'error', message: 'IndexedDB is not supported' })
      return
    }

    this.indexedDBAdapter = new IndexedDBAdapter(this.projectId)

    // Check if we have a stored directory handle
    const stored = await this.indexedDBAdapter.getStoredDirectoryHandle()
    if (stored) {
      this.connectionStatus = 'reconnecting'
      this.emitEvent({
        type: 'connection-changed',
        status: 'reconnecting',
      })

      // Try to reconnect
      const reconnected = await this.tryReconnect()
      if (!reconnected) {
        this.connectionStatus = 'permission-needed'
        this.emitEvent({
          type: 'connection-changed',
          status: 'permission-needed',
        })
        this.emitEvent({
          type: 'permission-request',
          handle: stored.handle,
        })
      }
    } else {
      this.syncStatus = 'offline'
      this.emitEvent({ type: 'sync-changed', status: 'offline' })
    }
  }

  /**
   * Try to reconnect to a stored directory handle
   */
  private async tryReconnect(): Promise<boolean> {
    if (!this.indexedDBAdapter) return false

    const stored = await this.indexedDBAdapter.getStoredDirectoryHandle()
    if (!stored) return false

    try {
      // Check current permission state
      const permission = await stored.handle.queryPermission({
        mode: 'readwrite',
      })

      if (permission === 'granted') {
        // Permission already granted - reconnect
        this.fileSystemAdapter = new BrowserFileSystemAdapter()
        this.fileSystemAdapter.setRootFromHandle(stored.handle)

        this.connectionStatus = 'connected'
        this.syncStatus = 'synced'
        this.emitEvent({ type: 'connection-changed', status: 'connected' })
        this.emitEvent({ type: 'sync-changed', status: 'synced' })
        return true
      }

      // Permission not granted - will need user interaction
      return false
    } catch (error) {
      // Handle may be invalid (e.g., after browser update)
      console.warn('[HybridPersistenceService] Reconnection failed:', error)
      this.emitEvent({
        type: 'error',
        message: `Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      return false
    }
  }

  /**
   * Request permission for a stored or provided directory handle
   * Must be called in response to user gesture
   */
  async requestPermission(
    handle?: FileSystemDirectoryHandle
  ): Promise<boolean> {
    const targetHandle =
      handle ??
      (await this.indexedDBAdapter?.getStoredDirectoryHandle())?.handle

    if (!targetHandle) return false

    try {
      const permission = await targetHandle.requestPermission({
        mode: 'readwrite',
      })

      if (permission === 'granted') {
        this.fileSystemAdapter = new BrowserFileSystemAdapter()
        this.fileSystemAdapter.setRootFromHandle(targetHandle)

        this.connectionStatus = 'connected'
        this.syncStatus = 'synced'
        this.emitEvent({ type: 'connection-changed', status: 'connected' })
        this.emitEvent({ type: 'sync-changed', status: 'synced' })
        return true
      }

      return false
    } catch (error) {
      console.warn(
        '[HybridPersistenceService] Permission request failed:',
        error
      )
      this.emitEvent({
        type: 'error',
        message:
          error instanceof Error
            ? `Permission denied: ${error.message}`
            : 'Failed to request permission',
      })
      return false
    }
  }

  /**
   * Connect to a new directory (user selects folder)
   */
  async connectToDirectory(): Promise<boolean> {
    if (!isFileSystemAccessSupported()) {
      this.emitEvent({
        type: 'error',
        message: 'File System Access API is not supported',
      })
      return false
    }

    this.connectionStatus = 'connecting'
    this.emitEvent({ type: 'connection-changed', status: 'connecting' })

    try {
      this.fileSystemAdapter = new BrowserFileSystemAdapter()
      await this.fileSystemAdapter.requestDirectoryAccess()

      const rootHandle = this.fileSystemAdapter.getRootHandle()
      if (rootHandle && this.indexedDBAdapter) {
        // Store the handle for future reconnection
        const rootPath = this.fileSystemAdapter.getRootPath()
        await this.indexedDBAdapter.storeDirectoryHandle(
          rootHandle,
          rootPath ?? undefined
        )
      }

      this.connectionStatus = 'connected'
      this.syncStatus = 'synced'
      this.emitEvent({ type: 'connection-changed', status: 'connected' })
      this.emitEvent({ type: 'sync-changed', status: 'synced' })
      return true
    } catch (error) {
      this.connectionStatus = 'disconnected'
      this.emitEvent({ type: 'connection-changed', status: 'disconnected' })
      this.emitEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect',
      })
      return false
    }
  }

  /**
   * Disconnect from file system and optionally clear stored handle
   */
  async disconnect(clearStoredHandle = false): Promise<void> {
    if (clearStoredHandle && this.indexedDBAdapter) {
      await this.indexedDBAdapter.clearDirectoryHandle()
    }

    this.fileSystemAdapter = null
    this.connectionStatus = 'disconnected'
    this.syncStatus = 'offline'
    this.emitEvent({ type: 'connection-changed', status: 'disconnected' })
    this.emitEvent({ type: 'sync-changed', status: 'offline' })
  }

  /**
   * Get the appropriate adapter based on connection status
   * Returns IndexedDB adapter if disconnected, file system adapter if connected
   */
  getAdapter(): FileSystemAdapter | null {
    if (this.connectionStatus === 'connected' && this.fileSystemAdapter) {
      return this.fileSystemAdapter
    }
    return this.indexedDBAdapter
  }

  /**
   * Get the IndexedDB adapter (always available if initialized)
   */
  getIndexedDBAdapter(): IndexedDBAdapter | null {
    return this.indexedDBAdapter
  }

  /**
   * Get the File System adapter (only available when connected)
   */
  getFileSystemAdapter(): BrowserFileSystemAdapter | null {
    return this.fileSystemAdapter
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus
  }

  /**
   * Check if we have a stored handle that needs permission
   */
  async hasStoredHandle(): Promise<boolean> {
    if (!this.indexedDBAdapter) return false
    const stored = await this.indexedDBAdapter.getStoredDirectoryHandle()
    return stored !== null
  }

  /**
   * Subscribe to persistence events
   */
  subscribe(callback: PersistenceEventCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: PersistenceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in persistence event listener:', error)
      }
    }
  }

  /**
   * Clean up resources
   */
  close(): void {
    this.indexedDBAdapter?.close()
    this.indexedDBAdapter = null
    this.fileSystemAdapter = null
    this.listeners.clear()
  }
}

/**
 * Check if hybrid persistence is available (IndexedDB supported)
 */
export function isHybridPersistenceSupported(): boolean {
  return isIndexedDBSupported()
}
