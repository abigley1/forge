/**
 * Conflict Service
 *
 * Detects and manages conflicts between IndexedDB (local) and file system (external) changes.
 * A conflict occurs when a node is dirty locally AND the file system version has been
 * modified since the last sync.
 */

import type { IndexedDBAdapter } from './IndexedDBAdapter'
import { FileNotFoundError, type FileSystemAdapter } from './types'

/** Resolution strategy for conflicts */
export type ConflictResolution = 'keepLocal' | 'keepExternal' | 'merge'

/** Status of a conflict */
export type ConflictStatus = 'pending' | 'resolved' | 'skipped'

/** A detected conflict between local and external versions */
export interface Conflict {
  /** Unique ID for this conflict */
  id: string
  /** Path to the conflicting file */
  path: string
  /** Content from IndexedDB (local changes) */
  localContent: string
  /** Content from file system (external changes) */
  externalContent: string
  /** When the local version was last modified */
  localModifiedAt: number
  /** When the external version was last modified (if known) */
  externalModifiedAt: number | null
  /** When this conflict was detected */
  detectedAt: number
  /** Current status of this conflict */
  status: ConflictStatus
  /** How this conflict was resolved (if resolved) */
  resolution?: ConflictResolution
  /** When this conflict was resolved (if resolved) */
  resolvedAt?: number
}

/** Result of conflict detection */
export interface ConflictDetectionResult {
  /** Whether detection completed successfully */
  success: boolean
  /** Detected conflicts */
  conflicts: Conflict[]
  /** Files that were checked */
  checkedPaths: string[]
  /** Any errors encountered */
  errors: Array<{ path: string; error: string }>
}

/** Result of conflict resolution */
export interface ConflictResolutionResult {
  /** Whether resolution completed successfully */
  success: boolean
  /** The conflict that was resolved */
  conflict: Conflict
  /** Error message if resolution failed */
  error?: string
}

/** Event types for conflict service */
export type ConflictEvent =
  | { type: 'conflict-detected'; conflict: Conflict }
  | {
      type: 'conflict-resolved'
      conflict: Conflict
      resolution: ConflictResolution
    }
  | { type: 'detection-started'; paths: string[] }
  | { type: 'detection-completed'; result: ConflictDetectionResult }
  | { type: 'error'; message: string; path?: string }

/** Callback type for conflict events */
export type ConflictEventCallback = (event: ConflictEvent) => void

/** History entry for conflict resolution */
export interface ConflictHistoryEntry {
  conflictId: string
  path: string
  resolution: ConflictResolution
  localContentPreview: string
  externalContentPreview: string
  resolvedAt: number
}

/**
 * Normalize error to string message
 */
function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  if (typeof error === 'string') {
    return error
  }
  return `Unknown error (${typeof error})`
}

/**
 * Generate a unique ID for a conflict
 */
