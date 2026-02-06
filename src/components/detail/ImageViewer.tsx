/**
 * ImageViewer Component (Task 15.10)
 *
 * Full-screen image viewer with zoom, pan, and annotation capabilities.
 * Opens when clicking on an image attachment thumbnail.
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Pencil,
  ArrowUpRight,
  Circle,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Z_MODAL } from '@/lib/z-index'
import type { Attachment } from '@/types/nodes'
import { useProjectStore } from '@/store/useProjectStore'

interface ImageViewerProps {
  attachment: Attachment
  isOpen: boolean
  onClose: () => void
}

type AnnotationTool = 'arrow' | 'circle' | 'text' | null

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export function ImageViewer({ attachment, isOpen, onClose }: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showAnnotationToolbar, setShowAnnotationToolbar] = useState(false)
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const adapter = useProjectStore((state) => state.adapter)
  const project = useProjectStore((state) => state.project)

  // Load image when viewer opens
  useEffect(() => {
    if (!isOpen || !adapter || !project) return

    let mounted = true
    let objectUrl: string | null = null

    async function loadImage() {
      try {
        setLoadError(null)
        const fullPath = `/${project!.path}/${attachment.path}`
        const arrayBuffer = await adapter!.readBinaryFile(fullPath)
        const blob = new Blob([arrayBuffer], { type: attachment.type })
        objectUrl = URL.createObjectURL(blob)
        if (mounted) {
          setImageUrl(objectUrl)
        }
      } catch (err) {
        console.error('[ImageViewer] Failed to load image:', err)
        if (mounted) {
          setLoadError(
            'Failed to load image. The file may be missing or corrupted.'
          )
        }
      }
    }

    loadImage()

    return () => {
      mounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [isOpen, adapter, project, attachment.path, attachment.type])

  // Track previous isOpen to detect closing transition
  const prevIsOpenRef = useRef(isOpen)
  useEffect(() => {
    // Only reset when transitioning from open to closed
    if (prevIsOpenRef.current && !isOpen) {
      // Reset happens after close transition, use timeout to avoid cascading
      const timer = setTimeout(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
        setShowAnnotationToolbar(false)
        setActiveTool(null)
        setImageUrl(null)
        setLoadError(null)
      }, 0)
      return () => clearTimeout(timer)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  // Zoom handlers - defined before effects that use them
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      containerRef.current?.focus()
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus()
    }
  }, [isOpen])

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleResetZoom()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleResetZoom])

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return

    try {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = attachment.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('[ImageViewer] Failed to download image:', err)
      setLoadError('Failed to download image. Please try again.')
    }
  }, [imageUrl, attachment.name])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool) return // Don't pan when annotating
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    },
    [activeTool, pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM))
  }, [])

  const toggleAnnotationToolbar = useCallback(() => {
    setShowAnnotationToolbar((show) => !show)
    if (showAnnotationToolbar) {
      setActiveTool(null)
    }
  }, [showAnnotationToolbar])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      data-testid="image-viewer"
      role="dialog"
      aria-label={`Image viewer: ${attachment.name}`}
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_MODAL }}
    >
      {/* Backdrop */}
      <div
        data-testid="image-viewer-backdrop"
        className="absolute inset-0 bg-black/80"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-2 shadow-lg">
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-5 w-5" aria-hidden="true" />
        </button>

        <span className="min-w-[4ch] text-center text-sm text-white">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="h-6 w-px bg-white/20" aria-hidden="true" />

        <button
          type="button"
          onClick={handleResetZoom}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Reset zoom to fit"
        >
          <Maximize2 className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="h-6 w-px bg-white/20" aria-hidden="true" />

        <button
          type="button"
          onClick={toggleAnnotationToolbar}
          className={cn(
            'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
            showAnnotationToolbar ? 'bg-forge-accent' : 'hover:bg-white/10'
          )}
          aria-label="Annotate image"
          aria-pressed={showAnnotationToolbar}
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Download image"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="h-6 w-px bg-white/20" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Annotation Toolbar */}
      {showAnnotationToolbar && (
        <div
          data-testid="annotation-toolbar"
          className="absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-2 shadow-lg"
        >
          <button
            type="button"
            onClick={() =>
              setActiveTool(activeTool === 'arrow' ? null : 'arrow')
            }
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
              activeTool === 'arrow' ? 'bg-forge-accent' : 'hover:bg-white/10'
            )}
            aria-label="Arrow tool"
            aria-pressed={activeTool === 'arrow'}
          >
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTool(activeTool === 'circle' ? null : 'circle')
            }
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
              activeTool === 'circle' ? 'bg-forge-accent' : 'hover:bg-white/10'
            )}
            aria-label="Circle tool"
            aria-pressed={activeTool === 'circle'}
          >
            <Circle className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
              activeTool === 'text' ? 'bg-forge-accent' : 'hover:bg-white/10'
            )}
            aria-label="Text tool"
            aria-pressed={activeTool === 'text'}
          >
            <Type className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Image Container - interactive for pan/zoom */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(
          'relative z-0 overflow-hidden',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-sm text-red-400">
            <X className="h-8 w-8" aria-hidden="true" />
            <span>{loadError}</span>
            <button
              type="button"
              onClick={onClose}
              className="bg-forge-surface-dark hover:bg-forge-border-dark mt-2 rounded-lg px-4 py-2 text-sm text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Close
            </button>
          </div>
        ) : imageUrl ? (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={`Full size view of ${attachment.name}`}
            className="max-h-[80vh] max-w-[90vw] select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
            onError={() => {
              setLoadError(
                'Failed to display image. The file may be corrupted.'
              )
            }}
          />
        ) : (
          <div className="flex items-center justify-center text-sm text-white/60">
            Loading image...
          </div>
        )}
      </div>

      {/* Image info */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/50 px-3 py-1 text-sm text-white/80">
        {attachment.name}
      </div>
    </div>
  )
}

export default ImageViewer
