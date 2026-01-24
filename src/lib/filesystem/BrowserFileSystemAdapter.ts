/**
 * Browser File System Adapter
 *
 * Implementation of FileSystemAdapter using the File System Access API.
 * Provides access to the local file system in supported browsers (Chrome, Edge).
 */

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
  PermissionDeniedError,
  InvalidPathError,
} from './types'

interface CachedHandle {
  handle: FileSystemDirectoryHandle
  timestamp: number
}

interface WatchSubscription {
  path: string
  callback: FileChangeCallback
  options: WatchOptions
  debounceTimer?: ReturnType<typeof setTimeout>
  pendingEvents: FileChangeEvent[]
  intervalId?: ReturnType<typeof setInterval>
  lastSnapshot?: Map<string, number>
}

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000

/** Default polling interval for watch (1 second) */
const WATCH_POLL_INTERVAL = 1000

/**
 * Check if File System Access API is available
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof window.showDirectoryPicker === 'function'
  )
}

/**
 * Normalize a path by removing leading slash for internal use
 */
function normalizeInternalPath(path: string): string[] {
  // Remove leading/trailing slashes and split
  return path.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean)
}

/**
 * BrowserFileSystemAdapter - File system using File System Access API
 */
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private rootHandle: FileSystemDirectoryHandle | null = null
  private rootPath: string = ''
  private handleCache: Map<string, CachedHandle> = new Map()
  private watchers: Map<number, WatchSubscription> = new Map()
  private watcherId = 0

  /**
   * Create a new BrowserFileSystemAdapter
   * @param rootHandle - Optional pre-existing directory handle
   */
  constructor(rootHandle?: FileSystemDirectoryHandle) {
    if (rootHandle) {
      this.rootHandle = rootHandle
      this.rootPath = rootHandle.name
    }
  }

  /**
   * Request access to a directory via the file picker
   */
  async requestDirectoryAccess(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error('File System Access API is not supported in this browser')
    }

    try {
      this.rootHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })
      this.rootPath = this.rootHandle.name
      this.handleCache.clear()
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new PermissionDeniedError(
          '',
          'User cancelled directory selection'
        )
      }
      throw error
    }
  }

  /**
   * Verify permission to access the directory
   */
  async verifyPermission(
    mode: 'read' | 'readwrite' = 'readwrite'
  ): Promise<boolean> {
    if (!this.rootHandle) {
      return false
    }

    try {
      const options = { mode } as FileSystemHandlePermissionDescriptor
      const permission = await this.rootHandle.queryPermission(options)

      if (permission === 'granted') {
        return true
      }

      if (permission === 'prompt') {
        const result = await this.rootHandle.requestPermission(options)
        return result === 'granted'
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Get a cached directory handle or traverse to it
   */
  private async getDirectoryHandle(
    path: string
  ): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      throw new Error(
        'No root directory selected. Call requestDirectoryAccess() first.'
      )
    }

    const segments = normalizeInternalPath(path)

    if (segments.length === 0) {
      return this.rootHandle
    }

    // Check cache
    const cacheKey = segments.join('/')
    const cached = this.handleCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.handle
    }

    // Traverse to the directory
    let current = this.rootHandle
    for (let i = 0; i < segments.length; i++) {
      try {
        current = await current.getDirectoryHandle(segments[i])

        // Cache intermediate directories too
        const intermediatePath = segments.slice(0, i + 1).join('/')
        this.handleCache.set(intermediatePath, {
          handle: current,
          timestamp: Date.now(),
        })
      } catch (error) {
        if ((error as Error).name === 'NotFoundError') {
          throw new DirectoryNotFoundError(
            '/' + segments.slice(0, i + 1).join('/')
          )
        }
        throw error
      }
    }

    return current
  }

  /**
   * Get a file handle at the given path
   */
  private async getFileHandle(
    path: string,
    create = false
  ): Promise<FileSystemFileHandle> {
    const segments = normalizeInternalPath(path)

    if (segments.length === 0) {
      throw new InvalidPathError(path, 'Cannot get file handle for root path')
    }

    const fileName = segments.pop()!
    const dirPath = '/' + segments.join('/')

    let dirHandle: FileSystemDirectoryHandle
    try {
      dirHandle = await this.getDirectoryHandle(dirPath)
    } catch (error) {
      if (create && error instanceof DirectoryNotFoundError) {
        // Create parent directories
        await this.mkdir(dirPath)
        dirHandle = await this.getDirectoryHandle(dirPath)
      } else {
        throw error
      }
    }

    try {
      return await dirHandle.getFileHandle(fileName, { create })
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        throw new FileNotFoundError(path)
      }
      if ((error as Error).name === 'TypeMismatchError') {
        throw new InvalidPathError(path, `${path} is a directory, not a file`)
      }
      throw error
    }
  }

  /**
   * Notify watchers of a file change
   */
  private notifyWatchers(event: FileChangeEvent): void {
    for (const subscription of this.watchers.values()) {
      const watchPath = subscription.path
      const eventPath = event.path

      // Check if the event path matches the watch path
      const isMatch =
        eventPath === watchPath ||
        (subscription.options.recursive &&
          eventPath.startsWith(watchPath + '/')) ||
        (subscription.options.recursive && watchPath === '/')

      if (isMatch) {
        const debounceMs = subscription.options.debounceMs ?? 100

        // Add event to pending
        subscription.pendingEvents.push(event)

        // Clear existing timer
        if (subscription.debounceTimer) {
          clearTimeout(subscription.debounceTimer)
        }

        // Set new debounce timer
        subscription.debounceTimer = setTimeout(() => {
          // Send all pending events
          for (const pendingEvent of subscription.pendingEvents) {
            subscription.callback(pendingEvent)
          }
          subscription.pendingEvents = []
        }, debounceMs)
      }
    }
  }

  async readFile(path: string): Promise<string> {
    const fileHandle = await this.getFileHandle(path)
    const file = await fileHandle.getFile()
    return await file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    const existed = await this.exists(path)
    const fileHandle = await this.getFileHandle(path, true)

    const writable = await fileHandle.createWritable()
    try {
      await writable.write(content)
    } finally {
      await writable.close()
    }

    this.notifyWatchers({
      type: existed ? 'modify' : 'create',
      path: '/' + normalizeInternalPath(path).join('/'),
      timestamp: Date.now(),
    })
  }

  async listDirectory(
    path: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]> {
    const dirHandle = await this.getDirectoryHandle(path)
    const entries: FileEntry[] = []
    const normalizedPath = '/' + normalizeInternalPath(path).join('/')

    for await (const [name, handle] of dirHandle.entries()) {
      const entryPath =
        normalizedPath === '/' ? `/${name}` : `${normalizedPath}/${name}`
      const isDirectory = handle.kind === 'directory'

      // Filter by extension if specified
      if (options?.extension && !isDirectory) {
        if (!name.endsWith(options.extension)) {
          continue
        }
      }

      entries.push({
        name,
        path: entryPath,
        isDirectory,
        isFile: !isDirectory,
      })

      // Recursively list subdirectories
      if (options?.recursive && isDirectory) {
        try {
          const subEntries = await this.listDirectory(entryPath, options)
          entries.push(...subEntries)
        } catch {
          // Skip directories we can't access
        }
      }
    }

    return entries
  }

  async exists(path: string): Promise<boolean> {
    const segments = normalizeInternalPath(path)

    if (segments.length === 0) {
      return this.rootHandle !== null
    }

    const name = segments.pop()!
    const dirPath = '/' + segments.join('/')

    try {
      const dirHandle = await this.getDirectoryHandle(dirPath)

      // Try as file first
      try {
        await dirHandle.getFileHandle(name)
        return true
      } catch {
        // Try as directory
        try {
          await dirHandle.getDirectoryHandle(name)
          return true
        } catch {
          return false
        }
      }
    } catch {
      return false
    }
  }

  async mkdir(path: string): Promise<void> {
    if (!this.rootHandle) {
      throw new Error(
        'No root directory selected. Call requestDirectoryAccess() first.'
      )
    }

    const segments = normalizeInternalPath(path)

    if (segments.length === 0) {
      return // Root already exists
    }

    let current = this.rootHandle
    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment, { create: true })
    }

    // Cache the created directory
    this.handleCache.set(segments.join('/'), {
      handle: current,
      timestamp: Date.now(),
    })

    this.notifyWatchers({
      type: 'create',
      path: '/' + segments.join('/'),
      timestamp: Date.now(),
    })
  }

  async delete(path: string, recursive?: boolean): Promise<void> {
    const segments = normalizeInternalPath(path)

    if (segments.length === 0) {
      throw new InvalidPathError(path, 'Cannot delete root directory')
    }

    const name = segments.pop()!
    const dirPath = '/' + segments.join('/')
    const dirHandle = await this.getDirectoryHandle(dirPath)

    try {
      await dirHandle.removeEntry(name, { recursive: recursive ?? false })
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        throw new FileNotFoundError(path)
      }
      if ((error as Error).name === 'InvalidModificationError') {
        throw new InvalidPathError(
          path,
          'Cannot delete non-empty directory without recursive flag'
        )
      }
      throw error
    }

    // Invalidate cache for this path and children
    const fullPath = [...segments, name].join('/')
    for (const key of this.handleCache.keys()) {
      if (key === fullPath || key.startsWith(fullPath + '/')) {
        this.handleCache.delete(key)
      }
    }

    this.notifyWatchers({
      type: 'delete',
      path: '/' + fullPath,
      timestamp: Date.now(),
    })
  }

  watch(
    path: string,
    callback: FileChangeCallback,
    options?: WatchOptions
  ): Unwatch {
    const id = ++this.watcherId
    const normalizedPath = '/' + normalizeInternalPath(path).join('/')

    const subscription: WatchSubscription = {
      path: normalizedPath === '/' ? '/' : normalizedPath,
      callback,
      options: options ?? {},
      pendingEvents: [],
    }

    // Set up polling for external changes
    if (options?.recursive !== false) {
      subscription.lastSnapshot = new Map()

      const pollForChanges = async () => {
        try {
          const entries = await this.listDirectory(subscription.path, {
            recursive: subscription.options.recursive,
          })

          const currentSnapshot = new Map<string, number>()

          for (const entry of entries) {
            if (entry.isFile) {
              try {
                const fileHandle = await this.getFileHandle(entry.path)
                const file = await fileHandle.getFile()
                currentSnapshot.set(entry.path, file.lastModified)
              } catch {
                // File might have been deleted
              }
            }
          }

          // Compare with last snapshot
          if (subscription.lastSnapshot && subscription.lastSnapshot.size > 0) {
            // Check for new or modified files
            for (const [filePath, mtime] of currentSnapshot) {
              const lastMtime = subscription.lastSnapshot.get(filePath)
              if (lastMtime === undefined) {
                this.notifyWatchers({
                  type: 'create',
                  path: filePath,
                  timestamp: Date.now(),
                })
              } else if (lastMtime !== mtime) {
                this.notifyWatchers({
                  type: 'modify',
                  path: filePath,
                  timestamp: Date.now(),
                })
              }
            }

            // Check for deleted files
            for (const filePath of subscription.lastSnapshot.keys()) {
              if (!currentSnapshot.has(filePath)) {
                this.notifyWatchers({
                  type: 'delete',
                  path: filePath,
                  timestamp: Date.now(),
                })
              }
            }
          }

          subscription.lastSnapshot = currentSnapshot
        } catch {
          // Directory might not exist or permission denied
        }
      }

      // Initial snapshot
      pollForChanges()

      // Set up polling interval
      subscription.intervalId = setInterval(pollForChanges, WATCH_POLL_INTERVAL)
    }

    this.watchers.set(id, subscription)

    return () => {
      const sub = this.watchers.get(id)
      if (sub) {
        if (sub.debounceTimer) {
          clearTimeout(sub.debounceTimer)
        }
        if (sub.intervalId) {
          clearInterval(sub.intervalId)
        }
      }
      this.watchers.delete(id)
    }
  }

  getRootPath(): string | null {
    return this.rootHandle ? '/' : null
  }

  getRootName(): string | null {
    return this.rootPath || null
  }

  /**
   * Check if a root directory has been selected
   */
  hasRootDirectory(): boolean {
    return this.rootHandle !== null
  }

  /**
   * Clear the handle cache
   */
  clearCache(): void {
    this.handleCache.clear()
  }

  /**
   * Get the root directory handle
   */
  getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle
  }

  /**
   * Set the root directory handle directly (for reconnection from stored handle)
   */
  setRootFromHandle(handle: FileSystemDirectoryHandle): void {
    this.rootHandle = handle
    this.rootPath = handle.name
    this.handleCache.clear()
  }
}
