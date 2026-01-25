/**
 * AttachmentsPanel Component
 *
 * Displays and manages file attachments for a node.
 * Features:
 * - List of attached files with icons based on type
 * - Upload button with file picker
 * - Download/view attachments
 * - Delete attachments with confirmation dialog
 * - Drag and drop support
 * - File size and type validation
 * - Image thumbnail previews
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  Paperclip,
  Upload,
  File,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button, AlertDialog } from '@/components/ui'
import type { Attachment, ForgeNode } from '@/types/nodes'
import { SUPPORTED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from '@/types/nodes'
import { useProjectStore } from '@/store'
import { ImageViewer } from './ImageViewer'

// ============================================================================
// Types
// ============================================================================

export interface AttachmentsPanelProps {
  /** The node to manage attachments for */
  node: ForgeNode
  /** Callback when attachments change */
  onChange: (attachments: Attachment[]) => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a MIME type is an image type
 */
function isImageType(type: string): boolean {
  return type.startsWith('image/')
}

/**
 * Get the appropriate icon for an attachment based on its MIME type
 * For images, we return null to indicate a thumbnail should be shown
 */
function getAttachmentIcon(type: string) {
  if (type === 'application/pdf') {
    return FileText
  }
  if (type.startsWith('text/')) {
    return FileText
  }
  return File
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if a MIME type is supported
 */
function isSupportedType(type: string): boolean {
  return (SUPPORTED_ATTACHMENT_TYPES as readonly string[]).includes(type)
}

/**
 * Generate a unique ID for an attachment
 */
function generateAttachmentId(): string {
  return crypto.randomUUID()
}

// ============================================================================
// ImageThumbnail Component
// ============================================================================

interface ImageThumbnailProps {
  attachment: Attachment
  className?: string
  onClick?: () => void
}

function ImageThumbnail({
  attachment,
  className,
  onClick,
}: ImageThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const adapter = useProjectStore((state) => state.adapter)
  const project = useProjectStore((state) => state.project)

  useEffect(() => {
    let mounted = true
    let objectUrl: string | null = null

    async function loadThumbnail() {
      if (!adapter || !project) {
        // Expected during initial render before project loads
        return
      }

      try {
        const fullPath = `/${project.path}/${attachment.path}`
        const arrayBuffer = await adapter.readBinaryFile(fullPath)
        const blob = new Blob([arrayBuffer], { type: attachment.type })
        objectUrl = URL.createObjectURL(blob)
        if (mounted) {
          setThumbnailUrl(objectUrl)
        }
      } catch (err) {
        // Log the error for debugging - thumbnail will show icon fallback
        console.warn(
          `[ImageThumbnail] Failed to load thumbnail for "${attachment.name}":`,
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    }

    loadThumbnail()

    return () => {
      mounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [adapter, project, attachment.path, attachment.type])

  if (!thumbnailUrl) {
    // Fallback to generic image icon
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded bg-gray-100 hover:ring-2 hover:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:bg-gray-800',
          className
        )}
        data-testid="attachment-thumbnail"
        aria-label={`View ${attachment.name}`}
      >
        <File className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded hover:ring-2 hover:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      aria-label={`View ${attachment.name} full size`}
    >
      <img
        src={thumbnailUrl}
        alt={`Thumbnail preview of ${attachment.name}`}
        className={cn(
          'h-10 w-10 flex-shrink-0 rounded object-cover',
          className
        )}
        data-testid="attachment-thumbnail"
      />
    </button>
  )
}

// ============================================================================
// AttachmentsPanel Component
// ============================================================================

export function AttachmentsPanel({
  node,
  onChange,
  className,
}: AttachmentsPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<Attachment | null>(null)
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adapter = useProjectStore((state) => state.adapter)
  const project = useProjectStore((state) => state.project)

  const attachments = useMemo(() => node.attachments ?? [], [node.attachments])

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!adapter || !project) {
        setError('No project loaded')
        return
      }

      setError(null)
      setIsUploading(true)

      const newAttachments: Attachment[] = []

      try {
        for (const file of Array.from(files)) {
          // Validate file type
          if (!isSupportedType(file.type)) {
            setError(
              `Unsupported file type: ${file.type}. Supported types: PDF, images, and text files.`
            )
            continue
          }

          // Validate file size
          if (file.size > MAX_ATTACHMENT_SIZE) {
            setError(
              `File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_ATTACHMENT_SIZE)}.`
            )
            continue
          }

          // Read file as ArrayBuffer
          const arrayBuffer = await file.arrayBuffer()

          // Generate attachment path
          const attachmentId = generateAttachmentId()
          const extension = file.name.split('.').pop() || ''
          const fileName = `${attachmentId}.${extension}`
          const attachmentPath = `attachments/${node.id}/${fileName}`

          // Ensure attachments directory exists
          const attachmentsDir = `attachments/${node.id}`
          const dirExists = await adapter.exists(
            `/${project.path}/${attachmentsDir}`
          )
          if (!dirExists) {
            await adapter.mkdir(`/${project.path}/${attachmentsDir}`)
          }

          // Write file to disk
          await adapter.writeBinaryFile(
            `/${project.path}/${attachmentPath}`,
            arrayBuffer
          )

          // Create attachment metadata
          const attachment: Attachment = {
            id: attachmentId,
            name: file.name,
            path: attachmentPath,
            type: file.type,
            size: file.size,
            addedAt: new Date().toISOString(),
          }

          newAttachments.push(attachment)
        }

        if (newAttachments.length > 0) {
          onChange([...attachments, ...newAttachments])
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[AttachmentsPanel] Upload failed:', {
          nodeId: node.id,
          error: errorMessage,
        })
        setError(`Failed to upload attachment: ${errorMessage}`)
      } finally {
        setIsUploading(false)
      }
    },
    [adapter, project, node.id, attachments, onChange]
  )

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileUpload(files)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFileUpload]
  )

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload]
  )

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = useCallback((attachment: Attachment) => {
    setAttachmentToDelete(attachment)
    setDeleteDialogOpen(true)
  }, [])

  /**
   * Handle confirmed attachment deletion
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!attachmentToDelete) return

    if (!adapter || !project) {
      setError('No project loaded')
      setDeleteDialogOpen(false)
      setAttachmentToDelete(null)
      return
    }

    try {
      // Delete file from disk
      const fullPath = `/${project.path}/${attachmentToDelete.path}`
      const exists = await adapter.exists(fullPath)
      if (exists) {
        await adapter.delete(fullPath)
      }

      // Remove from attachments list
      const updated = attachments.filter((a) => a.id !== attachmentToDelete.id)
      onChange(updated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[AttachmentsPanel] Delete failed:', {
        nodeId: node.id,
        attachmentId: attachmentToDelete.id,
        error: errorMessage,
      })
      setError(`Failed to delete "${attachmentToDelete.name}": ${errorMessage}`)
    } finally {
      setDeleteDialogOpen(false)
      setAttachmentToDelete(null)
    }
  }, [adapter, project, attachmentToDelete, attachments, onChange, node.id])

  /**
   * Handle attachment download
   */
  const handleDownload = useCallback(
    async (attachment: Attachment) => {
      if (!adapter || !project) {
        setError('No project loaded')
        return
      }

      try {
        const fullPath = `/${project.path}/${attachment.path}`
        const arrayBuffer = await adapter.readBinaryFile(fullPath)

        // Create blob and trigger download
        const blob = new Blob([arrayBuffer], { type: attachment.type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[AttachmentsPanel] Download failed:', {
          nodeId: node.id,
          attachmentId: attachment.id,
          error: errorMessage,
        })
        setError(`Failed to download "${attachment.name}": ${errorMessage}`)
      }
    },
    [adapter, project, node.id]
  )

  /**
   * Handle attachment view (open in new tab)
   */
  const handleView = useCallback(
    async (attachment: Attachment) => {
      if (!adapter || !project) {
        setError('No project loaded')
        return
      }

      try {
        const fullPath = `/${project.path}/${attachment.path}`
        const arrayBuffer = await adapter.readBinaryFile(fullPath)

        // Create blob and open in new tab
        const blob = new Blob([arrayBuffer], { type: attachment.type })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        // Note: We don't revoke the URL immediately as the new tab needs it
        // The browser will clean it up when the tab is closed
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[AttachmentsPanel] View failed:', {
          nodeId: node.id,
          attachmentId: attachment.id,
          error: errorMessage,
        })
        setError(`Failed to view "${attachment.name}": ${errorMessage}`)
      }
    },
    [adapter, project, node.id]
  )

  /**
   * Trigger file input click
   */
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div data-testid="attachments-panel" className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-gray-500 dark:text-gray-400">
              ({attachments.length})
            </span>
          )}
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={triggerFileInput}
          disabled={isUploading || !adapter}
          aria-label="Add attachment"
        >
          <Upload className="mr-1 h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={SUPPORTED_ATTACHMENT_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="flex-shrink-0 rounded p-2 text-red-500 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none dark:text-red-400 dark:hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Drop zone / Attachments list */}
      <div
        data-testid="attachment-dropzone"
        data-accepted-types={SUPPORTED_ATTACHMENT_TYPES.join(',')}
        aria-label="Drop files here to add attachments"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed',
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-200 dark:border-gray-700',
          attachments.length === 0 && 'p-6'
        )}
      >
        {attachments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Paperclip
              className="mx-auto mb-2 h-8 w-8 opacity-50"
              aria-hidden="true"
            />
            <p className="text-sm">
              {isDragOver
                ? 'Drop files here'
                : 'Drag and drop files here, or click Add'}
            </p>
            <p className="mt-1 text-xs opacity-75">
              PDF, images, and text files (Max{' '}
              {formatFileSize(MAX_ATTACHMENT_SIZE)})
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {attachments.map((attachment) => {
              const isImage = isImageType(attachment.type)
              const Icon = isImage ? null : getAttachmentIcon(attachment.type)

              return (
                <li
                  key={attachment.id}
                  data-testid={`attachment-${attachment.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {/* Icon or Thumbnail */}
                  {isImage ? (
                    <ImageThumbnail
                      attachment={attachment}
                      onClick={() => setViewerAttachment(attachment)}
                    />
                  ) : Icon ? (
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-800"
                      data-testid="file-icon"
                    >
                      <Icon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  ) : null}

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {/* View button */}
                    <button
                      type="button"
                      onClick={() => handleView(attachment)}
                      className={cn(
                        'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2',
                        'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
                      )}
                      aria-label={`View ${attachment.name}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Download button */}
                    <button
                      type="button"
                      onClick={() => handleDownload(attachment)}
                      className={cn(
                        'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2',
                        'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
                      )}
                      aria-label={`Download ${attachment.name}`}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(attachment)}
                      className={cn(
                        'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2',
                        'text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                      )}
                      aria-label={`Delete ${attachment.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-500 motion-safe:animate-spin" />
          Uploading...
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete Attachment</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete "{attachmentToDelete?.name}"? This
              action cannot be undone.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <AlertDialog.Close variant="cancel">Cancel</AlertDialog.Close>
              <AlertDialog.Close
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Delete
              </AlertDialog.Close>
            </AlertDialog.Footer>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Image Viewer */}
      {viewerAttachment && (
        <ImageViewer
          attachment={viewerAttachment}
          isOpen={viewerAttachment !== null}
          onClose={() => setViewerAttachment(null)}
        />
      )}
    </div>
  )
}

export default AttachmentsPanel