function generateConflictId(): string {
  return `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get a preview of content (first 100 chars)
 */
function getContentPreview(content: string, maxLength = 100): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.substring(0, maxLength) + '...'
}

/**
 * Service that detects and manages conflicts between IndexedDB and file system
 */
export class ConflictService {
  private indexedDBAdapter: IndexedDBAdapter
  private fileSystemAdapter: FileSystemAdapter | null = null
  private listeners: Set<ConflictEventCallback> = new Set()
  private pendingConflicts: Map<string, Conflict> = new Map()
  private history: ConflictHistoryEntry[] = []
  private maxHistorySize = 100

  constructor(indexedDBAdapter: IndexedDBAdapter) {
    this.indexedDBAdapter = indexedDBAdapter
  }

  /**
   * Connect to a file system adapter for conflict detection
   */
  connect(fileSystemAdapter: FileSystemAdapter): void {
    this.fileSystemAdapter = fileSystemAdapter
  }

  /**
   * Disconnect from file system
   */
  disconnect(): void {
    this.fileSystemAdapter = null
  }

  /**
   * Check if connected to a file system
   */
  isConnected(): boolean {
    return this.fileSystemAdapter !== null
  }

  /**
   * Detect conflicts for specified paths or all dirty files
   */
  async detectConflicts(paths?: string[]): Promise<ConflictDetectionResult> {
    if (!this.fileSystemAdapter) {
      return {
        success: false,
        conflicts: [],
        checkedPaths: [],
        errors: [{ path: '', error: 'Not connected to file system' }],
      }
    }

    // Get paths to check - either specified or all dirty files
    const pathsToCheck = paths ?? (await this.indexedDBAdapter.getDirtyFiles())

    this.emitEvent({ type: 'detection-started', paths: pathsToCheck })

    const conflicts: Conflict[] = []
    const errors: Array<{ path: string; error: string }> = []

    for (const path of pathsToCheck) {
      try {
        const conflict = await this.checkForConflict(path)
        if (conflict) {
          conflicts.push(conflict)
          this.pendingConflicts.set(conflict.id, conflict)
          this.emitEvent({ type: 'conflict-detected', conflict })
        }
      } catch (error) {
        const errorMessage = normalizeError(error)
        errors.push({ path, error: errorMessage })
        this.emitEvent({ type: 'error', message: errorMessage, path })
      }
    }

    const result: ConflictDetectionResult = {
      success: errors.length === 0,
      conflicts,
      checkedPaths: pathsToCheck,
      errors,
    }

    this.emitEvent({ type: 'detection-completed', result })
    return result
  }

  /**
   * Check if a specific path has a conflict
   */
  private async checkForConflict(path: string): Promise<Conflict | null> {
    if (!this.fileSystemAdapter) {
      return null
    }

    // Check if file is dirty in IndexedDB
    const isDirty = await this.indexedDBAdapter.isDirty(path)
    if (!isDirty) {
      return null // No local changes, no conflict possible
    }

    // Check if file is externally modified
    const isExternallyModified =
      await this.indexedDBAdapter.isExternallyModified(path)
    if (!isExternallyModified) {
      return null // No external changes, no conflict
    }

    // We have a conflict - both local and external changes exist
    // Get both versions
    const localContent = await this.indexedDBAdapter.readFile(path)

    let externalContent: string
    try {
      externalContent = await this.fileSystemAdapter.readFile(path)
    } catch (error) {
      // Only treat FileNotFoundError as "file deleted externally"
      // Other errors (permission denied, I/O errors) should propagate
      if (error instanceof FileNotFoundError) {
        externalContent = ''
      } else {
        // Re-throw to let caller handle unexpected errors
        throw error
      }
    }

    // If contents are identical, no real conflict
    if (localContent === externalContent) {
      // Mark as synced since they match
      await this.indexedDBAdapter.markSynced(path)
      return null
    }

    // Get metadata for timestamps
    const metadata = await this.indexedDBAdapter.getFileMetadata(path)

    return {
      id: generateConflictId(),
      path,
      localContent,
      externalContent,
      localModifiedAt: metadata?.lastModified ?? Date.now(),
      externalModifiedAt: null, // Would need file system metadata
      detectedAt: Date.now(),
      status: 'pending',
    }
  }

  /**
   * Resolve a conflict with the specified resolution strategy
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    mergedContent?: string
  ): Promise<ConflictResolutionResult> {
    const conflict = this.pendingConflicts.get(conflictId)
    if (!conflict) {
      return {
        success: false,
        conflict: {
          id: conflictId,
          path: '',
          localContent: '',
          externalContent: '',
          localModifiedAt: 0,
          externalModifiedAt: null,
          detectedAt: 0,
          status: 'pending',
        },
        error: 'Conflict not found',
      }
    }

    try {
      switch (resolution) {
        case 'keepLocal':
          // Write local content to file system
          if (this.fileSystemAdapter) {
            await this.fileSystemAdapter.writeFile(
              conflict.path,
              conflict.localContent
            )
          }
          await this.indexedDBAdapter.markSynced(conflict.path)
          break

        case 'keepExternal':
          // Write external content to IndexedDB
          await this.indexedDBAdapter.writeFile(
            conflict.path,
            conflict.externalContent
          )
          await this.indexedDBAdapter.markSynced(conflict.path)
          break

        case 'merge':
          if (!mergedContent) {
            return {
              success: false,
              conflict,
              error: 'Merged content required for merge resolution',
            }
          }
          // Write merged content to both
          await this.indexedDBAdapter.writeFile(conflict.path, mergedContent)
          if (this.fileSystemAdapter) {
            await this.fileSystemAdapter.writeFile(conflict.path, mergedContent)
          }
          await this.indexedDBAdapter.markSynced(conflict.path)
          break
      }

      // Update conflict status
      conflict.status = 'resolved'
      conflict.resolution = resolution
      conflict.resolvedAt = Date.now()

      // Add to history
      this.addToHistory({
        conflictId: conflict.id,
        path: conflict.path,
        resolution,
        localContentPreview: getContentPreview(conflict.localContent),
        externalContentPreview: getContentPreview(conflict.externalContent),
        resolvedAt: conflict.resolvedAt,
      })

      // Remove from pending
      this.pendingConflicts.delete(conflictId)

      this.emitEvent({ type: 'conflict-resolved', conflict, resolution })

      return { success: true, conflict }
    } catch (error) {
      const errorMessage = normalizeError(error)
      this.emitEvent({
        type: 'error',
        message: errorMessage,
        path: conflict.path,
      })
      return { success: false, conflict, error: errorMessage }
    }
  }

  /**
   * Resolve all pending conflicts with the same resolution
   */
  async resolveAllConflicts(
    resolution: ConflictResolution
  ): Promise<ConflictResolutionResult[]> {
    if (resolution === 'merge') {
      // Can't auto-resolve with merge - each needs manual content
      return Array.from(this.pendingConflicts.values()).map((conflict) => ({
        success: false,
        conflict,
        error: 'Cannot auto-resolve with merge strategy',
      }))
    }

    const results: ConflictResolutionResult[] = []
    for (const conflict of this.pendingConflicts.values()) {
      const result = await this.resolveConflict(conflict.id, resolution)
      results.push(result)
    }
    return results
  }

  /**
   * Skip a conflict (mark as skipped, don't resolve)
   */
  skipConflict(conflictId: string): boolean {
    const conflict = this.pendingConflicts.get(conflictId)
    if (!conflict) {
      return false
    }

    conflict.status = 'skipped'
    this.pendingConflicts.delete(conflictId)
    return true
  }

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(): Conflict[] {
    return Array.from(this.pendingConflicts.values())
  }

  /**
   * Get conflict history
   */
  getHistory(): ConflictHistoryEntry[] {
    return [...this.history]
  }

  /**
   * Clear conflict history
   */
  clearHistory(): void {
    this.history = []
  }

  /**
   * Subscribe to conflict events
   */
  subscribe(callback: ConflictEventCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Add entry to history, maintaining max size
   */
  private addToHistory(entry: ConflictHistoryEntry): void {
    this.history.push(entry)
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: ConflictEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[ConflictService] Error in event listener:', error)
      }
    }
  }
}
