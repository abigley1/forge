# Shared print queue

Open Forge → **Print queue**, or bookmark `/?tool=print-queue` on the same Forge origin.
The queue is a standalone tool beside Inventory. It uses the same Express server,
SQLite database and existing hosting/access boundary. There are no new services,
accounts, printer connections or remote uploads.

## For Andrew

- **Add plate**: name, project and revision, then each part's required quantity and
  quantity on one plate. Required is the allocation to **this queue row**, not a
  project-wide total duplicated across multiple plates.
- Copies needed = the largest `ceil(required / onPlate)` for the plate's parts.
  Copies remaining = needed minus successful full copies, bounded at zero.
  Example: four required hooks with one hook on the plate means four copies.
- Drag the grip to reorder; keyboard users can focus the grip and press Space,
  arrow keys, then Space. Up/down buttons also work, including on mobile. Order is
  global; filtering does not create a separate priority list. Arrows move one
  position in the full queue, including hidden rows.
- **Edit** changes quantities, status, material, color, profile, estimates, local
  artifact reference or web link, and notes. Blank estimates mean unknown, not zero.
  Estimates are per plate copy; totals multiply them by remaining copies.
- **Record 1 printed** records one successful full copy. It never starts a printer.
  The last required copy sets the status to done. Failed prints never add to the
  successful-copy count. For partial failures, adjust the required allocation or
  split the residual parts into another plate; don't count a partial plate as a
  successful full copy.
- **Superseded by** immediately sets blocked and excludes the old plate from totals.
  Use the Superseded filter to see its history. Clear that field deliberately to
  restore it, then choose a status. A done status requires fulfilled quantities.
- A plate artifact is a local absolute path or HTTP(S) link. **Copy artifact
  reference** copies the path for Finder / slicer use. Web links have an Open link.
  No arbitrary local file server or file upload is added.
- Current queue hides done and superseded records. Totals always cover **all**
  current records, even when filtered, and explicitly report unknown/unplanned work.
  Drafts and blocked items are planning demand, not instructions to print now.

Changes save immediately on the server. Other clients refresh every 15 seconds
when visible and outside the editor, or manually with Refresh. Version checks
reject stale edits with HTTP 409. Unsaved form content is retained on a conflict;
copy the intended changes, cancel, refresh, and reapply against the latest state.
The form warns before discarding unsaved changes. No automatic last-writer-wins
merge is performed.

## For dot / agents

The durable API is `/api/print-queue`. Read its version before each mutation. The
UI and agent API share exactly one queue. Every successful mutation returns the
new version and complete ordered plate list.

```sh
node scripts/print-queue.mjs list
node scripts/print-queue.mjs add /absolute/path/new-plate.json
node scripts/print-queue.mjs edit PLATE_ID /absolute/path/patch.json
node scripts/print-queue.mjs move PLATE_ID 1
```

`FORGE_API_URL` optionally selects another Forge API. The default is the live
queue on Home Assistant, `http://192.168.1.130:8099/api`. The Mac's
`127.0.0.1:3000` server is a read-only mirror and refuses edits (HTTP 405). `edit` merges the supplied top-level fields into the
freshly read plate; a `parts` array replaces that whole array. `move` takes a
one-based global position. Do not automatically retry conflicts with a stale full
plate. Re-read and reconcile the intended edit first.

`seed FILE.json` adds an array of plate inputs, skipping an existing matching
project/revision/name. It never overwrites existing records or sets physical
completion independently of the supplied evidence. It is not an automatic startup
seed. Renaming an imported record changes this simple deduplication key.

Example new-plate JSON:

```json
{
  "name": "Hook plate", "project": "Entry shelf", "revision": "R5",
  "parts": [{"name": "double_hook", "required": 4, "onPlate": 1}],
  "printed": 0, "status": "draft", "purpose": "production", "testResult": "",
  "material": "PETG", "color": "",
  "profile": "", "grams": null, "minutes": null,
  "artifact": "/absolute/path/hook.3mf", "supersededBy": "", "notes": ""
}
```

