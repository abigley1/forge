/**
 * File System Abstraction Types
 *
 * Defines the adapter interface for file system operations,
 * enabling both browser-based and in-memory implementations.
 */

/**
 * Represents a file entry in the file system
 */
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

/**
 * Result of a read operation
 */
export interface ReadResult {
  content: string
  path: string
}

/**
 * Result of a write operation
 */
export interface WriteResult {
  path: string
  bytesWritten: number
}

/**
 * Options for listing directory contents
 */
export interface ListDirectoryOptions {
  /** Include subdirectories recursively */
  recursive?: boolean
  /** Filter by file extension (e.g., '.md') */
  extension?: string
}

/**
 * Options for watching file changes
 */
export interface WatchOptions {
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number
  /** Watch subdirectories recursively */
  recursive?: boolean
}

/**
 * Event types for file system changes
 */
export type FileChangeType = 'create' | 'modify' | 'delete'

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileChangeType
  path: string
  timestamp: number
}

/**
 * Callback for file change events
 */
export type FileChangeCallback = (event: FileChangeEvent) => void

/**
 * Unsubscribe function returned by watch()
 */
export type Unwatch = () => void

/**
 * File System Adapter Interface
 *
 * Abstract interface for file system operations.
 * Implementations include MemoryFileSystemAdapter (for tests)
 * and BrowserFileSystemAdapter (using File System Access API).
 */
export interface FileSystemAdapter {
  /**
   * Read file contents as a string
   * @param path - Path to the file
   * @returns Promise resolving to file contents
   * @throws Error if file doesn't exist or can't be read
   */
  readFile(path: string): Promise<string>

  /**
   * Write content to a file
   * @param path - Path to the file
   * @param content - Content to write
   * @returns Promise resolving when write is complete
   * @throws Error if write fails (e.g., permission denied)
   */
  writeFile(path: string, content: string): Promise<void>

  /**
   * List contents of a directory
   * @param path - Path to the directory
   * @param options - Optional listing options
   * @returns Promise resolving to array of file entries
   * @throws Error if directory doesn't exist or can't be read
   */
  listDirectory(
    path: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]>

  /**
   * Check if a file or directory exists
   * @param path - Path to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(path: string): Promise<boolean>

  /**
   * Create a directory
   * @param path - Path for the new directory
   * @returns Promise resolving when directory is created
   * @throws Error if creation fails
   */
  mkdir(path: string): Promise<void>

  /**
   * Delete a file or directory
   * @param path - Path to delete
   * @param recursive - If true, delete directories recursively
   * @returns Promise resolving when deletion is complete
   * @throws Error if deletion fails
   */
  delete(path: string, recursive?: boolean): Promise<void>

  /**
   * Watch for file changes
   * @param path - Path to watch (file or directory)
   * @param callback - Function called when changes occur
   * @param options - Watch options
   * @returns Unsubscribe function to stop watching
   */
  watch(
    path: string,
    callback: FileChangeCallback,
    options?: WatchOptions
  ): Unwatch

  /**
   * Get the root path of the file system adapter
   * @returns The root path or null if not applicable
   */
  getRootPath(): string | null
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends Error {
  readonly path: string

  constructor(path: string, message?: string) {
    super(message ?? `File not found: ${path}`)
    this.name = 'FileNotFoundError'
    this.path = path
  }
}

/**
 * Error thrown when a directory is not found
 */
export class DirectoryNotFoundError extends Error {
  readonly path: string

  constructor(path: string, message?: string) {
    super(message ?? `Directory not found: ${path}`)
    this.name = 'DirectoryNotFoundError'
    this.path = path
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionDeniedError extends Error {
  readonly path: string

  constructor(path: string, message?: string) {
    super(message ?? `Permission denied: ${path}`)
    this.name = 'PermissionDeniedError'
    this.path = path
  }
}

/**
 * Error thrown when a path already exists
 */
export class PathExistsError extends Error {
  readonly path: string

  constructor(path: string, message?: string) {
    super(message ?? `Path already exists: ${path}`)
    this.name = 'PathExistsError'
    this.path = path
  }
}

/**
 * Error thrown for invalid path operations
 */
export class InvalidPathError extends Error {
  readonly path: string

  constructor(path: string, message?: string) {
    super(message ?? `Invalid path: ${path}`)
    this.name = 'InvalidPathError'
    this.path = path
  }
}
