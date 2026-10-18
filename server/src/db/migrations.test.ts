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
    const rows = db
      .prepare('SELECT id, status, version FROM nodes ORDER BY id')
      .all()

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
    const tables = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{
        name: string
      }>
    ).map((t) => t.name)
    expect(tables).toEqual(
      expect.arrayContaining(['workspace_links', 'session_closeouts'])
    )
    resetDatabase()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('migration 6 -> 7', () => {
  afterEach(() => resetDatabase())

  it('creates design_projects on upgraded databases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'forge-migration-7-'))
    const dbPath = join(dir, 'forge.sqlite')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO schema_version (version) VALUES (6);
    `)
    legacy.close()
    const db = initializeDatabase({ dbPath })
    const cols = (
      db.prepare('PRAGMA table_info(design_projects)').all() as Array<{
        name: string
      }>
    ).map((c) => c.name)
    expect(cols).toEqual([
      'id',
      'name',
      'stage',
      'stage_note',
      'version',
      'created_at',
      'updated_at',
    ])
    expect(
      (
        db.prepare('SELECT MAX(version) v FROM schema_version').get() as {
          v: number
        }
      ).v
    ).toBe(7)
    resetDatabase()
    rmSync(dir, { recursive: true, force: true })
  })
})
