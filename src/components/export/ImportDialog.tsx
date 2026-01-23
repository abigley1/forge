import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Upload,
  FileJson,
  FileText,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Files,
} from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { importFromJSON, importFromMarkdown } from '@/lib/export'
import type { Project } from '@/types/project'
import type {
  ExportFormat,
  ImportOptions,
  MarkdownParseError,
} from '@/types/export'

/**
 * Props for ImportDialog
 */
export interface ImportDialogProps {
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Callback when import succeeds */
  onImportSuccess?: (project: Project) => void
  /** Current project for merge mode (optional) */
  currentProject?: Project
}

/**
 * Detected format from file input
 */
interface DetectedFormat {
  format: ExportFormat | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * ImportDialog - Dialog for importing project data
 *
 * Supports JSON and Markdown formats with auto-detection,
 * drag-and-drop, and conflict resolution options.
 */
export function ImportDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onImportSuccess,
  currentProject,
}: ImportDialogProps) {
  // Open state
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      controlledOnOpenChange?.(newOpen)
    },
    [isControlled, controlledOnOpenChange]
  )

  // File input state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(
    null
  )

  // Import options
  const [conflictResolution, setConflictResolution] = useState<
    'skip' | 'overwrite' | 'rename'
  >('skip')
  const [mergeMode, setMergeMode] = useState(false)

  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<MarkdownParseError[]>([])
  const [importResult, setImportResult] = useState<Project | null>(null)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFiles([])
      setFileContent(null)
      setDetectedFormat(null)
      setImportError(null)
      setParseWarnings([])
      setImportResult(null)
      setMergeMode(!!currentProject)
    }
  }, [open, currentProject])

  // Detect format from content
  const detectFormat = useCallback(
    (content: string, filename?: string): DetectedFormat => {
      // Check file extension first
      if (filename) {
        if (filename.endsWith('.json')) {
          return {
            format: 'json',
            confidence: 'high',
            reason: 'File extension .json',
          }
        }
        if (filename.endsWith('.md')) {
          return {
            format: 'markdown',
            confidence: 'high',
            reason: 'File extension .md',
          }
        }
      }

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(content)
        // Check for our export structure
        if (parsed.nodes && (parsed.project || parsed.metadata)) {
          return {
            format: 'json',
            confidence: 'high',
            reason: 'Valid Forge JSON export structure',
          }
        }
        // Generic JSON
        return {
          format: 'json',
          confidence: 'medium',
          reason: 'Valid JSON file',
        }
      } catch (error) {
        // Check if it looks like JSON but has syntax errors
        const trimmed = content.trim()
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parseError =
            error instanceof SyntaxError ? error.message : 'syntax error'
          return {
            format: 'json',
            confidence: 'low',
            reason: `Appears to be JSON but has errors: ${parseError}`,
          }
        }
        // Not JSON, continue to markdown detection
      }

      // Check for markdown with frontmatter
      if (content.startsWith('---') || content.includes('\n---\n')) {
        return {
          format: 'markdown',
          confidence: 'medium',
          reason: 'Contains YAML frontmatter',
        }
      }

      // Check for markdown headers
      if (content.includes('# ') || content.includes('## ')) {
        return {
          format: 'markdown',
          confidence: 'low',
          reason: 'Contains markdown headers',
        }
      }

      return {
        format: 'unknown',
        confidence: 'low',
        reason: 'Could not detect format',
      }
    },
    []
  )

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setSelectedFiles(fileArray)
      setImportError(null)
      setParseWarnings([])
      setImportResult(null)

      // For single file, read content and detect format
      if (fileArray.length === 1) {
        const file = fileArray[0]
        try {
          const content = await file.text()
          setFileContent(content)
          setDetectedFormat(detectFormat(content, file.name))
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.error(`Failed to read file "${file.name}":`, error)
          setImportError(
            `Failed to read "${file.name}": ${errorMessage}. Check the file is accessible and not corrupted.`
          )
        }
      } else {
        // Multiple files - assume markdown directory structure
        setFileContent(null)
        setDetectedFormat({
          format: 'markdown',
          confidence: 'medium',
          reason: `${fileArray.length} files selected (directory import)`,
        })
      }
    },
    [detectFormat]
  )

  // Handle keyboard activation of drop zone
  const handleDropZoneKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }, [])

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files)
      }
    },
    [handleFileSelect]
  )

  // Handle clipboard paste
  useEffect(() => {
    if (!open) return

    const handlePaste = async (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')
      if (!text) return

      // Try to detect format from pasted content
      const detected = detectFormat(text)
      if (detected.format !== 'unknown') {
        setSelectedFiles([])
        setFileContent(text)
        setDetectedFormat({
          ...detected,
          reason: `${detected.reason} (from clipboard)`,
        })
        setImportError(null)
        setParseWarnings([])
        setImportResult(null)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [open, detectFormat])

  // Handle import
  const handleImport = useCallback(async () => {
    if (!fileContent && selectedFiles.length === 0) {
      setImportError('No file selected')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setParseWarnings([])

    try {
      const options: ImportOptions = {
        conflictResolution,
        mergeMode,
      }

      let result: Project

      if (detectedFormat?.format === 'json' && fileContent) {
        const jsonResult = importFromJSON(fileContent)
        if (!jsonResult.success) {
          let errorMessage = jsonResult.error.message
          if (jsonResult.error.issues) {
            errorMessage +=
              '\n' +
              jsonResult.error.issues
                .map((i) => `  - ${i.path}: ${i.message}`)
                .join('\n')
          }
          throw new Error(errorMessage)
        }
        result = jsonResult.data
      } else if (detectedFormat?.format === 'markdown') {
        // Build file entries from selected files
        const fileEntries: Array<{ path: string; content: string }> = []

        if (selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            const content = await file.text()
            // Use webkitRelativePath if available, otherwise file name
            const path =
              (file as File & { webkitRelativePath?: string })
                .webkitRelativePath || file.name
            fileEntries.push({ path, content })
          }
        } else if (fileContent) {
          // Single markdown file from clipboard/paste
          fileEntries.push({ path: 'imported.md', content: fileContent })
        }

        const projectName =
          selectedFiles.length > 0
            ? selectedFiles[0].name.replace(/\.[^.]+$/, '')
            : 'Imported Project'

        const mdResult = importFromMarkdown(fileEntries, projectName, options)

        if (!mdResult.success || !mdResult.project) {
          throw new Error(mdResult.error || 'Failed to import markdown files')
        }

        // Collect parse warnings
        if (mdResult.parseErrors.length > 0) {
          setParseWarnings(mdResult.parseErrors)
        }

        result = mdResult.project
      } else {
        throw new Error('Unknown or unsupported format')
      }

      setImportResult(result)
      onImportSuccess?.(result)

      // Close dialog on success (with delay to show success state)
      setTimeout(() => setOpen(false), 1000)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [
    fileContent,
    selectedFiles,
    detectedFormat,
    conflictResolution,
    mergeMode,
    onImportSuccess,
    setOpen,
  ])

  // Summary of what will be imported
  const importSummary = useMemo(() => {
    if (selectedFiles.length > 0) {
      const mdFiles = selectedFiles.filter((f) => f.name.endsWith('.md'))
      const jsonFiles = selectedFiles.filter((f) => f.name.endsWith('.json'))
      return `${selectedFiles.length} files (${mdFiles.length} markdown, ${jsonFiles.length} JSON)`
    }
    if (fileContent) {
      return `Pasted/loaded content (${detectedFormat?.format || 'unknown'} format)`
    }
    return null
  }, [selectedFiles, fileContent, detectedFormat])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="max-w-xl">
          <Dialog.Title className="text-balance">Import Project</Dialog.Title>
          <Dialog.Description>
            Import project data from JSON or Markdown files
          </Dialog.Description>

          <div className="mt-6 space-y-6">
            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              role="button"
              tabIndex={0}
              aria-label="Drop zone for importing files. Press Enter to open file browser."
              onKeyDown={handleDropZoneKeyDown}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-gray-300',
                isDragging
                  ? 'border-gray-900 bg-gray-100 dark:border-gray-100 dark:bg-gray-800'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
                importResult &&
                  'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20'
              )}
            >
              {importResult ? (
                <>
                  <CheckCircle2
                    className="size-12 text-green-500"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-300">
                    Import successful!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {importResult.nodes.size} nodes imported
                  </p>
                </>
              ) : (
                <>
                  <Upload
                    className={cn(
                      'size-12',
                      isDragging
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragging
                      ? 'Drop files here'
                      : 'Drag files here or click to browse'}
                  </p>
                  <p className="text-xs text-pretty text-gray-500 dark:text-gray-400">
                    Supports .json and .md files, or paste (Cmd/Ctrl+V)
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileJson className="mr-2 size-4" aria-hidden="true" />
                      Select File
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <FolderOpen className="mr-2 size-4" aria-hidden="true" />
                      Select Folder
                    </Button>
                  </div>
                </>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md"
                onChange={(e) =>
                  e.target.files && handleFileSelect(e.target.files)
                }
                className="hidden"
                aria-label="Select file to import"
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is not in React types
                webkitdirectory=""
                onChange={(e) =>
                  e.target.files && handleFileSelect(e.target.files)
                }
                className="hidden"
                aria-label="Select folder to import"
              />
            </div>

            {/* Selected Files Summary */}
            {importSummary && !importResult && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Files className="size-4 text-gray-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {importSummary}
                  </span>
                </div>
                {detectedFormat && (
                  <div className="mt-1 flex items-center gap-2">
                    {detectedFormat.format === 'json' ? (
                      <FileJson
                        className="size-4 text-blue-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <FileText
                        className="size-4 text-green-500"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {detectedFormat.reason} ({detectedFormat.confidence}{' '}
                      confidence)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Import Options */}
            {(selectedFiles.length > 0 || fileContent) && !importResult && (
              <fieldset className="space-y-3">
                <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Import Options
                </legend>

                {currentProject && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mergeMode}
                      onChange={(e) => setMergeMode(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Merge with current project
                    </span>
                  </label>
                )}

                {mergeMode && (
                  <div className="ml-6 space-y-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Conflict resolution:
                    </span>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="conflict"
                          checked={conflictResolution === 'skip'}
                          onChange={() => setConflictResolution('skip')}
                          className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Skip duplicates
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="conflict"
                          checked={conflictResolution === 'overwrite'}
                          onChange={() => setConflictResolution('overwrite')}
                          className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Overwrite existing
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="conflict"
                          checked={conflictResolution === 'rename'}
                          onChange={() => setConflictResolution('rename')}
                          className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Rename imported (add suffix)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </fieldset>
            )}

            {/* Parse Warnings */}
            {parseWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className="mt-0.5 size-4 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {parseWarnings.length} file(s) had issues:
                    </span>
                    <ul className="mt-1 list-inside list-disc text-xs text-amber-600 dark:text-amber-400">
                      {parseWarnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>
                          {warning.path}: {warning.message}
                        </li>
                      ))}
                      {parseWarnings.length > 5 && (
                        <li>...and {parseWarnings.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {importError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className="mt-0.5 size-4 text-red-600 dark:text-red-400"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      Import failed
                    </span>
                    <p className="mt-1 text-xs whitespace-pre-wrap text-red-600 dark:text-red-400">
                      {importError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <Button
              onClick={handleImport}
              disabled={
                isImporting ||
                (!fileContent && selectedFiles.length === 0) ||
                !!importResult
              }
            >
              {isImporting ? (
                <>
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Importing…
                </>
              ) : importResult ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
                  Done
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" aria-hidden="true" />
                  Import
                </>
              )}
            </Button>
          </Dialog.Footer>

          <Dialog.Close
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white hover:opacity-100 focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
