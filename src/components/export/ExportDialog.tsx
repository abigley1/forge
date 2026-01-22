import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  Loader2,
  X,
} from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  exportToJSON,
  exportProjectToMarkdown,
  exportComponentsToCSV,
  exportBOM,
  generateExportFilename,
} from '@/lib/export'
import type { Project } from '@/types/project'
import type {
  ExportFormat,
  JSONExportOptions,
  MarkdownExportOptions,
  CSVExportOptions,
} from '@/types/export'

/**
 * Props for ExportDialog
 */
export interface ExportDialogProps {
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** The project to export */
  project: Project
}

/**
 * Format configuration for display
 */
const FORMAT_CONFIG = {
  json: {
    icon: FileJson,
    label: 'JSON',
    description: 'Full project data with all metadata',
    extension: '.json',
  },
  markdown: {
    icon: FileText,
    label: 'Markdown',
    description: 'Directory structure with .md files',
    extension: '.zip',
  },
  csv: {
    icon: FileSpreadsheet,
    label: 'CSV',
    description: 'Components only (Bill of Materials)',
    extension: '.csv',
  },
} as const

/**
 * CSV export type options
 */
type CSVExportType = 'components' | 'bom'

/**
 * ExportDialog - Dialog for exporting project data
 *
 * Supports multiple formats with format-specific options,
 * live preview, and download functionality.
 */
