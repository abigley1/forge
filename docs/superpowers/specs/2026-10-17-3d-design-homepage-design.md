# 3D Design homepage — design

Date: 2026-10-17 · Branch: `forge-v2` · Status: design approved; §7 data to be reconfirmed before rollout step 5

## Intent

Andrew asked for "a 3d design homepage that tracks what each one of our 3d design
projects and what stage it's in, like if we're still doing test prints or if we're
printing production plates and if we are like how many have we done".

Success means: one Forge page, deployed to the Home Assistant add-on, that lists
Andrew's real 3D design projects, shows each project's stage, and, for projects in
production, shows how many production plates are printed out of how many are
planned. Every number must come from recorded evidence. Designed, sliced, queued,
printed and validated are different facts. A sliced or queued plate never counts
as printed.

Decisions made during brainstorming:

1. **Data home:** the real print queue (43 records, version 107) lives only in the
   Mac database `~/Documents/Codex/2026-10-14/task-3/runtime/forge.sqlite`. It moves
   to the HA add-on as part of this deploy, and HA becomes the single source of truth.
2. **Stage source:** the stage is declared per project. Counts are derived from plates
   tagged test or production. Disagreements are flagged, never auto-corrected.
3. **Initial projects:** the projects already in the queue, with the "Completed prints"
   pseudo-project reassigned. Andrew confirms the proposed table in §7 before anything
   is written.
4. **Approach A:** a new `design_projects` table (migration 7) plus two plate fields.

## 1. Stage model

Declared stages, in pipeline order: `designing`, `test-printing`, `production`,
`done`, `on-hold`. Each project also has an optional free-text `stageNote` of up to
500 characters. Nothing changes a stage automatically.

## 2. Derived facts (pure model)

New file `server/src/design-projects-model.ts`. Like `print-queue-model.ts`, it has no
dependencies and the frontend imports it directly. The Docker frontend build copies
it explicitly, the same way it copies the queue model.

`summarizeProject(project, plates)` uses the plates whose `project` matches the
project name (trimmed, case-insensitive). "Current" means `supersededBy` is empty.

| Fact | Rule |
|---|---|
| `planned` | current plates with status `draft` or `blocked` (count of plates) |
| `queued` | current plates with status `ready` or `printing`; sum of `copiesRemaining` |
| `test.printed` | sum of `printed` over current `purpose=test` plates |
| `test.passed` / `test.failed` | sum of `printed` over current test plates with `testResult` `pass` / `fail` |
| `test.awaiting` | sum of `printed` over current test plates with `printed > 0` and no `testResult` |
| `production.printed` | sum of `printed` over current `purpose=production` plates |
| `production.planned` | sum of `copiesNeeded` over current production plates |
| `production.planComplete` | false if any current production plate has no parts (placeholder). The UI then shows "at least N". |
| `earlierRevisions.printed` | sum of `printed` over superseded plates (any purpose), listed and never added to current counts |
| `untagged.printed` | sum of `printed` over current plates with no `purpose` |

`testResult` applies to the whole plate. A plate printed twice with result `pass`
counts as two passed copies. That is the same granularity as `printed`.

Flags, as `{ code, message }`:

- `production-without-plan`: stage `production`, `production.planned === 0`.
- `untagged-prints`: `untagged.printed > 0`.
- `tests-awaiting-result`: `test.awaiting > 0`.
- `production-before-stage`: stage `designing` or `test-printing`, and a current
  production plate has status `printing` or `printed > 0`.
- `done-with-remaining`: stage `done` and `production.printed < production.planned`.

Not claimed anywhere: "sliced" (an artifact may be a CAD zip), "validated" without
`testResult`, or progress from status `ready`/`printing` alone.

`unassignedPlates(projects, plates)` returns the queue `project` names that match no
design project, with plate counts.

## 3. Storage

**Migration 7** in `server/src/db/index.ts` (`SCHEMA_VERSION` 6 → 7):

