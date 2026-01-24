/**
 * IndexedDB Storage Adapter
 *
 * Implementation of FileSystemAdapter using IndexedDB for persistent storage.
 * This adapter stores files in the browser's IndexedDB, providing instant persistence
 * across page reloads without requiring File System Access API permissions.
 *
 * Database Schema:
 * - files: Stores file content (path as key, content and metadata as value)
 * - directories: Stores directory structure (path as key, metadata as value)
 * - metadata: Stores project-level metadata and sync information
 */

import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type {
  FileSystemAdapter,
  FileEntry,
  FileChangeCallback,
  FileChangeEvent,
  ListDirectoryOptions,
  WatchOptions,
  Unwatch,
} from './types'
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  PathExistsError,
  InvalidPathError,
} from './types'

/** Database name */
const DB_NAME = 'forge-db'

/** Current database version - increment when schema changes */
const DB_VERSION = 1

/** Interface for file records in IndexedDB */
interface FileRecord {
  path: string
  content: string
  lastModified: number
  lastSyncedAt: number | null
  isExternallyModified: boolean
}

/** Interface for directory records in IndexedDB */
interface DirectoryRecord {
  path: string
  createdAt: number
}

/** Interface for project metadata */
interface ProjectMetadata {
  id: string
  name: string
  rootPath: string
  lastAccessed: number
  directoryHandleId?: string
}

/** Interface for stored directory handle records */
interface HandleRecord {
  id: string
  handle: FileSystemDirectoryHandle
  projectPath: string
  lastSyncedAt: number | null
  storedAt: number
}

/** Database schema definition */
interface ForgeDBSchema extends DBSchema {
  files: {
    key: string
    value: FileRecord
    indexes: {
      'by-path': string
      'by-modified': number
    }
  }
  directories: {
    key: string
    value: DirectoryRecord
  }
  projects: {
    key: string
    value: ProjectMetadata
  }
  handles: {
    key: string
    value: HandleRecord
  }
}

/** Watch subscription interface */
interface WatchSubscription {
  path: string
  callback: FileChangeCallback
  options: WatchOptions
  debounceTimer?: ReturnType<typeof setTimeout>
  pendingEvents: FileChangeEvent[]
}

/**
 * Normalize a path by removing trailing slashes and resolving . and ..
 */
function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const segments = path.split('/').filter(Boolean)
  const result: string[] = []
  for (const segment of segments) {
    if (segment === '.') continue
    if (segment === '..') {
      result.pop()
    } else {
      result.push(segment)
    }
  }
  return '/' + result.join('/')
}

/**
 * Get the name (last segment) of a path
 */
function getPathName(path: string): string {
  const normalized = normalizePath(path)
  if (normalized === '/') return ''
  const lastSlash = normalized.lastIndexOf('/')
  return normalized.slice(lastSlash + 1)
}

/**
 * IndexedDBAdapter - Persistent storage using IndexedDB
 */
export class IndexedDBAdapter implements FileSystemAdapter {
  private db: IDBPDatabase<ForgeDBSchema> | null = null
  private projectId: string
  private projectName: string | null = null
  private watchers: Map<number, WatchSubscription> = new Map()
  private watcherId = 0
  private initialized = false

  /**
   * Create a new IndexedDBAdapter
   * @param projectId - Unique identifier for the project (used as prefix for all paths)
   */
  constructor(projectId: string = 'default') {
    this.projectId = projectId
  }

