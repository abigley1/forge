/**
 * Database Connection Manager
 *
 * Manages SQLite database connections using better-sqlite3.
 * Provides a singleton pattern for database access throughout the application.
 */

import Database from 'better-sqlite3'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema.js'

/**
 * Database instance type from better-sqlite3
 */
export type DatabaseInstance = Database.Database

/**
 * Database manager singleton
 */
let dbInstance: DatabaseInstance | null = null

/**
 * Options for initializing the database
 */
export interface DatabaseOptions {
  /** Path to the database file */
  dbPath: string
  /** Enable verbose logging */
  verbose?: boolean
  /** Run in memory (for testing) */
  inMemory?: boolean
}

/**
 * Initialize the database connection
 *
 * @param options - Database configuration options
 * @returns The database instance
 */
export function initializeDatabase(options: DatabaseOptions): DatabaseInstance {
  if (dbInstance) {
    return dbInstance
  }

  const { dbPath, verbose = false, inMemory = false } = options

  // Ensure directory exists for file-based databases
  if (!inMemory) {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Open database connection
  const db = new Database(inMemory ? ':memory:' : dbPath, {
    verbose: verbose ? console.log : undefined,
  })

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Enable WAL mode for better concurrent access
  if (!inMemory) {
    db.pragma('journal_mode = WAL')
  }

  // Run migrations
  runMigrations(db)

  dbInstance = db
  return db
}

/**
 * Get the current database instance
 *
 * @throws Error if database is not initialized
 */
export function getDatabase(): DatabaseInstance {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    )
  }
  return dbInstance
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/**
 * Reset the database singleton (for testing)
 */
export function resetDatabase(): void {
  closeDatabase()
}

/**
 * Run database migrations
 *
 * @param db - Database instance
 */
function runMigrations(db: DatabaseInstance): void {
  // Check if schema_version table exists
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    .get()

  if (!tableExists) {
    // Fresh database - create all tables
    db.exec(CREATE_TABLES_SQL)

    // Record schema version
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
      SCHEMA_VERSION
    )
    console.log(`Database initialized with schema version ${SCHEMA_VERSION}`)
    return
  }

  // Check current version
  const row = db
    .prepare('SELECT MAX(version) as version FROM schema_version')
    .get() as { version: number } | undefined

  const currentVersion = row?.version ?? 0

  if (currentVersion < SCHEMA_VERSION) {
    // Run incremental migrations
    runIncrementalMigrations(db, currentVersion, SCHEMA_VERSION)
  }
}

/**
 * Run incremental migrations from one version to another
 *
 * @param db - Database instance
 * @param fromVersion - Current schema version
 * @param toVersion - Target schema version
 */
function runIncrementalMigrations(
  db: DatabaseInstance,
  fromVersion: number,
  toVersion: number
): void {
  console.log(`Migrating database from version ${fromVersion} to ${toVersion}`)

  // Define migrations as an array of functions
  const migrations: Array<(db: DatabaseInstance) => void> = [
    // Migration 0 -> 1: Initial schema (already handled in CREATE_TABLES_SQL)
  ]

  // Run each migration in order
  for (let version = fromVersion; version < toVersion; version++) {
    const migration = migrations[version]
    if (migration) {
      console.log(`Running migration ${version + 1}...`)
      db.transaction(() => {
        migration(db)
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
          version + 1
        )
      })()
    }
  }

  console.log(`Database migrated to version ${toVersion}`)
}

/**
 * Create a new in-memory database for testing
 *
 * @returns A fresh in-memory database instance
 */
export function createTestDatabase(): DatabaseInstance {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES_SQL)
  db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
    SCHEMA_VERSION
  )
  return db
}