```sql
CREATE TABLE IF NOT EXISTS design_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  stage TEXT NOT NULL CHECK(stage IN ('designing','test-printing','production','done','on-hold')),
  stage_note TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Plate fields** in `print-queue-model.ts`:

- `purpose: '' | 'test' | 'production'`
- `testResult: '' | 'pass' | 'fail'`

`validatePlate` treats a missing field as `''`, so the 43 existing records load
unchanged. New rules: `testResult` requires `purpose === 'test'` and `printed > 0`.
`emptyPlate` gets both fields as `''`. The CLI `edit` merge and `seed` keep working.

## 4. API

New router `server/src/routes/design-projects.ts` and repository
`server/src/db/DesignProjectsRepository.ts`. Responses use the Forge
`{success, data}` / `{success:false, error}` convention. 400 means validation,
404 means missing, 409 means a stale version or a duplicate name.

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/design-projects` | none | `{ queueVersion, projects: [{...project, summary, plates}], unassigned }` |
| POST | `/api/design-projects` | `{ project: {name, stage, stageNote} }` | 201, created project |
| PUT | `/api/design-projects/:id` | `{ version, project: {name, stage, stageNote} }` | updated project |

**Rename** happens in one immediate SQLite transaction. It updates the project row,
rewrites `project` on every plate matching the old name, and bumps the queue version
only if plates changed. A rename into an existing name returns 409.

**One-time import:** `POST /api/print-queue/import` with body
`{ version: 0, plates: PrintPlate[] }`. It is accepted only when the stored queue has
version 0 and zero plates. Otherwise it returns 409 and changes nothing. It validates
every plate with `validatePlate`, requires unique string IDs and ISO `updatedAt`, and
keeps `id`, order, `printed` and `updatedAt` as supplied. The stored version becomes 1.

Plates are tagged through the existing `PUT /api/print-queue/:id`.

`scripts/design-projects.mjs` gives dot `list`, `add NAME STAGE [NOTE]` and
`stage ID STAGE [NOTE]`. It reads the version before each mutation and never retries
a 409. `docs/PRINT_QUEUE.md` gets a short section on purpose/testResult and the new API.

## 5. UI

- **Entry:** a **3D Design** button on `WelcomeScreen` next to Print queue, and the
  `/?tool=3d-design` URL. `App.tsx` `standaloneTool` gains `'3d-design'`, rendered full
  page with a back breadcrumb and no sidebar.
- **`src/components/design-projects/DesignProjectsView.tsx`** has:
  - A header with a per-stage count strip that doubles as a filter, and Refresh.
  - Project cards grouped by stage in pipeline order (`on-hold` last). Each card shows
    the name, a stage chip with an icon and text, the stage note, and a headline:
    - production: `X / Y production plates printed` with a progress bar, or `at least Y`;
    - test-printing: `N test prints · P passed · F failed · A awaiting result`;
    - designing: `No prints yet` or `N plates planned`;
    - done: `X production plates printed`;
    - on-hold: the most advanced non-zero fact.
  - Secondary rows on each card: queued, planned-not-ready, earlier-revision prints,
    and flags shown with a warning icon plus text.
  - An expandable plate list on each card (name, revision, purpose, status,
    printed/needed) and an "Open in print queue" link.
  - A **Change stage** form on each card (stage select and note) and **Rename**. A 409
    is shown inline and the form keeps its input.
  - An **Unassigned plates** strip, with **Add as project** for each queue project name.
  - Explicit loading, error-with-Retry and empty states. There is never sample data.
  - Refresh every 15 s while the page is visible and no form is open.
- **`PlateEditor.tsx`** gets a Purpose select (Unset/Test/Production) and a Test result
  select. The Test result select appears only when the purpose is Test and printed > 0.
