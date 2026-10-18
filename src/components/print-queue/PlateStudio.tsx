import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { studioBase as base, type StudioAsset } from './studio-api'
import type { PrintPlate } from '../../../server/src/print-queue-model'

export function PlateStudio({
  plate,
  asset,
}: {
  plate: PrintPlate
  asset?: StudioAsset
}) {
  const [expanded, setExpanded] = useState(false)
  const [failedImage, setFailedImage] = useState(false)
  const [opening, setOpening] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const url = asset
    ? `${base()}/${encodeURIComponent(plate.id)}/preview?v=${asset.binding}`
    : ''
  const hasPreview = !!asset?.preview && !failedImage
  const label = `${plate.project} · ${plate.revision} · ${plate.name}`
  const open = async () => {
    if (!asset?.canOpen || opening) return
    setOpening(true)
    setMessage('')
    try {
      const sessionResponse = await fetch(`${base()}/session`)
      const session = await sessionResponse.json()
      if (!sessionResponse.ok) throw new Error(session.error)
      const response = await fetch(
        `${base()}/${encodeURIComponent(plate.id)}/open`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forge-Studio': session.data.token,
          },
          body: JSON.stringify({ binding: asset.binding }),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setMessage(result.data.message)
      setReviewOpen(false)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not open Studio.'
      )
    } finally {
      setOpening(false)
    }
  }
  return (
    <>
      <div className="pq-media">
        {hasPreview ? (
          <button
            className="pq-thumbnail"
            onClick={() => setExpanded(true)}
            aria-label={`Enlarge preview of ${plate.name}`}
          >
            <img
              src={url}
              alt={`${asset?.previewKind}: ${label}`}
              loading="lazy"
              onError={() => setFailedImage(true)}
            />
          </button>
        ) : (
          <div className="pq-preview-missing">
            Preview not prepared
            <br />
            for this revision
          </div>
        )}
        <div className="pq-media-detail">
          <span className="pq-help">
            {hasPreview ? asset?.previewKind : 'No current preview'}
          </span>
          <button
            disabled={!asset?.canOpen || opening}
            onClick={() => {
              setMessage('')
              setReviewOpen(true)
            }}
          >
            Open in Bambu Studio
          </button>
          <span className="pq-help">
            {asset?.reason || 'A validated single-plate project is needed.'}
          </span>
        </div>
      </div>
      {message && !reviewOpen && (
        <p className="pq-handoff-message" role="status">
          {message}
        </p>
      )}
      <Dialog.Root open={expanded} onOpenChange={setExpanded}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className="pq-editor pq-preview-dialog max-w-5xl">
            <Dialog.Title>{plate.name}</Dialog.Title>
            <Dialog.Description>
              {plate.project} · {plate.revision} ·{' '}
              {plate.material || 'Material undecided'}
              {plate.color ? ` / ${plate.color}` : ''}
            </Dialog.Description>
            <p className="pq-help">
              {asset?.previewKind} ·{' '}
              {plate.parts.length
                ? plate.parts
                    .map((p) => `${p.onPlate} × ${p.name.replaceAll('_', ' ')}`)
                    .join(' · ')
                : 'Plate quantities not yet confirmed'}
            </p>
            {hasPreview ? (
              <img
                className="pq-large-preview"
                src={url}
                alt={`${asset?.previewKind}: ${label}`}
                onError={() => setFailedImage(true)}
              />
            ) : (
              <p>Preview unavailable for this revision.</p>
            )}
            <p className="pq-help">{asset?.reason}</p>
            <div className="pq-editor-actions">
              <button onClick={() => setExpanded(false)}>Close preview</button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={reviewOpen}
        onOpenChange={(value) => {
          if (!opening) setReviewOpen(value)
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className="pq-editor max-w-xl">
            <Dialog.Title>Open {plate.name}</Dialog.Title>
            <Dialog.Description>
              {plate.project} · {plate.revision} ·{' '}
              {plate.material || 'Material undecided'}
            </Dialog.Description>
            <p>
              A separate Bambu Studio 2.8.2.61 window will open a copy of this
              single-plate P2S project. Existing Studio documents stay open.
            </p>
            <p className="pq-help">
              Review material, supports and the sliced preview in Studio.
              Nothing is sent to the printer and queue counts stay unchanged.
            </p>
            <p className="pq-help">{asset?.reason}</p>
            {message && (
              <p className="pq-error" role="alert">
                {message}
              </p>
            )}
            <div className="pq-editor-actions">
              <button disabled={opening} onClick={() => setReviewOpen(false)}>
                Cancel
              </button>
              <button
                className="pq-primary"
                disabled={opening}
                onClick={() => void open()}
              >
                {opening ? 'Opening…' : 'Open separate Studio window'}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