| Method | Path | JSON body |
|---|---|---|
| GET | `/api/print-queue` | none |
| POST | `/api/print-queue` | `{ "version": N, "plate": PlateInput }` |
| PUT | `/api/print-queue/:id` | `{ "version": N, "plate": complete PlateInput }` |
| POST | `/api/print-queue/reorder` | `{ "version": N, "ids": [every ID exactly once] }` |

Responses use Forge's `{success, data}` / `{success:false, error}` convention.
HTTP 400 is validation failure, 404 is missing plate, 409 is stale version.
Allowed statuses: draft, ready, printing, done, failed, blocked. Optional `purpose`
is `test`, `production` or empty; `testResult` (`pass`/`fail`) is only valid on a
test plate with at least one printed copy. Ready/printing/done
require named parts and an artifact; a draft or blocked review placeholder may
have unknown quantities (empty parts). IDs and timestamps are assigned server-side.

## Storage, builds and scope

`print_queue` is an additive singleton table in the existing `FORGE_DB_PATH`
(default `FORGE_DATA_DIR/forge.sqlite`). It holds an ordered JSON array plus an
integer version. Writes use an immediate SQLite transaction, so a concurrent
process cannot overwrite the read version. Other Forge tables are untouched.
The feature does not rewrite existing inventory or project records.

The pure shared validation/calculation model is `server/src/print-queue-model.ts`;
the frontend imports it directly. The existing Docker frontend build copies that
file explicitly. No new dependency is required. `FORGE_HOST` now optionally sets
the HTTP bind address; existing deployment behavior is preserved when omitted.
For local-only execution use `FORGE_HOST=127.0.0.1`.

Checks: `npm run build`, `npm run build --prefix server`,
`npm test --prefix server`, and `npm test -- --run src/App.test.tsx`.
Queue API tests cover quantities, unknown estimates, persistence through a fresh
repository, all status transitions, invalid inputs, stale edits and reorder integrity.

The live queue has been on the Home Assistant add-on since 0.0.7 (2026-10-17).
The Mac's own copy of the queue (`~/Documents/Codex/2026-10-14/task-3/runtime/forge.sqlite`)
is a retired, frozen backup. Nothing reads or writes it any more; see below.
No auth layer, credentials, persistent access, or public hosting was added.

## Local previews and Studio handoff

### The Mac mirrors the live queue

Studio handoff has to run on the Mac, but the queue lives on Home Assistant. The
Mac launcher sets `FORGE_PRINT_QUEUE_UPSTREAM=http://192.168.1.130:8099/api`.
With that set, the Mac server:

- serves `GET /api/print-queue` and `GET /api/design-projects` from the live
  queue. The page shows a **View only** notice that links to the live queue, and
  has no add, edit, reorder or "Record 1 printed" controls;
- refuses every other method on those routes with HTTP 405 and a message that
  names the live API. A script or agent pointed at the Mac fails loudly instead
  of editing a copy nobody reads;
- validates every Studio preview and open against the live row, fetched when the
  request arrives. The manifest's expected fields are compared with that row;
- never falls back to the retired local queue. If Home Assistant is unreachable or
  returns anything that fails the queue's own validation, the queue page shows an
  error, previews and Studio handoff pause, and nothing opens.

Live rows only decide whether a prepared asset is still current. Every path, hash
and file comes from the local manifest, so nothing from the network can choose
what Studio opens. The upstream URL comes only from the launcher's environment;
the browser cannot set it. Without `FORGE_PRINT_QUEUE_UPSTREAM`, a server keeps
its own editable queue, as Home Assistant does.

Prepared rows show a thumbnail from their saved geometry. Click it to enlarge and
check the project, revision, material and part counts. Unsliced CAD is labeled;
missing previews remain explicit. A changed revision, artifact, part allocation,
material, profile or file content invalidates the prepared asset until reviewed.

