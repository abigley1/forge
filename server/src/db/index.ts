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
    // Migration 1 -> 2: Add inventory module tables
    () => {}, // Version 1 is base schema
    (db: DatabaseInstance) => {
      // Create inventory tables
      db.prepare(
        `
        CREATE TABLE IF NOT EXISTS inventory_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0
        )
      `
      ).run()

      db.prepare(
        `
        CREATE TABLE IF NOT EXISTS inventory_subcategories (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0
        )
      `
      ).run()

      db.prepare(
        `
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category_id TEXT NOT NULL REFERENCES inventory_categories(id),
          subcategory_id TEXT REFERENCES inventory_subcategories(id),
          quantity INTEGER NOT NULL DEFAULT 0,
          location TEXT,
          supplier TEXT,
          supplier_url TEXT,
          part_number TEXT,
          cost REAL,
          barcode TEXT,
          notes TEXT,
          image_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `
      ).run()

      db.prepare(
        `
        CREATE TABLE IF NOT EXISTS inventory_item_tags (
          item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
          tag TEXT NOT NULL,
          PRIMARY KEY (item_id, tag)
        )
      `
      ).run()

      // Create FTS virtual table
      db.prepare(
        `
        CREATE VIRTUAL TABLE IF NOT EXISTS inventory_items_fts USING fts5(
          name, notes, part_number,
          content='inventory_items',
          content_rowid='rowid'
        )
      `
      ).run()

      // Create FTS triggers
      db.prepare(
        `
        CREATE TRIGGER IF NOT EXISTS inventory_items_ai AFTER INSERT ON inventory_items BEGIN
          INSERT INTO inventory_items_fts(rowid, name, notes, part_number)
          VALUES (NEW.rowid, NEW.name, NEW.notes, NEW.part_number);
        END
      `
      ).run()

      db.prepare(
        `
        CREATE TRIGGER IF NOT EXISTS inventory_items_ad AFTER DELETE ON inventory_items BEGIN
          INSERT INTO inventory_items_fts(inventory_items_fts, rowid, name, notes, part_number)
          VALUES ('delete', OLD.rowid, OLD.name, OLD.notes, OLD.part_number);
        END
      `
      ).run()

      db.prepare(
        `
        CREATE TRIGGER IF NOT EXISTS inventory_items_au AFTER UPDATE ON inventory_items BEGIN
          INSERT INTO inventory_items_fts(inventory_items_fts, rowid, name, notes, part_number)
          VALUES ('delete', OLD.rowid, OLD.name, OLD.notes, OLD.part_number);
          INSERT INTO inventory_items_fts(rowid, name, notes, part_number)
          VALUES (NEW.rowid, NEW.name, NEW.notes, NEW.part_number);
        END
      `
      ).run()

      // Create indexes
      db.prepare(
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id)`
      ).run()
      db.prepare(
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_subcategory ON inventory_items(subcategory_id)`
      ).run()
      db.prepare(
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location)`
      ).run()

      // Seed default categories
      const insertCategory = db.prepare(
        `INSERT OR IGNORE INTO inventory_categories (id, name, sort_order) VALUES (?, ?, ?)`
      )
      insertCategory.run('electronics', 'Electronics', 0)
      insertCategory.run('fasteners', 'Fasteners', 1)
      insertCategory.run('mechanical', 'Mechanical', 2)
      insertCategory.run('raw-materials', 'Raw Materials', 3)
      insertCategory.run('tools', 'Tools', 4)
      insertCategory.run('consumables', 'Consumables', 5)
      insertCategory.run('other', 'Other', 6)

      // Seed default subcategories
      const insertSubcategory = db.prepare(
        `INSERT OR IGNORE INTO inventory_subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)`
      )

      // Electronics subcategories
      insertSubcategory.run(
        'electronics-capacitors',
        'electronics',
        'Capacitors',
        0
      )
      insertSubcategory.run(
        'electronics-resistors',
        'electronics',
        'Resistors',
        1
      )
      insertSubcategory.run('electronics-ics', 'electronics', 'ICs', 2)
      insertSubcategory.run(
        'electronics-connectors',
        'electronics',
        'Connectors',
        3
      )
      insertSubcategory.run('electronics-sensors', 'electronics', 'Sensors', 4)
      insertSubcategory.run('electronics-leds', 'electronics', 'LEDs', 5)
      insertSubcategory.run('electronics-other', 'electronics', 'Other', 6)

      // Fasteners subcategories
      insertSubcategory.run('fasteners-screws', 'fasteners', 'Screws', 0)
      insertSubcategory.run('fasteners-nuts', 'fasteners', 'Nuts', 1)
      insertSubcategory.run('fasteners-bolts', 'fasteners', 'Bolts', 2)
      insertSubcategory.run('fasteners-washers', 'fasteners', 'Washers', 3)
      insertSubcategory.run('fasteners-standoffs', 'fasteners', 'Standoffs', 4)
      insertSubcategory.run('fasteners-other', 'fasteners', 'Other', 5)

      // Mechanical subcategories
      insertSubcategory.run('mechanical-bearings', 'mechanical', 'Bearings', 0)
      insertSubcategory.run('mechanical-gears', 'mechanical', 'Gears', 1)
      insertSubcategory.run('mechanical-pulleys', 'mechanical', 'Pulleys', 2)
      insertSubcategory.run('mechanical-shafts', 'mechanical', 'Shafts', 3)
      insertSubcategory.run('mechanical-motors', 'mechanical', 'Motors', 4)
      insertSubcategory.run('mechanical-other', 'mechanical', 'Other', 5)

      // Raw Materials subcategories
      insertSubcategory.run('raw-materials-sheet', 'raw-materials', 'Sheet', 0)
      insertSubcategory.run('raw-materials-rod', 'raw-materials', 'Rod', 1)
      insertSubcategory.run('raw-materials-tube', 'raw-materials', 'Tube', 2)
      insertSubcategory.run('raw-materials-wire', 'raw-materials', 'Wire', 3)
      insertSubcategory.run('raw-materials-other', 'raw-materials', 'Other', 4)

      // Consumables subcategories
      insertSubcategory.run('consumables-solder', 'consumables', 'Solder', 0)
      insertSubcategory.run('consumables-tape', 'consumables', 'Tape', 1)
      insertSubcategory.run(
        'consumables-adhesives',
        'consumables',
        'Adhesives',
        2
      )
      insertSubcategory.run('consumables-other', 'consumables', 'Other', 3)
    },
    // Migration 2 -> 3: Add status column to inventory_items
    (db: DatabaseInstance) => {
      // Add status column with default 'owned' for existing items
      db.prepare(
        `ALTER TABLE inventory_items ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'`
      ).run()
      // Add index for status filtering
      db.prepare(
        `CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status)`
      ).run()
    },
    // Migration 3 -> 4: Add low_stock_threshold column to inventory_items
    (db: DatabaseInstance) => {
      // Add low_stock_threshold column (nullable, null means no alert)
      db.prepare(
        `ALTER TABLE inventory_items ADD COLUMN low_stock_threshold INTEGER`
      ).run()
    },
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
