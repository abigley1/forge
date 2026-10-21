import { Router, type Request } from 'express'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, realpath, stat, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DatabaseInstance } from '../db/index.js'
import { PrintQueueRepository } from '../db/PrintQueueRepository.js'
import type { PrintPlate, PrintQueue } from '../print-queue-model.js'
import { UpstreamError } from './print-queue-upstream.js'

const exec = promisify(execFile)
export const STUDIO_APP = '/Volumes/Bambu Studio/BambuStudio.app'
const APP_LABEL = 'Bambu Studio 2.8.2.61 (mounted application)'
const boundKeys = [
  'project',
  'revision',
  'artifact',
  'parts',
  'material',
  'profile',
] as const
interface Asset {
  expected: Pick<PrintPlate, (typeof boundKeys)[number]>
  sourceSha256: string
  projectFile?: string
  projectSha256?: string
  previewFile?: string
  previewSha256?: string
  previewKind: string
  reason: string
}
interface Manifest {
  entries: Record<string, Asset>
}
export interface StudioOptions {
  manifestPath: string
  origins: string[]
  /**
   * Where queue rows come from. The Mac passes the live Home Assistant queue;
   * omitted, the local database is used. Rows only gate eligibility: every path
   * and hash still comes from the local manifest.
   */
  readQueue?: () => Promise<PrintQueue>
  /** Injection for tests; production always uses fixed app and argv below. */
  launch?: (file: string) => Promise<void>
}
const digest = (bytes: Buffer | string) =>
  createHash('sha256').update(bytes).digest('hex')

async function launchStudio(file: string) {
  // Opening a separate process must not forward into a dirty existing document.
  const config = JSON.parse(
    await readFile(
      path.join(
        os.homedir(),
        'Library/Application Support/BambuStudio/BambuStudio.conf'
      ),
      'utf8'
    )
  )
  if (config.app?.single_instance !== false)
    throw new Error(
      'Studio single-instance mode is enabled or unknown. Open the saved project manually after saving your work; Forge has changed no settings.'
    )
  const version = await exec('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleShortVersionString',
    `${STUDIO_APP}/Contents/Info.plist`,
  ])
  if (version.stdout.trim() !== '02.08.02.61')
    throw new Error(
      'The verified Studio 2.8.2.61 application is not available at its selected location. No other app was opened.'
    )
  await exec('/usr/bin/open', ['-n', '-a', STUDIO_APP, '--args', file], {
    timeout: 15000,
  })
}

