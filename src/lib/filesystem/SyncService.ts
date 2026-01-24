/**
 * Sync Service
 *
 * Manages bidirectional synchronization between IndexedDB and the file system.
 * Provides atomic sync operations and observable state for UI binding.
 */

import type { FileSystemAdapter, FileEntry } from './types'
import type { IndexedDBAdapter } from './IndexedDBAdapter'
import { FileNotFoundError } from './types'

/**
 * Normalize any error value to a useful string message.
 * Handles Error instances, DOMException, string throws, and objects with message property.
 */
function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    // Handle DOMException and similar objects
    if ('name' in error && 'message' in error) {
      return `${(error as { name: string }).name}: ${(error as { message: string }).message}`
    }
    if ('message' in error) {
      return String((error as { message: unknown }).message)
    }
  }
  if (typeof error === 'string') {
    return error
  }
  return `Unknown error (${typeof error})`
}

/** Sync operation modes */
export type SyncMode = 'idle' | 'syncing' | 'error' | 'disconnected'

/** Sync direction */
export type SyncDirection = 'toFileSystem' | 'fromFileSystem' | 'bidirectional'

/** Result of a sync operation for a single node */
export interface SyncNodeResult {
  path: string
  success: boolean
  error?: string
  direction: SyncDirection
}

/** Result of a full sync operation */
export interface SyncResult {
  success: boolean
  mode: SyncMode
  syncedNodes: SyncNodeResult[]
  failedNodes: SyncNodeResult[]
  startedAt: number
  completedAt: number
}

/** Sync event types */
export type SyncEvent =
  | { type: 'sync-started'; direction: SyncDirection }
  | { type: 'sync-completed'; result: SyncResult }
  | { type: 'sync-progress'; current: number; total: number; path: string }
  | { type: 'sync-error'; message: string; path?: string }
  | { type: 'mode-changed'; mode: SyncMode }

/** Callback type for sync events */
export type SyncEventCallback = (event: SyncEvent) => void

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Only sync specific paths */
  paths?: string[]
  /** Skip files that haven't changed since last sync */
  skipUnchanged?: boolean
  /** Continue on error instead of aborting */
  continueOnError?: boolean
}

/**
 * Service that manages bidirectional sync between IndexedDB and file system
 */
export class SyncService {
  private indexedDBAdapter: IndexedDBAdapter
  private fileSystemAdapter: FileSystemAdapter | null = null
  private mode: SyncMode = 'disconnected'
  private listeners: Set<SyncEventCallback> = new Set()
  private lastSyncResult: SyncResult | null = null
  private isSyncing = false

  constructor(indexedDBAdapter: IndexedDBAdapter) {
    this.indexedDBAdapter = indexedDBAdapter
  }

  /**
   * Connect to a file system adapter for syncing
   */
  connect(fileSystemAdapter: FileSystemAdapter): void {
    this.fileSystemAdapter = fileSystemAdapter
    this.mode = 'idle'
    this.emitEvent({ type: 'mode-changed', mode: 'idle' })
  }

  /**
   * Disconnect from file system
   */
  disconnect(): void {
    this.fileSystemAdapter = null
    this.mode = 'disconnected'
    this.emitEvent({ type: 'mode-changed', mode: 'disconnected' })
  }

  /**
   * Check if connected to a file system
   */
  isConnected(): boolean {
    return this.fileSystemAdapter !== null
  }

  /**
   * Get current sync mode
   */
  getMode(): SyncMode {
    return this.mode
  }

