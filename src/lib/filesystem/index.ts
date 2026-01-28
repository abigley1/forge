/**
 * File System Abstraction
 *
 * Provides a unified interface for file system operations.
 * The MemoryFileSystemAdapter is used for testing.
 */

// Types
export type {
  FileSystemAdapter,
  FileEntry,
  ReadResult,
  WriteResult,
  ListDirectoryOptions,
  WatchOptions,
  FileChangeType,
  FileChangeEvent,
  FileChangeCallback,
  Unwatch,
} from './types'

// Error classes
export {
  FileNotFoundError,
  DirectoryNotFoundError,
  PermissionDeniedError,
  PathExistsError,
  InvalidPathError,
} from './types'

// Adapters
export { MemoryFileSystemAdapter } from './MemoryFileSystemAdapter'