- **Styling:** forge-* Tailwind tokens, mono uppercase labels, Inter body text, amber only
  for progress/active marks, transform/opacity-only motion with reduced-motion respected,
  44 px targets, and `h-dvh`.

## 6. Testing

- `design-projects-model.test.ts`: every rule and flag in §2, superseded history, the
  "at least" placeholder, case-insensitive matching, and unassigned plates.
- `print-queue-model` tests: legacy records without the new fields load, and the
  `testResult` rules.
- `DesignProjectsRepository`/route tests on a temp DB: migration 6 → 7 on a v6 database,
  create, duplicate 409, stale-version 409, rename rewriting plates atomically (with
  rollback on failure), and import only into an empty queue (IDs, order and `printed`
  preserved; non-empty → 409; invalid plate → 400 and nothing written).
- Component tests: a card headline for each stage, flags, the error state with Retry,
  and the empty state.
- An `App` routing test for `?tool=3d-design`.
- Local end-to-end run against a **copy** of the Mac DB. The Mac original is never
  opened read-write.

## 7. Initial data (approved as a proposal; reconfirm with Andrew before rollout step 5)

This is applied through the API after the import. Every row cites the queue record it
comes from. Plates not listed keep `purpose` unset.

| Project | Proposed stage | Note | Plate tags |
|---|---|---|---|
| Entry shelf | on-hold | R6 visual review pending; archived from queue 2026-10-16 | R6 plates 01–07: production. R6 "Optional · Fluting and center seam sample": test. R4/R5 rows (superseded, unprinted): production. |
| Pipe corral | test-printing | R3 and R4 fit tests printed 2026-10-13; results not recorded | R3 "Span and joint test", R4 "Pipe corral fit test": test, **result unset until Andrew says pass or fail** |
| Basic 9U rack | production | Remaining 9U work removed; one extra 6U M5-nut leg archived 2026-10-16 | Jobs 1335123553 and 1336857604 moved from "Completed prints" to this project: production. Archived plates 02–08 and the 6U leg: production. |
| 6U magnetic frame | done | Two runs printed 2026-10-14 | Jobs 1337767358 and 1338136548 moved from "Completed prints": production. *Alternative: fold into Basic 9U rack.* |
| Gridfinity pegboard | done | Baseplate printed 2026-10-13 | Job 1337190057 moved from "Completed prints": production. *Alternative: leave unassigned if it isn't one of "our" designs.* |
| Pebble caddy | on-hold | R6 form review pending; R2 rejected; archived 2026-10-16 | R6 placeholder: production (no parts yet, so "at least 0") |
| FarmLoop Stage 1 · P2S | on-hold | Blocked on bender screws, shield attachment, stock; archived 2026-10-16 | Plates 1–5: production |

Moving a "Completed prints" job changes only that record's `project` text. The
revision, notes, printed count and status stay as they are.

## 8. Rollout (each step needs Andrew's go-ahead to deploy)

1. Andrew re-authenticates Docker to ghcr (the keychain error -25293 blocks pushes).
2. Back up the HA database: copy `forge.sqlite` from the add-on data directory over SSH.
3. Bump `forge/config.yaml`, coordinating the version with the other forge-v2 session's
   0.0.7. Then buildx push and `ha addons update a58add88_forge`.
4. POST `/api/print-queue/import` with the Mac queue document as read from its running
   API. The Mac DB file is untouched.
5. Apply §7 through the API. Read it back and check that the plate count is 43, the
   printed copies are unchanged, and each project's summary matches §7.
6. Freeze the Mac queue. Its database stays as a backup and its launcher is not used for
   edits. The Mac-only "Open in Bambu Studio" handoff then only knows the frozen rows;
   re-pointing it at HA is a separate follow-up.

## Out of scope

Printer integration, automatic stage changes, slice detection, the Codex-folder-only
projects (they can be added later through the UI/CLI), re-pointing the Studio handoff,
and the two known InventorySidebar test failures.