  /**
   * Get last sync result
   */
  getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult
  }

  /**
   * Sync data from IndexedDB to file system
   * Writes all dirty nodes to the file system
   */
  async syncToFileSystem(options: SyncOptions = {}): Promise<SyncResult> {
    if (!this.fileSystemAdapter) {
      return this.createErrorResult(
        'Not connected to file system',
        'toFileSystem'
      )
    }

    if (this.isSyncing) {
      return this.createErrorResult('Sync already in progress', 'toFileSystem')
    }

    this.isSyncing = true
    this.mode = 'syncing'
    this.emitEvent({ type: 'mode-changed', mode: 'syncing' })
    this.emitEvent({ type: 'sync-started', direction: 'toFileSystem' })

    const startedAt = Date.now()
    const syncedNodes: SyncNodeResult[] = []
    const failedNodes: SyncNodeResult[] = []

    try {
      // Get dirty files from IndexedDB
      let dirtyPaths = await this.indexedDBAdapter.getDirtyFiles()

      // Filter to specific paths if provided
      if (options.paths && options.paths.length > 0) {
        const pathSet = new Set(options.paths)
        dirtyPaths = dirtyPaths.filter((p) => pathSet.has(p))
      }

      const total = dirtyPaths.length

      for (let i = 0; i < dirtyPaths.length; i++) {
        const path = dirtyPaths[i]
        this.emitEvent({
          type: 'sync-progress',
          current: i + 1,
          total,
          path,
        })

        try {
          // Read from IndexedDB
          const content = await this.indexedDBAdapter.readFile(path)

          // Write to file system (atomic per node)
          await this.fileSystemAdapter.writeFile(path, content)

          // Mark as synced in IndexedDB
          await this.indexedDBAdapter.markSynced(path)

          syncedNodes.push({
            path,
            success: true,
            direction: 'toFileSystem',
          })
        } catch (error) {
          const errorMessage = normalizeError(error)

          failedNodes.push({
            path,
            success: false,
            error: errorMessage,
            direction: 'toFileSystem',
          })

          this.emitEvent({
            type: 'sync-error',
            message: `Failed to sync ${path}: ${errorMessage}`,
            path,
          })

          if (!options.continueOnError) {
            break
          }
        }
      }

      // Update handle sync time if we synced anything
      // Wrap in try-catch to avoid failing a successful sync due to metadata update
      if (syncedNodes.length > 0) {
        try {
          await this.indexedDBAdapter.updateHandleSyncTime()
        } catch (error) {
          console.warn(
            '[SyncService] Failed to update sync timestamp:',
            normalizeError(error)
          )
        }
      }

      const result: SyncResult = {
        success: failedNodes.length === 0,
        mode: failedNodes.length === 0 ? 'idle' : 'error',
        syncedNodes,
        failedNodes,
        startedAt,
        completedAt: Date.now(),
      }

      this.lastSyncResult = result
      this.mode = result.mode
      this.emitEvent({ type: 'mode-changed', mode: result.mode })
      this.emitEvent({ type: 'sync-completed', result })

      return result
    } catch (error) {
      const errorMessage = normalizeError(error)
      const result = this.createErrorResult(errorMessage, 'toFileSystem')
      result.startedAt = startedAt
      this.lastSyncResult = result
      return result
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync data from file system to IndexedDB
   * Reads all files from file system and stores in IndexedDB
   */
  async syncFromFileSystem(options: SyncOptions = {}): Promise<SyncResult> {
    if (!this.fileSystemAdapter) {
      return this.createErrorResult(
        'Not connected to file system',
        'fromFileSystem'
      )
    }

    if (this.isSyncing) {
      return this.createErrorResult(
        'Sync already in progress',
        'fromFileSystem'
      )
    }

    this.isSyncing = true
    this.mode = 'syncing'
    this.emitEvent({ type: 'mode-changed', mode: 'syncing' })
    this.emitEvent({ type: 'sync-started', direction: 'fromFileSystem' })

    const startedAt = Date.now()
    const syncedNodes: SyncNodeResult[] = []
    const failedNodes: SyncNodeResult[] = []

    try {
      // Get all files from file system
      const rootPath = this.fileSystemAdapter.getRootPath()
      if (!rootPath) {
        return this.createErrorResult(
          'File system has no root path',
          'fromFileSystem'
        )
      }

      const allFiles = await this.getAllFilesRecursive(
        this.fileSystemAdapter,
        rootPath
      )

      // Filter to specific paths if provided
      let filesToSync = allFiles
      if (options.paths && options.paths.length > 0) {
        const pathSet = new Set(options.paths)
        filesToSync = allFiles.filter((f) => pathSet.has(f.path))
      }

      // Filter to only .md files (Forge node files)
      filesToSync = filesToSync.filter((f) => f.path.endsWith('.md'))

      const total = filesToSync.length

      for (let i = 0; i < filesToSync.length; i++) {
        const file = filesToSync[i]
        this.emitEvent({
          type: 'sync-progress',
          current: i + 1,
          total,
          path: file.path,
        })

        try {
          // Check if we should skip unchanged files
          if (options.skipUnchanged) {
            const isDirty = await this.indexedDBAdapter.isDirty(file.path)
            const isExternal = await this.indexedDBAdapter.isExternallyModified(
              file.path
            )
            if (!isDirty && !isExternal) {
              // Check if file exists in IndexedDB
              const exists = await this.indexedDBAdapter.exists(file.path)
              if (exists) {
                continue // Skip unchanged file
              }
            }
          }

          // Read from file system
          const content = await this.fileSystemAdapter.readFile(file.path)

          // Write to IndexedDB (atomic per node)
          await this.indexedDBAdapter.writeFile(file.path, content)

          // Mark as synced (not dirty, not externally modified)
          await this.indexedDBAdapter.markSynced(file.path)

          syncedNodes.push({
            path: file.path,
            success: true,
            direction: 'fromFileSystem',
          })
        } catch (error) {
          const errorMessage = normalizeError(error)

          failedNodes.push({
            path: file.path,
            success: false,
            error: errorMessage,
            direction: 'fromFileSystem',
          })

          this.emitEvent({
            type: 'sync-error',
            message: `Failed to sync ${file.path}: ${errorMessage}`,
            path: file.path,
          })

          if (!options.continueOnError) {
            break
          }
        }
      }

      // Update handle sync time if we synced anything
      // Wrap in try-catch to avoid failing a successful sync due to metadata update
      if (syncedNodes.length > 0) {
        try {
          await this.indexedDBAdapter.updateHandleSyncTime()
        } catch (error) {
          console.warn(
            '[SyncService] Failed to update sync timestamp:',
            normalizeError(error)
          )
        }
      }

      const result: SyncResult = {
        success: failedNodes.length === 0,
        mode: failedNodes.length === 0 ? 'idle' : 'error',
        syncedNodes,
        failedNodes,
        startedAt,
        completedAt: Date.now(),
      }

      this.lastSyncResult = result
      this.mode = result.mode
      this.emitEvent({ type: 'mode-changed', mode: result.mode })
      this.emitEvent({ type: 'sync-completed', result })

      return result
    } catch (error) {
      const errorMessage = normalizeError(error)
      const result = this.createErrorResult(errorMessage, 'fromFileSystem')
      result.startedAt = startedAt
      this.lastSyncResult = result
      return result
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync a single node to the file system
   */
  async syncNodeToFileSystem(path: string): Promise<SyncNodeResult> {
    if (!this.fileSystemAdapter) {
      return {
        path,
        success: false,
        error: 'Not connected to file system',
        direction: 'toFileSystem',
      }
    }

    try {
      // Read from IndexedDB
      const content = await this.indexedDBAdapter.readFile(path)

      // Write to file system
      await this.fileSystemAdapter.writeFile(path, content)

      // Mark as synced
      await this.indexedDBAdapter.markSynced(path)

      return {
        path,
        success: true,
        direction: 'toFileSystem',
      }
    } catch (error) {
      const errorMessage = normalizeError(error)

      this.emitEvent({
        type: 'sync-error',
        message: `Failed to sync ${path}: ${errorMessage}`,
        path,
      })

      return {
        path,
        success: false,
        error: errorMessage,
        direction: 'toFileSystem',
      }
    }
  }

  /**
   * Sync a single node from the file system
   */
  async syncNodeFromFileSystem(path: string): Promise<SyncNodeResult> {
    if (!this.fileSystemAdapter) {
      return {
        path,
        success: false,
        error: 'Not connected to file system',
        direction: 'fromFileSystem',
      }
    }

    try {
      // Read from file system
      const content = await this.fileSystemAdapter.readFile(path)

      // Write to IndexedDB
      await this.indexedDBAdapter.writeFile(path, content)

      // Mark as synced
      await this.indexedDBAdapter.markSynced(path)

      return {
        path,
        success: true,
        direction: 'fromFileSystem',
      }
    } catch (error) {
      const errorMessage = normalizeError(error)

      // Handle file not found - emit event for consistency with other errors
      if (error instanceof FileNotFoundError) {
        this.emitEvent({
          type: 'sync-error',
          message: `File not found: ${path}`,
          path,
        })
        return {
          path,
          success: false,
          error: 'File not found in file system',
          direction: 'fromFileSystem',
        }
      }

      this.emitEvent({
        type: 'sync-error',
        message: `Failed to sync ${path}: ${errorMessage}`,
        path,
      })

      return {
        path,
        success: false,
        error: errorMessage,
        direction: 'fromFileSystem',
      }
    }
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SyncEventCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Get all files recursively from file system
   */
  private async getAllFilesRecursive(
    adapter: FileSystemAdapter,
    path: string
  ): Promise<FileEntry[]> {
    try {
      const entries = await adapter.listDirectory(path, { recursive: true })
      return entries.filter((e) => e.isFile)
    } catch (error) {
      const message = normalizeError(error)
      throw new Error(`Failed to list directory ${path}: ${message}`)
    }
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    message: string,
    direction: SyncDirection
  ): SyncResult {
    this.mode = 'error'
    this.emitEvent({ type: 'mode-changed', mode: 'error' })
    this.emitEvent({ type: 'sync-error', message })

    return {
      success: false,
      mode: 'error',
      syncedNodes: [],
      failedNodes: [
        {
          path: '',
          success: false,
          error: message,
          direction,
        },
      ],
      startedAt: Date.now(),
      completedAt: Date.now(),
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[SyncService] Error in event listener:', error)
      }
    }
  }
}
