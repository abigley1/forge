import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Printer,
  RefreshCw,
} from 'lucide-react'
import {
  copiesNeeded,
  copiesRemaining,
  queueTotals,
  statuses,
  type PrintPlate,
  type PrintQueue,
} from '../../../server/src/print-queue-model'
import { queueRequest } from './api'
import { PlateEditor } from './PlateEditor'
import { PlateStudio } from './PlateStudio'
import { useStudioAssets, type StudioAsset } from './studio-api'
import './print-queue.css'

const time = (minutes: number) =>
  `${Math.floor(Math.round(minutes) / 60)}h ${Math.round(minutes) % 60}m`
function PlateRow({
  plate,
  index,
  busy,
  canUp,
  canDown,
  move,
  edit,
  complete,
  studioAsset,
}: {
  plate: PrintPlate
  index: number
  busy: boolean
  canUp: boolean
  canDown: boolean
  move: (direction: number) => void
  edit: () => void
  complete: () => void
  studioAsset?: StudioAsset
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plate.id, disabled: busy })
  const remaining = copiesRemaining(plate)
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`pq-row ${isDragging ? 'pq-dragging' : ''}`}
      data-plate-id={plate.id}
    >
      <div className="pq-order">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag ${plate.name}`}
          disabled={busy}
          className="pq-grip"
        >
          <GripVertical size={18} />
        </button>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div className="pq-arrows">
          <button
            aria-label={`Move ${plate.name} up`}
            disabled={busy || !canUp}
            onClick={() => move(-1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            aria-label={`Move ${plate.name} down`}
            disabled={busy || !canDown}
            onClick={() => move(1)}
          >
            <ArrowDown size={15} />
          </button>
        </div>
      </div>
      <div className="pq-plate">
        <span className="pq-project">
          {plate.project} · {plate.revision}
        </span>
        <button className="pq-name" onClick={edit} disabled={busy}>
          {plate.name}
        </button>
        <p>
          {plate.parts.length
            ? plate.parts
                .map((p) => `${p.onPlate} × ${p.name.replaceAll('_', ' ')}`)
                .join(' · ')
            : 'Parts and plate layout not confirmed'}
        </p>
        <p className="pq-material">
          {plate.material || 'Material undecided'}
          {plate.color ? ` / ${plate.color}` : ''}
        </p>
        {plate.supersededBy && (
          <p className="pq-warning">Superseded by {plate.supersededBy}</p>
        )}
        <PlateStudio
          key={`${plate.id}:${plate.updatedAt}:${studioAsset?.binding ?? ''}`}
          plate={plate}
          asset={studioAsset}
        />
      </div>
      <div className="pq-status-cell">
        <span className={`pq-status pq-${plate.status}`}>
          {plate.supersededBy ? 'superseded' : plate.status}
        </span>
        <span className="pq-help">
          {plate.artifact ? 'Artifact linked' : 'No artifact yet'}
        </span>
      </div>
      <div className="pq-count">
        <strong>{plate.parts.length ? remaining : '—'}</strong>
        <span>copies left</span>
        <small>
          {plate.printed} / {copiesNeeded(plate)} printed
        </small>
      </div>
      <div className="pq-estimate">
        <span>
          {plate.grams === null ? '— g' : `${plate.grams.toLocaleString()} g`}
        </span>
        <span>
          {plate.minutes === null ? 'Unsliced / unknown' : time(plate.minutes)}
        </span>
        <small>per copy</small>
      </div>
      <div className="pq-actions">
        <button onClick={edit} disabled={busy}>
          Edit
        </button>
        {!plate.supersededBy &&
          remaining > 0 &&
          ['ready', 'printing'].includes(plate.status) && (
            <button disabled={busy} onClick={complete}>
              Record 1 printed
            </button>
          )}
      </div>
    </li>
  )
}
export function PrintQueueView({ onBack }: { onBack: () => void }) {
  const [queue, setQueue] = useState<PrintQueue | null>(null)
  const studioAssets = useStudioAssets(queue?.version)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<{
    plate?: PrintPlate
    version: number
  } | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('active')
  const [page, setPage] = useState(0)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const refresh = useCallback(async () => {
    try {
      const next = await queueRequest()
      setQueue((q) => (!q || next.version >= q.version ? next : q))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load queue.')
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  useEffect(() => {
    if (editor || busy) return
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [refresh, editor, busy])
  const mutate = async (
    operation: () => Promise<PrintQueue>,
    message: string
  ) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      setQueue(await operation())
      setNotice(message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }
  const reorder = (from: number, to: number) => {
    if (!queue || to < 0 || to >= queue.plates.length || from === to) return
    void mutate(
      () =>
        queueRequest('POST', '/reorder', {
          version: queue.version,
          ids: arrayMove(queue.plates, from, to).map((p) => p.id),
        }),
      'Queue order saved.'
    )
  }
  const totals = queueTotals(queue?.plates ?? [])
  const filtered = (queue?.plates ?? []).filter((p) => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'active'
        ? !p.supersededBy && p.status !== 'done'
        : filter === 'superseded'
          ? !!p.supersededBy
          : !p.supersededBy && p.status === filter)
    return (
      matchesStatus &&
      `${p.project} ${p.revision} ${p.name} ${p.material} ${p.parts.map((part) => part.name).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  })
  const pages = Math.max(1, Math.ceil(filtered.length / 30))
  const currentPage = Math.min(page, pages - 1)
  const visible = filtered.slice(currentPage * 30, currentPage * 30 + 30)
  return (
    <div className="pq-shell">
      <header className="pq-top">
        <button onClick={onBack}>← Forge</button>
        <span>/</span>
        <span>Print queue</span>
      </header>
      <main className="pq-main">
        <div className="pq-heading">
          <div>
            <h1>
              <Printer size={26} /> Print queue
            </h1>
            <p>One shared order for what’s next on the printer.</p>
          </div>
          <button
            className="pq-primary"
            disabled={!queue || busy}
            onClick={() => setEditor({ version: queue!.version })}
          >
            <Plus size={18} /> Add plate
          </button>
        </div>
        <div className="pq-summary">
          <div>
            <strong>{totals.copies}</strong>
            <span>copies remaining</span>
          </div>
          <div>
            <strong>
              {totals.copies > 0 && totals.unknownGrams === totals.copies
                ? '—'
                : totals.grams.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
              g
            </strong>
            <span>known material · {totals.unknownGrams} unknown copies</span>
          </div>
          <div>
            <strong>
              {totals.copies > 0 && totals.unknownTime === totals.copies
                ? '—'
                : time(totals.minutes)}
            </strong>
            <span>known print time · {totals.unknownTime} unknown copies</span>
          </div>
          <div>
            <strong>
              {
                (queue?.plates ?? []).filter(
                  (p) => p.status === 'ready' && !p.supersededBy
                ).length
              }
            </strong>
            <span>plates ready</span>
          </div>
        </div>
        <p className="pq-help pq-total-note">
          Totals cover remaining copies across all current plates, including
          drafts and blocked work. Done and superseded plates are excluded.
          {totals.unplanned > 0
            ? ` ${totals.unplanned} unplanned items have no copy quantities yet.`
            : ''}
        </p>
        <div className="pq-toolbar">
          <label className="pq-search">
            Search queue
            <input
              type="search"
              placeholder="Project, plate or material…"
              autoComplete="off"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </label>
          <label>
            Show
            <select
              aria-label="Show"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(0)
              }}
            >
              {['active', 'all', ...statuses, 'superseded'].map((s) => (
                <option key={s} value={s}>
                  {s === 'active'
                    ? 'Current queue'
                    : s === 'all'
                      ? 'All plates'
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy || !!editor} onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
        {error && (
          <p role="alert" className="pq-error">
            {error}
          </p>
        )}
        <div className="pq-list-meta">
          <span>
            {filtered.length} {filtered.length === 1 ? 'plate' : 'plates'} ·
            Drag to reorder, or use the arrows
          </span>
          <span role="status">
            {busy
              ? 'Saving…'
              : notice ||
                (queue
                  ? `Saved on server · version ${queue.version}`
                  : 'Loading…')}
          </span>
        </div>
        <div className="pq-columns" aria-hidden="true">
          <span>Order</span>
          <span>Plate / project</span>
          <span>Status</span>
          <span>Copies</span>
          <span>Estimate</span>
          <span />
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (queue && over)
              reorder(
                queue.plates.findIndex((p) => p.id === active.id),
                queue.plates.findIndex((p) => p.id === over.id)
              )
          }}
        >
          <SortableContext
            items={visible.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="pq-list">
              {visible.map((plate) => {
                const index = queue!.plates.findIndex((p) => p.id === plate.id)
                return (
                  <PlateRow
                    key={plate.id}
                    plate={plate}
                    studioAsset={studioAssets[plate.id]}
                    index={index}
                    busy={busy}
                    canUp={index > 0}
                    canDown={index < queue!.plates.length - 1}
                    move={(direction) => reorder(index, index + direction)}
                    edit={() => setEditor({ plate, version: queue!.version })}
                    complete={() => {
                      void mutate(
                        () =>
                          queueRequest('PUT', `/${plate.id}`, {
                            version: queue!.version,
                            plate: {
                              ...plate,
                              printed: plate.printed + 1,
                              status:
                                plate.printed + 1 >= copiesNeeded(plate)
                                  ? 'done'
                                  : 'ready',
                            },
                          }),
                        `Recorded one successful copy of ${plate.name}.`
                      )
                    }}
                  />
                )
              })}
            </ol>
          </SortableContext>
        </DndContext>
        {queue && !filtered.length && (
          <div className="pq-empty">
            <h2>
              {queue.plates.length
                ? 'No matching plates'
                : 'Your next print starts here'}
            </h2>
            <p>
              {queue.plates.length
                ? 'Try another search or status.'
                : 'Add a plate, its parts and required quantities. The queue calculates the copies you need.'}
            </p>
          </div>
        )}
        {pages > 1 && (
          <div className="pq-pagination">
            <button
              disabled={!currentPage}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {currentPage + 1} / {pages}
            </span>
            <button
              disabled={currentPage + 1 >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        )}
        <footer className="pq-foot">
          Changes sync every 15 seconds. Recording a print updates this queue
          only; it never starts a printer. Open a plate to inspect its artifact
          reference and edit quantities.
        </footer>
      </main>
      {editor && (
        <PlateEditor
          plate={editor.plate}
          onClose={() => setEditor(null)}
          onSave={async (plate) => {
            const next = await queueRequest(
              editor.plate ? 'PUT' : 'POST',
              editor.plate ? `/${editor.plate.id}` : '',
              { version: editor.version, plate }
            )
            setQueue(next)
            setNotice('Plate saved.')
            setError('')
          }}
        />
      )}
    </div>
  )
}