/** Loopback-only browser handoff. No arbitrary path, shell, download or printer commands. */
export function createPrintQueueStudioRouter(
  db: DatabaseInstance,
  options?: StudioOptions
): Router {
  const router = Router()
  const repo = new PrintQueueRepository(db)
  const readPlates = async () =>
    (await (options?.readQueue?.() ?? repo.read())).plates
  const token = randomBytes(32).toString('hex') // in-memory, rotates when server restarts
  const cooldown = new Map<string, number>()
  const sourceCache = new Map<string, { stamp: string; hash: string }>()
  const origins = new Set(options?.origins ?? [])
  const hosts = new Set([...origins].map((o) => new URL(o).host))
  const browserLocal = (req: Request) => {
    const remote = req.socket.remoteAddress
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote ?? ''))
      return false
    if (!hosts.has(req.headers.host ?? '')) return false
    const origin = req.get('Origin')
    const site = req.get('Sec-Fetch-Site')
    if (site && site !== 'same-origin') return false
    return origin
      ? origins.has(origin) && new URL(origin).host === req.headers.host
      : site === 'same-origin'
  }
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    if (!options) {
      res.status(503).json({
        success: false,
        error: 'Local Studio handoff is not configured on this server.',
      })
      return
    }
    if (!browserLocal(req)) {
      res.status(403).json({
        success: false,
        error: 'Studio handoff requires the local Forge page on this Mac.',
      })
      return
    }
    next()
  })
  const load = async () => {
    const manifestPath = await realpath(options!.manifestPath)
    const root = path.dirname(manifestPath)
    const manifest: Manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    return { root, manifest }
  }
  const checkedFile = async (
    root: string,
    relative: string | undefined,
    hash: string | undefined,
    extension: string
  ) => {
    if (
      !relative ||
      !hash ||
      !/^[a-f0-9]{64}$/.test(hash) ||
      path.isAbsolute(relative) ||
      path.basename(relative) !== relative ||
      !relative.endsWith(extension)
    )
      throw new Error('Prepared asset is unavailable.')
    const file = await realpath(path.join(root, relative))
    if (path.dirname(file) !== root)
      throw new Error('Prepared asset is outside its approved folder.')
    const s = await stat(file)
    if (!s.isFile() || s.size > 200 * 1024 * 1024)
      throw new Error('Prepared asset is invalid.')
    const bytes = await readFile(file)
    if (digest(bytes) !== hash)
      throw new Error(
        'Prepared file changed. Refresh its validation before opening or previewing it.'
      )
    return { file, bytes }
  }
  const matches = (p: PrintPlate, a: Asset) =>
    boundKeys.every(
      (k) => JSON.stringify(p[k]) === JSON.stringify(a.expected[k])
    )
  const sourceMatches = async (a: Asset) => {
    const s = await stat(a.expected.artifact)
    if (!s.isFile() || s.size > 200 * 1024 * 1024) return false
    const stamp = `${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`
    let cached = sourceCache.get(a.expected.artifact)
    if (!cached || cached.stamp !== stamp) {
      cached = { stamp, hash: digest(await readFile(a.expected.artifact)) }
      sourceCache.set(a.expected.artifact, cached)
    }
    return cached.hash === a.sourceSha256
  }
  const binding = (a: Asset) => digest(JSON.stringify(a))
  const resolve = async (id: string) => {
    const { root, manifest } = await load()
    const plate = (await readPlates()).find((p) => p.id === id)
    const asset = manifest.entries[id]
    if (
      !plate ||
      !asset ||
      !matches(plate, asset) ||
      !(await sourceMatches(asset))
    )
      throw new Error(
        'No validated preview or Studio project for this revision. Refresh after preparing it.'
      )
    return { root, plate, asset }
  }
  router.get('/session', (_req, res) =>
    res.json({ success: true, data: { token, appLabel: APP_LABEL } })
  )
  router.get('/assets', async (_req, res) => {
    try {
      const { manifest } = await load()
      const plates = await readPlates()
      const items: Record<string, unknown> = {}
      for (const plate of plates) {
        const asset = manifest.entries[plate.id]
        if (!asset || !matches(plate, asset)) continue
        try {
          if (!(await sourceMatches(asset))) continue
        } catch {
          continue
        }
        items[plate.id] = {
          binding: binding(asset),
          preview: !!asset.previewFile,
          previewKind: asset.previewKind,
          reason: asset.reason,
          canOpen:
            !!asset.projectFile &&
            !plate.supersededBy &&
            !['printing', 'done'].includes(plate.status),
        }
      }
      res.json({ success: true, data: { items, appLabel: APP_LABEL } })
    } catch (error) {
      res.status(503).json({
        success: false,
        error:
          error instanceof UpstreamError
            ? `${error.message} Previews and Studio handoff are paused.`
            : 'Prepared previews are unavailable. The queue itself still works.',
      })
    }
  })
  router.get('/:id/preview', async (req, res) => {
    try {
      const { root, asset } = await resolve(req.params.id)
      if (req.query.v !== binding(asset)) {
        res.status(409).end()
        return
      }
      const { bytes } = await checkedFile(
        root,
        asset.previewFile,
        asset.previewSha256,
        '.png'
      )
      res.type('png').send(bytes)
    } catch {
      res.status(404).json({
        success: false,
        error: 'Preview unavailable for this revision.',
      })
    }
  })
  router.post('/:id/open', async (req, res) => {
    const supplied = req.get('X-Forge-Studio') ?? ''
    if (
      !req.get('Origin') ||
      !/^[a-f0-9]{64}$/.test(supplied) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
    ) {
      res.status(403).json({
        success: false,
        error: 'Reload the local queue before opening Studio.',
      })
      return
    }
    if (
      !req.body ||
      Object.keys(req.body).some((k) => k !== 'binding') ||
      typeof req.body.binding !== 'string'
    ) {
      res.status(400).json({
        success: false,
        error: 'Supply the selected queue asset only.',
      })
      return
    }
    let locked = false
    try {
      const { root, asset, plate } = await resolve(req.params.id)
      if (
        asset.projectFile === undefined ||
        plate.supersededBy ||
        ['printing', 'done'].includes(plate.status)
      )
        throw new Error(
          asset.reason || 'This plate is not available for Studio handoff.'
        )
      if (req.body.binding !== binding(asset)) {
        res.status(409).json({
          success: false,
          error: 'Prepared project changed; refresh and review it.',
        })
        return
      }
      if ((cooldown.get(plate.id) ?? 0) > Date.now()) {
        res.status(409).json({
          success: false,
          error: 'This plate was just opened. Check its Studio window.',
        })
        return
      }
      cooldown.set(plate.id, Date.now() + 15000)
      locked = true
      const { file } = await checkedFile(
        root,
        asset.projectFile,
        asset.projectSha256,
        '.3mf'
      )
      const folder = path.join(root, 'opened-copies')
      await mkdir(folder, { recursive: true })
      if ((await realpath(folder)) !== folder)
        throw new Error('Handoff folder must not be a symbolic link.')
      const copy = path.join(
        folder,
        `${plate.id}-${randomBytes(8).toString('hex')}.3mf`
      )
      await copyFile(file, copy)
      if (digest(await readFile(copy)) !== asset.projectSha256)
        throw new Error('Project changed during handoff; nothing opened.')
      await (options!.launch ?? launchStudio)(copy)
      res.json({
        success: true,
        data: {
          message:
            'Opened a separate Studio window for review. Queue counts are unchanged; nothing was sent to the printer.',
        },
      })
    } catch (error) {
      if (locked) cooldown.delete(req.params.id)
      res.status(409).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Studio could not open.',
      })
    }
  })
  return router
}
