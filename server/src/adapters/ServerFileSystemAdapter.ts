import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { watch, type FSWatcher } from 'node:fs'

/**
 * File change event types
 */
export type FileChangeType = 'create' | 'modify' | 'delete'

/**
 * Event emitted when a file changes
 */
export interface FileChangeEvent {
  type: FileChangeType
  path: string
  timestamp: number
}

/**
 * File entry returned from directory listing
 */
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

/**
 * Options for listing directories
 */
export interface ListDirectoryOptions {
  recursive?: boolean
  extension?: string
}

/**
 * Options for watching files
 */
export interface WatchOptions {
  recursive?: boolean
  debounceMs?: number
}

/**
 * Callback for file change events
 */
export type FileChangeCallback = (event: FileChangeEvent) => void

/**
 * Function to stop watching
 */
export type Unwatch = () => void

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

/**
 * Error thrown when a directory is not found
 */
export class DirectoryNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Directory not found: ${path}`)
    this.name = 'DirectoryNotFoundError'
  }
}

/**
 * Error thrown when a path is invalid
 */
export class InvalidPathError extends Error {
  constructor(
    public readonly path: string,
    message?: string
  ) {
    super(message || `Invalid path: ${path}`)
    this.name = 'InvalidPathError'
  }
}

/**
 * Error thrown when a path already exists
 */
export class PathExistsError extends Error {
  constructor(
    public readonly path: string,
    message?: string
  ) {
    super(message || `Path already exists: ${path}`)
    this.name = 'PathExistsError'
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly path: string,
    message?: string
  ) {
    super(message || `Permission denied: ${path}`)
    this.name = 'PermissionDeniedError'
  }
}

interface WatchSubscription {
  watcher: FSWatcher
  callback: FileChangeCallback
  debounceTimer?: ReturnType<typeof setTimeout>
  pendingEvents: FileChangeEvent[]
  options: WatchOptions
}

/**
 * Normalize a path to use forward slashes and remove trailing slashes
 */
function normalizePath(inputPath: string): string {
  let normalized = inputPath.replace(/\\/g, '/')
  // Remove trailing slash unless it's the root
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/**
 * Server-side file system adapter using Node.js fs module.
 * Implements the FileSystemAdapter interface for use with the Express file server.
 */
export class ServerFileSystemAdapter {
  private watchers: Map<number, WatchSubscription> = new Map()
  private watcherId = 0

  constructor(private readonly rootPath: string) {
    // Ensure root path is absolute
    this.rootPath = path.resolve(rootPath)
  }

  /**
   * Resolve a relative path to an absolute path within the root
   */
  private resolvePath(relativePath: string): string {
    const normalized = normalizePath(relativePath)
    // Remove leading slash for path.join to work correctly
    const cleanPath = normalized.startsWith('/')
      ? normalized.slice(1)
      : normalized
    const resolved = path.resolve(this.rootPath, cleanPath)

    // Security check: ensure the resolved path is within the root
    if (!resolved.startsWith(this.rootPath)) {
      throw new InvalidPathError(
        relativePath,
        'Path traversal detected: path must be within root directory'
      )
    }

    return resolved
  }

  /**
   * Convert an absolute path back to a relative path
   */
  private toRelativePath(absolutePath: string): string {
    const relative = path.relative(this.rootPath, absolutePath)
    return '/' + normalizePath(relative)
  }

  /**
   * Read file contents as a string
   */
  async readFile(filePath: string): Promise<string> {
    const absolutePath = this.resolvePath(filePath)

    try {
      const stat = await fs.stat(absolutePath)
      if (stat.isDirectory()) {
        throw new InvalidPathError(
          filePath,
          `Cannot read directory as file: ${filePath}`
        )
      }
      return await fs.readFile(absolutePath, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(filePath)
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new PermissionDeniedError(filePath)
      }
      throw error
    }
  }

  /**
   * Write content to a file, creating parent directories if needed
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const absolutePath = this.resolvePath(filePath)
    const dir = path.dirname(absolutePath)

    try {
      // Ensure parent directory exists
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(absolutePath, content, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new PermissionDeniedError(filePath)
      }
      throw error
    }
  }

  /**
   * List contents of a directory
   */
  async listDirectory(
    dirPath: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]> {
    const absolutePath = this.resolvePath(dirPath)

    try {
      const stat = await fs.stat(absolutePath)
      if (!stat.isDirectory()) {
        throw new InvalidPathError(dirPath, `Not a directory: ${dirPath}`)
      }

      const entries: FileEntry[] = []
      const items = await fs.readdir(absolutePath, { withFileTypes: true })

      for (const item of items) {
        const itemPath = path.join(absolutePath, item.name)
        const relativePath = this.toRelativePath(itemPath)

        // Filter by extension if specified (skip directories and non-matching files)
        if (options?.extension) {
          if (item.isDirectory() || !item.name.endsWith(options.extension)) {
            // Still recurse into directories if recursive option is set
            if (options?.recursive && item.isDirectory()) {
              const subEntries = await this.listDirectory(relativePath, options)
              entries.push(...subEntries)
            }
            continue
          }
        }

        entries.push({
          name: item.name,
          path: relativePath,
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
        })

        // Recursively list subdirectories
        if (options?.recursive && item.isDirectory()) {
          const subEntries = await this.listDirectory(relativePath, options)
          entries.push(...subEntries)
        }
      }

      return entries
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new DirectoryNotFoundError(dirPath)
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new PermissionDeniedError(dirPath)
      }
      throw error
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    const absolutePath = this.resolvePath(filePath)
    try {
      await fs.access(absolutePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create a directory
   */
  async mkdir(dirPath: string): Promise<void> {
    const absolutePath = this.resolvePath(dirPath)

    try {
      await fs.mkdir(absolutePath, { recursive: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new PermissionDeniedError(dirPath)
      }
      throw error
    }
  }

  /**
   * Delete a file or directory
   */
  async delete(filePath: string, recursive?: boolean): Promise<void> {
    const absolutePath = this.resolvePath(filePath)

    try {
      const stat = await fs.stat(absolutePath)

      if (stat.isDirectory()) {
        if (recursive) {
          await fs.rm(absolutePath, { recursive: true })
        } else {
          await fs.rmdir(absolutePath)
        }
      } else {
        await fs.unlink(absolutePath)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(filePath)
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOTEMPTY') {
        throw new InvalidPathError(
          filePath,
          'Cannot delete non-empty directory without recursive flag'
        )
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new PermissionDeniedError(filePath)
      }
      throw error
    }
  }

  /**
   * Watch for file changes
   */
  watch(
    watchPath: string,
    callback: FileChangeCallback,
    options?: WatchOptions
  ): Unwatch {
    const absolutePath = this.resolvePath(watchPath)
    const id = ++this.watcherId
    const debounceMs = options?.debounceMs ?? 100

    const watcher = watch(
      absolutePath,
      { recursive: options?.recursive },
      (eventType, filename) => {
        if (!filename) return

        const fullPath = path.join(absolutePath, filename)
        const relativePath = this.toRelativePath(fullPath)

        // Determine change type
        let changeType: FileChangeType = 'modify'
        if (eventType === 'rename') {
          // 'rename' can mean create or delete - we need to check if file exists
          try {
            fs.access(fullPath)
              .then(() => {
                this.emitWatchEvent(id, {
                  type: 'create',
                  path: relativePath,
                  timestamp: Date.now(),
                })
              })
              .catch(() => {
                this.emitWatchEvent(id, {
                  type: 'delete',
                  path: relativePath,
                  timestamp: Date.now(),
                })
              })
            return
          } catch {
            changeType = 'delete'
          }
        }

        this.emitWatchEvent(id, {
          type: changeType,
          path: relativePath,
          timestamp: Date.now(),
        })
      }
    )

    const subscription: WatchSubscription = {
      watcher,
      callback,
      pendingEvents: [],
      options: { debounceMs, ...options },
    }

    this.watchers.set(id, subscription)

    return () => {
      const sub = this.watchers.get(id)
      if (sub) {
        sub.watcher.close()
        if (sub.debounceTimer) {
          clearTimeout(sub.debounceTimer)
        }
        this.watchers.delete(id)
      }
    }
  }

  /**
   * Emit a watch event with debouncing
   */
  private emitWatchEvent(watcherId: number, event: FileChangeEvent): void {
    const subscription = this.watchers.get(watcherId)
    if (!subscription) return

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

  /**
   * Get the root path of the file system adapter
   */
  getRootPath(): string {
    return this.rootPath
  }

  /**
   * Get the name of the root directory
   */
  getRootName(): string {
    return path.basename(this.rootPath)
  }

  /**
   * Close all watchers
   */
  close(): void {
    for (const sub of this.watchers.values()) {
      sub.watcher.close()
      if (sub.debounceTimer) {
        clearTimeout(sub.debounceTimer)
      }
    }
    this.watchers.clear()
  }
}
