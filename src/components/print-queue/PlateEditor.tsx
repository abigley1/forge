import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import {
  copiesNeeded,
  emptyPlate,
  statuses,
  validatePlate,
  type PlateInput,
  type PrintPlate,
} from '../../../server/src/print-queue-model'

export function PlateEditor({
  plate,
  onSave,
  onClose,
}: {
  plate?: PrintPlate
  onSave: (plate: PlateInput) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<PlateInput>(() =>
    plate
      ? structuredClone(plate)
      : { ...emptyPlate, parts: [{ name: '', required: 1, onPlate: 1 }] }
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [artifactNotice, setArtifactNotice] = useState('')
  const set = <K extends keyof PlateInput>(key: K, value: PlateInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
  }
  const close = () => {
    if (!busy && (!dirty || window.confirm('Discard unsaved plate changes?')))
      onClose()
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="pq-editor max-w-3xl">
          <Dialog.Title>{plate ? 'Edit plate' : 'Add plate'}</Dialog.Title>
          <Dialog.Description>
            Quantities are allocated to this plate. Record successful full-plate
            copies only.
          </Dialog.Description>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              setError('')
              setBusy(true)
              try {
                await onSave(validatePlate(draft))
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Save failed.')
                requestAnimationFrame(() =>
                  document.getElementById('plate-error')?.focus()
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            <fieldset disabled={busy}>
              <div className="pq-fields">
                <label className="pq-wide">
                  Plate name
                  <input
                    required
                    autoComplete="off"
                    value={draft.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </label>
                <label>
                  Project
                  <input
                    required
                    autoComplete="off"
                    value={draft.project}
                    onChange={(e) => set('project', e.target.value)}
                  />
                </label>
                <label>
                  Revision
                  <input
                    required
                    autoComplete="off"
                    placeholder="R5"
                    value={draft.revision}
                    onChange={(e) => set('revision', e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    aria-label="Status"
                    value={draft.status}
                    onChange={(e) =>
                      set('status', e.target.value as PlateInput['status'])
                    }
                    disabled={!!draft.supersededBy}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Successful copies printed
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    value={draft.printed}
                    onChange={(e) => set('printed', Number(e.target.value))}
                  />
                </label>
                <label>
                  Purpose
                  <select
                    aria-label="Purpose"
                    value={draft.purpose}
                    onChange={(e) => {
                      const purpose = e.target.value as PlateInput['purpose']
                      set('purpose', purpose)
                      if (purpose !== 'test') set('testResult', '')
                    }}
                  >
                    <option value="">Unset</option>
                    <option value="test">Test print</option>
                    <option value="production">Production</option>
                  </select>
                </label>
                {/* Stays visible while a result is set, so it can be cleared. */}
                {draft.purpose === 'test' &&
                  (draft.printed > 0 || !!draft.testResult) && (
                    <label>
                      Test result
                      <select
                        aria-label="Test result"
                        value={draft.testResult}
                        onChange={(e) =>
                          set(
                            'testResult',
                            e.target.value as PlateInput['testResult']
                          )
                        }
                      >
                        <option value="">Awaiting result</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </select>
                    </label>
                  )}
              </div>
              <h3>Parts on this plate</h3>
              <p className="pq-help">
                Required = this row’s share of the project. Copies needed use
                the largest required ÷ on-plate quantity, rounded up.
              </p>
              <div className="pq-part-labels" aria-hidden="true">
                <span>Part</span>
                <span>Required</span>
                <span>On plate</span>
                <span />
              </div>
              {draft.parts.map((part, index) => (
                <div className="pq-part" key={index}>
                  <input
                    aria-label={`Part ${index + 1} name`}
                    autoComplete="off"
                    required
                    value={part.name}
                    onChange={(e) =>
                      set(
                        'parts',
                        draft.parts.map((p, i) =>
                          i === index ? { ...p, name: e.target.value } : p
                        )
                      )
                    }
                  />
                  {(['required', 'onPlate'] as const).map((key) => (
                    <input
                      key={key}
                      aria-label={`Part ${index + 1} ${key === 'required' ? 'required' : 'on plate'}`}
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      required
                      value={part[key]}
                      onChange={(e) =>
                        set(
                          'parts',
                          draft.parts.map((p, i) =>
                            i === index
                              ? { ...p, [key]: Number(e.target.value) }
                              : p
                          )
                        )
                      }
                    />
                  ))}
                  <button
                    type="button"
                    aria-label={`Remove part ${index + 1}`}
                    onClick={() =>
                      set(
                        'parts',
                        draft.parts.filter((_, i) => i !== index)
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="pq-inline">
                <button
                  type="button"
                  onClick={() =>
                    set('parts', [
                      ...draft.parts,
                      { name: '', required: 1, onPlate: 1 },
                    ])
                  }
                >
                  Add part
                </button>
                <span>
                  {Number.isFinite(copiesNeeded(draft))
                    ? copiesNeeded(draft)
                    : '—'}{' '}
                  copies needed
                </span>
              </div>
              <div className="pq-fields">
                <label>
                  Material
                  <input
                    autoComplete="off"
                    placeholder="PETG"
                    value={draft.material}
                    onChange={(e) => set('material', e.target.value)}
                  />
                </label>
                <label>
                  Color
                  <input
                    autoComplete="off"
                    placeholder="Not selected"
                    value={draft.color}
                    onChange={(e) => set('color', e.target.value)}
                  />
                </label>
                <label className="pq-wide">
                  Printer / slicer profile
                  <input
                    autoComplete="off"
                    placeholder="Printer, nozzle, layer height, walls, infill"
                    value={draft.profile}
                    onChange={(e) => set('profile', e.target.value)}
                  />
                </label>
                <label>
                  Grams per copy
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Unknown / unsliced"
                    value={draft.grams ?? ''}
                    onChange={(e) =>
                      set(
                        'grams',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                  />
                </label>
                <label>
                  Minutes per copy
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Unknown / unsliced"
                    value={draft.minutes ?? ''}
                    onChange={(e) =>
                      set(
                        'minutes',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                  />
                </label>
                <label className="pq-wide">
                  Plate artifact path or link
                  <input
                    autoComplete="off"
                    placeholder="/Users/…/plate.3mf or https://…"
                    aria-label="Plate artifact path or link"
                    value={draft.artifact}
                    onChange={(e) => set('artifact', e.target.value)}
                  />
                  <span className="pq-help">
                    Local paths are stored as references; files are never
                    uploaded.
                  </span>
                </label>
                {draft.artifact && (
                  <div className="pq-wide pq-inline">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(draft.artifact)
                          setArtifactNotice('Artifact reference copied.')
                        } catch {
                          setArtifactNotice(
                            'Select and copy the artifact field above.'
                          )
                        }
                      }}
                    >
                      Copy artifact reference
                    </button>
                    {/^https?:\/\//i.test(draft.artifact) && (
                      <a href={draft.artifact} target="_blank" rel="noreferrer">
                        Open artifact link
                      </a>
                    )}
                    <span role="status">{artifactNotice}</span>
                  </div>
                )}
                <label className="pq-wide">
                  Superseded by
                  <input
                    autoComplete="off"
                    placeholder="Leave empty for current revision"
                    aria-label="Superseded by"
                    value={draft.supersededBy}
                    onChange={(e) => {
                      set('supersededBy', e.target.value)
                      if (e.target.value.trim()) set('status', 'blocked')
                    }}
                  />
                  <span className="pq-help">
                    A replacement revision blocks this plate and removes it from
                    totals.
                  </span>
                </label>
                <label className="pq-wide">
                  Notes / source evidence
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            {error && (
              <p
                id="plate-error"
                role="alert"
                tabIndex={-1}
                className="pq-error"
              >
                {error} Your edits are still here. For a conflict, copy your
                changes before cancelling and refreshing.
              </p>
            )}
            <div className="pq-editor-actions">
              <button type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button className="pq-primary" disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Save plate'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
