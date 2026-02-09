import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

/**
 * Get git metadata for version.json
 */
function getGitInfo() {
  try {
    const gitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
    }).trim()
    const gitHashFull = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
    }).trim()
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim()
    return { gitHash, gitHashFull, gitBranch }
  } catch {
    return { gitHash: 'unknown', gitHashFull: 'unknown', gitBranch: 'unknown' }
  }
}

/**
 * Vite plugin to generate version.json during production builds
 */
function versionJsonPlugin(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    closeBundle() {
      const packageJson = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
      )
      const { gitHash, gitHashFull, gitBranch } = getGitInfo()

      const versionInfo = {
        version: packageJson.version,
        buildTimestamp: new Date().toISOString(),
        gitHash,
        gitHashFull,
        gitBranch,
        buildEnvironment: 'production',
      }

      const distPath = path.resolve(__dirname, 'dist')
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true })
      }

      fs.writeFileSync(
        path.join(distPath, 'version.json'),
        JSON.stringify(versionInfo, null, 2)
      )

      console.log('\n✓ Generated version.json')
      console.log(`  Version: ${versionInfo.version}`)
      console.log(`  Git Hash: ${versionInfo.gitHash}`)
      console.log(`  Build Time: ${versionInfo.buildTimestamp}\n`)
    },
  }
}

// Support configurable base path via VITE_BASE_PATH environment variable
// Defaults to '/' for standard deployments, can be set to '/ingress/...' for Home Assistant
const basePath = process.env.VITE_BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), versionJsonPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Polyfill Buffer for gray-matter (used for frontmatter parsing)
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    // Ensure assets use relative paths when base is configured
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Consistent chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
