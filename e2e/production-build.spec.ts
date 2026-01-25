import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distPath = path.join(projectRoot, 'dist')

/**
 * E2E tests for production build (Task 12.1)
 *
 * These tests verify:
 * - npm run build:prod generates optimized static files in dist/
 * - version.json is generated with build metadata
 * - Assets respect the base path configuration
 */
test.describe('Production Build', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // Clean dist directory before tests
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true })
    }

    // Run production build
    console.log('Running production build...')
    try {
      execSync('npm run build:prod', {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      })
    } catch (error) {
      console.error('Build failed:', error)
      throw error
    }
  })

  test('build:prod generates dist directory', async () => {
    expect(fs.existsSync(distPath)).toBe(true)
  })

  test('dist contains index.html', async () => {
    const indexPath = path.join(distPath, 'index.html')
    expect(fs.existsSync(indexPath)).toBe(true)

    const content = fs.readFileSync(indexPath, 'utf-8')
    // Vite uses lowercase doctype
    expect(content.toLowerCase()).toContain('<!doctype html>')
    expect(content).toContain('<script')
  })

  test('dist contains assets directory', async () => {
    const assetsPath = path.join(distPath, 'assets')
    expect(fs.existsSync(assetsPath)).toBe(true)

    const assets = fs.readdirSync(assetsPath)
    expect(assets.length).toBeGreaterThan(0)

    // Should contain JavaScript files
    const jsFiles = assets.filter((f) => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)

    // Should contain CSS files
    const cssFiles = assets.filter((f) => f.endsWith('.css'))
    expect(cssFiles.length).toBeGreaterThan(0)
  })

  test('version.json is generated with correct structure', async () => {
    const versionPath = path.join(distPath, 'version.json')
    expect(fs.existsSync(versionPath)).toBe(true)

    const versionContent = fs.readFileSync(versionPath, 'utf-8')
    const version = JSON.parse(versionContent)

    // Check required fields
    expect(version).toHaveProperty('version')
    expect(version).toHaveProperty('buildTimestamp')
    expect(version).toHaveProperty('gitHash')
    expect(version).toHaveProperty('gitHashFull')
    expect(version).toHaveProperty('gitBranch')
    expect(version).toHaveProperty('buildEnvironment')
  })

  test('version.json contains valid version from package.json', async () => {
    const versionPath = path.join(distPath, 'version.json')
    const packagePath = path.join(projectRoot, 'package.json')

    const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))

    expect(version.version).toBe(packageJson.version)
  })

  test('version.json buildTimestamp is valid ISO date', async () => {
    const versionPath = path.join(distPath, 'version.json')
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))

    const timestamp = new Date(version.buildTimestamp)
    expect(timestamp.toString()).not.toBe('Invalid Date')

    // Timestamp should be recent (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    expect(timestamp > oneHourAgo).toBe(true)
  })

  test('version.json gitHash is valid short hash', async () => {
    const versionPath = path.join(distPath, 'version.json')
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))

    // Git short hash is typically 7-8 characters or 'unknown'
    if (version.gitHash !== 'unknown') {
      expect(version.gitHash).toMatch(/^[a-f0-9]{7,8}$/)
    }
  })

  test('version.json buildEnvironment is production', async () => {
    const versionPath = path.join(distPath, 'version.json')
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))

    expect(version.buildEnvironment).toBe('production')
  })

  test('assets have hashed filenames for cache busting', async () => {
    const assetsPath = path.join(distPath, 'assets')
    const assets = fs.readdirSync(assetsPath)

    // Check JS files have hash in filename
    const jsFiles = assets.filter((f) => f.endsWith('.js'))
    for (const file of jsFiles) {
      // Pattern: name-HASH.js (hash may contain alphanumeric and underscore)
      expect(file).toMatch(/^.+-[a-zA-Z0-9_]+\.js$/)
    }

    // Check CSS files have hash in filename
    const cssFiles = assets.filter((f) => f.endsWith('.css'))
    for (const file of cssFiles) {
      // Pattern: name-HASH.css (hash may contain alphanumeric and underscore)
      expect(file).toMatch(/^.+-[a-zA-Z0-9_]+\.css$/)
    }
  })

  test('index.html references assets correctly', async () => {
    const indexPath = path.join(distPath, 'index.html')
    const content = fs.readFileSync(indexPath, 'utf-8')

    // Should reference assets from the assets directory (with optional base path prefix)
    expect(content).toMatch(/src="[^"]*assets\/[^"]+\.js"/)
    // Should have stylesheet link
    expect(content).toMatch(/href="[^"]*assets\/[^"]+\.css"/)
  })
})

test.describe('Base Path Configuration', () => {
  test.beforeAll(async () => {
    // Clean dist directory
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true })
    }

    // Run build with custom base path
    console.log('Running build with custom base path...')
    try {
      execSync('VITE_BASE_PATH=/forge/ npm run build:prod', {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      })
    } catch (error) {
      console.error('Build with base path failed:', error)
      throw error
    }
  })

  test('index.html respects VITE_BASE_PATH for assets', async () => {
    const indexPath = path.join(distPath, 'index.html')
    const content = fs.readFileSync(indexPath, 'utf-8')

    // Assets should be prefixed with the base path
    expect(content).toContain('/forge/assets/')
  })

  test('version.json is still generated with custom base path', async () => {
    const versionPath = path.join(distPath, 'version.json')
    expect(fs.existsSync(versionPath)).toBe(true)

    const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
    expect(version).toHaveProperty('version')
    expect(version.buildEnvironment).toBe('production')
  })
})