  /**
   * Initialize the database connection
   */
  private async ensureDB(): Promise<IDBPDatabase<ForgeDBSchema>> {
    if (this.db) return this.db

    try {
      this.db = await openDB<ForgeDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          // Handle database upgrades
          if (oldVersion < 1) {
            // Create files store
            const filesStore = db.createObjectStore('files', {
              keyPath: 'path',
            })
            filesStore.createIndex('by-path', 'path')
            filesStore.createIndex('by-modified', 'lastModified')

            // Create directories store
            db.createObjectStore('directories', { keyPath: 'path' })

            // Create projects store
            db.createObjectStore('projects', { keyPath: 'id' })

            // Create handles store for directory handles
            // Use 'id' as keyPath since FileSystemDirectoryHandle doesn't have a path property
            db.createObjectStore('handles', { keyPath: 'id' })
          }
          // Add future migrations here as DB_VERSION increases
        },
        blocked() {
          console.warn(
            'IndexedDB upgrade blocked - another tab has the database open'
          )
        },
        blocking() {
          console.warn('IndexedDB is blocking another tabs upgrade')
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown IndexedDB error'
      throw new Error(`Failed to initialize IndexedDB: ${message}`)
    }

    // Create root directory if it doesn't exist
    const rootPath = this.getFullPath('/')
    const rootDir = await this.db.get('directories', rootPath)
    if (!rootDir) {
      await this.db.put('directories', {
        path: rootPath,
        createdAt: Date.now(),
      })
    }

    this.initialized = true
    return this.db
  }

  /**
   * Get the full path including project prefix
   */
  private getFullPath(path: string): string {
    const normalized = normalizePath(path)
    if (normalized === '/') return `/${this.projectId}`
    return `/${this.projectId}${normalized}`
  }

  /**
   * Strip the project prefix from a full path
   */
  private stripProjectPrefix(fullPath: string): string {
    const prefix = `/${this.projectId}`
    if (fullPath === prefix) return '/'
    if (fullPath.startsWith(prefix + '/')) {
      return fullPath.slice(prefix.length)
    }
    return fullPath
  }

  /**
   * Notify watchers of a file change
   */
  private notifyWatchers(event: FileChangeEvent): void {
    for (const subscription of this.watchers.values()) {
      const watchPath = normalizePath(subscription.path)
      const eventPath = normalizePath(event.path)

      // Match exact path or child paths
      // For root '/', match any path that starts with '/'
      const isMatch =
        eventPath === watchPath ||
        (watchPath === '/' && eventPath.startsWith('/')) ||
        (subscription.options.recursive &&
          watchPath !== '/' &&
          eventPath.startsWith(watchPath + '/'))

      if (isMatch) {
        const debounceMs = subscription.options.debounceMs ?? 100

        subscription.pendingEvents.push(event)

        if (subscription.debounceTimer) {
          clearTimeout(subscription.debounceTimer)
        }

        subscription.debounceTimer = setTimeout(() => {
          for (const pendingEvent of subscription.pendingEvents) {
            subscription.callback(pendingEvent)
          }
          subscription.pendingEvents = []
        }, debounceMs)
      }
    }
  }

  async readFile(path: string): Promise<string> {
    const db = await this.ensureDB()
    const fullPath = this.getFullPath(path)
    const file = await db.get('files', fullPath)

    if (!file) {
      throw new FileNotFoundError(path)
    }

    return file.content
  }