**Open in Bambu Studio** offers a separate review window with a copy of a validated
single-plate P2S 0.4 mm project. It never dispatches a print or changes completion
counts. Current shelf R6 and caddy R6 remain withheld pending profile/design review.
Blocked FarmLoop jobs can open for review, but their assembly/stock blockers remain.

This capability is enabled only on a Mac bound to `127.0.0.1`, with an explicit
`FORGE_STUDIO_MANIFEST` outside both the writable data directory and static root.
The local launcher selects `studio-assets/manifest.json`. Keep this folder private
to filesystem tools: do not expose it through `/api/files` or static hosting.
The manifest maps queue IDs to expected row fields, source SHA-256, and basename/
SHA-256 pairs for PNG and optional 3MF files. Browser requests cannot supply paths.
The route checks same-origin browser context, exact host, loopback peer, a rotating
in-memory token for opening, file hashes, symlink boundaries, and recent duplicates.

The selected app is `/Volumes/Bambu Studio/BambuStudio.app`, version 2.8.2.61.
It must remain mounted. A missing app or enabled/unknown single-instance setting
fails safely; it never silently falls back to the installed 2.4 app. Existing
single-instance=false is required, and the service changes no Studio preferences.
Review copies accumulate under `studio-assets/opened-copies`; preserve any copies
Andrew edits. No background printer control, login or auto-start service is added.

For dot: normal queue additions and reorder still use the API/CLI above, against
the live queue on Home Assistant. New rows
do not acquire invented previews or automatic Studio eligibility. Prepare and
inspect actual CAD renders and a single-job project, slice it locally, then register
its hashes and current row fields in the manifest atomically. The October 14 task
contains `prepare-studio-projects.py`, `validate-studio-projects.py` and
`register-studio-assets.py` as evidence-specific examples, not a universal importer.
Do not rerun their frozen-source preparation against newer revisions without review.

## 3D Design homepage

Open Forge → **3D Design**, or bookmark `/?tool=3d-design`. Each 3D design project
has a **declared stage** (designing, test-printing, production, done, on-hold) and a
short note. Nothing changes a stage automatically. Counts come only from queue facts:

- Tag each plate's **Purpose** (Test print / Production) in the plate editor.
  Printed plates without a tag are flagged, never guessed.
- For a printed test plate, set **Test result** (pass/fail). Printed is not validated.
- Production shows printed copies out of copies needed on current production plates.
  "At least" means a production plate has no parts yet. Prints on superseded plates
  show as earlier-revision history and never count toward the current plan.
- Ready, printing, queued or an attached artifact never count as printed.
- Plates link to a project by matching `project` text, ignoring case and outer
  spaces. Renaming a project rewrites matching plates in the same transaction.
  Queue projects with no design project appear under **Unassigned plates**.

| Method | Path | JSON body |
|---|---|---|
| GET | `/api/design-projects` | none → `{queueVersion, projects: [{…, summary, plates}], unassigned}` |
| POST | `/api/design-projects` | `{ "project": {name, stage, stageNote} }` |
| PUT | `/api/design-projects/:id` | `{ "version": N, "project": {name, stage, stageNote} }` |
| POST | `/api/print-queue/import` | `{ "version": 0, "plates": [complete plates with id/updatedAt] }` |

The import is a one-time move of an existing queue (used to move the Mac queue onto
Home Assistant). It only works on an empty queue, keeps IDs, order, printed counts
and timestamps, and writes nothing if any plate is invalid.

```sh
node scripts/design-projects.mjs list
node scripts/design-projects.mjs add "Pipe corral" test-printing "R4 fit test printed"
node scripts/design-projects.mjs stage PROJECT_ID production "R6 plates released"
node scripts/design-projects.mjs rename PROJECT_ID "Basic 9U rack"
```

## Owned filament reference

See [Andrew's owned filament and P2S starting profiles](materials-p2s/README.md) for
stock, material selection, drying/feed restrictions and exact profile names. The
2026-10-15 stock is a dated user report, not a live counter. Keep meter quantities
and approximate conversions distinct. START presets are not physical calibration.
