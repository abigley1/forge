import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { request } from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  parseTransportOptions,
  startHttpServer,
  type RunningHttpServer,
} from './http-server.js'
import {
  getDefaultProjectId,
  runWithProject,
  setDefaultProjectId,
} from './project-scope.js'

// Same shape as createForgeServer: switch_project sets the session's default,
// which later calls in that session read back.
function createScopedServer(): Server {
  const server = new Server(
    { name: 'test', version: '0.0.0' },
    { capabilities: { tools: {} } }
  )
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }))
  server.setRequestHandler(CallToolRequestSchema, async (req, ctx) =>
    runWithProject({ sessionId: ctx.sessionId }, async () => {
      if (req.params.name === 'switch_project') {
        setDefaultProjectId(String(req.params.arguments?.projectId))
      }
      return {
        content: [{ type: 'text', text: String(getDefaultProjectId()) }],
      }
    })
  )
  return server
}

async function connect(port: number): Promise<Client> {
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))
  )
  return client
}

async function callText(
  client: Client,
  name: string,
  args: Record<string, unknown> = {}
): Promise<string> {
  const result = await client.callTool({ name, arguments: args })
  return (result.content as Array<{ text: string }>)[0].text
}

function rawPost(
  port: number,
  headers: Record<string, string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...headers,
        },
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
      }
    )
    req.on('error', reject)
    req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
  })
}

describe('parseTransportOptions', () => {
  it('defaults to stdio', () => {
    expect(parseTransportOptions([], {})).toEqual({
      transport: 'stdio',
      port: 8765,
    })
  })

  it('reads flags and env', () => {
    expect(parseTransportOptions(['--http', '--port', '9000'], {})).toEqual({
      transport: 'http',
      port: 9000,
    })
    expect(
      parseTransportOptions([], {
        FORGE_MCP_TRANSPORT: 'http',
        FORGE_MCP_PORT: '9001',
      })
    ).toEqual({ transport: 'http', port: 9001 })
  })

  it('rejects a bad port', () => {
    expect(() => parseTransportOptions(['--http', '--port', 'x'], {})).toThrow(
      /Invalid port/
    )
  })
})

describe('shared HTTP server', () => {
  let running: RunningHttpServer

  beforeAll(async () => {
    running = await startHttpServer({
      createServer: createScopedServer,
      port: 0,
    })
  })

  afterAll(async () => {
    await running.close()
  })

  it('keeps switch_project defaults separate per client', async () => {
    const a = await connect(running.port)
    const b = await connect(running.port)

    expect(await callText(a, 'switch_project', { projectId: 'alpha' })).toBe(
      'alpha'
    )
    expect(await callText(b, 'switch_project', { projectId: 'beta' })).toBe(
      'beta'
    )
    expect(await callText(a, 'whoami')).toBe('alpha')
    expect(await callText(b, 'whoami')).toBe('beta')
    expect(getDefaultProjectId()).toBeNull()
    expect(running.sessionCount()).toBe(2)

    await a.close()
    await b.close()
  })

  it('drops a session when the client terminates it', async () => {
    const before = running.sessionCount()
    const client = await connect(running.port)
    expect(running.sessionCount()).toBe(before + 1)

    await (client.transport as StreamableHTTPClientTransport).terminateSession()
    await client.close()
    expect(running.sessionCount()).toBe(before)
  })

  it('returns 404 for an unknown session so clients re-initialize', async () => {
    expect(
      await rawPost(running.port, { 'mcp-session-id': 'no-such-session' })
    ).toBe(404)
  })

  it('rejects a foreign Host or Origin (DNS rebinding)', async () => {
    expect(await rawPost(running.port, { host: 'evil.example:80' })).toBe(403)
    expect(
      await rawPost(running.port, { origin: 'https://evil.example' })
    ).toBe(403)
  })

  it('expires idle sessions', async () => {
    const short = await startHttpServer({
      createServer: createScopedServer,
      port: 0,
      sessionIdleMs: 50,
    })
    const client = await connect(short.port)
    expect(short.sessionCount()).toBe(1)
    await new Promise((r) => setTimeout(r, 200))
    expect(short.sessionCount()).toBe(0)
    await client.close()
    await short.close()
  })
})
