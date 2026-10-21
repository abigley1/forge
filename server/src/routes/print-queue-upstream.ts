import { Router } from 'express'
import { validatePlate, type PrintQueue } from '../print-queue-model.js'

/**
 * Read-only view of a print queue that lives on another Forge server.
 *
 * The Mac keeps a retired local queue (frozen backup) but must show, and validate
 * Studio handoffs against, the live queue on Home Assistant. Nothing here writes
 * upstream: every mutation is refused with a pointer to the live API.
 */
export interface UpstreamQueue {
  /** Live API base, e.g. http://192.168.1.130:8099/api */
  apiBase: string
  /** Live queue page for people, e.g. http://192.168.1.130:8099/?tool=print-queue */
  pageUrl: string
  readQueue: () => Promise<PrintQueue>
  readJson: (path: string) => Promise<unknown>
}

const MAX_BYTES = 5 * 1024 * 1024

export class UpstreamError extends Error {}

export function createUpstreamQueue(
  apiBase: string,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {}
): UpstreamQueue {
  const url = new URL(apiBase)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.search)
    throw new Error(
      'FORGE_PRINT_QUEUE_UPSTREAM must be a plain http(s) API URL.'
    )
  const base = url.href.replace(/\/$/, '')
  const get = options.fetch ?? fetch
  const unreachable = `The live print queue at ${base} is unreachable. Nothing on this Mac reads the retired local queue instead.`
  const readJson = async (path: string) => {
    let text: string
    try {
      const response = await get(`${base}${path}`, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
      })
      text = await response.text()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch {
      throw new UpstreamError(unreachable)
    }
    if (text.length > MAX_BYTES) throw new UpstreamError(unreachable)
    let body: { success?: unknown; data?: unknown }
    try {
      body = JSON.parse(text)
    } catch {
      throw new UpstreamError(unreachable)
    }
    if (body?.success !== true) throw new UpstreamError(unreachable)
    return body.data
  }
  const readQueue = async (): Promise<PrintQueue> => {
    const data = (await readJson('/print-queue')) as Partial<PrintQueue>
    try {
      if (
        !data ||
        !Number.isSafeInteger(data.version) ||
        !Array.isArray(data.plates)
      )
        throw new Error('shape')
      for (const plate of data.plates) {
        // Same rules HA applied when the row was written; a malformed reply is
        // treated as unavailable, never as "this plate has no prepared assets".
        validatePlate(plate)
        if (
          typeof plate.id !== 'string' ||
          !plate.id ||
          typeof plate.updatedAt !== 'string'
        )
          throw new Error('identity')
      }
    } catch {
      throw new UpstreamError(
        `The live print queue at ${base} returned an unexpected response.`
      )
    }
    return data as PrintQueue
  }
  return {
    apiBase: base,
    pageUrl: `${url.origin}/?tool=print-queue`,
    readQueue,
    readJson,
  }
}

/**
 * GET / mirrors the live resource; every other method is refused so the retired
 * local copy can never be edited by the browser, the CLI or an agent.
 */
export function createReadOnlyUpstreamRouter(
  upstream: UpstreamQueue,
  resource: 'print-queue' | 'design-projects'
): Router {
  const router = Router()
  router.get('/', async (_req, res) => {
    try {
      const data =
        resource === 'print-queue'
          ? {
              ...(await upstream.readQueue()),
              readOnlySource: upstream.pageUrl,
            }
          : await upstream.readJson(`/${resource}`)
      res.setHeader('Cache-Control', 'no-store')
      res.json({ success: true, data })
    } catch (error) {
      res.status(502).json({
        success: false,
        error:
          error instanceof UpstreamError
            ? error.message
            : 'The live print queue could not be read.',
      })
    }
  })
  router.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next()
    res.setHeader('Allow', 'GET')
    res.status(405).json({
      success: false,
      error: `This Mac's print queue is a retired, read-only copy. Make changes on the live queue at ${upstream.apiBase}/${resource} (scripts: FORGE_API_URL=${upstream.apiBase}).`,
    })
  })
  return router
}
