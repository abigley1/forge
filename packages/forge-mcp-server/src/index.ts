#!/usr/bin/env node
/**
 * Forge MCP Server
 *
 * Model Context Protocol server for Forge's workshop data: inventory (including
 * filament) and per-project parts lists. Project knowledge (tasks, decisions,
 * briefs, session notes) lives in the vault, not here.
 *
 * Usage:
 *   FORGE_API_URL=http://localhost:3000/api forge-mcp-server
 *
 * Or configure in Claude Code settings:
 *   {
 *     "mcpServers": {
 *       "forge": {
 *         "command": "npx",
 *         "args": ["forge-mcp-server"],
 *         "env": {
 *           "FORGE_API_URL": "http://localhost:3000/api"
 *         }
 *       }
 *     }
 *   }
 *
 * Shared HTTP mode (one process for every client on this machine):
 *   FORGE_API_URL=... forge-mcp-server --http [--port 8765]
 *   claude mcp add -s user --transport http forge http://127.0.0.1:8765/mcp
 * FORGE_MCP_TRANSPORT=http and FORGE_MCP_PORT work too. stdio is the default.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  HTTP_HOST,
  parseTransportOptions,
  startHttpServer,
} from './http-server.js'
import { createApiClient, type ApiClient } from './api-client.js'
import { callWorkshopTool, workshopTools } from './workshop-tools.js'

function loadApiClient(): ApiClient {
  const apiUrl = process.env.FORGE_API_URL
  if (!apiUrl) {
    console.error('Error: Missing required configuration')
    console.error('Set FORGE_API_URL (for example http://localhost:3000/api)')
    process.exit(1)
  }
  return createApiClient({ baseUrl: apiUrl })
}

function createForgeServer(api: ApiClient): Server {
  const server = new Server(
    { name: 'forge-mcp-server', version: '0.2.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: workshopTools,
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      return await callWorkshopTool(api, name, args ?? {})
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: false, error: message }),
          },
        ],
      }
    }
  })

  return server
}

async function main() {
  const api = loadApiClient()
  const transport = parseTransportOptions(process.argv.slice(2), process.env)

  if (transport.transport === 'http') {
    const running = await startHttpServer({
      createServer: () => createForgeServer(api),
      port: transport.port,
    })
    const shutdown = () => {
      void running.close().then(() => process.exit(0))
    }
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    console.error(
      `Forge MCP Server listening on http://${HTTP_HOST}:${running.port}/mcp`
    )
    return
  }

  await createForgeServer(api).connect(new StdioServerTransport())
  console.error('Forge MCP Server started')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