  async writeFile(path: string, content: string): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)
    const name = getPathName(normalized)

    if (!name) {
      throw new InvalidPathError(path, 'Cannot write to root path')
    }

    // Ensure parent directories exist
    await this.ensureParentDirectories(normalized)

    // Check if it's a directory
    const existingDir = await db.get('directories', fullPath)
    if (existingDir) {
      throw new InvalidPathError(
        path,
        `Cannot overwrite directory with file: ${path}`
      )
    }

    // Check if file exists (for event type)
    const existing = await db.get('files', fullPath)
    const isCreate = !existing

    try {
      // Write the file
      await db.put('files', {
        path: fullPath,
        content,
        lastModified: Date.now(),
        lastSyncedAt: null,
        isExternallyModified: false,
      })
    } catch (error) {
      // Handle quota exceeded error
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.code === 22 ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        throw new Error(
          `Storage quota exceeded when writing ${path}. Please free up space.`
        )
      }
      throw error
    }

    this.notifyWatchers({
      type: isCreate ? 'create' : 'modify',
      path: normalized,
      timestamp: Date.now(),
    })
  }

  /**
   * Ensure all parent directories exist
   */
  private async ensureParentDirectories(path: string): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const segments = normalized.split('/').filter(Boolean)
    segments.pop() // Remove the file/dir name itself

    let currentPath = '/'
    for (const segment of segments) {
      currentPath =
        currentPath === '/' ? `/${segment}` : `${currentPath}/${segment}`
      const fullPath = this.getFullPath(currentPath)

      const existingDir = await db.get('directories', fullPath)
      if (!existingDir) {
        // Check if a file exists at this path
        const existingFile = await db.get('files', fullPath)
        if (existingFile) {
          throw new InvalidPathError(
            path,
            `Cannot create path: ${segment} is a file, not a directory`
          )
        }

        await db.put('directories', {
          path: fullPath,
          createdAt: Date.now(),
        })
      }
    }
  }

  async listDirectory(
    path: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)

    // Check if directory exists
    const dir = await db.get('directories', fullPath)
    if (!dir) {
      throw new DirectoryNotFoundError(path)
    }

    const entries: FileEntry[] = []
    const seenPaths = new Set<string>()
    const prefix =
      fullPath === `/${this.projectId}` ? fullPath + '/' : fullPath + '/'

    // Use cursor to iterate through files store efficiently
    const filesTransaction = db.transaction('files', 'readonly')
    const filesStore = filesTransaction.objectStore('files')
    let filesCursor = await filesStore.openCursor()

    while (filesCursor) {
      const file = filesCursor.value
      if (file.path.startsWith(prefix)) {
        const relativePath = file.path.slice(prefix.length)
        const segments = relativePath.split('/')

        // If not recursive, only include direct children
        if (!options?.recursive && segments.length > 1) {
          filesCursor = await filesCursor.continue()
          continue
        }

        const name = segments[0]
        const entryPath =
          normalized === '/' ? `/${name}` : `${normalized}/${name}`

        // Filter by extension if specified
        if (options?.extension && !name.endsWith(options.extension)) {
          filesCursor = await filesCursor.continue()
          continue
        }

        // Check if we already added this entry
        if (!seenPaths.has(entryPath)) {
          seenPaths.add(entryPath)
          entries.push({
            name,
            path: entryPath,
            isDirectory: false,
            isFile: true,
          })
        }
      }
      filesCursor = await filesCursor.continue()
    }

    // Use cursor to iterate through directories store efficiently
    const dirsTransaction = db.transaction('directories', 'readonly')
    const dirsStore = dirsTransaction.objectStore('directories')
    let dirsCursor = await dirsStore.openCursor()

    while (dirsCursor) {
      const dirRecord = dirsCursor.value
      if (dirRecord.path.startsWith(prefix) && dirRecord.path !== fullPath) {
        const relativePath = dirRecord.path.slice(prefix.length)
        const segments = relativePath.split('/')

        // If not recursive, only include direct children
        if (!options?.recursive && segments.length > 1) {
          dirsCursor = await dirsCursor.continue()
          continue
        }

        const name = segments[0]
        const entryPath =
          normalized === '/' ? `/${name}` : `${normalized}/${name}`

        // Check if we already added this entry
        if (!seenPaths.has(entryPath)) {
          seenPaths.add(entryPath)
          entries.push({
            name,
            path: entryPath,
            isDirectory: true,
            isFile: false,
          })
        }
      }
      dirsCursor = await dirsCursor.continue()
    }

    return entries
  }

  async exists(path: string): Promise<boolean> {
    const db = await this.ensureDB()
    const fullPath = this.getFullPath(path)

    const file = await db.get('files', fullPath)
    if (file) return true

    const dir = await db.get('directories', fullPath)
    return !!dir
  }

  async mkdir(path: string): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)
    const name = getPathName(normalized)

    if (!name) {
      // Root already exists
      return
    }

    // Check if something already exists at this path
    const existingDir = await db.get('directories', fullPath)
    if (existingDir) {
      return // Directory already exists, no-op
    }

    const existingFile = await db.get('files', fullPath)
    if (existingFile) {
      throw new PathExistsError(
        path,
        `Cannot create directory: file exists at ${path}`
      )
    }

    // Ensure parent directories exist
    await this.ensureParentDirectories(normalized)

    // Create the directory
    await db.put('directories', {
      path: fullPath,
      createdAt: Date.now(),
    })

    this.notifyWatchers({
      type: 'create',
      path: normalized,
      timestamp: Date.now(),
    })
  }

  async delete(path: string, recursive?: boolean): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)
    const name = getPathName(normalized)

    if (!name || normalized === '/') {
      throw new InvalidPathError(path, 'Cannot delete root')
    }

    // Check if it's a file
    const file = await db.get('files', fullPath)
    if (file) {
      await db.delete('files', fullPath)
      this.notifyWatchers({
        type: 'delete',
        path: normalized,
        timestamp: Date.now(),
      })
      return
    }

    // Check if it's a directory
    const dir = await db.get('directories', fullPath)
    if (!dir) {
      throw new FileNotFoundError(path)
    }

    const prefix = fullPath + '/'

    // Use cursor to check if directory has contents (instead of getAll)
    let hasContents = false

    // Check for files
    const filesTransaction = db.transaction('files', 'readonly')
    const filesStore = filesTransaction.objectStore('files')
    let filesCursor = await filesStore.openCursor()

    while (filesCursor && !hasContents) {
      if (filesCursor.value.path.startsWith(prefix)) {
        hasContents = true
      }
      filesCursor = await filesCursor.continue()
    }

    // Check for subdirectories if no files found
    if (!hasContents) {
      const dirsTransaction = db.transaction('directories', 'readonly')
      const dirsStore = dirsTransaction.objectStore('directories')
      let dirsCursor = await dirsStore.openCursor()

      while (dirsCursor && !hasContents) {
        if (
          dirsCursor.value.path.startsWith(prefix) &&
          dirsCursor.value.path !== fullPath
        ) {
          hasContents = true
        }
        dirsCursor = await dirsCursor.continue()
      }
    }

    if (hasContents && !recursive) {
      throw new InvalidPathError(
        path,
        'Cannot delete non-empty directory without recursive flag'
      )
    }

    // Use a single transaction for atomic recursive delete
    if (recursive && hasContents) {
      const tx = db.transaction(['files', 'directories'], 'readwrite')

      // Collect paths to delete using cursor
      const filesToDelete: string[] = []
      const dirsToDelete: string[] = []

      const fileStore = tx.objectStore('files')
      let fCursor = await fileStore.openCursor()
      while (fCursor) {
        if (fCursor.value.path.startsWith(prefix)) {
          filesToDelete.push(fCursor.value.path)
        }
        fCursor = await fCursor.continue()
      }

      const dirStore = tx.objectStore('directories')
      let dCursor = await dirStore.openCursor()
      while (dCursor) {
        if (dCursor.value.path.startsWith(prefix)) {
          dirsToDelete.push(dCursor.value.path)
        }
        dCursor = await dCursor.continue()
      }

      // Delete all collected paths within the transaction
      for (const filePath of filesToDelete) {
        await fileStore.delete(filePath)
      }
      for (const dirPath of dirsToDelete) {
        await dirStore.delete(dirPath)
      }

      // Delete the directory itself
      await dirStore.delete(fullPath)

      await tx.done
    } else {
      // Just delete the directory itself (empty or no recursive needed)
      await db.delete('directories', fullPath)
    }

    this.notifyWatchers({
      type: 'delete',
      path: normalized,
      timestamp: Date.now(),
    })
  }

  watch(
    path: string,
    callback: FileChangeCallback,
    options?: WatchOptions
  ): Unwatch {
    const id = ++this.watcherId
    const subscription: WatchSubscription = {
      path: normalizePath(path),
      callback,
      options: options ?? {},
      pendingEvents: [],
    }

    this.watchers.set(id, subscription)

    return () => {
      const sub = this.watchers.get(id)
      if (sub?.debounceTimer) {
        clearTimeout(sub.debounceTimer)
      }
      this.watchers.delete(id)
    }
  }

  getRootPath(): string {
    return '/'
  }

  getRootName(): string | null {
    return this.projectName
  }

  /**
   * Set the project name for display purposes
   */
  setProjectName(name: string): void {
    this.projectName = name
  }

  /**
   * Get the project ID
   */
  getProjectId(): string {
    return this.projectId
  }

  /**
   * Check if a file is dirty (has unsaved changes to file system)
   */
  async isDirty(path: string): Promise<boolean> {
    const db = await this.ensureDB()
    const fullPath = this.getFullPath(path)
    const file = await db.get('files', fullPath)

    if (!file) return false

    // File is dirty if lastModified > lastSyncedAt
    return file.lastSyncedAt === null || file.lastModified > file.lastSyncedAt
  }

  /**
   * Mark a file as synced
   */
  async markSynced(path: string): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)
    const file = await db.get('files', fullPath)

    if (!file) {
      throw new FileNotFoundError(path)
    }

    await db.put('files', {
      ...file,
      lastSyncedAt: Date.now(),
      isExternallyModified: false,
    })
  }

  /**
   * Mark a file as externally modified
   */
  async markExternallyModified(path: string): Promise<void> {
    const db = await this.ensureDB()
    const normalized = normalizePath(path)
    const fullPath = this.getFullPath(normalized)
    const file = await db.get('files', fullPath)

    if (!file) {
      throw new FileNotFoundError(path)
    }

    await db.put('files', {
      ...file,
      isExternallyModified: true,
    })
  }

  /**
   * Check if a file was externally modified
   */
  async isExternallyModified(path: string): Promise<boolean> {
    const db = await this.ensureDB()
    const fullPath = this.getFullPath(path)
    const file = await db.get('files', fullPath)

    return file?.isExternallyModified ?? false
  }

  /**
   * Get all dirty files (files that need to be synced to file system)
   */
  async getDirtyFiles(): Promise<string[]> {
    const db = await this.ensureDB()
    const prefix = `/${this.projectId}`
    const dirtyFiles: string[] = []

    // Use cursor for memory-efficient iteration
    const tx = db.transaction('files', 'readonly')
    const store = tx.objectStore('files')
    let cursor = await store.openCursor()

    while (cursor) {
      const file = cursor.value
      if (
        file.path.startsWith(prefix) &&
        (file.lastSyncedAt === null || file.lastModified > file.lastSyncedAt)
      ) {
        dirtyFiles.push(this.stripProjectPrefix(file.path))
      }
      cursor = await cursor.continue()
    }

    return dirtyFiles
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(
    path: string
  ): Promise<{ lastModified: number; lastSyncedAt: number | null } | null> {
    const db = await this.ensureDB()
    const fullPath = this.getFullPath(path)
    const file = await db.get('files', fullPath)

    if (!file) return null

    return {
      lastModified: file.lastModified,
      lastSyncedAt: file.lastSyncedAt,
    }
  }

  /**
   * Clear all data for this project (for testing or reset)
   */
  async clear(): Promise<void> {
    const db = await this.ensureDB()
    const prefix = `/${this.projectId}`

    // Use a single transaction for atomic clear operation
    const tx = db.transaction(['files', 'directories'], 'readwrite')

    // Collect paths to delete using cursors
    const filesToDelete: string[] = []
    const dirsToDelete: string[] = []

    const filesStore = tx.objectStore('files')
    let filesCursor = await filesStore.openCursor()
    while (filesCursor) {
      if (filesCursor.value.path.startsWith(prefix)) {
        filesToDelete.push(filesCursor.value.path)
      }
      filesCursor = await filesCursor.continue()
    }

    const dirsStore = tx.objectStore('directories')
    let dirsCursor = await dirsStore.openCursor()
    while (dirsCursor) {
      if (
        dirsCursor.value.path.startsWith(prefix) &&
        dirsCursor.value.path !== prefix
      ) {
        dirsToDelete.push(dirsCursor.value.path)
      }
      dirsCursor = await dirsCursor.continue()
    }

    // Delete all collected paths
    for (const path of filesToDelete) {
      await filesStore.delete(path)
    }
    for (const path of dirsToDelete) {
      await dirsStore.delete(path)
    }

    await tx.done

    // Clear watchers
    for (const sub of this.watchers.values()) {
      if (sub.debounceTimer) {
        clearTimeout(sub.debounceTimer)
      }
    }
    this.watchers.clear()
  }

  /**
   * Store a directory handle for reconnection
   */
  async storeDirectoryHandle(
    handle: FileSystemDirectoryHandle,
    projectPath?: string
  ): Promise<void> {
    const db = await this.ensureDB()
    const record: HandleRecord = {
      id: this.projectId,
      handle: handle,
      projectPath: projectPath ?? '/',
      lastSyncedAt: null,
      storedAt: Date.now(),
    }
    await db.put('handles', record)
  }

  /**
   * Retrieve a stored directory handle
   */
  async getStoredDirectoryHandle(): Promise<{
    handle: FileSystemDirectoryHandle
    projectPath: string
    lastSyncedAt: number | null
  } | null> {
    const db = await this.ensureDB()
    const record = await db.get('handles', this.projectId)
    if (!record) return null
    return {
      handle: record.handle,
      projectPath: record.projectPath,
      lastSyncedAt: record.lastSyncedAt,
    }
  }

  /**
   * Save project metadata
   */
  async saveProjectMetadata(
    metadata: Omit<ProjectMetadata, 'id'>
  ): Promise<void> {
    const db = await this.ensureDB()
    await db.put('projects', {
      ...metadata,
      id: this.projectId,
    })
  }

  /**
   * Get project metadata
   */
  async getProjectMetadata(): Promise<ProjectMetadata | null> {
    const db = await this.ensureDB()
    const metadata = await db.get('projects', this.projectId)
    return metadata ?? null
  }

  /**
   * Clear the stored directory handle for this project
   */
  async clearDirectoryHandle(): Promise<void> {
    const db = await this.ensureDB()
    await db.delete('handles', this.projectId)
  }

  /**
   * Update the last synced timestamp for the stored handle
   */
  async updateHandleSyncTime(): Promise<void> {
    const db = await this.ensureDB()
    const record = await db.get('handles', this.projectId)
    if (record) {
      await db.put('handles', {
        ...record,
        lastSyncedAt: Date.now(),
      })
    }
  }

  /**
   * Check if we have permission to access the stored directory handle
   * Returns 'granted', 'denied', 'prompt', or null if no handle stored
   */
  async checkHandlePermission(): Promise<PermissionState | null> {
    const stored = await this.getStoredDirectoryHandle()
    if (!stored) return null

    try {
      // queryPermission checks current state without prompting
      const permission = await stored.handle.queryPermission({
        mode: 'readwrite',
      })
      return permission
    } catch (error) {
      // Handle may be invalid (e.g., after browser update)
      console.warn(
        `[IndexedDBAdapter] Failed to check handle permission for project ${this.projectId}:`,
        error
      )
      return null
    }
  }

  /**
   * Request permission for the stored directory handle
   * Returns true if permission granted, false otherwise
   */
  async requestHandlePermission(): Promise<boolean> {
    const stored = await this.getStoredDirectoryHandle()
    if (!stored) return false

    try {
      // requestPermission will prompt user if needed
      const permission = await stored.handle.requestPermission({
        mode: 'readwrite',
      })
      return permission === 'granted'
    } catch (error) {
      // Handle may be invalid or user denied permission
      console.warn(
        `[IndexedDBAdapter] Permission request failed for project ${this.projectId}:`,
        error
      )
      return false
    }
  }

  /**
   * Check if the adapter has been initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
    }

    // Clear all watch timers
    for (const sub of this.watchers.values()) {
      if (sub.debounceTimer) {
        clearTimeout(sub.debounceTimer)
      }
    }
    this.watchers.clear()
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'indexedDB' in window &&
    window.indexedDB !== null
  )
}
