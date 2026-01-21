/**
 * Memory File System Adapter
 *
 * In-memory implementation of FileSystemAdapter for testing purposes.
 * Simulates a file system with directories and files stored in memory.
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
  PathExistsError,
  InvalidPathError,
} from './types'

interface MemoryNode {
  isDirectory: boolean
  content?: string
  children?: Map<string, MemoryNode>
}

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
  // Handle empty path
  if (!path || path === '/') return '/'

  // Split into segments
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
 * Get the parent path of a given path
 */
function getParentPath(path: string): string {
  const normalized = normalizePath(path)
  if (normalized === '/') return '/'
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === 0 ? '/' : normalized.slice(0, lastSlash)
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
 * MemoryFileSystemAdapter - In-memory file system for testing
 */
export class MemoryFileSystemAdapter implements FileSystemAdapter {
  private root: MemoryNode
  private watchers: Map<number, WatchSubscription> = new Map()
  private watcherId = 0

  constructor() {
    this.root = {
      isDirectory: true,
      children: new Map(),
    }
  }

  /**
   * Get a node at the given path
   */
  private getNode(path: string): MemoryNode | null {
    const normalized = normalizePath(path)
    if (normalized === '/') return this.root

    const segments = normalized.split('/').filter(Boolean)
    let current: MemoryNode = this.root

    for (const segment of segments) {
      if (!current.isDirectory || !current.children) {
        return null
      }
      const child = current.children.get(segment)
      if (!child) return null
      current = child
    }

    return current
  }

  /**
   * Get or create parent directories for a path
   */
  private ensureParentDirectories(path: string): MemoryNode {
    const normalized = normalizePath(path)
    const segments = normalized.split('/').filter(Boolean)
    segments.pop() // Remove the file/dir name itself

    let current: MemoryNode = this.root

    for (const segment of segments) {
      if (!current.children) {
        current.children = new Map()
      }
      let child = current.children.get(segment)
      if (!child) {
        child = { isDirectory: true, children: new Map() }
        current.children.set(segment, child)
      } else if (!child.isDirectory) {
        throw new InvalidPathError(
          path,
          `Cannot create path: ${segment} is not a directory`
        )
      }
      current = child
    }

    return current
  }

  /**
   * Notify watchers of a file change
   */
  private notifyWatchers(event: FileChangeEvent): void {
    for (const subscription of this.watchers.values()) {
      const watchPath = normalizePath(subscription.path)
      const eventPath = normalizePath(event.path)

      // Check if the event path matches the watch path
      const isMatch =
        eventPath === watchPath ||
        (subscription.options.recursive &&
          eventPath.startsWith(watchPath + '/'))

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
    const normalized = normalizePath(path)
    const node = this.getNode(normalized)

    if (!node) {
      throw new FileNotFoundError(normalized)
    }

    if (node.isDirectory) {
      throw new InvalidPathError(
        normalized,
        `Cannot read directory as file: ${normalized}`
      )
    }

    return node.content ?? ''
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path)
    const name = getPathName(normalized)

    if (!name) {
      throw new InvalidPathError(normalized, 'Cannot write to root path')
    }

    const parent = this.ensureParentDirectories(normalized)
    const existing = parent.children?.get(name)
    const isCreate = !existing

    if (existing?.isDirectory) {
      throw new InvalidPathError(
        normalized,
        `Cannot overwrite directory with file: ${normalized}`
      )
    }

    if (!parent.children) {
      parent.children = new Map()
    }

    parent.children.set(name, {
      isDirectory: false,
      content,
    })

    this.notifyWatchers({
      type: isCreate ? 'create' : 'modify',
      path: normalized,
      timestamp: Date.now(),
    })
  }

  async listDirectory(
    path: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]> {
    const normalized = normalizePath(path)
    const node = this.getNode(normalized)

    if (!node) {
      throw new DirectoryNotFoundError(normalized)
    }

    if (!node.isDirectory) {
      throw new InvalidPathError(normalized, `Not a directory: ${normalized}`)
    }

    const entries: FileEntry[] = []
    const children = node.children ?? new Map()

    for (const [name, child] of children) {
      const entryPath =
        normalized === '/' ? `/${name}` : `${normalized}/${name}`

      // Filter by extension if specified
      if (options?.extension && !child.isDirectory) {
        if (!name.endsWith(options.extension)) {
          continue
        }
      }

      entries.push({
        name,
        path: entryPath,
        isDirectory: child.isDirectory,
        isFile: !child.isDirectory,
      })

      // Recursively list subdirectories
      if (options?.recursive && child.isDirectory) {
        const subEntries = await this.listDirectory(entryPath, options)
        entries.push(...subEntries)
      }
    }

    return entries
  }

  async exists(path: string): Promise<boolean> {
    const normalized = normalizePath(path)
    return this.getNode(normalized) !== null
  }

  async mkdir(path: string): Promise<void> {
    const normalized = normalizePath(path)
    const name = getPathName(normalized)

    if (!name) {
      // Root already exists
      return
    }

    const existing = this.getNode(normalized)
    if (existing) {
      if (existing.isDirectory) {
        return // Directory already exists, no-op
      }
      throw new PathExistsError(
        normalized,
        `Cannot create directory: file exists at ${normalized}`
      )
    }

    const parent = this.ensureParentDirectories(normalized)
    if (!parent.children) {
      parent.children = new Map()
    }

    parent.children.set(name, {
      isDirectory: true,
      children: new Map(),
    })

    this.notifyWatchers({
      type: 'create',
      path: normalized,
      timestamp: Date.now(),
    })
  }

  async delete(path: string, recursive?: boolean): Promise<void> {
    const normalized = normalizePath(path)
    const name = getPathName(normalized)

    if (!name || normalized === '/') {
      throw new InvalidPathError(normalized, 'Cannot delete root')
    }

    const node = this.getNode(normalized)
    if (!node) {
      throw new FileNotFoundError(normalized)
    }

    if (
      node.isDirectory &&
      node.children &&
      node.children.size > 0 &&
      !recursive
    ) {
      throw new InvalidPathError(
        normalized,
        `Cannot delete non-empty directory without recursive flag`
      )
    }

    const parentPath = getParentPath(normalized)
    const parent = this.getNode(parentPath)

    if (parent?.children) {
      parent.children.delete(name)
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

  /**
   * Clear all files and directories (for testing)
   */
  clear(): void {
    this.root = {
      isDirectory: true,
      children: new Map(),
    }
    // Clear all watch timers
    for (const sub of this.watchers.values()) {
      if (sub.debounceTimer) {
        clearTimeout(sub.debounceTimer)
      }
    }
    this.watchers.clear()
  }

  /**
   * Seed the file system with multiple files (for testing)
   */
  async seed(files: Record<string, string>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
      await this.writeFile(path, content)
    }
  }

  /**
   * Get a snapshot of all files (for testing)
   */
  snapshot(): Record<string, string> {
    const result: Record<string, string> = {}

    const collectFiles = (node: MemoryNode, path: string) => {
      if (!node.isDirectory) {
        result[path] = node.content ?? ''
        return
      }

      if (node.children) {
        for (const [name, child] of node.children) {
          const childPath = path === '/' ? `/${name}` : `${path}/${name}`
          collectFiles(child, childPath)
        }
      }
    }

    collectFiles(this.root, '/')
    return result
  }
}
