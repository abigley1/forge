# Forge 2.0 Foundation + Agent Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Forge trustworthy enough for agents to write to (Week 1). Then make every Claude Code and Codex session start with a Forge project brief and end with a recorded closeout, with no manual effort (Weeks 2–3).

**Architecture:** Keep the existing React/Vite + Express 5 + better-sqlite3 stack, the MCP server, and the Home Assistant add-on. Shared business rules (statuses, dependency readiness, brief assembly) go in a dependency-free `server/src/domain/` folder. The frontend imports it the same way it already imports `server/src/print-queue-model.ts`. A new `packages/forge-agent-hooks` CLI is wired into SessionStart and Stop hooks. It serves both clients, because Claude Code and Codex share the hook contract: SessionStart stdout becomes context, and Stop returns `{"decision":"block","reason":…}`.

**Tech Stack:** TypeScript 5.9, Express 5, better-sqlite3 12, Vitest 4, supertest 7, `@modelcontextprotocol/sdk` 1.x, React 19, Zustand 5, Docker buildx → `ghcr.io/abigley1/forge`, Home Assistant add-on.

**Spec:** `~/Documents/ChatGPT/forge/review-2026-10-15/FORGE-V2-REVIEW.md` (Codex's review), as trimmed by the decisions below. Executors should read the review's "Trust problems" table and the "Spec decisions" section before starting.

## Spec decisions (the trimmed scope)

1. Stage 0 shrinks to: round-trip field fixes, runtime status validation plus a migration of legacy values, one shared dependency-readiness rule, per-node `version` with optional `expected_version` (409 on mismatch), a backup endpoint, and one restore drill. No event sourcing, no general concurrency rework.
2. The frontend does **not** send `expected_version` yet. It already sends field-level diffs (`forgeNodeToUpdateInput(previous, node)`), and overlapping UI batches would make it conflict with itself. The new risk is agent writes, so MCP sends it.
3. Every project-scoped MCP tool accepts `project_id`. `switch_project` remains only as a fallback default.
4. Project identity: server-side `workspace_links`, matched by longest path prefix first, then normalized git remote. An unlinked folder (for example a dated Codex task folder) gets a short list of active projects at SessionStart. The agent calls `link_workspace` when the user's task clearly belongs to one. No marker files.
5. The lifecycle hooks *are* the integration. There is no separate "Forge workflow" skill: guidance lives in the MCP tool descriptions and the Stop-hook `reason`.
6. The Stop hook asks for a closeout only when the workspace fingerprint changed since the last prompt. Pure Q&A sessions are never interrupted. Closeouts upsert on `(project_id, session_id)`, so repeats cannot duplicate.
7. Out of scope: Home/Inbox redesign, global search UI, inventory lots/units/reservations, InvenTree trial, attachments, graph work, mobile layout. Revisit only after the pilot (Task 17).
8. Kill criterion: by **2026-11-05**, if the pilot log does not show the brief saving re-explanation in most sessions, stop and rethink before building Stage 2.

## Global Constraints

- No stubs, fake data, or `NotImplementedError`-style placeholders in product code (user rule). Tests may create their own fixtures. Live verification uses real projects.
- "Done" means deployed to the Home Assistant add-on and verified against `http://192.168.1.130:8099/api`.
- `server/src/domain/*` must not import anything outside `server/src/domain/` (the frontend Docker stage copies only that folder).
- Hooks must fail open. Any error, timeout (2500 ms per HTTP call), or unreachable Forge → exit 0 with empty stdout (SessionStart) or `{}` (Stop).
- Brief markdown ≤ 6000 characters.
- Node 22 in Docker, Node 20 in CI. Don't use APIs newer than Node 20.
- Keep existing behavior for callers that omit the new fields (`expected_version`, `project_id`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Forge unreachable at session start or stop** (HA rebooting, off Tailscale). The hook must return quickly and print nothing, so the session isn't affected. Pinned by the Task 15 test "fails open when Forge is unreachable".
2. **Stop-hook loops.** When `stop_hook_active` is true, the hook must never block again. Pinned by the Task 15 test "does not block when stop_hook_active".
3. **Closeout recorded twice for one session** (the agent is re-prompted after more edits). It must update one row, not create two. Pinned by the Task 12 test "upserts on session_id".
4. **Agent writes over a newer edit.** A stale `expected_version` must return 409 with the current node and write nothing. Pinned by the Task 6 test "rejects stale expected_version".
5. **Path-prefix false positives.** `/Users/a/forge` must not match a link for `/Users/a/for`, and a nested subfolder of a linked path must match. Pinned by the Task 11 tests "matches nested folders" and "does not match sibling prefixes".

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/domain/nodeRules.ts` (new) | Canonical statuses per type, legacy aliases, `normalizeStatus`, `isDependencyResolved` |
| `server/src/domain/brief.ts` (new) | Pure `buildBrief(input)` → structured brief + capped markdown |
| `server/src/db/schema.ts` | `SCHEMA_VERSION` 6, `nodes.version`, `AGENT_LOOP_TABLES_SQL` |
| `server/src/db/index.ts` | Migrations 4→5 (statuses + version) and 5→6 (agent-loop tables) |
| `server/src/db/NodeRepository.ts` | `version` bump, `expectedVersion`, `VersionConflictError`, shared blocked rule |
| `server/src/db/WorkspaceRepository.ts` (new) | Link/resolve workspaces |
| `server/src/db/CloseoutRepository.ts` (new) | Upsert/list session closeouts |
| `server/src/db/InventoryRepository.ts` | `listWithPartNumbers()` for the brief |
| `server/src/routes/nodes.ts` | `pickNodeFields`, status validation, 409 handling |
| `server/src/routes/backup.ts` (new) | `GET /api/backup` consistent SQLite snapshot |
| `server/src/routes/workspaces.ts` (new) | `/api/workspaces/resolve`, `/api/workspaces/links` |
| `server/src/routes/closeouts.ts` (new) | `/api/projects/:projectId/closeouts/:sessionId` |
| `server/src/routes/brief.ts` (new) | `GET /api/projects/:projectId/brief` |
| `server/src/index.ts` | Mount new routers |
| `src/lib/blockedStatus.ts` | Delegate to domain rule; add `getBlockedTaskIds` |
| `src/components/kanban/KanbanView.tsx` | Use `getBlockedTaskIds` instead of `dependsOn.length > 0` |
| `forge/Dockerfile` | Copy `server/src/domain/` into frontend stage |
| `packages/forge-mcp-server/src/project-scope.ts` (new) | AsyncLocalStorage project scope + `project_id` param injection |
| `packages/forge-mcp-server/src/index.ts` | Use project scope; new tools; `expected_version` |
| `packages/forge-mcp-server/src/api-client.ts` | New endpoints; `version`/`expected_version` |
| `packages/forge-agent-hooks/*` (new package) | `forge-hook session-start|stop` CLI |
| `docs/plans/forge-v2-pilot-log.md` (new) | Pilot evidence |

---

# Week 1 — Trustworthy foundation

### Task 1: Preserve local work and take a pre-change backup

**Files:**
- Modify: `.gitignore`
- Commit: currently untracked/modified print-queue and materials work

**Interfaces:** none (housekeeping). Every later task assumes a clean `forge-v2` branch.

- [ ] **Step 1: Confirm branch and inspect the working tree**

Run: `git branch --show-current && git status --short`
Expected: `forge-v2`. About 44 entries, including `docs/PRINT_QUEUE.md`, `docs/materials-p2s/`, `server/src/print-queue-model.ts`, print-queue routes and components, plus root-level `*.png` screenshots.

- [ ] **Step 2: Ignore root-level screenshots instead of committing them**

Append to `.gitignore`:

```gitignore
# Ad-hoc review screenshots at repo root
/*.png
```

- [ ] **Step 3: Run the full checks on the preserved work before committing**

Run: `npm run type-check && npm test && (cd server && npm test) && (cd packages/forge-mcp-server && npm test)`
Expected: all pass. If anything fails, stop and report. Don't commit broken work under a "preserve" message.

- [ ] **Step 4: Commit the preserved work (excluding local Claude settings)**

```bash
git add -A
git reset .claude/settings.local.json
git commit -m "chore: preserve print queue, Studio handoff, and materials work

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Take a Home Assistant backup of the add-on before any deploy**

Use the `ha` skill (SSH into Home Assistant):

```bash
ha addons list | grep -i forge
ha backups new --addons <forge-addon-slug> --name "forge-pre-v2-2026-10-15"
ha backups list | grep forge-pre-v2
```

Expected: the backup appears in the list. Record its slug in the PR description.

---

### Task 2: Backup endpoint and restore drill

**Files:**
- Create: `server/src/routes/backup.ts`
- Create: `server/src/routes/backup.test.ts`
- Modify: `server/src/index.ts` (mount at `/api/backup`)

**Interfaces:**
- Produces: `GET /api/backup` → `200 application/vnd.sqlite3`, attachment `forge-<ISO>.sqlite`, a consistent snapshot via `db.backup()`.

- [ ] **Step 1: Write the failing test**

```ts
// server/src/routes/backup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Backup API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-backup-test-'))
    db = createTestDatabase()
    app = createApp({
      config: { port: 3000, dataDir: tempDir, staticDir: tempDir, dbPath: ':memory:' },
      db,
    }).app
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('returns a restorable SQLite snapshot containing current data', async () => {
    await request(app).post('/api/projects').send({ name: 'Desk risers' }).expect(201)

    const res = await request(app)
      .get('/api/backup')
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="forge-.*\.sqlite"/)
    const restoredPath = path.join(tempDir, 'restored.sqlite')
    await fs.writeFile(restoredPath, res.body as Buffer)
    const restored = new Database(restoredPath, { readonly: true })
    const names = restored.prepare('SELECT name FROM projects').all() as Array<{ name: string }>
    restored.close()
    expect(names.map((n) => n.name)).toContain('Desk risers')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/backup.test.ts`
Expected: FAIL, 404 from `/api/backup`.

- [ ] **Step 3: Implement the route**

```ts
// server/src/routes/backup.ts
/**
 * Backup API
 * - GET /api/backup - Download a consistent SQLite snapshot of the live database
 */
import { Router, Request, Response } from 'express'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { DatabaseInstance } from '../db/index.js'

export function createBackupRouter(db: DatabaseInstance): Router {
  const router = Router()

  router.get('/', async (_req: Request, res: Response) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-backup-'))
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(dir, `forge-${stamp}.sqlite`)
    try {
      await db.backup(file)
      res.setHeader('Content-Type', 'application/vnd.sqlite3')
      res.setHeader('Content-Disposition', `attachment; filename="forge-${stamp}.sqlite"`)
      res.send(await fs.readFile(file))
    } catch (error) {
      console.error('Error creating backup:', error)
      res.status(500).json({ error: 'Failed to create backup' })
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  return router
}
```

In `server/src/index.ts`, import `createBackupRouter` and add it next to the health router:

```ts
  app.use('/api/backup', createBackupRouter(db))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/backup.test.ts`
Expected: PASS. (If better-sqlite3 refuses to back up an in-memory DB, switch the test DB to a temp file path via `new Database(path)` + `CREATE_TABLES_SQL`. Don't drop the test.)

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/backup.ts server/src/routes/backup.test.ts server/src/index.ts
git commit -m "feat(server): add GET /api/backup consistent SQLite snapshot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared node rules (statuses + readiness)

**Files:**
- Create: `server/src/domain/nodeRules.ts`
- Create: `server/src/domain/nodeRules.test.ts`

**Interfaces:**
- Produces:
  - `type ForgeNodeType = 'task' | 'decision' | 'component' | 'note' | 'subsystem' | 'assembly' | 'module'`
  - `STATUS_BY_TYPE: Record<ForgeNodeType, readonly string[]>`
  - `LEGACY_STATUS_ALIASES: Partial<Record<ForgeNodeType, Readonly<Record<string, string>>>>`
  - `normalizeStatus(type: ForgeNodeType, status: unknown): { ok: true; status: string | undefined } | { ok: false; error: string }`
  - `isDependencyResolved(type: ForgeNodeType, status: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/domain/nodeRules.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeStatus, isDependencyResolved, STATUS_BY_TYPE } from './nodeRules.js'

describe('normalizeStatus', () => {
  it('accepts canonical statuses', () => {
    expect(normalizeStatus('task', 'in_progress')).toEqual({ ok: true, status: 'in_progress' })
    expect(normalizeStatus('decision', 'selected')).toEqual({ ok: true, status: 'selected' })
    expect(normalizeStatus('module', 'on_hold')).toEqual({ ok: true, status: 'on_hold' })
  })

  it('maps legacy aliases seen in live data to canonical values', () => {
    expect(normalizeStatus('decision', 'open')).toEqual({ ok: true, status: 'pending' })
    expect(normalizeStatus('decision', 'decided')).toEqual({ ok: true, status: 'selected' })
    expect(normalizeStatus('component', 'evaluating')).toEqual({ ok: true, status: 'considering' })
    expect(normalizeStatus('component', 'specified')).toEqual({ ok: true, status: 'selected' })
  })

  it('treats missing status as not provided', () => {
    expect(normalizeStatus('task', undefined)).toEqual({ ok: true, status: undefined })
    expect(normalizeStatus('task', null)).toEqual({ ok: true, status: undefined })
  })

  it('rejects unknown statuses with the allowed list', () => {
    const result = normalizeStatus('task', 'invalid-review-status')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('pending, in_progress, blocked, complete')
  })

  it('rejects any status on notes', () => {
    expect(normalizeStatus('note', 'pending').ok).toBe(false)
  })

  it('rejects non-string statuses', () => {
    expect(normalizeStatus('task', 3).ok).toBe(false)
  })
})

describe('isDependencyResolved', () => {
  it('resolves tasks only when complete', () => {
    expect(isDependencyResolved('task', 'complete')).toBe(true)
    expect(isDependencyResolved('task', 'in_progress')).toBe(false)
    expect(isDependencyResolved('task', null)).toBe(false)
  })

  it('resolves decisions only when selected', () => {
    expect(isDependencyResolved('decision', 'selected')).toBe(true)
    expect(isDependencyResolved('decision', 'pending')).toBe(false)
  })

  it('never blocks on components, notes, or containers', () => {
    expect(isDependencyResolved('component', 'considering')).toBe(true)
    expect(isDependencyResolved('note', null)).toBe(true)
    expect(isDependencyResolved('subsystem', 'planning')).toBe(true)
  })

  it('matches the frontend status unions', () => {
    expect(STATUS_BY_TYPE.task).toEqual(['pending', 'in_progress', 'blocked', 'complete'])
    expect(STATUS_BY_TYPE.decision).toEqual(['pending', 'selected'])
    expect(STATUS_BY_TYPE.component).toEqual(['selected', 'considering', 'rejected'])
    expect(STATUS_BY_TYPE.assembly).toEqual(['planning', 'in_progress', 'complete', 'on_hold'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/domain/nodeRules.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// server/src/domain/nodeRules.ts
/**
 * Node business rules shared by the server, frontend, and (via API) MCP.
 *
 * Dependency-free on purpose: the frontend imports this file directly and the
 * Dockerfile copies only server/src/domain/ into the frontend build stage.
 */

export type ForgeNodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

const CONTAINER_STATUSES = ['planning', 'in_progress', 'complete', 'on_hold'] as const

export const STATUS_BY_TYPE: Record<ForgeNodeType, readonly string[]> = {
  task: ['pending', 'in_progress', 'blocked', 'complete'],
  decision: ['pending', 'selected'],
  component: ['selected', 'considering', 'rejected'],
  note: [],
  subsystem: CONTAINER_STATUSES,
  assembly: CONTAINER_STATUSES,
  module: CONTAINER_STATUSES,
}

/** Values written by earlier agents/imports; mapped on write and by migration 5. */
export const LEGACY_STATUS_ALIASES: Partial<
  Record<ForgeNodeType, Readonly<Record<string, string>>>
> = {
  decision: { open: 'pending', decided: 'selected' },
  component: { evaluating: 'considering', specified: 'selected' },
}

export type NormalizeStatusResult =
  | { ok: true; status: string | undefined }
  | { ok: false; error: string }

export function normalizeStatus(type: ForgeNodeType, status: unknown): NormalizeStatusResult {
  if (status === undefined || status === null) return { ok: true, status: undefined }
  if (typeof status !== 'string') return { ok: false, error: 'Status must be a string' }

  const allowed = STATUS_BY_TYPE[type]
  if (allowed.length === 0) return { ok: false, error: `${type} nodes have no status` }
  if (allowed.includes(status)) return { ok: true, status }

  const alias = LEGACY_STATUS_ALIASES[type]?.[status]
  if (alias) return { ok: true, status: alias }

  return {
    ok: false,
    error: `Invalid status "${status}" for ${type}. Must be one of: ${allowed.join(', ')}`,
  }
}

/** A dependency stops blocking its dependents once this returns true. */
export function isDependencyResolved(
  type: ForgeNodeType,
  status: string | null | undefined
): boolean {
  if (type === 'task') return status === 'complete'
  if (type === 'decision') return status === 'selected'
  return true
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/domain/nodeRules.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm the `specified → selected` mapping with Andrew before Task 5 ships**

Ask in chat: "Live components use `specified`. I'm mapping it to `selected` (the chosen part). OK?" If they say otherwise, change only the alias value and the matching test line.

- [ ] **Step 6: Commit**

```bash
git add server/src/domain/
git commit -m "feat(domain): shared node status and dependency-readiness rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Node routes pass every field through and validate status

**Files:**
- Modify: `server/src/routes/nodes.ts` (POST ~L111-165, PUT ~L198-300)
- Test: `server/src/routes/nodes.test.ts` (add a `describe('field round trip')` block)

**Interfaces:**
- Consumes: `normalizeStatus`, `ForgeNodeType` from `../domain/nodeRules.js`
- Produces: POST/PUT accept and persist `checklist`, `custom_fields`, `selected_date` (previously dropped). An invalid status → `400 { error }`. Legacy aliases are stored canonically.

- [ ] **Step 1: Write the failing tests** (append inside the top-level `describe('Nodes API')`, reusing its `app`/`projectId`)

```ts
  describe('field round trip', () => {
    const base = () => `/api/projects/${projectId}/nodes`

    it('persists task checklist on create and update', async () => {
      const created = await request(app).post(base()).send({
        type: 'task',
        title: 'Crimp harness',
        checklist: [{ id: 'c1', text: 'Crimp JST', completed: false }],
      })
      expect(created.status).toBe(201)
      expect(created.body.data.checklist).toEqual([{ id: 'c1', text: 'Crimp JST', completed: false }])

      const id = created.body.data.id
      await request(app)
        .put(`${base()}/${id}`)
        .send({ checklist: [{ id: 'c1', text: 'Crimp JST', completed: true }] })
        .expect(200)

      const reloaded = await request(app).get(`${base()}/${id}`)
      expect(reloaded.body.data.checklist).toEqual([{ id: 'c1', text: 'Crimp JST', completed: true }])
    })

    it('persists component custom_fields on create and update', async () => {
      const created = await request(app).post(base()).send({
        type: 'component',
        title: 'NEMA17',
        custom_fields: { torque_ncm: 45 },
      })
      expect(created.body.data.custom_fields).toEqual({ torque_ncm: 45 })

      const id = created.body.data.id
      await request(app).put(`${base()}/${id}`).send({ custom_fields: { torque_ncm: 59 } }).expect(200)
      const reloaded = await request(app).get(`${base()}/${id}`)
      expect(reloaded.body.data.custom_fields).toEqual({ torque_ncm: 59 })
    })

    it('persists decision selected_date', async () => {
      const created = await request(app).post(base()).send({
        type: 'decision',
        title: 'Controller',
        status: 'selected',
        selected_date: '2026-10-15',
      })
      expect(created.body.data.selected_date).toBe('2026-10-15')
    })

    it('rejects an invalid status on create and update', async () => {
      const bad = await request(app).post(base()).send({ type: 'task', title: 'X', status: 'invalid-review-status' })
      expect(bad.status).toBe(400)

      const ok = await request(app).post(base()).send({ type: 'task', title: 'Y' })
      const badUpdate = await request(app).put(`${base()}/${ok.body.data.id}`).send({ status: 'done-ish' })
      expect(badUpdate.status).toBe(400)
    })

    it('stores legacy aliases canonically', async () => {
      const created = await request(app).post(base()).send({ type: 'decision', title: 'Motor', status: 'open' })
      expect(created.body.data.status).toBe('pending')
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/routes/nodes.test.ts -t "field round trip"`
Expected: FAIL. `checklist`/`custom_fields`/`selected_date` come back `null`, and the invalid status returns 201/200.

- [ ] **Step 3: Implement field picking + status validation**

At the top of `server/src/routes/nodes.ts`, add:

```ts
import type { CreateNodeData, UpdateNodeData } from '../db/NodeRepository.js'
import { normalizeStatus } from '../domain/nodeRules.js'

/** Every client-writable node field. Keep in sync with UpdateNodeData. */
const NODE_BODY_FIELDS = [
  'title', 'content', 'status', 'priority', 'parent_id', 'milestone', 'tags', 'depends_on',
  'supplier', 'part_number', 'cost', 'datasheet_url', 'custom_fields',
  'selected_option', 'selection_rationale', 'selected_date', 'comparison_data',
  'checklist',
] as const satisfies ReadonlyArray<keyof UpdateNodeData>

function pickNodeFields(body: Record<string, unknown>): UpdateNodeData {
  const out: Record<string, unknown> = {}
  for (const key of NODE_BODY_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out as UpdateNodeData
}
```

In POST, replace the big destructuring and the `nodeRepo.create({...})` argument:

```ts
      const { id, type, title } = req.body
      const fields = pickNodeFields(req.body)
      // ...existing type/title/parent/dependency validation stays as is,
      //    reading fields.parent_id / fields.depends_on instead of the old locals...

      const status = normalizeStatus(type, req.body.status)
      if (!status.ok) {
        res.status(400).json({ error: status.error })
        return
      }
      fields.status = status.status

      const node = nodeRepo.create({
        ...fields,
        id,
        project_id: projectId,
        type,
        title,
      } as CreateNodeData)
```

In PUT, replace the destructuring and the `nodeRepo.update(nodeId, {...})` argument:

```ts
      const fields = pickNodeFields(req.body)
      // ...existing parent/dependency validation, reading fields.parent_id / fields.depends_on...

      const status = normalizeStatus(existing.type, req.body.status)
      if (!status.ok) {
        res.status(400).json({ error: status.error })
        return
      }
      fields.status = status.status

      const node = nodeRepo.update(nodeId, fields)
```

- [ ] **Step 4: Run all server tests**

Run: `cd server && npm test`
Expected: all PASS, including existing node tests. (`NodeRepository` already writes `checklist`, `custom_fields`, and `selected_date`. The bug was only that the routes never passed them through.)

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/nodes.ts server/src/routes/nodes.test.ts
git commit -m "fix(server): persist checklist/custom_fields/selected_date and validate status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Migration 5 — canonical statuses + node versions

**Files:**
- Modify: `server/src/db/schema.ts` (`SCHEMA_VERSION = 5`, `nodes.version` column, `NodeRow.version`)
- Modify: `server/src/db/index.ts` (append migration at index 4)
- Create: `server/src/db/migrations.test.ts`

**Interfaces:**
- Consumes: `LEGACY_STATUS_ALIASES` from `../domain/nodeRules.js`
- Produces: `NodeRow.version: number` (starts at 1). Legacy statuses are rewritten. Unknown values are left untouched.

- [ ] **Step 1: Write the failing test**

```ts
// server/src/db/migrations.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initializeDatabase, resetDatabase } from './index.js'

describe('migration 4 -> 5', () => {
  let dir: string | undefined

  afterEach(() => {
    resetDatabase()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('adds node versions and canonicalizes legacy statuses, leaving unknown values', () => {
    dir = mkdtempSync(join(tmpdir(), 'forge-migration-'))
    const dbPath = join(dir, 'forge.sqlite')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO schema_version (version) VALUES (4);
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), modified_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE nodes (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL,
        content TEXT, status TEXT, priority TEXT, parent_id TEXT, milestone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), modified_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO projects (id, name) VALUES ('p1', 'Desk risers');
      INSERT INTO nodes (id, project_id, type, title, status) VALUES
        ('c1', 'p1', 'component', 'NEMA17', 'specified'),
        ('c2', 'p1', 'component', 'Driver', 'evaluating'),
        ('d1', 'p1', 'decision', 'Motor choice', 'open'),
        ('d2', 'p1', 'decision', 'Controller', 'decided'),
        ('t1', 'p1', 'task', 'Print brackets', 'pending'),
        ('x1', 'p1', 'component', 'Odd', 'mystery');
    `)
    legacy.close()

    const db = initializeDatabase({ dbPath })
    const rows = db.prepare('SELECT id, status, version FROM nodes ORDER BY id').all()

    expect(rows).toEqual([
      { id: 'c1', status: 'selected', version: 1 },
      { id: 'c2', status: 'considering', version: 1 },
      { id: 'd1', status: 'pending', version: 1 },
      { id: 'd2', status: 'selected', version: 1 },
      { id: 't1', status: 'pending', version: 1 },
      { id: 'x1', status: 'mystery', version: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/db/migrations.test.ts`
Expected: FAIL, `no such column: version`.

- [ ] **Step 3: Implement**

In `server/src/db/schema.ts`:
- `export const SCHEMA_VERSION = 5`
- In `CREATE TABLE IF NOT EXISTS nodes`, add `version INTEGER NOT NULL DEFAULT 1,` after `milestone TEXT,`
- In `interface NodeRow`, add `version: number`

In `server/src/db/index.ts`, import `LEGACY_STATUS_ALIASES` from `'../domain/nodeRules.js'` and append to the `migrations` array:

```ts
    // Migration 4 -> 5: node versions + canonical statuses
    (db: DatabaseInstance) => {
      db.prepare('ALTER TABLE nodes ADD COLUMN version INTEGER NOT NULL DEFAULT 1').run()
      const rewrite = db.prepare('UPDATE nodes SET status = ? WHERE type = ? AND status = ?')
      for (const [type, aliases] of Object.entries(LEGACY_STATUS_ALIASES)) {
        for (const [legacy, canonical] of Object.entries(aliases ?? {})) {
          rewrite.run(canonical, type, legacy)
        }
      }
    },
```

- [ ] **Step 4: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Dry-run against a real backup**

```bash
mkdir -p ~/forge-backups
curl -fo ~/forge-backups/forge-pre-v2.sqlite http://192.168.1.130:8099/api/backup || echo "backup endpoint not deployed yet; use the HA backup from Task 1"
sqlite3 ~/forge-backups/forge-pre-v2.sqlite "SELECT type, status, COUNT(*) FROM nodes GROUP BY 1,2 ORDER BY 1,2"
```

Expected: only canonical values plus the four known aliases. If any other value appears (for example `todo`), add it to `LEGACY_STATUS_ALIASES` with a test line in Task 3, or confirm it with Andrew. Do not ship a migration that leaves live rows the UI can't render without telling them.

(The endpoint only exists after deploy. Before Task 9, take the copy out of the HA backup tarball: `/backup/<slug>.tar` → `forge.sqlite`.)

- [ ] **Step 6: Commit**

```bash
git add server/src/db/schema.ts server/src/db/index.ts server/src/db/migrations.test.ts
git commit -m "feat(db): migration 5 adds node versions and canonical statuses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Version-checked node updates

**Files:**
- Modify: `server/src/db/NodeRepository.ts` (`update`, new `VersionConflictError`)
- Modify: `server/src/routes/nodes.ts` (PUT reads `expected_version`, maps conflict → 409)
- Test: `server/src/db/NodeRepository.test.ts`, `server/src/routes/nodes.test.ts`

**Interfaces:**
- Produces:
  - `export class VersionConflictError extends Error { readonly current: NodeWithRelations }`
  - `NodeRepository.update(id: string, data: UpdateNodeData, options?: { expectedVersion?: number }): NodeWithRelations | null`. Every successful update increments `version` by 1.
  - `PUT /api/projects/:projectId/nodes/:id` body may include `expected_version: number`. Mismatch → `409 { error, current }`.

- [ ] **Step 1: Write the failing tests**

Append to `server/src/db/NodeRepository.test.ts`, inside its top-level describe (which already provides `repo: NodeRepository` and `projectId`). Add `VersionConflictError` to the `./NodeRepository.js` import:

```ts
  describe('versions', () => {
    it('increments version on every update', () => {
      const node = repo.create({ project_id: projectId, type: 'task', title: 'Cut panel' })
      expect(node.version).toBe(1)
      expect(repo.update(node.id, { title: 'Cut side panel' })!.version).toBe(2)
      expect(repo.update(node.id, { tags: ['cnc'] })!.version).toBe(3)
    })

    it('rejects stale expected_version and writes nothing', () => {
      const node = repo.create({ project_id: projectId, type: 'task', title: 'Cut panel' })
      repo.update(node.id, { title: 'Agent edit' })
      expect(() => repo.update(node.id, { title: 'Stale edit' }, { expectedVersion: 1 })).toThrow(VersionConflictError)
      expect(repo.findById(node.id)!.title).toBe('Agent edit')
    })
  })
```

Append to the `field round trip` describe in `server/src/routes/nodes.test.ts`:

```ts
    it('rejects stale expected_version with 409 and the current node', async () => {
      const created = await request(app).post(base()).send({ type: 'task', title: 'Glue up' })
      const id = created.body.data.id
      await request(app).put(`${base()}/${id}`).send({ title: 'Glue up legs', expected_version: 1 }).expect(200)

      const stale = await request(app).put(`${base()}/${id}`).send({ title: 'Glue up top', expected_version: 1 })
      expect(stale.status).toBe(409)
      expect(stale.body.current.title).toBe('Glue up legs')
      expect(stale.body.current.version).toBe(2)
    })

    it('rejects a non-integer expected_version', async () => {
      const created = await request(app).post(base()).send({ type: 'task', title: 'Sand' })
      const res = await request(app).put(`${base()}/${created.body.data.id}`).send({ expected_version: '1' })
      expect(res.status).toBe(400)
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/db/NodeRepository.test.ts src/routes/nodes.test.ts -t "version"`
Expected: FAIL. `version` stays 1, and there's no conflict error.

- [ ] **Step 3: Implement the repository change**

In `server/src/db/NodeRepository.ts`:

```ts
export class VersionConflictError extends Error {
  constructor(readonly current: NodeWithRelations) {
    super(`Version conflict: node ${current.id} is at version ${current.version}. Re-read it and retry.`)
    this.name = 'VersionConflictError'
  }
}
```

Change the `update` signature and the start/end of its transaction:

```ts
  update(
    id: string,
    data: UpdateNodeData,
    options: { expectedVersion?: number } = {}
  ): NodeWithRelations | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    return this.db.transaction(() => {
      if (options.expectedVersion !== undefined && existing.version !== options.expectedVersion) {
        throw new VersionConflictError(existing)
      }
      // ...existing body unchanged...

      // Insert immediately before the existing final `return this.findById(id)!`:
      this.db.prepare('UPDATE nodes SET version = version + 1 WHERE id = ?').run(id)
      return this.findById(id)!
    })()
  }
```

- [ ] **Step 4: Implement the route change**

In the PUT handler in `server/src/routes/nodes.ts`, before the status validation:

```ts
      const expectedVersion = req.body.expected_version
      if (expectedVersion !== undefined && !Number.isInteger(expectedVersion)) {
        res.status(400).json({ error: 'expected_version must be an integer' })
        return
      }
```

Replace the update call and extend the catch:

```ts
      const node = nodeRepo.update(nodeId, fields, { expectedVersion })
```

```ts
    } catch (error) {
      if (error instanceof VersionConflictError) {
        res.status(409).json({ error: error.message, current: error.current })
        return
      }
      console.error('Error updating node:', error)
      res.status(500).json({ error: 'Failed to update node' })
    }
```

Import `VersionConflictError` from `'../db/NodeRepository.js'`.

- [ ] **Step 5: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/db/NodeRepository.ts server/src/db/NodeRepository.test.ts server/src/routes/nodes.ts server/src/routes/nodes.test.ts
git commit -m "feat(server): per-node versions with optional expected_version (409 on conflict)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: One readiness rule across server, UI, and Kanban

**Files:**
- Modify: `server/src/db/NodeRepository.ts` (`getBlockedTasks`)
- Modify: `src/lib/blockedStatus.ts` (`isDependencyResolved` delegates; add `getBlockedTaskIds`)
- Modify: `src/components/kanban/KanbanView.tsx` (compute blocked IDs once, pass to cards)
- Modify: `forge/Dockerfile` (copy `server/src/domain/` into the frontend stage)
- Test: `server/src/db/NodeRepository.test.ts`, `src/lib/blockedStatus.test.ts`

**Interfaces:**
- Consumes: `isDependencyResolved(type, status)` from `server/src/domain/nodeRules.ts`
- Produces: `getBlockedTaskIds(tasks: TaskNode[], nodesById: Map<string, ForgeNode>): Set<string>` in `src/lib/blockedStatus.ts`

- [ ] **Step 1: Write the failing server test** (in `NodeRepository.test.ts`)

```ts
  describe('getBlockedTasks readiness', () => {
    it('uses the shared rule: decisions unblock when selected, components never block', () => {
      const decision = repo.create({ project_id: projectId, type: 'decision', title: 'Motor', status: 'selected' })
      const openDecision = repo.create({ project_id: projectId, type: 'decision', title: 'Finish', status: 'pending' })
      const part = repo.create({ project_id: projectId, type: 'component', title: 'NEMA17', status: 'considering' })
      const doneTask = repo.create({ project_id: projectId, type: 'task', title: 'Order', status: 'complete' })

      const ready = repo.create({ project_id: projectId, type: 'task', title: 'Mount motor', status: 'pending', depends_on: [decision.id, part.id, doneTask.id] })
      const waiting = repo.create({ project_id: projectId, type: 'task', title: 'Paint', status: 'pending', depends_on: [openDecision.id] })

      const blockedIds = repo.getBlockedTasks(projectId).map((n) => n.id)
      expect(blockedIds).toContain(waiting.id)
      expect(blockedIds).not.toContain(ready.id)
    })
  })
```

- [ ] **Step 2: Write the failing frontend test** (append to `src/lib/blockedStatus.test.ts`. Add `getBlockedTaskIds` to the existing `./blockedStatus` import, and add `import { createTaskNode, createDecisionNode, type ForgeNode } from '@/types/nodes'`.)

```ts
describe('getBlockedTaskIds', () => {
  it('flags only tasks with an unresolved prerequisite', () => {
    const doneTask = createTaskNode('done', 'Order parts', { status: 'complete' })
    const pendingDecision = createDecisionNode('dec', 'Finish', { status: 'pending' })
    const ready = createTaskNode('ready', 'Mount', { dependsOn: ['done'] })
    const waiting = createTaskNode('waiting', 'Paint', { dependsOn: ['dec'] })
    const finished = createTaskNode('finished', 'Old', { status: 'complete', dependsOn: ['dec'] })

    const nodesById = new Map<string, ForgeNode>(
      [doneTask, pendingDecision, ready, waiting, finished].map((n) => [n.id, n])
    )
    expect(getBlockedTaskIds([ready, waiting, finished], nodesById)).toEqual(new Set(['waiting']))
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx vitest run src/db/NodeRepository.test.ts -t readiness` and `npx vitest run src/lib/blockedStatus.test.ts -t getBlockedTaskIds`
Expected: server FAIL (`ready` is listed because the decision isn't `complete`). Frontend FAIL (`getBlockedTaskIds` is not exported).

- [ ] **Step 4: Implement the server rule**

Replace `getBlockedTasks` in `NodeRepository.ts`:

```ts
  getBlockedTasks(projectId: string): NodeWithRelations[] {
    const tasks = this.db
      .prepare(
        `SELECT * FROM nodes WHERE project_id = ? AND type = 'task'
           AND (status IS NULL OR status != 'complete')`
      )
      .all(projectId) as NodeRow[]
    const depsOf = this.db.prepare(
      `SELECT dep.type AS type, dep.status AS status
         FROM node_dependencies nd JOIN nodes dep ON dep.id = nd.depends_on_id
        WHERE nd.node_id = ?`
    )
    return tasks
      .filter((task) =>
        (depsOf.all(task.id) as Array<{ type: NodeType; status: string | null }>).some(
          (dep) => !isDependencyResolved(dep.type, dep.status)
        )
      )
      .map((node) => this.enrichNode(node))
  }
```

Import `isDependencyResolved` from `'../domain/nodeRules.js'`.

- [ ] **Step 5: Implement the frontend rule**

In `src/lib/blockedStatus.ts`, replace the body of `isDependencyResolved` and add `getBlockedTaskIds`:

```ts
import { isDependencyResolved as isResolvedByRule } from '../../server/src/domain/nodeRules'

export function isDependencyResolved(node: ForgeNode): boolean {
  return isResolvedByRule(node.type, 'status' in node ? node.status : null)
}

/** IDs of incomplete tasks with at least one unresolved, existing prerequisite. */
export function getBlockedTaskIds(
  tasks: TaskNode[],
  nodesById: Map<string, ForgeNode>
): Set<string> {
  const blocked = new Set<string>()
  for (const task of tasks) {
    if (task.status === 'complete') continue
    const waiting = task.dependsOn.some((depId) => {
      const dep = nodesById.get(depId)
      return dep !== undefined && !isDependencyResolved(dep)
    })
    if (waiting) blocked.add(task.id)
  }
  return blocked
}
```

- [ ] **Step 6: Use it in Kanban**

In `src/components/kanban/KanbanView.tsx`:
- `KanbanCardProps`: add `isBlocked: boolean`. Delete the line `const isBlocked = task.dependsOn.length > 0 && task.status !== 'complete'` and destructure `isBlocked` from props instead.
- `KanbanColumnProps`: add `blockedTaskIds: Set<string>`. In the `<KanbanCard …>` JSX, add `isBlocked={blockedTaskIds.has(task.id)}`.
- In `KanbanView`, after `taskNodes`:

```ts
  // Resolve prerequisites against the full store, not the filtered view
  const blockedTaskIds = useMemo(
    () => getBlockedTaskIds(taskNodes, storeNodes),
    [taskNodes, storeNodes]
  )
```

  Then pass `blockedTaskIds={blockedTaskIds}` to every `<KanbanColumnComponent …>`.

- [ ] **Step 7: Copy the domain folder in the frontend Docker stage**

In `forge/Dockerfile`, next to the existing `COPY server/src/print-queue-model.ts …` line:

```dockerfile
COPY server/src/domain/ ./server/src/domain/
```

- [ ] **Step 8: Run all checks**

Run: `npm run type-check && npm test && (cd server && npm test)`
Expected: PASS. Then run `npm run build:prod` to confirm Vite resolves the cross-folder import.

- [ ] **Step 9: Commit**

```bash
git add server/src/db/NodeRepository.ts server/src/db/NodeRepository.test.ts src/lib/blockedStatus.ts src/lib/blockedStatus.test.ts src/components/kanban/KanbanView.tsx forge/Dockerfile
git commit -m "fix: one dependency-readiness rule for server, UI, and Kanban

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: MCP — explicit project_id on every scoped tool, expected_version on update

**Files:**
- Create: `packages/forge-mcp-server/src/project-scope.ts`
- Create: `packages/forge-mcp-server/src/project-scope.test.ts`
- Modify: `packages/forge-mcp-server/src/index.ts` (9 `currentProjectId` references, ListTools, CallTool, `update_node`)
- Modify: `packages/forge-mcp-server/src/api-client.ts` (`ApiNode.version`, `UpdateNodeInput.expected_version`)

**Interfaces:**
- Produces:
  - `setDefaultProjectId(id: string | null): void`, `getDefaultProjectId(): string | null`
  - `runWithProject<T>(projectId: string | undefined, fn: () => Promise<T>): Promise<T>`
  - `requireProjectId(): string` (per-call `project_id` first, then the default, else throws)
  - `PROJECT_SCOPED_TOOLS: ReadonlySet<string>`
  - `withProjectIdParam<T extends ToolDef>(tool: T): T`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/forge-mcp-server/src/project-scope.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  runWithProject,
  requireProjectId,
  setDefaultProjectId,
  withProjectIdParam,
} from './project-scope.js'

describe('project scope', () => {
  beforeEach(() => setDefaultProjectId(null))

  it('prefers the per-call project_id over the default', async () => {
    setDefaultProjectId('default')
    await expect(runWithProject('explicit', async () => requireProjectId())).resolves.toBe('explicit')
  })

  it('falls back to the switch_project default', async () => {
    setDefaultProjectId('default')
    await expect(runWithProject(undefined, async () => requireProjectId())).resolves.toBe('default')
  })

  it('isolates concurrent calls', async () => {
    const tick = () => new Promise((r) => setTimeout(r, 5))
    const [a, b] = await Promise.all([
      runWithProject('a', async () => { await tick(); return requireProjectId() }),
      runWithProject('b', async () => { await tick(); return requireProjectId() }),
    ])
    expect([a, b]).toEqual(['a', 'b'])
  })

  it('throws a helpful error when nothing is set', async () => {
    await expect(runWithProject(undefined, async () => requireProjectId())).rejects.toThrow(/project_id/)
  })

  it('adds project_id only to scoped tools', () => {
    const scoped = withProjectIdParam({ name: 'get_node', description: '', inputSchema: { type: 'object', properties: { id: { type: 'string' } } } })
    const global = withProjectIdParam({ name: 'list_projects', description: '', inputSchema: { type: 'object', properties: {} } })
    expect(Object.keys(scoped.inputSchema.properties ?? {})).toEqual(['project_id', 'id'])
    expect(global.inputSchema.properties).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/forge-mcp-server && npx vitest run src/project-scope.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `project-scope.ts`**

```ts
// packages/forge-mcp-server/src/project-scope.ts
/**
 * Per-call project scoping. Each tool call may pass project_id; concurrent
 * calls never see each other's project. switch_project only sets a fallback.
 */
import { AsyncLocalStorage } from 'node:async_hooks'

const scope = new AsyncLocalStorage<string | undefined>()
let defaultProjectId: string | null = null

export function setDefaultProjectId(id: string | null): void {
  defaultProjectId = id
}

export function getDefaultProjectId(): string | null {
  return defaultProjectId
}

export function runWithProject<T>(projectId: string | undefined, fn: () => Promise<T>): Promise<T> {
  return scope.run(projectId, fn)
}

export function requireProjectId(): string {
  const id = scope.getStore() ?? defaultProjectId
  if (!id) {
    throw new Error(
      'No project specified. Pass project_id (from resolve_workspace or list_projects).'
    )
  }
  return id
}

export const PROJECT_SCOPED_TOOLS: ReadonlySet<string> = new Set([
  'create_node', 'update_node', 'delete_node', 'search_nodes', 'get_node',
  'add_dependency', 'remove_dependency', 'get_blocked_tasks', 'get_critical_path',
  'bulk_update', 'find_components', 'get_brief', 'record_closeout',
])

interface ToolDef {
  name: string
  description: string
  inputSchema: { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
}

export function withProjectIdParam<T extends ToolDef>(tool: T): T {
  if (!PROJECT_SCOPED_TOOLS.has(tool.name)) return tool
  return {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        project_id: {
          type: 'string',
          description: 'Forge project ID. Always pass it; switch_project is only a fallback.',
        },
        ...tool.inputSchema.properties,
      },
    },
  }
}
```

- [ ] **Step 4: Wire it into `index.ts`**

1. Delete `let currentProjectId: string | null = null` and the local `requireProjectId` function. Import `setDefaultProjectId, getDefaultProjectId, runWithProject, requireProjectId, withProjectIdParam` from `'./project-scope.js'`.
2. Run `grep -n currentProjectId src/index.ts`. Replace each assignment with `setDefaultProjectId(x)` and each read with `getDefaultProjectId()`.
3. ListTools: change `tools: [ … ]` to `tools: [ … ].map(withProjectIdParam)`.
4. CallTool: wrap the `switch`:

```ts
    const projectId =
      args && typeof args.project_id === 'string' ? args.project_id : undefined
    try {
      return await runWithProject(projectId, async () => {
        switch (name) {
          // ...existing cases unchanged...
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      })
    } catch (error) {
      // ...existing catch unchanged...
    }
```

5. `update_node` tool schema: add

```ts
              expected_version: {
                type: 'number',
                description: 'Version from get_node. If the node changed since, the update is rejected; re-read and retry.',
              },
```

   In `handleUpdateNode` (API branch), pass `expected_version: typeof args.expected_version === 'number' ? args.expected_version : undefined` to `apiClient!.updateNode`.
6. In `api-client.ts`: add `version: number` to `ApiNode` and `expected_version?: number` to `UpdateNodeInput`.

- [ ] **Step 5: Run checks and build**

Run: `cd packages/forge-mcp-server && npm test && npm run build`
Expected: PASS. `dist/index.js` is rebuilt, and that's what Claude Code and Codex run.

- [ ] **Step 6: Commit**

```bash
git add packages/forge-mcp-server/src/
git commit -m "feat(mcp): per-call project_id scoping and expected_version on update_node

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Deploy Week 1 and run the restore drill

**Files:**
- Modify: `forge/config.yaml` (`version: "0.0.7"`)

**Interfaces:** live API at `http://192.168.1.130:8099/api` now has `/backup`, status validation, versions.

- [ ] **Step 1: Full local verification**

Run: `npm run lint && npm run type-check && npm test && (cd server && npm test) && (cd packages/forge-mcp-server && npm test) && npm run build:prod`
Expected: all PASS.

- [ ] **Step 2: Bump and build the multi-arch image**

Set `version: "0.0.7"` in `forge/config.yaml`, then:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -f forge/Dockerfile \
  -t ghcr.io/abigley1/forge:0.0.7 -t ghcr.io/abigley1/forge:latest --push .
```

Expected: push succeeds for both platforms.

- [ ] **Step 3: Update the add-on in Home Assistant**

Use the `ha` skill: `ha store reload && ha addons update <forge-addon-slug>`, then `ha addons logs <forge-addon-slug> | tail -20`.
Expected: logs show `Migrating database from version 4 to 5` and `Database migrated to version 5`.

- [ ] **Step 4: Verify live behavior**

```bash
curl -fs http://192.168.1.130:8099/api/health
curl -fo ~/forge-backups/forge-0.0.7.sqlite http://192.168.1.130:8099/api/backup
sqlite3 ~/forge-backups/forge-0.0.7.sqlite "SELECT type, status, COUNT(*) FROM nodes GROUP BY 1,2; SELECT MAX(version) FROM schema_version;"
```

Expected: health OK. Statuses are canonical (plus any value you deliberately left). Schema version is 5.

- [ ] **Step 5: Restore drill (isolated, real data)**

```bash
cd server && FORGE_DB_PATH=$HOME/forge-backups/forge-0.0.7.sqlite FORGE_DATA_DIR=$(mktemp -d) PORT=3999 npm run dev
```

In another shell: `curl -fs localhost:3999/api/projects | head -c 400`
Expected: the same project names as live. Stop the dev server. Record "restore drill passed, <date>" in the PR description.

- [ ] **Step 6: Live UI check**

Open `http://192.168.1.130:8099`, open the larger project's Kanban, and confirm the task whose only prerequisite is complete no longer shows "Blocked". Edit a task's checklist, reload, and confirm it persisted.

- [ ] **Step 7: Commit**

```bash
git add forge/config.yaml
git commit -m "chore: bump add-on to 0.0.7 (Forge 2.0 foundation)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Weeks 2–3 — Brief / closeout / hooks loop

### Task 10: Migration 6 — workspace links and session closeouts

**Files:**
- Modify: `server/src/db/schema.ts` (`SCHEMA_VERSION = 6`, `AGENT_LOOP_TABLES_SQL`, row types)
- Modify: `server/src/db/index.ts` (migration at index 5)
- Test: `server/src/db/migrations.test.ts`

**Interfaces:**
- Produces tables `workspace_links(id, project_id, kind, value, created_at, UNIQUE(kind,value))` and `session_closeouts(id, project_id, session_id, client, workspace_path, summary, next_action, evidence, uncertain, created_at, updated_at, UNIQUE(project_id,session_id))`, plus row types `WorkspaceLinkRow` and `SessionCloseoutRow`.

- [ ] **Step 1: Write the failing test** (append to `migrations.test.ts`)

```ts
describe('migration 5 -> 6', () => {
  afterEach(() => resetDatabase())

  it('creates workspace_links and session_closeouts on upgraded databases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'forge-migration-6-'))
    const dbPath = join(dir, 'forge.sqlite')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO schema_version (version) VALUES (5);
      CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), modified_at TEXT NOT NULL DEFAULT (datetime('now')));
    `)
    legacy.close()

    const db = initializeDatabase({ dbPath })
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name)
    expect(tables).toEqual(expect.arrayContaining(['workspace_links', 'session_closeouts']))
    resetDatabase()
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx vitest run src/db/migrations.test.ts`
Expected: FAIL, tables missing.

- [ ] **Step 3: Implement**

In `schema.ts`, set `SCHEMA_VERSION = 6` and add:

```ts
export const AGENT_LOOP_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS workspace_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('path', 'git_remote')),
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(kind, value)
);

CREATE TABLE IF NOT EXISTS session_closeouts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  client TEXT NOT NULL,
  workspace_path TEXT,
  summary TEXT NOT NULL,
  next_action TEXT,
  evidence TEXT NOT NULL DEFAULT '[]',
  uncertain TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_closeouts_project ON session_closeouts(project_id, updated_at);
`

export interface WorkspaceLinkRow {
  id: string
  project_id: string
  kind: 'path' | 'git_remote'
  value: string
  created_at: string
}

export interface SessionCloseoutRow {
  id: string
  project_id: string
  session_id: string
  client: string
  workspace_path: string | null
  summary: string
  next_action: string | null
  evidence: string // JSON
  uncertain: string // JSON
  created_at: string
  updated_at: string
}
```

Change the `CREATE_TABLES_SQL` export so fresh databases get the tables too. Rename the existing template to `BASE_TABLES_SQL`, then:

```ts
export const CREATE_TABLES_SQL = BASE_TABLES_SQL + AGENT_LOOP_TABLES_SQL
```

(`AGENT_LOOP_TABLES_SQL` must be declared before this line.)

In `index.ts`, import `AGENT_LOOP_TABLES_SQL` and append:

```ts
    // Migration 5 -> 6: workspace links + session closeouts
    (db: DatabaseInstance) => {
      db.exec(AGENT_LOOP_TABLES_SQL)
    },
```

- [ ] **Step 4: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/db/schema.ts server/src/db/index.ts server/src/db/migrations.test.ts
git commit -m "feat(db): migration 6 adds workspace_links and session_closeouts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Workspace links — repository and routes

**Files:**
- Create: `server/src/db/WorkspaceRepository.ts`
- Create: `server/src/db/WorkspaceRepository.test.ts`
- Create: `server/src/routes/workspaces.ts`
- Create: `server/src/routes/workspaces.test.ts`
- Modify: `server/src/index.ts` (mount at `/api/workspaces`)

**Interfaces:**
- Produces:
  - `normalizeGitRemote(remote: string): string` (`git@github.com:abigley1/forge.git` and `https://github.com/abigley1/forge` → `github.com/abigley1/forge`)
  - `normalizePath(p: string): string`, `isPathWithin(child: string, parent: string): boolean`
  - `class WorkspaceRepository { link(projectId, kind, value): WorkspaceLinkRow; resolve(cwd: string, gitRemote?: string): WorkspaceLinkRow | null; list(projectId?: string): WorkspaceLinkRow[] }`
  - `POST /api/workspaces/resolve` body `{ cwd: string, git_remote?: string }` → `200 { data: { project: ProjectRow, match: { kind, value } } }` or `200 { data: { project: null, candidates: ProjectRow[] } }` (up to 8, most recently modified first)
  - `POST /api/workspaces/links` body `{ project_id, path?, git_remote? }` → `201 { data: WorkspaceLinkRow[] }`; `400` if neither is given; `404` if the project is unknown
  - `GET /api/workspaces/links?project_id=` → `200 { data: WorkspaceLinkRow[] }`

- [ ] **Step 1: Write the failing repository tests**

```ts
// server/src/db/WorkspaceRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDatabase, type DatabaseInstance } from './index.js'
import { ProjectRepository } from './ProjectRepository.js'
import { WorkspaceRepository, normalizeGitRemote, isPathWithin } from './WorkspaceRepository.js'

describe('WorkspaceRepository', () => {
  let db: DatabaseInstance
  let repo: WorkspaceRepository
  let forgeId: string
  let risersId: string

  beforeEach(() => {
    db = createTestDatabase()
    const projects = new ProjectRepository(db)
    forgeId = projects.create({ name: 'Forge' }).id
    risersId = projects.create({ name: 'Desk risers' }).id
    repo = new WorkspaceRepository(db)
  })

  it('normalizes ssh and https remotes to the same key', () => {
    expect(normalizeGitRemote('git@github.com:abigley1/forge.git')).toBe('github.com/abigley1/forge')
    expect(normalizeGitRemote('https://github.com/abigley1/Forge/')).toBe('github.com/abigley1/forge')
  })

  it('matches nested folders of a linked path', () => {
    repo.link(risersId, 'path', '/Users/a/deskrisers/')
    expect(repo.resolve('/Users/a/deskrisers/cad/brackets')?.project_id).toBe(risersId)
  })

  it('does not match sibling prefixes', () => {
    repo.link(risersId, 'path', '/Users/a/desk')
    expect(repo.resolve('/Users/a/deskrisers')).toBeNull()
    expect(isPathWithin('/Users/a/deskrisers', '/Users/a/desk')).toBe(false)
  })

  it('prefers the longest path match, then git remote', () => {
    repo.link(forgeId, 'path', '/Users/a/Projects')
    repo.link(risersId, 'path', '/Users/a/Projects/risers')
    repo.link(forgeId, 'git_remote', 'git@github.com:abigley1/forge.git')
    expect(repo.resolve('/Users/a/Projects/risers/x')?.project_id).toBe(risersId)
    expect(repo.resolve('/tmp/clone', 'https://github.com/abigley1/forge')?.project_id).toBe(forgeId)
  })

  it('relinking a value moves it to the new project', () => {
    repo.link(forgeId, 'path', '/Users/a/scratch')
    repo.link(risersId, 'path', '/Users/a/scratch')
    expect(repo.resolve('/Users/a/scratch')?.project_id).toBe(risersId)
    expect(repo.list()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx vitest run src/db/WorkspaceRepository.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the repository**

```ts
// server/src/db/WorkspaceRepository.ts
/**
 * Maps working folders and git remotes to Forge projects so agents can
 * resolve "which project is this?" without a mutable selection.
 */
import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import type { WorkspaceLinkRow } from './schema.js'

export function normalizeGitRemote(remote: string): string {
  const trimmed = remote.trim().replace(/\/+$/, '').replace(/\.git$/, '')
  const scp = trimmed.match(/^[\w.-]+@([^:/]+):(.+)$/)
  if (scp) return `${scp[1]}/${scp[2]}`.toLowerCase()
  try {
    const url = new URL(trimmed)
    return `${url.hostname}${url.pathname}`.replace(/\/+$/, '').toLowerCase()
  } catch {
    return trimmed.toLowerCase()
  }
}

export function normalizePath(p: string): string {
  const trimmed = p.trim().replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function isPathWithin(child: string, parent: string): boolean {
  const c = normalizePath(child)
  const p = normalizePath(parent)
  return c === p || c.startsWith(p === '/' ? '/' : `${p}/`)
}

export class WorkspaceRepository {
  constructor(private db: DatabaseInstance) {}

  link(projectId: string, kind: WorkspaceLinkRow['kind'], rawValue: string): WorkspaceLinkRow {
    const value = kind === 'path' ? normalizePath(rawValue) : normalizeGitRemote(rawValue)
    this.db
      .prepare(
        `INSERT INTO workspace_links (id, project_id, kind, value) VALUES (?, ?, ?, ?)
         ON CONFLICT(kind, value) DO UPDATE SET project_id = excluded.project_id`
      )
      .run(randomUUID(), projectId, kind, value)
    return this.db
      .prepare('SELECT * FROM workspace_links WHERE kind = ? AND value = ?')
      .get(kind, value) as WorkspaceLinkRow
  }

  resolve(cwd: string, gitRemote?: string): WorkspaceLinkRow | null {
    const paths = this.db
      .prepare(`SELECT * FROM workspace_links WHERE kind = 'path'`)
      .all() as WorkspaceLinkRow[]
    const best = paths
      .filter((link) => isPathWithin(cwd, link.value))
      .sort((a, b) => b.value.length - a.value.length)[0]
    if (best) return best

    if (gitRemote) {
      const match = this.db
        .prepare(`SELECT * FROM workspace_links WHERE kind = 'git_remote' AND value = ?`)
        .get(normalizeGitRemote(gitRemote)) as WorkspaceLinkRow | undefined
      if (match) return match
    }
    return null
  }

  list(projectId?: string): WorkspaceLinkRow[] {
    return projectId
      ? (this.db.prepare('SELECT * FROM workspace_links WHERE project_id = ? ORDER BY value').all(projectId) as WorkspaceLinkRow[])
      : (this.db.prepare('SELECT * FROM workspace_links ORDER BY value').all() as WorkspaceLinkRow[])
  }
}
```

- [ ] **Step 4: Run repository tests to verify they pass**

Run: `cd server && npx vitest run src/db/WorkspaceRepository.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route tests**

```ts
// server/src/routes/workspaces.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Workspaces API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let projectId: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-ws-test-'))
    db = createTestDatabase()
    app = createApp({ config: { port: 3000, dataDir: tempDir, staticDir: tempDir, dbPath: ':memory:' }, db }).app
    projectId = (await request(app).post('/api/projects').send({ name: 'Pegboard mounts' })).body.data.id
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('returns candidates for an unlinked folder', async () => {
    const res = await request(app).post('/api/workspaces/resolve').send({ cwd: '/Users/a/Documents/Codex/2026-10-15/task-3' })
    expect(res.status).toBe(200)
    expect(res.body.data.project).toBeNull()
    expect(res.body.data.candidates.map((p: { name: string }) => p.name)).toContain('Pegboard mounts')
  })

  it('links a folder and then resolves it', async () => {
    await request(app).post('/api/workspaces/links').send({ project_id: projectId, path: '/Users/a/Documents/Codex/2026-10-15/task-3' }).expect(201)
    const res = await request(app).post('/api/workspaces/resolve').send({ cwd: '/Users/a/Documents/Codex/2026-10-15/task-3/pegboard-mounts' })
    expect(res.body.data.project.id).toBe(projectId)
    expect(res.body.data.match).toEqual({ kind: 'path', value: '/Users/a/Documents/Codex/2026-10-15/task-3' })
  })

  it('validates link requests', async () => {
    await request(app).post('/api/workspaces/links').send({ project_id: projectId }).expect(400)
    await request(app).post('/api/workspaces/links').send({ project_id: 'nope', path: '/x' }).expect(404)
    await request(app).post('/api/workspaces/resolve').send({}).expect(400)
  })
})
```

- [ ] **Step 6: Implement the routes**

```ts
// server/src/routes/workspaces.ts
/**
 * Workspaces API
 * - POST /api/workspaces/resolve - Resolve a working folder / git remote to a project
 * - POST /api/workspaces/links   - Link a folder and/or git remote to a project
 * - GET  /api/workspaces/links   - List links (optionally ?project_id=)
 */
import { Router, Request, Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import { WorkspaceRepository } from '../db/WorkspaceRepository.js'

const MAX_CANDIDATES = 8

export function createWorkspacesRouter(db: DatabaseInstance): Router {
  const router = Router()
  const projects = new ProjectRepository(db)
  const workspaces = new WorkspaceRepository(db)

  router.post('/resolve', (req: Request, res: Response) => {
    const { cwd, git_remote } = req.body ?? {}
    if (typeof cwd !== 'string' || cwd === '') {
      res.status(400).json({ error: 'cwd is required' })
      return
    }
    const link = workspaces.resolve(cwd, typeof git_remote === 'string' ? git_remote : undefined)
    const project = link ? projects.findById(link.project_id) : null
    if (link && project) {
      res.json({ data: { project, match: { kind: link.kind, value: link.value } } })
      return
    }
    const candidates = projects
      .findAll()
      .sort((a, b) => b.modified_at.localeCompare(a.modified_at))
      .slice(0, MAX_CANDIDATES)
    res.json({ data: { project: null, candidates } })
  })

  router.post('/links', (req: Request, res: Response) => {
    const { project_id, path, git_remote } = req.body ?? {}
    if (typeof project_id !== 'string' || !projects.exists(project_id)) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    if (typeof path !== 'string' && typeof git_remote !== 'string') {
      res.status(400).json({ error: 'Provide path and/or git_remote' })
      return
    }
    const created = []
    if (typeof path === 'string') created.push(workspaces.link(project_id, 'path', path))
    if (typeof git_remote === 'string') created.push(workspaces.link(project_id, 'git_remote', git_remote))
    res.status(201).json({ data: created })
  })

  router.get('/links', (req: Request, res: Response) => {
    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined
    res.json({ data: workspaces.list(projectId) })
  })

  return router
}
```

Mount in `server/src/index.ts`: `app.use('/api/workspaces', createWorkspacesRouter(db))`.

- [ ] **Step 7: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/db/WorkspaceRepository.ts server/src/db/WorkspaceRepository.test.ts server/src/routes/workspaces.ts server/src/routes/workspaces.test.ts server/src/index.ts
git commit -m "feat(server): workspace links resolve folders and git remotes to projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Session closeouts — repository and routes

**Files:**
- Create: `server/src/db/CloseoutRepository.ts`
- Create: `server/src/routes/closeouts.ts`
- Create: `server/src/routes/closeouts.test.ts`
- Modify: `server/src/index.ts` (mount at `/api/projects/:projectId/closeouts`)

**Interfaces:**
- Produces:
  - `type EvidenceKind = 'commit' | 'file' | 'test' | 'url' | 'user_report' | 'observation'`
  - `interface CloseoutEvidence { kind: EvidenceKind; ref: string; note?: string }`
  - `interface Closeout { id; project_id; session_id; client: 'claude-code' | 'codex' | 'other'; workspace_path: string | null; summary: string; next_action: string | null; evidence: CloseoutEvidence[]; uncertain: string[]; created_at; updated_at }`
  - `class CloseoutRepository { upsert(input: UpsertCloseoutInput): Closeout; listRecent(projectId: string, limit: number): Closeout[]; findBySession(projectId: string, sessionId: string): Closeout | null }`
  - `PUT /api/projects/:projectId/closeouts/:sessionId` → `200 { data: Closeout }`
  - `GET /api/projects/:projectId/closeouts?limit=5` → `200 { data: Closeout[] }` (newest `updated_at` first)
  - `GET /api/projects/:projectId/closeouts/:sessionId` → `200 | 404`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/routes/closeouts.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Closeouts API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let base: string

  const closeout = {
    client: 'codex',
    workspace_path: '/Users/a/Documents/Codex/2026-10-15/task-3',
    summary: 'Redesigned pegboard hook with 0.2 mm clearance; sliced plate 2.',
    next_action: 'Print plate 2 and test fit on the pegboard.',
    evidence: [{ kind: 'file', ref: 'pegboard-mounts/hook-v3.3mf' }],
    uncertain: ['Fit not physically tested'],
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-closeout-test-'))
    db = createTestDatabase()
    app = createApp({ config: { port: 3000, dataDir: tempDir, staticDir: tempDir, dbPath: ':memory:' }, db }).app
    const projectId = (await request(app).post('/api/projects').send({ name: 'Pegboard mounts' })).body.data.id
    base = `/api/projects/${projectId}/closeouts`
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('records and reads back a closeout', async () => {
    const res = await request(app).put(`${base}/sess-1`).send(closeout)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ session_id: 'sess-1', ...closeout })
    const got = await request(app).get(`${base}/sess-1`)
    expect(got.body.data.uncertain).toEqual(['Fit not physically tested'])
  })

  it('upserts on session_id instead of duplicating', async () => {
    await request(app).put(`${base}/sess-1`).send(closeout).expect(200)
    await request(app).put(`${base}/sess-1`).send({ ...closeout, summary: 'Updated after second pass.' }).expect(200)
    const list = await request(app).get(base)
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].summary).toBe('Updated after second pass.')
  })

  it('lists newest first and honors limit', async () => {
    await request(app).put(`${base}/older`).send(closeout)
    await new Promise((r) => setTimeout(r, 5))
    await request(app).put(`${base}/newer`).send(closeout)
    const list = await request(app).get(`${base}?limit=1`)
    expect(list.body.data.map((c: { session_id: string }) => c.session_id)).toEqual(['newer'])
  })

  it('validates input', async () => {
    await request(app).put(`${base}/s`).send({ ...closeout, summary: '' }).expect(400)
    await request(app).put(`${base}/s`).send({ ...closeout, client: 'cursor' }).expect(400)
    await request(app).put(`${base}/s`).send({ ...closeout, evidence: [{ kind: 'vibes', ref: 'x' }] }).expect(400)
    await request(app).put(`${base}/s`).send({ ...closeout, uncertain: 'nope' }).expect(400)
    await request(app).put(`/api/projects/missing/closeouts/s`).send(closeout).expect(404)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx vitest run src/routes/closeouts.test.ts`
Expected: FAIL, 404 on the route.

- [ ] **Step 3: Implement the repository**

```ts
// server/src/db/CloseoutRepository.ts
/**
 * Session closeouts: one evidence-backed record per agent session per project.
 * Upserts on (project_id, session_id) so repeated closeouts never duplicate.
 */
import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import type { SessionCloseoutRow } from './schema.js'

export const EVIDENCE_KINDS = ['commit', 'file', 'test', 'url', 'user_report', 'observation'] as const
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number]
export const CLOSEOUT_CLIENTS = ['claude-code', 'codex', 'other'] as const
export type CloseoutClient = (typeof CLOSEOUT_CLIENTS)[number]

export interface CloseoutEvidence {
  kind: EvidenceKind
  ref: string
  note?: string
}

export interface Closeout {
  id: string
  project_id: string
  session_id: string
  client: CloseoutClient
  workspace_path: string | null
  summary: string
  next_action: string | null
  evidence: CloseoutEvidence[]
  uncertain: string[]
  created_at: string
  updated_at: string
}

export interface UpsertCloseoutInput {
  project_id: string
  session_id: string
  client: CloseoutClient
  workspace_path: string | null
  summary: string
  next_action: string | null
  evidence: CloseoutEvidence[]
  uncertain: string[]
}

function toCloseout(row: SessionCloseoutRow): Closeout {
  return {
    ...row,
    client: row.client as CloseoutClient,
    evidence: JSON.parse(row.evidence) as CloseoutEvidence[],
    uncertain: JSON.parse(row.uncertain) as string[],
  }
}

export class CloseoutRepository {
  constructor(private db: DatabaseInstance) {}

  upsert(input: UpsertCloseoutInput): Closeout {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO session_closeouts
           (id, project_id, session_id, client, workspace_path, summary, next_action, evidence, uncertain, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, session_id) DO UPDATE SET
           client = excluded.client,
           workspace_path = excluded.workspace_path,
           summary = excluded.summary,
           next_action = excluded.next_action,
           evidence = excluded.evidence,
           uncertain = excluded.uncertain,
           updated_at = excluded.updated_at`
      )
      .run(
        randomUUID(), input.project_id, input.session_id, input.client, input.workspace_path,
        input.summary, input.next_action, JSON.stringify(input.evidence), JSON.stringify(input.uncertain),
        now, now
      )
    return this.findBySession(input.project_id, input.session_id)!
  }

  findBySession(projectId: string, sessionId: string): Closeout | null {
    const row = this.db
      .prepare('SELECT * FROM session_closeouts WHERE project_id = ? AND session_id = ?')
      .get(projectId, sessionId) as SessionCloseoutRow | undefined
    return row ? toCloseout(row) : null
  }

  listRecent(projectId: string, limit: number): Closeout[] {
    const rows = this.db
      .prepare('SELECT * FROM session_closeouts WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?')
      .all(projectId, limit) as SessionCloseoutRow[]
    return rows.map(toCloseout)
  }
}
```

- [ ] **Step 4: Implement the routes**

```ts
// server/src/routes/closeouts.ts
/**
 * Closeouts API
 * - GET /api/projects/:projectId/closeouts            - Recent closeouts (?limit=, default 5, max 50)
 * - GET /api/projects/:projectId/closeouts/:sessionId - One session's closeout
 * - PUT /api/projects/:projectId/closeouts/:sessionId - Record or update a session closeout
 */
import { Router, Request, Response, NextFunction } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import {
  CloseoutRepository,
  CLOSEOUT_CLIENTS,
  EVIDENCE_KINDS,
  type CloseoutEvidence,
  type CloseoutClient,
} from '../db/CloseoutRepository.js'

const MAX_SUMMARY = 4000

function isEvidence(value: unknown): value is CloseoutEvidence {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    EVIDENCE_KINDS.includes(v.kind as never) &&
    typeof v.ref === 'string' && v.ref !== '' &&
    (v.note === undefined || typeof v.note === 'string')
  )
}

export function createCloseoutsRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true })
  const projects = new ProjectRepository(db)
  const closeouts = new CloseoutRepository(db)

  router.use((req: Request<{ projectId: string }>, res: Response, next: NextFunction) => {
    if (!projects.exists(req.params.projectId)) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    next()
  })

  router.get('/', (req: Request<{ projectId: string }>, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 5) || 5, 1), 50)
    res.json({ data: closeouts.listRecent(req.params.projectId, limit) })
  })

  router.get('/:sessionId', (req: Request<{ projectId: string; sessionId: string }>, res: Response) => {
    const found = closeouts.findBySession(req.params.projectId, req.params.sessionId)
    if (!found) {
      res.status(404).json({ error: 'Closeout not found' })
      return
    }
    res.json({ data: found })
  })

  router.put('/:sessionId', (req: Request<{ projectId: string; sessionId: string }>, res: Response) => {
    const { client, workspace_path, summary, next_action, evidence = [], uncertain = [] } = req.body ?? {}
    if (typeof summary !== 'string' || summary.trim() === '' || summary.length > MAX_SUMMARY) {
      res.status(400).json({ error: `summary is required (max ${MAX_SUMMARY} chars)` })
      return
    }
    if (!CLOSEOUT_CLIENTS.includes(client)) {
      res.status(400).json({ error: `client must be one of: ${CLOSEOUT_CLIENTS.join(', ')}` })
      return
    }
    if (!Array.isArray(evidence) || !evidence.every(isEvidence)) {
      res.status(400).json({ error: `evidence must be [{kind, ref, note?}] with kind in: ${EVIDENCE_KINDS.join(', ')}` })
      return
    }
    if (!Array.isArray(uncertain) || !uncertain.every((u) => typeof u === 'string')) {
      res.status(400).json({ error: 'uncertain must be an array of strings' })
      return
    }
    const saved = closeouts.upsert({
      project_id: req.params.projectId,
      session_id: req.params.sessionId,
      client: client as CloseoutClient,
      workspace_path: typeof workspace_path === 'string' ? workspace_path : null,
      summary: summary.trim(),
      next_action: typeof next_action === 'string' && next_action.trim() !== '' ? next_action.trim() : null,
      evidence,
      uncertain,
    })
    projects.touch(req.params.projectId)
    res.json({ data: saved })
  })

  return router
}
```

Mount in `server/src/index.ts` **before** the analytics router line: `app.use('/api/projects/:projectId/closeouts', createCloseoutsRouter(db))`.

- [ ] **Step 5: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/db/CloseoutRepository.ts server/src/routes/closeouts.ts server/src/routes/closeouts.test.ts server/src/index.ts
git commit -m "feat(server): idempotent session closeouts per project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Project brief — builder and endpoint

**Files:**
- Create: `server/src/domain/brief.ts`
- Create: `server/src/domain/brief.test.ts`
- Create: `server/src/routes/brief.ts`
- Create: `server/src/routes/brief.test.ts`
- Modify: `server/src/db/InventoryRepository.ts` (`listWithPartNumbers`)
- Modify: `server/src/index.ts` (mount `createBriefRouter` at `/api/projects/:projectId/brief`)

**Interfaces:**
- Consumes: `isDependencyResolved`, `ForgeNodeType` (Task 3); `CloseoutRepository.listRecent` (Task 12)
- Produces:
  - `buildBrief(input: BriefInput, options?: { markdownLimit?: number }): Brief`
  - `BRIEF_MARKDOWN_LIMIT = 6000`
  - `GET /api/projects/:projectId/brief` → `200 { data: Brief }`
  - `InventoryRepository.listWithPartNumbers(): Array<{ id: string; name: string; part_number: string; quantity: number; location: string | null; status: 'owned' | 'wishlist' | 'on_order' }>`

- [ ] **Step 1: Write the failing builder tests**

```ts
// server/src/domain/brief.test.ts
import { describe, it, expect } from 'vitest'
import { buildBrief, type BriefInput, type BriefNode } from './brief.js'

const now = new Date('2026-10-20T12:00:00Z')
const node = (n: Partial<BriefNode> & Pick<BriefNode, 'id' | 'type' | 'title'>): BriefNode => ({
  status: null, priority: null, modified_at: '2026-10-19T00:00:00Z', depends_on: [], part_number: null, ...n,
})

const input: BriefInput = {
  now,
  project: { id: 'p1', name: 'Desk risers', description: 'Motorized desk riser with two NEMA17s', modified_at: '2026-10-19T00:00:00Z' },
  nodes: [
    node({ id: 'dec', type: 'decision', title: 'Lead screw pitch', status: 'pending' }),
    node({ id: 't1', type: 'task', title: 'Print motor brackets', status: 'in_progress', priority: 'high' }),
    node({ id: 't2', type: 'task', title: 'Wire drivers', status: 'pending', depends_on: ['dec'] }),
    node({ id: 't3', type: 'task', title: 'Order screws', status: 'pending', priority: 'low' }),
    node({ id: 't4', type: 'task', title: 'Old task', status: 'complete', modified_at: '2026-08-01T00:00:00Z' }),
    node({ id: 'c1', type: 'component', title: 'NEMA17', status: 'selected', part_number: '17HS4401' }),
    node({ id: 'c2', type: 'component', title: 'TMC2209', status: 'selected', part_number: 'TMC2209-LA' }),
  ],
  closeouts: [
    { session_id: 's1', client: 'codex', summary: 'Redesigned bracket v3', next_action: 'Print v3', uncertain: ['Clearance untested'], updated_at: '2026-10-19T10:00:00Z' },
  ],
  inventory: [
    { id: 'i1', name: 'Stepper motor', part_number: '17hs4401', quantity: 2, location: 'Bin A3', status: 'owned' },
  ],
}

describe('buildBrief', () => {
  const brief = buildBrief(input)

  it('orders next actions: in progress first, then priority, excluding blocked and complete', () => {
    expect(brief.next_actions.map((i) => i.id)).toEqual(['t1', 't3'])
  })

  it('lists blocked tasks with what they wait on', () => {
    expect(brief.blocked).toEqual([expect.objectContaining({ id: 't2', blocked_by: ['Lead screw pitch'] })])
  })

  it('lists open decisions and recent changes only within 14 days', () => {
    expect(brief.open_decisions.map((i) => i.id)).toEqual(['dec'])
    expect(brief.recent_changes.map((i) => i.id)).not.toContain('t4')
  })

  it('matches components to owned inventory case-insensitively and lists the rest as missing', () => {
    expect(brief.parts.owned).toEqual([{ title: 'NEMA17', part_number: '17HS4401', quantity: 2, location: 'Bin A3' }])
    expect(brief.parts.missing).toEqual([{ title: 'TMC2209', part_number: 'TMC2209-LA', inventory_status: null }])
  })

  it('renders markdown with project id, goal, last session, and uncertainty', () => {
    expect(brief.markdown).toContain('# Forge brief: Desk risers')
    expect(brief.markdown).toContain('Project ID: p1')
    expect(brief.markdown).toContain('Motorized desk riser')
    expect(brief.markdown).toContain('Redesigned bracket v3')
    expect(brief.markdown).toContain('Unverified: Clearance untested')
    expect(brief.truncated).toBe(false)
  })

  it('caps markdown at the limit and flags truncation', () => {
    const small = buildBrief(input, { markdownLimit: 300 })
    expect(small.markdown.length).toBeLessThanOrEqual(300)
    expect(small.truncated).toBe(true)
    expect(small.markdown).toContain('# Forge brief: Desk risers')
  })

  it('handles a project with no goal and no data', () => {
    const empty = buildBrief({ ...input, project: { ...input.project, description: null }, nodes: [], closeouts: [], inventory: [] })
    expect(empty.markdown).toContain('no goal recorded')
    expect(empty.next_actions).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx vitest run src/domain/brief.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the builder**

```ts
// server/src/domain/brief.ts
/**
 * Builds the compact, source-linked project brief agents receive at session
 * start. Pure and dependency-free (beyond nodeRules) so it is easy to test.
 */
import { isDependencyResolved, type ForgeNodeType } from './nodeRules.js'

export const BRIEF_MARKDOWN_LIMIT = 6000
const RECENT_DAYS = 14
const TITLE_MAX = 120
const SUMMARY_MAX = 600

export interface BriefNode {
  id: string
  type: ForgeNodeType
  title: string
  status: string | null
  priority: string | null
  modified_at: string
  depends_on: string[]
  part_number: string | null
}

export interface BriefCloseout {
  session_id: string
  client: string
  summary: string
  next_action: string | null
  uncertain: string[]
  updated_at: string
}

export interface BriefInventoryItem {
  id: string
  name: string
  part_number: string
  quantity: number
  location: string | null
  status: 'owned' | 'wishlist' | 'on_order'
}

export interface BriefInput {
  now: Date
  project: { id: string; name: string; description: string | null; modified_at: string }
  nodes: BriefNode[]
  closeouts: BriefCloseout[]
  inventory: BriefInventoryItem[]
}

export interface BriefItem {
  id: string
  type: ForgeNodeType
  title: string
  status: string | null
  priority: string | null
}

export interface Brief {
  project_id: string
  project_name: string
  goal: string | null
  generated_at: string
  last_sessions: BriefCloseout[]
  next_actions: BriefItem[]
  blocked: Array<BriefItem & { blocked_by: string[] }>
  open_decisions: BriefItem[]
  recent_changes: BriefItem[]
  parts: {
    owned: Array<{ title: string; part_number: string; quantity: number; location: string | null }>
    missing: Array<{ title: string; part_number: string; inventory_status: 'wishlist' | 'on_order' | null }>
  }
  markdown: string
  truncated: boolean
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
const item = (n: BriefNode): BriefItem => ({
  id: n.id, type: n.type, title: clip(n.title, TITLE_MAX), status: n.status, priority: n.priority,
})

export function buildBrief(
  input: BriefInput,
  options: { markdownLimit?: number } = {}
): Brief {
  const limit = options.markdownLimit ?? BRIEF_MARKDOWN_LIMIT
  const byId = new Map(input.nodes.map((n) => [n.id, n]))
  const unresolvedDeps = (n: BriefNode) =>
    n.depends_on
      .map((id) => byId.get(id))
      .filter((d): d is BriefNode => d !== undefined && !isDependencyResolved(d.type, d.status))

  const openTasks = input.nodes.filter((n) => n.type === 'task' && n.status !== 'complete')

  const next_actions = openTasks
    .filter((n) => (n.status ?? 'pending') !== 'blocked' && unresolvedDeps(n).length === 0)
    .sort(
      (a, b) =>
        Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
        (PRIORITY_RANK[a.priority ?? ''] ?? 3) - (PRIORITY_RANK[b.priority ?? ''] ?? 3) ||
        b.modified_at.localeCompare(a.modified_at)
    )
    .slice(0, 5)
    .map(item)

  const blocked = openTasks
    .map((n) => ({ n, deps: unresolvedDeps(n) }))
    .filter(({ n, deps }) => deps.length > 0 || n.status === 'blocked')
    .slice(0, 5)
    .map(({ n, deps }) => ({ ...item(n), blocked_by: deps.map((d) => clip(d.title, TITLE_MAX)) }))

  const open_decisions = input.nodes
    .filter((n) => n.type === 'decision' && (n.status ?? 'pending') === 'pending')
    .slice(0, 5)
    .map(item)

  const cutoff = new Date(input.now.getTime() - RECENT_DAYS * 86_400_000).toISOString()
  const recent_changes = input.nodes
    .filter((n) => n.modified_at >= cutoff)
    .sort((a, b) => b.modified_at.localeCompare(a.modified_at))
    .slice(0, 8)
    .map(item)

  const inventoryByPart = new Map<string, BriefInventoryItem[]>()
  for (const inv of input.inventory) {
    const key = inv.part_number.toLowerCase()
    inventoryByPart.set(key, [...(inventoryByPart.get(key) ?? []), inv])
  }
  const owned: Brief['parts']['owned'] = []
  const missing: Brief['parts']['missing'] = []
  for (const c of input.nodes) {
    if (c.type !== 'component' || !c.part_number || c.status === 'rejected') continue
    const matches = inventoryByPart.get(c.part_number.toLowerCase()) ?? []
    const have = matches.find((m) => m.status === 'owned' && m.quantity > 0)
    if (have) {
      owned.push({ title: clip(c.title, TITLE_MAX), part_number: c.part_number, quantity: have.quantity, location: have.location })
    } else {
      const pending = matches.find((m) => m.status !== 'owned')
      missing.push({ title: clip(c.title, TITLE_MAX), part_number: c.part_number, inventory_status: pending ? (pending.status as 'wishlist' | 'on_order') : null })
    }
  }

  const last_sessions = input.closeouts.slice(0, 2).map((c) => ({ ...c, summary: clip(c.summary, SUMMARY_MAX) }))
  const goal = input.project.description?.trim() || null

  const header = [
    `# Forge brief: ${input.project.name}`,
    `Project ID: ${input.project.id} · generated ${input.now.toISOString()}`,
    `Goal: ${goal ?? '(no goal recorded; ask the user and update the project description)'}`,
  ].join('\n')

  const section = (title: string, lines: string[]) => (lines.length ? `## ${title}\n${lines.join('\n')}` : '')
  const sections = [
    section('Last sessions', last_sessions.map((c) =>
      `- ${c.updated_at.slice(0, 10)} (${c.client}): ${c.summary}` +
      (c.next_action ? ` Next: ${c.next_action}` : '') +
      (c.uncertain.length ? ` Unverified: ${c.uncertain.join('; ')}` : ''))),
    section('Next actions', next_actions.map((i) => `- [${i.status ?? 'pending'}] ${i.title}${i.priority ? ` (${i.priority})` : ''} \`${i.id}\``)),
    section('Blocked', blocked.map((i) => `- ${i.title}: waiting on ${i.blocked_by.join(', ') || 'marked blocked'} \`${i.id}\``)),
    section('Open decisions', open_decisions.map((i) => `- ${i.title} \`${i.id}\``)),
    section('Parts', [
      ...owned.map((p) => `- Owned: ${p.title} (${p.part_number}) ×${p.quantity} @ ${p.location ?? 'location unknown'}`),
      ...missing.map((p) => `- Missing: ${p.title} (${p.part_number}): ${p.inventory_status?.replace('_', ' ') ?? 'not in inventory'}`),
    ]),
    section(`Recent changes (${RECENT_DAYS} days)`, recent_changes.map((i) => `- ${i.type}: ${i.title} \`${i.id}\``)),
  ].filter(Boolean)

  const footer = '\n\n_Brief truncated; use search_nodes/get_node for more._'
  let markdown = header.length > limit ? header.slice(0, limit) : header
  let truncated = header.length > limit
  for (const s of sections) {
    const candidate = `${markdown}\n\n${s}`
    if (candidate.length + footer.length > limit) {
      truncated = true
      break
    }
    markdown = candidate
  }
  if (truncated && markdown.length + footer.length <= limit) markdown += footer

  return {
    project_id: input.project.id,
    project_name: input.project.name,
    goal,
    generated_at: input.now.toISOString(),
    last_sessions,
    next_actions,
    blocked,
    open_decisions,
    recent_changes,
    parts: { owned: owned.slice(0, 10), missing: missing.slice(0, 10) },
    markdown,
    truncated,
  }
}
```

- [ ] **Step 4: Run builder tests to verify they pass**

Run: `cd server && npx vitest run src/domain/brief.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `listWithPartNumbers` to `InventoryRepository`**

```ts
  /** Inventory rows that can be matched to project components by part number. */
  listWithPartNumbers(): Array<{
    id: string; name: string; part_number: string; quantity: number
    location: string | null; status: 'owned' | 'wishlist' | 'on_order'
  }> {
    return this.db
      .prepare(
        `SELECT id, name, part_number, quantity, location, status
           FROM inventory_items WHERE part_number IS NOT NULL AND part_number != ''`
      )
      .all() as Array<{ id: string; name: string; part_number: string; quantity: number; location: string | null; status: 'owned' | 'wishlist' | 'on_order' }>
  }
```

- [ ] **Step 6: Write the failing route test**

```ts
// server/src/routes/brief.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createApp } from '../index.js'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import type { Express } from 'express'

describe('Brief API', () => {
  let tempDir: string
  let app: Express
  let db: DatabaseInstance
  let projectId: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-brief-test-'))
    db = createTestDatabase()
    app = createApp({ config: { port: 3000, dataDir: tempDir, staticDir: tempDir, dbPath: ':memory:' }, db }).app
    projectId = (await request(app).post('/api/projects').send({ name: 'Pegboard mounts', description: 'Hooks for the shop pegboard' })).body.data.id
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('assembles nodes, closeouts, and inventory into one brief', async () => {
    await request(app).post(`/api/projects/${projectId}/nodes`).send({ type: 'task', title: 'Print hook v3', status: 'in_progress' })
    await request(app).put(`/api/projects/${projectId}/closeouts/s1`).send({ client: 'claude-code', summary: 'Tuned clearance to 0.2 mm', next_action: 'Print v3' })

    const res = await request(app).get(`/api/projects/${projectId}/brief`)
    expect(res.status).toBe(200)
    expect(res.body.data.next_actions[0].title).toBe('Print hook v3')
    expect(res.body.data.last_sessions[0].summary).toBe('Tuned clearance to 0.2 mm')
    expect(res.body.data.markdown).toContain('Hooks for the shop pegboard')
  })

  it('404s for unknown projects', async () => {
    await request(app).get('/api/projects/missing/brief').expect(404)
  })
})
```

- [ ] **Step 7: Implement the route**

```ts
// server/src/routes/brief.ts
/**
 * Brief API
 * - GET /api/projects/:projectId/brief - Compact project brief for agents and humans
 */
import { Router, Request, Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { ProjectRepository } from '../db/ProjectRepository.js'
import { NodeRepository } from '../db/NodeRepository.js'
import { CloseoutRepository } from '../db/CloseoutRepository.js'
import { InventoryRepository } from '../db/InventoryRepository.js'
import { buildBrief } from '../domain/brief.js'

export function createBriefRouter(db: DatabaseInstance): Router {
  const router = Router({ mergeParams: true })
  const projects = new ProjectRepository(db)
  const nodes = new NodeRepository(db)
  const closeouts = new CloseoutRepository(db)
  const inventory = new InventoryRepository(db)

  router.get('/', (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const project = projects.findById(req.params.projectId)
      if (!project) {
        res.status(404).json({ error: 'Project not found' })
        return
      }
      const brief = buildBrief({
        now: new Date(),
        project,
        nodes: nodes.findByProject(project.id).map((n) => ({
          id: n.id, type: n.type, title: n.title, status: n.status, priority: n.priority,
          modified_at: n.modified_at, depends_on: n.depends_on, part_number: n.part_number ?? null,
        })),
        closeouts: closeouts.listRecent(project.id, 2),
        inventory: inventory.listWithPartNumbers(),
      })
      res.json({ data: brief })
    } catch (error) {
      console.error('Error building brief:', error)
      res.status(500).json({ error: 'Failed to build brief' })
    }
  })

  return router
}
```

Mount in `server/src/index.ts` before the analytics router: `app.use('/api/projects/:projectId/brief', createBriefRouter(db))`.

- [ ] **Step 8: Run all server tests**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/domain/brief.ts server/src/domain/brief.test.ts server/src/routes/brief.ts server/src/routes/brief.test.ts server/src/db/InventoryRepository.ts server/src/index.ts
git commit -m "feat(server): bounded project brief with next actions, blockers, parts, and last sessions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: MCP tools — resolve_workspace, link_workspace, get_brief, record_closeout

**Files:**
- Modify: `packages/forge-mcp-server/src/api-client.ts`
- Modify: `packages/forge-mcp-server/src/index.ts` (tool defs, handlers, CallTool cases)
- Create: `packages/forge-mcp-server/src/agent-loop.test.ts`

**Interfaces:**
- Consumes: Task 11–13 endpoints; `requireProjectId` (Task 8)
- Produces API client methods:
  - `resolveWorkspace(cwd: string, gitRemote?: string): Promise<ApiResult<{ project: ApiProject | null; match?: { kind: string; value: string }; candidates?: ApiProject[] }>>`
  - `linkWorkspace(input: { project_id: string; path?: string; git_remote?: string }): Promise<ApiResult<unknown[]>>`
  - `getBrief(projectId: string): Promise<ApiResult<{ markdown: string; truncated: boolean } & Record<string, unknown>>>`
  - `recordCloseout(projectId: string, sessionId: string, body: { client: 'claude-code' | 'codex' | 'other'; workspace_path?: string; summary: string; next_action?: string; evidence?: Array<{ kind: string; ref: string; note?: string }>; uncertain?: string[] }): Promise<ApiResult<unknown>>`
- Produces MCP tools: `resolve_workspace`, `link_workspace`, `get_brief` (scoped), `record_closeout` (scoped)

- [ ] **Step 1: Write the failing integration test against the real server**

```ts
// packages/forge-mcp-server/src/agent-loop.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApp } from '../../../server/src/index.js'
import { createTestDatabase } from '../../../server/src/db/index.js'
import { createApiClient } from './api-client.js'

describe('agent-loop API client (real Forge server)', () => {
  let server: Server
  let tempDir: string
  let client: ReturnType<typeof createApiClient>

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-mcp-loop-'))
    const db = createTestDatabase()
    const { app } = createApp({ config: { port: 0, dataDir: tempDir, staticDir: tempDir, dbPath: ':memory:' }, db })
    server = app.listen(0)
    const { port } = server.address() as AddressInfo
    client = createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` })
  })

  afterAll(async () => {
    server.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('links, resolves, briefs, and records a closeout', async () => {
    const project = await client.createProject({ name: 'Jumper organizer' })
    if (!project.success) throw new Error(project.error)
    const id = project.data.id

    const unresolved = await client.resolveWorkspace('/Users/a/Documents/Codex/2026-10-15/task-4')
    expect(unresolved.success && unresolved.data.project).toBeNull()

    await client.linkWorkspace({ project_id: id, path: '/Users/a/Documents/Codex/2026-10-15/task-4' })
    const resolved = await client.resolveWorkspace('/Users/a/Documents/Codex/2026-10-15/task-4/jumper-organizer')
    expect(resolved.success && resolved.data.project?.id).toBe(id)

    const saved = await client.recordCloseout(id, 'sess-9', { client: 'codex', summary: 'Added divider insert' })
    expect(saved.success).toBe(true)

    const brief = await client.getBrief(id)
    expect(brief.success && brief.data.markdown).toContain('Added divider insert')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/forge-mcp-server && npx vitest run src/agent-loop.test.ts`
Expected: FAIL, `client.resolveWorkspace is not a function`. (If vitest can't load `better-sqlite3` from the server folder, run `(cd server && npm ci)` first. Node resolves it from `server/node_modules` because the imported file lives there.)

- [ ] **Step 3: Implement the API client methods** (inside `createApiClient`, and add them to the returned object)

```ts
  // ========== Agent loop API ==========

  async function resolveWorkspace(cwd: string, gitRemote?: string) {
    return request<{ project: ApiProject | null; match?: { kind: string; value: string }; candidates?: ApiProject[] }>(
      'POST', '/workspaces/resolve', { cwd, git_remote: gitRemote }
    )
  }

  async function linkWorkspace(input: { project_id: string; path?: string; git_remote?: string }) {
    return request<unknown[]>('POST', '/workspaces/links', input)
  }

  async function getBrief(projectId: string) {
    return request<{ markdown: string; truncated: boolean } & Record<string, unknown>>(
      'GET', `/projects/${encodeURIComponent(projectId)}/brief`
    )
  }

  async function recordCloseout(
    projectId: string,
    sessionId: string,
    body: {
      client: 'claude-code' | 'codex' | 'other'
      workspace_path?: string
      summary: string
      next_action?: string
      evidence?: Array<{ kind: string; ref: string; note?: string }>
      uncertain?: string[]
    }
  ) {
    return request<unknown>(
      'PUT', `/projects/${encodeURIComponent(projectId)}/closeouts/${encodeURIComponent(sessionId)}`, body
    )
  }
```

- [ ] **Step 4: Run to verify the client test passes**

Run: `cd packages/forge-mcp-server && npx vitest run src/agent-loop.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the MCP tool definitions** (in the ListTools array)

```ts
        {
          name: 'resolve_workspace',
          description:
            'Find the Forge project for a working folder (and optional git remote). Returns the project, or candidate projects if the folder is not linked yet.',
          inputSchema: {
            type: 'object',
            properties: {
              cwd: { type: 'string', description: 'Absolute path of the working folder' },
              git_remote: { type: 'string', description: 'Output of `git remote get-url origin`, if any' },
            },
            required: ['cwd'],
          },
        },
        {
          name: 'link_workspace',
          description:
            "Link a working folder and/or git remote to a Forge project so future sessions get its brief automatically. Only call when the user's task clearly belongs to that project.",
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string' },
              path: { type: 'string', description: 'Absolute folder path to link' },
              git_remote: { type: 'string' },
            },
            required: ['project_id'],
          },
        },
        {
          name: 'get_brief',
          description:
            'Compact project brief: goal, last sessions, next actions, blockers, open decisions, parts owned/missing, recent changes. Read this before asking the user to re-explain a project.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'record_closeout',
          description: [
            'Record what this session changed for the Forge project. Safe to call again with the same session_id; it updates instead of duplicating.',
            'summary: what changed, in 1-4 sentences. next_action: the single most useful next step.',
            'evidence: [{kind: commit|file|test|url|user_report|observation, ref, note?}] for claims you can point to.',
            'uncertain: anything not verified. A code change is not a passed physical test; a sliced plate is not a printed part; a suggested purchase is not owned stock.',
          ].join(' '),
          inputSchema: {
            type: 'object',
            properties: {
              session_id: { type: 'string', description: 'The session id given in the Forge session-start context' },
              client: { type: 'string', enum: ['claude-code', 'codex', 'other'] },
              workspace_path: { type: 'string' },
              summary: { type: 'string' },
              next_action: { type: 'string' },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['commit', 'file', 'test', 'url', 'user_report', 'observation'] },
                    ref: { type: 'string' },
                    note: { type: 'string' },
                  },
                  required: ['kind', 'ref'],
                },
              },
              uncertain: { type: 'array', items: { type: 'string' } },
            },
            required: ['session_id', 'client', 'summary'],
          },
        },
```

- [ ] **Step 6: Add handlers and CallTool cases**

```ts
function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

function requireApi(): ApiClient {
  if (!isApiMode() || !apiClient) throw new Error('This tool requires FORGE_API_URL (API mode).')
  return apiClient
}

async function handleResolveWorkspace(args: Record<string, unknown>) {
  if (typeof args.cwd !== 'string') throw new Error('cwd is required')
  const result = await requireApi().resolveWorkspace(args.cwd, typeof args.git_remote === 'string' ? args.git_remote : undefined)
  return jsonResult(result)
}

async function handleLinkWorkspace(args: Record<string, unknown>) {
  if (typeof args.project_id !== 'string') throw new Error('project_id is required')
  const result = await requireApi().linkWorkspace({
    project_id: args.project_id,
    path: typeof args.path === 'string' ? args.path : undefined,
    git_remote: typeof args.git_remote === 'string' ? args.git_remote : undefined,
  })
  return jsonResult(result)
}

async function handleGetBrief() {
  const result = await requireApi().getBrief(requireProjectId())
  if (!result.success) return jsonResult(result)
  return { content: [{ type: 'text', text: result.data.markdown }] }
}

async function handleRecordCloseout(args: Record<string, unknown>) {
  if (typeof args.session_id !== 'string' || typeof args.summary !== 'string') {
    throw new Error('session_id and summary are required')
  }
  const result = await requireApi().recordCloseout(requireProjectId(), args.session_id, {
    client: (['claude-code', 'codex'].includes(args.client as string) ? args.client : 'other') as 'claude-code' | 'codex' | 'other',
    workspace_path: typeof args.workspace_path === 'string' ? args.workspace_path : undefined,
    summary: args.summary,
    next_action: typeof args.next_action === 'string' ? args.next_action : undefined,
    evidence: Array.isArray(args.evidence) ? (args.evidence as Array<{ kind: string; ref: string; note?: string }>) : undefined,
    uncertain: Array.isArray(args.uncertain) ? (args.uncertain as string[]) : undefined,
  })
  return jsonResult(result)
}
```

CallTool cases:

```ts
          case 'resolve_workspace':
            return await handleResolveWorkspace(args ?? {})
          case 'link_workspace':
            return await handleLinkWorkspace(args ?? {})
          case 'get_brief':
            return await handleGetBrief()
          case 'record_closeout':
            return await handleRecordCloseout(args ?? {})
```

- [ ] **Step 7: Test, build, and smoke-test over stdio**

Run: `cd packages/forge-mcp-server && npm test && npm run build`
Then: `printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | FORGE_API_URL=http://127.0.0.1:1/api node dist/index.js | grep -o '"name":"[a-z_]*"' | sort -u`
Expected: the list includes `get_brief`, `link_workspace`, `record_closeout`, `resolve_workspace`.

- [ ] **Step 8: Commit**

```bash
git add packages/forge-mcp-server/src/
git commit -m "feat(mcp): resolve_workspace, link_workspace, get_brief, record_closeout tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `forge-hook` CLI for Claude Code and Codex

**Files:**
- Create: `packages/forge-agent-hooks/package.json`
- Create: `packages/forge-agent-hooks/tsconfig.json`
- Create: `packages/forge-agent-hooks/vitest.config.ts`
- Create: `packages/forge-agent-hooks/src/forge.ts` (HTTP with timeout)
- Create: `packages/forge-agent-hooks/src/fingerprint.ts`
- Create: `packages/forge-agent-hooks/src/state.ts`
- Create: `packages/forge-agent-hooks/src/hooks.ts` (`sessionStart`, `stop`)
- Create: `packages/forge-agent-hooks/src/cli.ts`
- Create: `packages/forge-agent-hooks/src/hooks.test.ts`

**Interfaces:**
- Consumes: `POST /api/workspaces/resolve`, `GET /api/projects/:id/brief`, `GET /api/projects/:id/closeouts/:sessionId`
- Produces:
  - CLI `node dist/cli.js session-start|stop --client claude-code|codex`. Reads hook JSON on stdin and writes the hook response on stdout. Env: `FORGE_API_URL` (required), `FORGE_HOOK_STATE_DIR` (default `~/.forge/hook-state`).
  - `sessionStart(input: HookInput, deps: HookDeps): Promise<string>` returns the context text (empty string = print nothing)
  - `stop(input: HookInput, deps: HookDeps): Promise<StopOutput>` where `StopOutput = Record<string, never> | { decision: 'block'; reason: string }`
  - `HookInput = { session_id: string; cwd: string; stop_hook_active?: boolean; source?: string }`
  - `HookDeps = { apiUrl: string; client: 'claude-code' | 'codex'; stateDir: string; timeoutMs?: number }`

- [ ] **Step 1: Scaffold the package**

```json
// packages/forge-agent-hooks/package.json
{
  "name": "forge-agent-hooks",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "forge-hook": "./dist/cli.js" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^24.10.9",
    "typescript": "~5.9.3",
    "vitest": "^4.0.17"
  }
}
```

```json
// packages/forge-agent-hooks/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

```ts
// packages/forge-agent-hooks/vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', testTimeout: 15000 } })
```

Run `npm install` at the repo root (the `packages/*` workspace picks it up).

- [ ] **Step 2: Write the failing tests (against the real Forge server)**

```ts
// packages/forge-agent-hooks/src/hooks.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApp } from '../../../server/src/index.js'
import { createTestDatabase } from '../../../server/src/db/index.js'
import { sessionStart, stop, type HookDeps } from './hooks.js'

describe('forge hooks', () => {
  let server: Server
  let apiUrl: string
  let projectId: string
  let workDir: string
  let deps: HookDeps

  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-srv-'))
    const { app } = createApp({ config: { port: 0, dataDir: tmp, staticDir: tmp, dbPath: ':memory:' }, db: createTestDatabase() })
    server = app.listen(0)
    apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
    const res = await fetch(`${apiUrl}/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Monitor wall mount', description: 'VESA wall mount, PETG' }),
    })
    projectId = ((await res.json()) as { data: { id: string } }).data.id
  })

  afterAll(() => server.close())

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-work-'))
    deps = { apiUrl, client: 'codex', stateDir: await fs.mkdtemp(path.join(os.tmpdir(), 'forge-hooks-state-')) }
  })

  const link = () =>
    fetch(`${apiUrl}/workspaces/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, path: workDir }),
    })

  it('injects the brief and session instructions for a linked folder', async () => {
    await link()
    const out = await sessionStart({ session_id: 's1', cwd: workDir }, deps)
    expect(out).toContain('# Forge brief: Monitor wall mount')
    expect(out).toContain(`project_id="${projectId}"`)
    expect(out).toContain('session_id="s1"')
  })

  it('lists candidate projects for an unlinked folder', async () => {
    const out = await sessionStart({ session_id: 's2', cwd: workDir }, deps)
    expect(out).toContain('not linked')
    expect(out).toContain('Monitor wall mount')
    expect(out).toContain('link_workspace')
  })

  it('fails open when Forge is unreachable', async () => {
    const started = Date.now()
    const down = { ...deps, apiUrl: 'http://127.0.0.1:1/api', timeoutMs: 500 }
    expect(await sessionStart({ session_id: 's3', cwd: workDir }, down)).toBe('')
    expect(await stop({ session_id: 's3', cwd: workDir }, down)).toEqual({})
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('does not block when nothing changed in the workspace', async () => {
    await link()
    await sessionStart({ session_id: 's4', cwd: workDir }, deps)
    expect(await stop({ session_id: 's4', cwd: workDir }, deps)).toEqual({})
  })

  it('blocks once after workspace changes, then not again until the next change', async () => {
    await link()
    await sessionStart({ session_id: 's5', cwd: workDir }, deps)
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'mount-v2.scad'), 'cube(10);')

    const first = await stop({ session_id: 's5', cwd: workDir }, deps)
    expect(first).toMatchObject({ decision: 'block' })
    if ('reason' in first) expect(first.reason).toContain('record_closeout')

    expect(await stop({ session_id: 's5', cwd: workDir }, deps)).toEqual({})

    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'mount-v3.scad'), 'cube(12);')
    expect(await stop({ session_id: 's5', cwd: workDir }, deps)).toMatchObject({ decision: 'block' })
  })

  it('does not block when stop_hook_active', async () => {
    await link()
    await sessionStart({ session_id: 's6', cwd: workDir }, deps)
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(await stop({ session_id: 's6', cwd: workDir, stop_hook_active: true }, deps)).toEqual({})
  })

  it('does not block for unlinked folders', async () => {
    await sessionStart({ session_id: 's7', cwd: workDir }, deps)
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(await stop({ session_id: 's7', cwd: workDir }, deps)).toEqual({})
  })

  it('picks up a folder linked mid-session', async () => {
    await sessionStart({ session_id: 's8', cwd: workDir }, deps)
    await link()
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(workDir, 'x.txt'), 'x')
    expect(await stop({ session_id: 's8', cwd: workDir }, deps)).toMatchObject({ decision: 'block' })
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd packages/forge-agent-hooks && npx vitest run`
Expected: FAIL, `./hooks.js` not found.

- [ ] **Step 4: Implement `forge.ts`**

```ts
// packages/forge-agent-hooks/src/forge.ts
export interface ForgeProject { id: string; name: string; description: string | null }

export async function forgeFetch<T>(
  apiUrl: string,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs: number }
): Promise<T | null> {
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs),
    })
    if (!res.ok) return null
    return ((await res.json()) as { data: T }).data
  } catch {
    return null
  }
}

export type ResolveResult =
  | { project: ForgeProject; match: { kind: string; value: string } }
  | { project: null; candidates: ForgeProject[] }
```

- [ ] **Step 5: Implement `fingerprint.ts`**

```ts
// packages/forge-agent-hooks/src/fingerprint.ts
/**
 * Cheap "did this workspace change?" signal. Git repos: HEAD + porcelain status.
 * Anything else (e.g. dated Codex task folders): newest mtime under cwd.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SKIP = new Set(['node_modules', '.git', 'dist', '.venv', '__pycache__', '.next'])
const MAX_ENTRIES = 5000
const MAX_DEPTH = 4

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

export function gitRemote(cwd: string): string | undefined {
  return git(cwd, ['remote', 'get-url', 'origin']) ?? undefined
}

function newestMtime(root: string): number {
  let newest = 0
  let seen = 0
  const walk = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH || seen > MAX_ENTRIES) return
    let entries: import('node:fs').Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (++seen > MAX_ENTRIES) return
      if (SKIP.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, depth + 1)
      else if (entry.isFile()) {
        try {
          newest = Math.max(newest, statSync(full).mtimeMs)
        } catch {
          // file vanished mid-walk
        }
      }
    }
  }
  walk(root, 0)
  return newest
}

export function workspaceFingerprint(cwd: string): string {
  const head = git(cwd, ['rev-parse', 'HEAD'])
  const raw = head !== null
    ? `git:${head}:${git(cwd, ['status', '--porcelain']) ?? ''}`
    : `mtime:${newestMtime(cwd)}`
  return createHash('sha1').update(raw).digest('hex')
}
```

- [ ] **Step 6: Implement `state.ts`**

```ts
// packages/forge-agent-hooks/src/state.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SessionState {
  projectId: string | null
  /** Fingerprint at the last point we considered the workspace "recorded". */
  baseline: string
}

const file = (dir: string, sessionId: string) =>
  join(dir, `${sessionId.replace(/[^\w.-]/g, '_')}.json`)

export function readState(dir: string, sessionId: string): SessionState | null {
  try {
    return JSON.parse(readFileSync(file(dir, sessionId), 'utf8')) as SessionState
  } catch {
    return null
  }
}

export function writeState(dir: string, sessionId: string, state: SessionState): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(file(dir, sessionId), JSON.stringify(state), { mode: 0o600 })
}
```

- [ ] **Step 7: Implement `hooks.ts`**

```ts
// packages/forge-agent-hooks/src/hooks.ts
import { forgeFetch, type ResolveResult } from './forge.js'
import { gitRemote, workspaceFingerprint } from './fingerprint.js'
import { readState, writeState } from './state.js'

export interface HookInput {
  session_id: string
  cwd: string
  stop_hook_active?: boolean
  source?: string
}

export interface HookDeps {
  apiUrl: string
  client: 'claude-code' | 'codex'
  stateDir: string
  timeoutMs?: number
}

export type StopOutput = Record<string, never> | { decision: 'block'; reason: string }

const DEFAULT_TIMEOUT = 2500

async function resolve(input: HookInput, deps: HookDeps): Promise<ResolveResult | null> {
  return forgeFetch<ResolveResult>(deps.apiUrl, '/workspaces/resolve', {
    method: 'POST',
    body: { cwd: input.cwd, git_remote: gitRemote(input.cwd) },
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT,
  })
}

export async function sessionStart(input: HookInput, deps: HookDeps): Promise<string> {
  try {
    const resolved = await resolve(input, deps)
    if (!resolved) return ''

    writeState(deps.stateDir, input.session_id, {
      projectId: resolved.project?.id ?? null,
      baseline: workspaceFingerprint(input.cwd),
    })

    if (!resolved.project) {
      if (resolved.candidates.length === 0) return ''
      const list = resolved.candidates.map((p) => `- ${p.name} (project_id="${p.id}")`).join('\n')
      return [
        'Forge: this folder is not linked to a Forge project.',
        "If the user's task clearly belongs to one of these, call the Forge `link_workspace` tool with that project_id and",
        `path="${input.cwd}", then \`get_brief\`. Otherwise ignore this.`,
        list,
      ].join('\n')
    }

    const brief = await forgeFetch<{ markdown: string }>(
      deps.apiUrl,
      `/projects/${encodeURIComponent(resolved.project.id)}/brief`,
      { timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT }
    )
    if (!brief) return ''
    return [
      brief.markdown,
      '',
      `Forge session: project_id="${resolved.project.id}" session_id="${input.session_id}" client="${deps.client}".`,
      'Use this brief instead of asking the user to re-explain the project. Pass project_id on every Forge tool call.',
    ].join('\n')
  } catch {
    return ''
  }
}

export async function stop(input: HookInput, deps: HookDeps): Promise<StopOutput> {
  try {
    if (input.stop_hook_active) return {}
    const state = readState(deps.stateDir, input.session_id)
    if (!state) return {}

    let projectId = state.projectId
    if (!projectId) {
      const resolved = await resolve(input, deps)
      projectId = resolved?.project?.id ?? null
      if (!projectId) return {}
    }

    const current = workspaceFingerprint(input.cwd)
    if (current === state.baseline) return {}

    writeState(deps.stateDir, input.session_id, { projectId, baseline: current })
    return {
      decision: 'block',
      reason: [
        `Forge: files in this workspace changed this session. Call the Forge \`record_closeout\` tool with`,
        `project_id="${projectId}", session_id="${input.session_id}", client="${deps.client}", workspace_path="${input.cwd}",`,
        'a 1-4 sentence summary, the single best next_action, evidence for claims (commits, files, tests, user reports),',
        'and uncertain items (anything not physically or independently verified).',
        'If you already recorded one this session, call it again with the same session_id to update it. Then finish your reply.',
      ].join(' '),
    }
  } catch {
    return {}
  }
}
```

- [ ] **Step 8: Implement `cli.ts`**

```ts
#!/usr/bin/env node
// packages/forge-agent-hooks/src/cli.ts
import { homedir } from 'node:os'
import { join } from 'node:path'
import { sessionStart, stop, type HookInput, type HookDeps } from './hooks.js'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2)
  const clientArg = process.argv[process.argv.indexOf('--client') + 1]
  const apiUrl = process.env.FORGE_API_URL
  const isStop = command === 'stop'

  try {
    if (!apiUrl || (command !== 'session-start' && !isStop)) throw new Error('misconfigured')
    const input = JSON.parse(await readStdin()) as HookInput
    if (typeof input.session_id !== 'string' || typeof input.cwd !== 'string') throw new Error('bad input')

    const deps: HookDeps = {
      apiUrl,
      client: clientArg === 'codex' ? 'codex' : 'claude-code',
      stateDir: process.env.FORGE_HOOK_STATE_DIR ?? join(homedir(), '.forge', 'hook-state'),
    }

    if (isStop) {
      process.stdout.write(JSON.stringify(await stop(input, deps)))
    } else {
      const text = await sessionStart(input, deps)
      if (text) process.stdout.write(text)
    }
  } catch {
    // Fail open: never disturb the agent session.
    if (isStop) process.stdout.write('{}')
  }
  process.exit(0)
}

void main()
```

- [ ] **Step 9: Run tests and build**

Run: `cd packages/forge-agent-hooks && npx vitest run && npm run build && chmod +x dist/cli.js`
Expected: all 8 tests PASS. `dist/cli.js` exists.

- [ ] **Step 10: CLI smoke test (fail-open path)**

Run: `echo '{"session_id":"x","cwd":"/tmp"}' | FORGE_API_URL=http://127.0.0.1:1/api node packages/forge-agent-hooks/dist/cli.js stop --client codex; echo " exit=$?"`
Expected: `{} exit=0`, within about 3 s.

- [ ] **Step 11: Commit**

```bash
git add packages/forge-agent-hooks package.json package-lock.json
git commit -m "feat(hooks): forge-hook CLI injects briefs and prompts closeouts in Claude Code and Codex

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Deploy server changes and install the hooks

**Files:**
- Modify: `forge/config.yaml` (`version: "0.0.8"`)
- Modify (user config, outside repo): `~/.claude/settings.json`, `~/.codex/hooks.json`
- Modify: `CLAUDE.md` (a short "Agent loop" section)

**Interfaces:** live `/api/workspaces/*`, `/api/projects/:id/brief`, `/api/projects/:id/closeouts/*`. Hooks are active in both clients.

- [ ] **Step 1: Full verification**

Run: `npm run lint && npm run type-check && npm test && (cd server && npm test) && (cd packages/forge-mcp-server && npm test && npm run build) && (cd packages/forge-agent-hooks && npm test && npm run build) && npm run build:prod`
Expected: all PASS.

- [ ] **Step 2: Build, push, update the add-on**

```bash
docker buildx build --platform linux/amd64,linux/arm64 -f forge/Dockerfile \
  -t ghcr.io/abigley1/forge:0.0.8 -t ghcr.io/abigley1/forge:latest --push .
```

Then, via the `ha` skill: `ha store reload && ha addons update <forge-addon-slug> && ha addons logs <forge-addon-slug> | tail -20`
Expected: `Database migrated to version 6`.

- [ ] **Step 3: Verify live endpoints**

```bash
curl -fs -X POST http://192.168.1.130:8099/api/workspaces/resolve -H 'Content-Type: application/json' -d '{"cwd":"/tmp/nowhere"}' | head -c 400
```

Expected: `{"data":{"project":null,"candidates":[…real projects…]}}`.

- [ ] **Step 4: Install the Claude Code hooks**

Show Andrew the exact diff and get approval (this is user configuration). Then merge into `~/.claude/settings.json` under `"hooks"`:

```json
{
  "SessionStart": [
    {
      "matcher": "startup|resume|clear|compact",
      "hooks": [
        {
          "type": "command",
          "command": "FORGE_API_URL=http://192.168.1.130:8099/api node /Users/andrewbigley/Projects/ProjectAccelerator/packages/forge-agent-hooks/dist/cli.js session-start --client claude-code",
          "timeout": 6
        }
      ]
    }
  ],
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "FORGE_API_URL=http://192.168.1.130:8099/api node /Users/andrewbigley/Projects/ProjectAccelerator/packages/forge-agent-hooks/dist/cli.js stop --client claude-code",
          "timeout": 6
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: Install the Codex hooks, preserving the existing Tidbyt recorder**

Show Andrew the diff first. In `~/.codex/hooks.json`, **append** a new entry to the existing `SessionStart` and `Stop` arrays. Do not replace the Tidbyt entries:

```json
{
  "matcher": "startup|resume|clear|compact",
  "hooks": [
    {
      "type": "command",
      "command": "FORGE_API_URL=http://192.168.1.130:8099/api node /Users/andrewbigley/Projects/ProjectAccelerator/packages/forge-agent-hooks/dist/cli.js session-start --client codex",
      "timeout": 6
    }
  ]
}
```

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "FORGE_API_URL=http://192.168.1.130:8099/api node /Users/andrewbigley/Projects/ProjectAccelerator/packages/forge-agent-hooks/dist/cli.js stop --client codex",
      "timeout": 6
    }
  ]
}
```

Validate: `python3 -m json.tool ~/.codex/hooks.json > /dev/null && echo ok`.
Then ask Andrew to open Codex and trust the new hooks via `/hooks`. Codex skips untrusted or changed hooks.

- [ ] **Step 6: Document the loop in `CLAUDE.md`**

Add under "Architecture":

```markdown
### Agent loop (Forge 2.0)

- `packages/forge-agent-hooks` is wired into Claude Code and Codex SessionStart/Stop hooks (see `docs/plans/2026-10-15-forge-v2-agent-loop.md`, Task 16).
- SessionStart: resolves cwd → project via `/api/workspaces/resolve`, injects `/api/projects/:id/brief`.
- Stop: if the workspace fingerprint changed, asks the agent to call `record_closeout` (idempotent per session).
- After changing hook code: `cd packages/forge-agent-hooks && npm run build`. Codex requires re-trusting changed hooks via `/hooks`.
```

- [ ] **Step 7: Commit**

```bash
git add forge/config.yaml CLAUDE.md
git commit -m "chore: bump add-on to 0.0.8 (agent loop) and document hook setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: End-to-end verification in both clients, then the two-week pilot

**Files:**
- Create: `docs/plans/forge-v2-pilot-log.md`

**Interfaces:** none new. This task proves the loop on real projects.

- [ ] **Step 1: Pick three real active projects with Andrew**

Ask: "Which 3 projects should the pilot cover?" For example ProjectAccelerator itself, a hardware project under `~/Projects`, and one dated Codex task folder. For each, make sure a Forge project exists with a one-line goal in its description, then link its folder:

```bash
curl -fs -X POST http://192.168.1.130:8099/api/workspaces/links -H 'Content-Type: application/json' \
  -d '{"project_id":"<id>","path":"<absolute folder>","git_remote":"<origin url or omit>"}'
```

(For dated Codex folders, linking happens in-session via the `link_workspace` prompt. Exercise that path deliberately once.)

- [ ] **Step 2: Claude Code end-to-end**

In a linked folder: start a fresh `claude` session and ask "what's the state of this project?" Expected: the answer uses the brief without any tool call. Make a small real change the project needs. When the turn ends, the Stop hook should prompt and the agent should call `record_closeout`. Start another fresh session: its brief's "Last sessions" shows that closeout. Then:

```bash
curl -fs "http://192.168.1.130:8099/api/projects/<id>/closeouts" | python3 -m json.tool | grep -c '"session_id"'
```

Expected: one entry per session, with no duplicates after repeated prompts.

- [ ] **Step 3: Codex end-to-end**

Repeat Step 2 in Codex (after trusting the hooks). Also open a brand-new dated Codex task folder for one of the pilot projects. Expected: the not-linked candidate list appears, the agent calls `link_workspace`, and the next Stop prompts a closeout.

- [ ] **Step 4: Failure-mode check**

With Andrew's OK, run `ha addons stop <forge-addon-slug>`. Start a fresh session in a linked folder, make a small edit, and end the turn. Then run `ha addons start <forge-addon-slug>`. Expected: the session starts and stops normally, with no Forge context, no closeout prompt, and no visible error.

- [ ] **Step 5: Create the pilot log**

```markdown
# Forge 2.0 pilot log (2026-10-22 → 2026-11-05)

Kill criterion: by 2026-11-05, the brief should have saved re-explanation in most sessions. If not, stop and rethink before any Stage 2 work.

| Date | Client | Project | Brief used without re-explaining? (Y/N) | Agent assumption corrected? | Closeout accurate? (Y/N/partial) | Notes |
|---|---|---|---|---|---|---|
```

- [ ] **Step 6: Commit and open the PR**

```bash
git add docs/plans/forge-v2-pilot-log.md
git commit -m "docs: start Forge 2.0 pilot log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin forge-v2
gh pr create --title "Forge 2.0: trustworthy foundation + agent brief/closeout loop" --body "$(cat <<'EOF'
Implements docs/plans/2026-10-15-forge-v2-agent-loop.md.

- Week 1: field round-trips, status validation + migration, shared readiness rule, node versions (409), backup endpoint, MCP project_id scoping.
- Weeks 2-3: workspace links, idempotent closeouts, bounded project brief, MCP agent-loop tools, forge-hook CLI for Claude Code + Codex.

Deployed: add-on 0.0.7 and 0.0.8. Pre-change HA backup: <slug>. Restore drill: <date>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7: On 2026-11-05, review the pilot log with Andrew**

Count the Y's. If the brief helped in most sessions, plan Stage 2 (Home/resume view, inbox, global search including inventory). If not, write down what was missing before building anything else.
