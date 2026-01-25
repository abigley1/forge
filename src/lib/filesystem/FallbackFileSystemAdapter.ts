/**
 * Fallback File System Adapter
 *
 * Implementation using <input type="file" webkitdirectory> for browsers
 * that don't support the File System Access API (Firefox, Safari).
 *
 * Limitations:
 * - Read-only after initial directory selection
 * - No watch support for external changes
 * - Files are loaded into memory on selection
 */

import type {
  FileSystemAdapter,
  FileEntry,
  FileChangeCallback,
  ListDirectoryOptions,
  WatchOptions,
  Unwatch,
} from './types'
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  InvalidPathError,
} from './types'

interface LoadedFile {
  content: string
  /** Binary content stored as base64 (for binary files) */
  binaryContent?: string
  lastModified: number
}

/**
 * Check if fallback is needed (File System Access API not available)
 */
export function needsFallback(): boolean {
  return (
    typeof window !== 'undefined' &&
    !(
      'showDirectoryPicker' in window &&
      typeof window.showDirectoryPicker === 'function'
    )
  )
}

/**
 * FallbackFileSystemAdapter - Read-only file system using input[webkitdirectory]
 */
export class FallbackFileSystemAdapter implements FileSystemAdapter {
  private files: Map<string, LoadedFile> = new Map()
  private directories: Set<string> = new Set()
  private rootPath: string = ''
  private inputElement: HTMLInputElement | null = null

  constructor() {
    this.directories.add('/')
  }

