# Forge MCP Server

Model Context Protocol (MCP) server that exposes Forge's workshop data (inventory, filament, per-project parts lists) to AI agents like Claude Code. Project knowledge (tasks, decisions, briefs, session notes) lives in the vault, not here.

## Installation

```bash
cd packages/forge-mcp-server
npm install
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FORGE_API_URL` | Yes | Forge API, for example `http://<forge-host>:8099/api` |

### Claude Code Integration

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "forge": {
      "command": "node",
      "args": ["/path/to/forge-mcp-server/dist/index.js"],
      "env": {
        "FORGE_API_URL": "http://<forge-host>:8099/api"
      }
    }
  }
}
```

Or using npx (after publishing):

```json
{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["forge-mcp-server"],
      "env": {
        "FORGE_API_URL": "http://<forge-host>:8099/api"
      }
    }
  }
}
```

### Shared HTTP server

By default each client spawns its own stdio copy of the server. With many
Claude Code sessions open that means dozens of identical Node processes. Run
one shared Streamable HTTP server instead:

```bash
FORGE_API_URL=http://<forge-host>:8099/api node dist/index.js --http --port 8765
claude mcp add -s user --transport http forge http://127.0.0.1:8765/mcp
```

`FORGE_MCP_TRANSPORT=http` and `FORGE_MCP_PORT` are equivalent to the flags.
The server listens on `127.0.0.1` only and rejects requests whose `Host` or
`Origin` is not localhost; it has no authentication, so do not proxy it.

Each client gets its own MCP session (`mcp-session-id`) and its own server
instance, so sessions never share state. Sessions idle for 24 hours are dropped; the client re-initializes on
its next request. `GET /health` reports the open session count.

On macOS, run it under a launchd user agent with `KeepAlive` (this machine
uses `~/Library/LaunchAgents/local.forge-mcp.plist`, logging to
`~/Library/Logs/forge-mcp.log`). Rebuild `dist/` and restart the agent after
changing the server: `launchctl kickstart -k gui/$(id -u)/local.forge-mcp`.

A process started by launchd does not inherit a terminal's macOS Local Network
permission, so its requests to a LAN address fail with `fetch failed`. Point
`FORGE_API_URL` at Home Assistant's Tailscale address instead, or grant `node`
Local Network access in System Settings.

## Available Tools

Inventory: `search_inventory`, `get_inventory_item`, `add_inventory_item`,
`update_inventory_quantity`, `list_inventory_categories`. Filament is in
category `consumables`, subcategory `consumables-filament`, keyed by
`part_number` = material id, quantity in grams.

Project parts (`project` is the vault project slug):

- `list_project_parts` (`project?`): the parts a project needs.
- `project_parts_shortfall` (`project`): `[{name, itemId, needed, owned}]` where owned stock is below the need. Only `owned` stock counts; a part with no inventory link counts as owned 0.
- `upsert_project_part` (`project`, `name`, `quantity_needed`, `item_id?`): add the part, or update the one with that name.

The project, node, brief, closeout and workspace tools were removed when
project knowledge moved to the vault. Print-queue changes go through
`scripts/print-queue.mjs` and `/api/print-queue` (see `docs/PRINT_QUEUE.md`).
