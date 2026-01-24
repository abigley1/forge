# Forge MCP Server

Model Context Protocol (MCP) server that exposes Forge project operations to AI agents like Claude Code.

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
| `FORGE_PROJECT_PATH` | Yes | Path to your Forge project directory |
| `FORGE_WORKSPACE_PATH` | No | Path to workspace containing multiple projects |

### Claude Code Integration

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "forge": {
      "command": "node",
      "args": ["/path/to/forge-mcp-server/dist/index.js"],
      "env": {
        "FORGE_PROJECT_PATH": "/path/to/your/project"
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
        "FORGE_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

## Available Tools

### `create_node`

Create a new node in the Forge project.

**Parameters:**
- `type` (required): Node type - `task`, `decision`, `component`, `note`, `subsystem`, `assembly`, `module`
- `title` (required): Title of the node
- `content`: Markdown content for the node body
- `tags`: Array of tags
- `parent`: ID of parent container node
- `status`: Status (type-specific)
- `priority`: `high`, `medium`, or `low` (for tasks)
- `dependsOn`: Array of dependency node IDs (for tasks)
- `cost`: Cost in dollars (for components)
- `supplier`: Supplier name (for components)
- `partNumber`: Part number (for components)

### `update_node`

Update an existing node.

**Parameters:**
- `id` (required): ID of the node to update
- All other parameters from `create_node` (optional)

### `delete_node`

Delete a node from the project.

**Parameters:**
- `id` (required): ID of the node to delete

### `search_nodes`

Search for nodes with various filters.

**Parameters:**
- `query`: Free-text search in title and content
- `type`: Filter by node type
- `status`: Filter by status
- `tags`: Filter by tags (any match)
- `parent`: Filter by parent container ID
- `limit`: Maximum results (default 50)

### `get_node`

Get a single node by ID with full content.

**Parameters:**
- `id` (required): ID of the node to retrieve

### `list_projects`

List all Forge projects in the workspace.

### `add_dependency`

Add a dependency between two task nodes.

**Parameters:**
- `taskId` (required): ID of the task that will depend on another
- `dependsOnId` (required): ID of the task to depend on

### `remove_dependency`

Remove a dependency between two task nodes.

**Parameters:**
- `taskId` (required): ID of the task to remove dependency from
- `dependsOnId` (required): ID of the dependency to remove

### `get_blocked_tasks`

Get all tasks that are blocked by incomplete dependencies.

### `get_critical_path`

Get the critical path through incomplete tasks (longest chain of dependent tasks).

### `bulk_update`

Update multiple nodes at once.

**Parameters:**
- `updates` (required): Array of objects with:
  - `id` (required): Node ID to update
  - `status`: New status
  - `priority`: New priority (`high`, `medium`, `low`)
  - `tags`: New tags array

### `find_components`

Find components by supplier, price range, or part number pattern.

**Parameters:**
- `supplier`: Filter by supplier name (case-insensitive)
- `minCost`: Minimum cost filter
- `maxCost`: Maximum cost filter
- `partNumberPattern`: Regex pattern to match part numbers

## Available Resources

- `forge://project/{id}` - Project metadata
- `forge://nodes/all` - All nodes summary
- `forge://nodes/tasks` - All task nodes
- `forge://nodes/decisions` - All decision nodes
- `forge://nodes/components` - All component nodes

## Available Prompts

### `plan_subsystem`

Guide AI to create a complete subsystem with components and tasks.

**Arguments:**
- `name` (required): Name of the subsystem to plan
- `description`: Brief description of the subsystem purpose

### `source_components`

Guide AI to find and import components for given requirements.

**Arguments:**
- `requirements` (required): Component requirements (specs, constraints, use case)
- `budget`: Budget constraint for components

### `review_dependencies`

Analyze task dependencies and suggest improvements. Identifies bottlenecks, unnecessary dependencies, and potential parallelization opportunities.

### `project_status`

Summarize project state, blocked items, and critical path. Provides executive summary, key blockers, recommended next steps, and risks.

## Example Usage with Claude Code

```
Human: Create a new task for assembling the power supply

Claude: I'll create that task for you.
[Uses create_node tool with type="task", title="Assemble Power Supply"]