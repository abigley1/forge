/**
 * Shared Streamable HTTP transport. One long-lived process serves every MCP
 * client on this machine instead of each client spawning its own stdio copy.
 *
 * Each client gets its own MCP session (mcp-session-id header) backed by its
 * own Server instance, so per-client state such as the switch_project default
 * stays per-client. Listens on 127.0.0.1 only and rejects foreign Host/Origin
 * headers (DNS rebinding), since there is no authentication.
 */

import { randomUUID } from 'node:crypto'
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { endSession } from './project-scope.js'

export const HTTP_HOST = '127.0.0.1'
export const DEFAULT_HTTP_PORT = 8765
const MAX_BODY_BYTES = 4 * 1024 * 1024
// Clients that exit without DELETE leave their session behind; drop it after
// this long without a request so a months-long daemon does not grow forever.
const DEFAULT_SESSION_IDLE_MS = 24 * 60 * 60 * 1000

export interface TransportOptions {
  transport: 'stdio' | 'http'
  port: number
}

/** `--http [--port N]` or FORGE_MCP_TRANSPORT=http [FORGE_MCP_PORT=N]. */
export function parseTransportOptions(
  argv: string[],
  env: NodeJS.ProcessEnv
): TransportOptions {
  const http = argv.includes('--http') || env.FORGE_MCP_TRANSPORT === 'http'
  const portFlag = argv.indexOf('--port')
  const rawPort = portFlag >= 0 ? argv[portFlag + 1] : env.FORGE_MCP_PORT
  const port = rawPort === undefined ? DEFAULT_HTTP_PORT : Number(rawPort)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${rawPort}`)
  }
  return { transport: http ? 'http' : 'stdio', port }
}

interface Session {
  transport: StreamableHTTPServerTransport
  lastSeen: number
}

export interface StartHttpOptions {
  createServer: () => Server
  port: number
  sessionIdleMs?: number
}

export interface RunningHttpServer {
  httpServer: HttpServer
  port: number
  sessionCount: () => number
  close: () => Promise<void>
}

export async function startHttpServer(
  options: StartHttpOptions
): Promise<RunningHttpServer> {
  const sessions = new Map<string, Session>()
  const idleMs = options.sessionIdleMs ?? DEFAULT_SESSION_IDLE_MS
  let port = options.port

  const httpServer = createHttpServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error('Forge MCP HTTP error:', error)
      if (!res.headersSent) sendJsonRpcError(res, 500, 'Internal server error')
    })
  })

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', `http://${HTTP_HOST}`)

    if (!isLocalRequest(req, port)) {
      sendJsonRpcError(res, 403, 'Forbidden host or origin')
      return
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, sessions: sessions.size }))
      return
    }
    if (url.pathname !== '/mcp') {
      sendJsonRpcError(res, 404, 'Not found')
      return
    }

    const body = req.method === 'POST' ? await readJsonBody(req) : undefined
    if (body instanceof Error) {
      sendJsonRpcError(res, 400, body.message, -32700)
      return
    }

    const sessionId = header(req, 'mcp-session-id')
    const existing = sessionId ? sessions.get(sessionId) : undefined
    if (existing) {
      existing.lastSeen = Date.now()
      await existing.transport.handleRequest(req, res, body)
      return
    }
    if (sessionId) {
      // Spec: an unknown session gets 404 so the client re-initializes.
      sendJsonRpcError(res, 404, 'Session not found')
      return
    }
    if (req.method !== 'POST' || !isInitializeRequest(body)) {
      sendJsonRpcError(res, 400, 'No valid session ID provided')
      return
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, lastSeen: Date.now() })
      },
    })
    transport.onclose = () => {
      const id = transport.sessionId
      if (id && sessions.get(id)?.transport === transport) {
        sessions.delete(id)
        endSession(id)
      }
    }
    await options.createServer().connect(transport)
    await transport.handleRequest(req, res, body)
  }

  const sweep = setInterval(
    () => {
      const cutoff = Date.now() - idleMs
      for (const session of sessions.values()) {
        if (session.lastSeen < cutoff) void session.transport.close()
      }
    },
    Math.min(idleMs, 60 * 60 * 1000)
  )
  sweep.unref()

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(options.port, HTTP_HOST, () => {
      httpServer.off('error', reject)
      resolve()
    })
  })
  port = (httpServer.address() as AddressInfo).port

  return {
    httpServer,
    port,
    sessionCount: () => sessions.size,
    close: async () => {
      clearInterval(sweep)
      await Promise.all([...sessions.values()].map((s) => s.transport.close()))
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    },
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function isLocalRequest(req: IncomingMessage, port: number): boolean {
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`]
  if (!allowedHosts.includes(header(req, 'host') ?? '')) return false
  const origin = header(req, 'origin')
  return (
    origin === undefined ||
    allowedHosts.some((host) => origin === `http://${host}`)
  )
}

async function readJsonBody(req: IncomingMessage): Promise<unknown | Error> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) return new Error('Request body too large')
    chunks.push(chunk as Buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return new Error('Parse error: invalid JSON')
  }
}

function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  message: string,
  code = -32000
): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null })
  )
}
