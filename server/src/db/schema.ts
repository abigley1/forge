/**
 * SQLite Database Schema for Forge
 *
 * Tables:
 * - projects: Project metadata
 * - nodes: All node types (task, decision, component, note, subsystem, assembly, module)
 * - node_tags: Many-to-many relationship for node tags
 * - node_dependencies: Task dependencies (depends_on relationships)
 * - components_extra: Additional fields for component nodes (supplier, part_number, cost)
 * - decisions_extra: Additional fields for decision nodes (comparison data)
 * - attachments: File attachments for nodes
 */

export const SCHEMA_VERSION = 1

/**
 * SQL statements to create the database schema
 */
export const CREATE_TABLES_SQL = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  modified_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nodes table - stores all node types
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('task', 'decision', 'component', 'note', 'subsystem', 'assembly', 'module')),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT,
  priority TEXT,
  parent_id TEXT,
  milestone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE SET NULL
);

-- Index for faster project-based queries
CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

-- Node tags - many-to-many relationship
CREATE TABLE IF NOT EXISTS node_tags (
  node_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (node_id, tag),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_tags_tag ON node_tags(tag);

-- Node dependencies - for task depends_on relationships
CREATE TABLE IF NOT EXISTS node_dependencies (
  node_id TEXT NOT NULL,
  depends_on_id TEXT NOT NULL,
  PRIMARY KEY (node_id, depends_on_id),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_dependencies_depends_on ON node_dependencies(depends_on_id);

-- Components extra data (supplier, part_number, cost, custom fields)
CREATE TABLE IF NOT EXISTS components_extra (
  node_id TEXT PRIMARY KEY,
  supplier TEXT,
  part_number TEXT,
  cost REAL,
  datasheet_url TEXT,
  custom_fields TEXT, -- JSON blob for arbitrary custom fields
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Decisions extra data (comparison table, selected option)
CREATE TABLE IF NOT EXISTS decisions_extra (
  node_id TEXT PRIMARY KEY,
  selected_option TEXT,
  selection_rationale TEXT,
  selected_date TEXT,
  comparison_data TEXT, -- JSON blob for options and criteria
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Tasks extra data (checklist)
CREATE TABLE IF NOT EXISTS tasks_extra (
  node_id TEXT PRIMARY KEY,
  checklist TEXT, -- JSON blob for checklist items
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_node_id ON attachments(node_id);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

/**
 * Node types as a union type for type safety
 */
export type NodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

/**
 * Valid node types array for runtime validation
 */
export const VALID_NODE_TYPES: NodeType[] = [
  'task',
  'decision',
  'component',
  'note',
  'subsystem',
  'assembly',
  'module',
]

/**
 * Database row types (what SQLite returns)
 */
export interface ProjectRow {
  id: string
  name: string
  description: string | null
  created_at: string
  modified_at: string
}

export interface NodeRow {
  id: string
  project_id: string
  type: NodeType
  title: string
  content: string | null
  status: string | null
  priority: string | null
  parent_id: string | null
  milestone: string | null
  created_at: string
  modified_at: string
}

export interface NodeTagRow {
  node_id: string
  tag: string
}

export interface NodeDependencyRow {
  node_id: string
  depends_on_id: string
}

export interface ComponentExtraRow {
  node_id: string
  supplier: string | null
  part_number: string | null
  cost: number | null
  datasheet_url: string | null
  custom_fields: string | null // JSON string
}

export interface DecisionExtraRow {
  node_id: string
  selected_option: string | null
  selection_rationale: string | null
  selected_date: string | null
  comparison_data: string | null // JSON string
}

export interface TaskExtraRow {
  node_id: string
  checklist: string | null // JSON string
}

export interface AttachmentRow {
  id: string
  node_id: string
  filename: string
  mime_type: string
  size: number
  data: Buffer | null
  created_at: string
}