  /**
   * Create a hidden file input element
   */
  private createInputElement(): HTMLInputElement {
    if (this.inputElement) {
      return this.inputElement
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'

    // webkitdirectory is supported in most browsers
    input.setAttribute('webkitdirectory', '')
    input.setAttribute('directory', '')
    input.multiple = true

    document.body.appendChild(input)
    this.inputElement = input

    return input
  }

  /**
   * Request access to a directory via file input
   */
  requestDirectoryAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = this.createInputElement()

      const handleChange = async () => {
        input.removeEventListener('change', handleChange)

        if (!input.files || input.files.length === 0) {
          reject(new Error('No files selected'))
          return
        }

        // Clear existing data
        this.files.clear()
        this.directories.clear()
        this.directories.add('/')

        // Process selected files
        const fileList = Array.from(input.files)

        if (fileList.length > 0) {
          // Extract root directory name from first file's webkitRelativePath
          const firstPath = fileList[0].webkitRelativePath
          const rootDir = firstPath.split('/')[0]
          this.rootPath = rootDir
        }

        for (const file of fileList) {
          const relativePath = file.webkitRelativePath
          // Remove root directory from path to normalize
          const pathWithoutRoot = relativePath.substring(
            relativePath.indexOf('/')
          )
          const normalizedPath = pathWithoutRoot || `/${file.name}`

          // Add parent directories
          const segments = normalizedPath.split('/').filter(Boolean)
          for (let i = 1; i < segments.length; i++) {
            const dirPath = '/' + segments.slice(0, i).join('/')
            this.directories.add(dirPath)
          }

          // Read file content
          try {
            const content = await file.text()
            this.files.set(normalizedPath, {
              content,
              lastModified: file.lastModified,
            })
          } catch (error) {
            console.error(`Failed to read file: ${normalizedPath}`, error)
          }
        }

        resolve()
      }

      const handleCancel = () => {
        // Handle case where user cancels the dialog
        setTimeout(() => {
          if (!input.files || input.files.length === 0) {
            input.removeEventListener('change', handleChange)
            reject(new Error('User cancelled directory selection'))
          }
        }, 300)
      }

      input.addEventListener('change', handleChange)
      input.addEventListener('cancel', handleCancel)

      // Trigger the file picker
      input.click()
    })
  }

  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path)
    const file = this.files.get(normalizedPath)

    if (!file) {
      if (this.directories.has(normalizedPath)) {
        throw new InvalidPathError(
          normalizedPath,
          `Cannot read directory as file: ${normalizedPath}`
        )
      }
      throw new FileNotFoundError(normalizedPath)
    }

    return file.content
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalizedPath = this.normalizePath(path)

    // In fallback mode, we can only write to memory (changes won't persist)
    const existing = this.files.get(normalizedPath)

    // Ensure parent directories exist
    const segments = normalizedPath.split('/').filter(Boolean)
    for (let i = 1; i < segments.length; i++) {
      const dirPath = '/' + segments.slice(0, i).join('/')
      this.directories.add(dirPath)
    }

    this.files.set(normalizedPath, {
      content,
      lastModified: Date.now(),
    })

    // Log warning about persistence
    if (!existing) {
      console.warn(
        `FallbackFileSystemAdapter: File created in memory only. ` +
          `Changes will not persist to disk: ${normalizedPath}`
      )
    }
  }

  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    const normalizedPath = this.normalizePath(path)
    const file = this.files.get(normalizedPath)

    if (!file) {
      if (this.directories.has(normalizedPath)) {
        throw new InvalidPathError(
          normalizedPath,
          `Cannot read directory as file: ${normalizedPath}`
        )
      }
      throw new FileNotFoundError(normalizedPath)
    }

    // If we have binary content, decode it from base64
    if (file.binaryContent) {
      const binaryString = atob(file.binaryContent)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes.buffer
    }

    // Otherwise convert string content to ArrayBuffer
    const encoder = new TextEncoder()
    return encoder.encode(file.content).buffer as ArrayBuffer
  }

  async writeBinaryFile(path: string, content: ArrayBuffer): Promise<void> {
    const normalizedPath = this.normalizePath(path)

    // In fallback mode, we can only write to memory (changes won't persist)
    const existing = this.files.get(normalizedPath)

    // Ensure parent directories exist
    const segments = normalizedPath.split('/').filter(Boolean)
    for (let i = 1; i < segments.length; i++) {
      const dirPath = '/' + segments.slice(0, i).join('/')
      this.directories.add(dirPath)
    }

    // Convert ArrayBuffer to base64 string for storage
    const bytes = new Uint8Array(content)
    let binaryString = ''
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i])
    }
    const base64Content = btoa(binaryString)

    this.files.set(normalizedPath, {
      content: '', // Empty string content for binary files
      binaryContent: base64Content,
      lastModified: Date.now(),
    })

    // Log warning about persistence
    if (!existing) {
      console.warn(
        `FallbackFileSystemAdapter: File created in memory only. ` +
          `Changes will not persist to disk: ${normalizedPath}`
      )
    }
  }

  async listDirectory(
    path: string,
    options?: ListDirectoryOptions
  ): Promise<FileEntry[]> {
    const normalizedPath = this.normalizePath(path)

    if (!this.directories.has(normalizedPath) && normalizedPath !== '/') {
      throw new DirectoryNotFoundError(normalizedPath)
    }

    const entries: FileEntry[] = []
    const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/'
    const seen = new Set<string>()

    // Find files in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length)
        const firstSegment = relative.split('/')[0]

        if (!seen.has(firstSegment)) {
          seen.add(firstSegment)
          const isNestedFile = relative.includes('/')
          const entryPath =
            prefix === '/'
              ? `/${firstSegment}`
              : `${normalizedPath}/${firstSegment}`

          if (isNestedFile) {
            // This is a directory
            if (!options?.extension) {
              entries.push({
                name: firstSegment,
                path: entryPath,
                isDirectory: true,
                isFile: false,
              })
            }
          } else {
            // This is a file
            if (
              !options?.extension ||
              firstSegment.endsWith(options.extension)
            ) {
              entries.push({
                name: firstSegment,
                path: entryPath,
                isDirectory: false,
                isFile: true,
              })
            }
          }
        }
      }
    }

    // Add directories
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(prefix) && dirPath !== normalizedPath) {
        const relative = dirPath.slice(prefix.length)
        const firstSegment = relative.split('/')[0]

        if (!seen.has(firstSegment)) {
          seen.add(firstSegment)
          const entryPath =
            prefix === '/'
              ? `/${firstSegment}`
              : `${normalizedPath}/${firstSegment}`

          if (!options?.extension) {
            entries.push({
              name: firstSegment,
              path: entryPath,
              isDirectory: true,
              isFile: false,
            })
          }
        }
      }
    }

    // Recursively list subdirectories if requested
    if (options?.recursive) {
      const subdirs = entries.filter((e) => e.isDirectory)
      for (const subdir of subdirs) {
        const subEntries = await this.listDirectory(subdir.path, options)
        entries.push(...subEntries)
      }
    }

    return entries
  }

  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path)
    return (
      this.files.has(normalizedPath) || this.directories.has(normalizedPath)
    )
  }

  async mkdir(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path)

    // Add all parent directories
    const segments = normalizedPath.split('/').filter(Boolean)
    for (let i = 1; i <= segments.length; i++) {
      const dirPath = '/' + segments.slice(0, i).join('/')
      this.directories.add(dirPath)
    }

    console.warn(
      `FallbackFileSystemAdapter: Directory created in memory only. ` +
        `Changes will not persist to disk: ${normalizedPath}`
    )
  }

  async delete(path: string, recursive?: boolean): Promise<void> {
    const normalizedPath = this.normalizePath(path)

    if (this.files.has(normalizedPath)) {
      this.files.delete(normalizedPath)
      return
    }

    if (this.directories.has(normalizedPath)) {
      const prefix = normalizedPath + '/'

      // Check if directory has contents
      const hasContents =
        [...this.files.keys()].some((f) => f.startsWith(prefix)) ||
        [...this.directories].some((d) => d.startsWith(prefix))

      if (hasContents && !recursive) {
        throw new InvalidPathError(
          normalizedPath,
          'Cannot delete non-empty directory without recursive flag'
        )
      }

      // Delete contents if recursive
      if (recursive) {
        for (const filePath of [...this.files.keys()]) {
          if (filePath.startsWith(prefix)) {
            this.files.delete(filePath)
          }
        }
        for (const dirPath of [...this.directories]) {
          if (dirPath.startsWith(prefix)) {
            this.directories.delete(dirPath)
          }
        }
      }

      this.directories.delete(normalizedPath)
      return
    }

    throw new FileNotFoundError(normalizedPath)
  }

  watch(
    _path: string,
    _callback: FileChangeCallback,
    _options?: WatchOptions
  ): Unwatch {
    // Parameters intentionally unused - fallback adapter cannot watch for external changes
    void _path
    void _callback
    void _options

    console.warn(
      'FallbackFileSystemAdapter: watch() is not fully supported. ' +
        'External file changes will not be detected.'
    )

    // Return a no-op unsubscribe function
    return () => {}
  }

  getRootPath(): string | null {
    return this.rootPath ? '/' : null
  }

  getRootName(): string | null {
    return this.rootPath || null
  }

  /**
   * Check if files have been loaded
   */
  hasFiles(): boolean {
    return this.files.size > 0
  }

  /**
   * Get the number of loaded files
   */
  getFileCount(): number {
    return this.files.size
  }

  /**
   * Normalize a path
   */
  private normalizePath(path: string): string {
    if (!path || path === '/') return '/'

    // Ensure leading slash, remove trailing slash
    let normalized = path.startsWith('/') ? path : '/' + path
    normalized = normalized.replace(/\/+$/, '')

    // Resolve . and ..
    const segments = normalized.split('/').filter(Boolean)
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
   * Clear all loaded files (for testing)
   */
  clear(): void {
    this.files.clear()
    this.directories.clear()
    this.directories.add('/')
    this.rootPath = ''
  }

  /**
   * Seed the file system with files (for testing)
   */
  async seed(files: Record<string, string>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
      await this.writeFile(path, content)
    }
  }
}
