import express from 'express'
import { createPrintQueueRouter } from './routes/print-queue.js'
import { createDesignProjectsRouter } from './routes/design-projects.js'
import { createPrintQueueStudioRouter } from './routes/print-queue-studio.js'
import {
  createReadOnlyUpstreamRouter,
  createUpstreamQueue,
} from './routes/print-queue-upstream.js'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { createCorsMiddleware } from './middleware/cors.js'
import { createHealthRouter } from './routes/health.js'
import { createBackupRouter } from './routes/backup.js'
import { createWorkspacesRouter } from './routes/workspaces.js'
import { createCloseoutsRouter } from './routes/closeouts.js'
import { createBriefRouter } from './routes/brief.js'
import { createFilesRouter } from './routes/files.js'
import { createProjectsRouter } from './routes/projects.js'
import {
  createNodesRouter,
  createProjectAnalyticsRouter,
} from './routes/nodes.js'
import { createInventoryRouter } from './routes/inventory.js'
import { urlExtractionRouter } from './routes/url-extraction.js'
import { barcodeLookupRouter } from './routes/barcode-lookup.js'
import { createCsvImportRouter } from './routes/csv-import.js'
import { createImageUploadRouter } from './routes/image-upload.js'
import { ServerFileSystemAdapter } from './adapters/ServerFileSystemAdapter.js'
import { initializeDatabase, closeDatabase } from './db/index.js'
import type { DatabaseInstance } from './db/index.js'
import type { Express } from 'express'

/**
 * Server configuration from environment variables
 */
interface ServerConfig {
  port: number
  dataDir: string
  staticDir: string
  dbPath: string
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): ServerConfig {
  const dataDir = process.env.FORGE_DATA_DIR || './data'
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    dataDir,
    staticDir: process.env.FORGE_STATIC_DIR || './dist',
    dbPath: process.env.FORGE_DB_PATH || path.join(dataDir, 'forge.sqlite'),
  }
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDir(dataDir: string): Promise<void> {
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    console.error(`Failed to create data directory: ${dataDir}`, error)
    throw error
  }
}

/**
 * Options for creating the app
 */
export interface CreateAppOptions {
  config: ServerConfig
  /** Optionally pass a pre-initialized database (for testing) */
  db?: DatabaseInstance
}

/**
 * Return type for createApp
 */
export interface CreateAppResult {
  app: Express
  adapter: InstanceType<typeof ServerFileSystemAdapter>
  db: DatabaseInstance
}

/**
 * Create and configure the Express application
 */
export function createApp(options: CreateAppOptions): CreateAppResult {
  const { config, db: externalDb } = options
  const app = express()

  // Initialize database (use external db if provided, e.g., for testing)
  const db =
    externalDb ??
    initializeDatabase({
      dbPath: config.dbPath,
      verbose: process.env.DEBUG_SQL === 'true',
    })

  // Middleware
  app.use(createCorsMiddleware())
  app.use(express.json({ limit: '50mb' })) // Allow larger payloads for attachments

  // Create file system adapter (for legacy/migration support)
  const adapter = new ServerFileSystemAdapter(path.resolve(config.dataDir))

  // API routes
  app.use('/api/health', createHealthRouter(config.dataDir))
  app.use('/api/backup', createBackupRouter(db))
  app.use('/api/workspaces', createWorkspacesRouter(db))
  app.use('/api/files', createFilesRouter(adapter))

  // New SQLite-backed API routes
  app.use('/api/projects', createProjectsRouter(db))
  app.use('/api/projects/:projectId/nodes', createNodesRouter(db))
  app.use('/api/projects/:projectId/closeouts', createCloseoutsRouter(db))
  app.use('/api/projects/:projectId/brief', createBriefRouter(db))
  app.use('/api/projects/:projectId', createProjectAnalyticsRouter(db))

  // Inventory module routes
  // On the Mac the local queue is a retired backup: mirror the live HA queue
  // read-only and refuse every local edit.
  const upstreamUrl = process.env.FORGE_PRINT_QUEUE_UPSTREAM
  const upstream = upstreamUrl ? createUpstreamQueue(upstreamUrl) : undefined
  if (upstream) {
    app.use(
      '/api/print-queue',
      createReadOnlyUpstreamRouter(upstream, 'print-queue')
    )
    app.use(
      '/api/design-projects',
      createReadOnlyUpstreamRouter(upstream, 'design-projects')
    )
  } else {
    app.use('/api/print-queue', createPrintQueueRouter(db))
    app.use('/api/design-projects', createDesignProjectsRouter(db))
  }
  const studioManifest = process.env.FORGE_STUDIO_MANIFEST
  // Trusted assets must be outside every browser-writable/static file root.
  const outsideRoot = (root: string, file: string) =>
    path
      .relative(path.resolve(root), path.resolve(file))
      .startsWith(`..${path.sep}`)
  app.use(
    '/api/print-queue-studio',
    createPrintQueueStudioRouter(
      db,
      process.platform === 'darwin' &&
        process.env.FORGE_HOST === '127.0.0.1' &&
        studioManifest &&
        outsideRoot(config.dataDir, studioManifest) &&
        outsideRoot(config.staticDir, studioManifest)
        ? {
            manifestPath: studioManifest,
            readQueue: upstream?.readQueue,
            origins: [
              `http://127.0.0.1:${config.port}`,
              `http://localhost:${config.port}`,
            ],
          }
        : undefined
    )
  )
  app.use('/api/inventory', createInventoryRouter(db))
  app.use('/api/inventory', urlExtractionRouter)
  app.use('/api/inventory', barcodeLookupRouter)
  app.use('/api/inventory', createCsvImportRouter(db))
  app.use('/api/inventory', createImageUploadRouter(db))

  // Serve static files from the Vite build output
  app.use(express.static(path.resolve(config.staticDir)))

  // SPA fallback - serve index.html for all non-API routes
  app.get('/*path', (_req, res) => {
    const indexPath = path.resolve(config.staticDir, 'index.html')
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).send('Not found')
      }
    })
  })

  return { app, adapter, db }
}

/**
 * Start the server
 */
async function main() {
  const config = loadConfig()

  console.log('Forge Server starting...')
  console.log(`  Data directory: ${path.resolve(config.dataDir)}`)
  console.log(`  Database: ${path.resolve(config.dbPath)}`)
  console.log(`  Static directory: ${path.resolve(config.staticDir)}`)
  console.log(`  Port: ${config.port}`)

  // Ensure data directory exists
  await ensureDataDir(config.dataDir)

  const { app } = createApp({ config })

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...')
    closeDatabase()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  app.listen(config.port, process.env.FORGE_HOST || '0.0.0.0', () => {
    console.log(`Forge Server listening on http://localhost:${config.port}`)
    console.log(`  Health check: http://localhost:${config.port}/api/health`)
    console.log(`  Projects API: http://localhost:${config.port}/api/projects`)
  })
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}
