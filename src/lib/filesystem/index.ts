/**
 * File System Abstraction
 *
 * Provides a unified interface for file system operations across different
 * environments (browser with File System Access API, IndexedDB, and memory).
 *
 * Note: Sync services have been removed in favor of IndexedDB-only persistence
 * with on-demand export to file system. See electron_prd.json for future git integration.
 */

import {
  BrowserFileSystemAdapter as BrowserFSAdapter,
  isFileSystemAccessSupported as isFSAccessSupported,
} from './BrowserFileSystemAdapter'
import { FallbackFileSystemAdapter as FallbackFSAdapter } from './FallbackFileSystemAdapter'

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
export {
  BrowserFileSystemAdapter,
  isFileSystemAccessSupported,
} from './BrowserFileSystemAdapter'
export {
  FallbackFileSystemAdapter,
  needsFallback,
} from './FallbackFileSystemAdapter'
export { IndexedDBAdapter, isIndexedDBSupported } from './IndexedDBAdapter'

/**
 * Create the appropriate file system adapter for the current environment
 */
export function createFileSystemAdapter():
  | BrowserFSAdapter
  | FallbackFSAdapter {
  if (isFSAccessSupported()) {
    return new BrowserFSAdapter()
  }
  return new FallbackFSAdapter()
}
