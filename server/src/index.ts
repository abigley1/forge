import express from 'express'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { createCorsMiddleware } from './middleware/cors.js'
import { createHealthRouter } from './routes/health.js'
import { createFilesRouter } from './routes/files.js'
import { ServerFileSystemAdapter } from './adapters/ServerFileSystemAdapter.js'

/**
 * Server configuration from environment variables
 */
interface ServerConfig {
  port: number
  dataDir: string
  staticDir: string
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    dataDir: process.env.FORGE_DATA_DIR || './data',
    staticDir: process.env.FORGE_STATIC_DIR || './dist',
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
 * Create and configure the Express application
 */
export function createApp(config: ServerConfig) {
  const app = express()

  // Middleware
  app.use(createCorsMiddleware())
  app.use(express.json())

  // Create file system adapter
  const adapter = new ServerFileSystemAdapter(path.resolve(config.dataDir))

  // API routes
  app.use('/api/health', createHealthRouter(config.dataDir))
  app.use('/api/files', createFilesRouter(adapter))

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

  return { app, adapter }
}

/**
 * Start the server
 */
async function main() {
  const config = loadConfig()

  console.log('Forge Server starting...')
  console.log(`  Data directory: ${path.resolve(config.dataDir)}`)
  console.log(`  Static directory: ${path.resolve(config.staticDir)}`)
  console.log(`  Port: ${config.port}`)

  // Ensure data directory exists
  await ensureDataDir(config.dataDir)

  const { app } = createApp(config)

  app.listen(config.port, () => {
    console.log(`Forge Server listening on http://localhost:${config.port}`)
    console.log(`  Health check: http://localhost:${config.port}/api/health`)
    console.log(`  Files API: http://localhost:${config.port}/api/files/`)
  })
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}