export function ExportDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  project,
}: ExportDialogProps) {
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

  // Format selection
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')

  // Format-specific options
  const [jsonOptions, setJsonOptions] = useState<JSONExportOptions>({
    prettyPrint: true,
    includeMetadata: true,
    indentSpaces: 2,
  })

  const [markdownOptions, setMarkdownOptions] = useState<MarkdownExportOptions>(
    {
      includeFrontmatter: true,
    }
  )

  const [csvOptions, setCsvOptions] = useState<CSVExportOptions>({
    includeBOM: true,
  })

  const [csvExportType, setCsvExportType] =
    useState<CSVExportType>('components')

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Preview ref for scrolling
  const previewRef = useRef<HTMLDivElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExportError(null)
      setCopied(false)
    }
  }, [open])

  // Generate export preview
  const exportPreview = useMemo(() => {
    try {
      switch (selectedFormat) {
        case 'json':
          return exportToJSON(project, {
            ...jsonOptions,
            // Limit preview to avoid large renders
          })
        case 'markdown': {
          const result = exportProjectToMarkdown(project, markdownOptions)
          const fileList = Array.from(result.files.keys())
          return `Project will export ${fileList.length} files:\n\n${fileList.join('\n')}\n\nproject.json included`
        }
        case 'csv':
          if (csvExportType === 'bom') {
            const bomResult = exportBOM(project)
            return bomResult.data
          } else {
            const csvResult = exportComponentsToCSV(project.nodes, csvOptions)
            return csvResult.data
          }
        default:
          return ''
      }
    } catch (error) {
      return `Error generating preview: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }, [
    selectedFormat,
    project,
    jsonOptions,
    markdownOptions,
    csvOptions,
    csvExportType,
  ])

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      let data: string
      let filename: string
      let mimeType: string

      switch (selectedFormat) {
        case 'json':
          data = exportToJSON(project, jsonOptions)
          filename = generateExportFilename(project.name, 'json')
          mimeType = 'application/json'
          break
        case 'markdown': {
          // For markdown, we need to create a zip file
          const result = exportProjectToMarkdown(project, markdownOptions)
          // For now, export as a JSON representation of the file structure
          // A real implementation would use JSZip or similar
          const markdownData = {
            projectJson: result.projectJson,
            files: Object.fromEntries(result.files),
          }
          data = JSON.stringify(markdownData, null, 2)
          filename = `${project.name}-markdown-export.json`
          mimeType = 'application/json'
          break
        }
        case 'csv':
          if (csvExportType === 'bom') {
            const bomResult = exportBOM(project)
            data = bomResult.data
            filename = bomResult.filename
          } else {
            const csvResult = exportComponentsToCSV(project.nodes, csvOptions)
            data = csvResult.data
            filename = csvResult.filename
          }
          mimeType = 'text/csv'
          break
        default:
          throw new Error(`Unsupported format: ${selectedFormat}`)
      }

      // Create blob and download
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Close dialog on success
      setOpen(false)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [
    selectedFormat,
    project,
    jsonOptions,
    markdownOptions,
    csvOptions,
    csvExportType,
    setOpen,
  ])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportPreview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setExportError('Failed to copy to clipboard')
    }
  }, [exportPreview])

  // Get node counts
  const nodeCounts = useMemo(() => {
    let components = 0
    let decisions = 0
    let tasks = 0
    let notes = 0
    for (const node of project.nodes.values()) {
      switch (node.type) {
        case 'component':
          components++
          break
        case 'decision':
          decisions++
          break
        case 'task':
          tasks++
          break
        case 'note':
          notes++
          break
      }
    }
    return { components, decisions, tasks, notes, total: project.nodes.size }
  }, [project.nodes])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="max-w-2xl">
          <Dialog.Title>Export Project</Dialog.Title>
          <Dialog.Description>
            Export "{project.name}" with {nodeCounts.total} nodes
          </Dialog.Description>

          <div className="mt-6 space-y-6">
            {/* Format Selection */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Export Format
              </legend>
              <div
                className="mt-2 grid grid-cols-3 gap-3"
                role="radiogroup"
                aria-label="Export format"
              >
                {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map(
                  (format) => {
                    const config = FORMAT_CONFIG[format]
                    const Icon = config.icon
                    const isSelected = selectedFormat === format
                    const isDisabled =
                      format === 'csv' && nodeCounts.components === 0

                    return (
                      <button
                        key={format}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-disabled={isDisabled}
                        disabled={isDisabled}
                        onClick={() => setSelectedFormat(format)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4',
                          'text-sm transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                          'dark:focus-visible:ring-gray-300',
                          isDisabled && 'cursor-not-allowed opacity-50',
                          isSelected
                            ? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                        )}
                      >
                        <Icon
                          className="h-6 w-6 text-gray-600 dark:text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {config.label}
                        </span>
                        <span className="text-center text-xs text-gray-500 dark:text-gray-400">
                          {config.description}
                        </span>
                      </button>
                    )
                  }
                )}
              </div>
              {nodeCounts.components === 0 && selectedFormat === 'csv' && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  No components to export. Add components first.
                </p>
              )}
            </fieldset>

            {/* Format-specific Options */}
            <fieldset className="space-y-3">
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Options
              </legend>

              {selectedFormat === 'json' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={jsonOptions.prettyPrint}
                      onChange={(e) =>
                        setJsonOptions((prev) => ({
                          ...prev,
                          prettyPrint: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Pretty print (formatted with indentation)
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={jsonOptions.includeMetadata}
                      onChange={(e) =>
                        setJsonOptions((prev) => ({
                          ...prev,
                          includeMetadata: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include export metadata
                    </span>
                  </label>
                </div>
              )}

              {selectedFormat === 'markdown' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={markdownOptions.includeFrontmatter}
                      onChange={(e) =>
                        setMarkdownOptions((prev) => ({
                          ...prev,
                          includeFrontmatter: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include YAML frontmatter
                    </span>
                  </label>
                </div>
              )}

              {selectedFormat === 'csv' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Export type:
                    </span>
                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="csvType"
                          checked={csvExportType === 'components'}
                          onChange={() => setCsvExportType('components')}
                          className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Components list
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="csvType"
                          checked={csvExportType === 'bom'}
                          onChange={() => setCsvExportType('bom')}
                          className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Bill of Materials (grouped)
                        </span>
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={csvOptions.includeBOM}
                      onChange={(e) =>
                        setCsvOptions((prev) => ({
                          ...prev,
                          includeBOM: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include UTF-8 BOM (Excel compatibility)
                    </span>
                  </label>
                </div>
              )}
            </fieldset>

            {/* Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                >
                  {copied ? (
                    <Check
                      className="h-4 w-4 text-green-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
              {/* Scrollable region needs keyboard access for accessibility */}
              <div
                ref={previewRef}
                className={cn(
                  'max-h-60 overflow-auto rounded-lg border border-gray-200 bg-gray-50',
                  'dark:border-gray-700 dark:bg-gray-900'
                )}
                role="region"
                tabIndex={0}
                aria-label="Export preview"
              >
                <pre
                  className={cn(
                    'p-4 text-xs text-gray-800 dark:text-gray-200',
                    'font-mono whitespace-pre-wrap'
                  )}
                >
                  {exportPreview.slice(0, 5000)}
                  {exportPreview.length > 5000 &&
                    '\n\n... (truncated for preview)'}
                </pre>
              </div>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            </div>

            {/* Error Display */}
            {exportError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                role="alert"
              >
                <span className="font-medium">Export failed:</span>{' '}
                {exportError}
              </div>
            )}
          </div>

          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <Button
              onClick={handleExport}
              disabled={
                isExporting ||
                (selectedFormat === 'csv' && nodeCounts.components === 0)
              }
            >
              {isExporting ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download {FORMAT_CONFIG[selectedFormat].extension}
                </>
              )}
            </Button>
          </Dialog.Footer>

          <Dialog.Close
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none dark:ring-offset-gray-950 dark:focus:ring-gray-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
