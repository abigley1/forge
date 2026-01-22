/**
 * Command Registry Types
 *
 * Provides types for the command palette command registry system.
 * Commands can be registered with shortcuts, categories, and execution callbacks.
 */

import type {
  NodeType,
  DecisionStatus,
  ComponentStatus,
  TaskStatus,
} from './nodes'

/**
 * All possible status values that can be filtered
 */
export type FilterableStatus = DecisionStatus | ComponentStatus | TaskStatus

/**
 * Command categories for organizing commands in the palette
 */
export type CommandCategory =
  | 'navigation'
  | 'create'
  | 'view'
  | 'actions'
  | 'filter'

/**
 * Command category display information
 */
export interface CommandCategoryInfo {
  id: CommandCategory
  label: string
  order: number
}

/**
 * Keyboard shortcut modifiers
 *
 * Note: The `key` field should be a valid keyboard key name:
 * - Single characters: 'a', 'b', '1', '2', etc.
 * - Special keys: 'Escape', 'Enter', 'Tab', 'Backspace', 'Delete'
 * - Arrow keys: 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
 * - Function keys: 'F1', 'F2', etc.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
 */
export interface CommandShortcut {
  /** The keyboard key (e.g., 'k', 'Escape', 'ArrowUp'). Must be a valid KeyboardEvent.key value. */
  key: string
  /** Requires Ctrl key (or Cmd on Mac) */
  ctrl?: boolean
  /** Requires Shift key */
  shift?: boolean
  /** Requires Alt key (or Option on Mac) */
  alt?: boolean
  /** Requires Meta key (Cmd on Mac, Win on Windows) - use sparingly */
  meta?: boolean
}

/**
 * Command execution context
 * Provides access to app state and actions
 */
export interface CommandContext {
  /** Navigate to a specific node by ID */
  navigateToNode: (nodeId: string) => void
  /** Create a new node of the specified type */
  createNode: (type: NodeType) => void
  /** Switch between views (outline/graph) */
  setActiveView: (view: 'outline' | 'graph') => void
  /** Toggle sidebar visibility */
  toggleSidebar: () => void
  /** Open export dialog */
  openExportDialog: () => void
  /** Open import dialog */
  openImportDialog: () => void
  /** Toggle dark mode */
  toggleDarkMode: () => void
  /** Open settings panel */
  openSettings: () => void
  /** Get recent node IDs */
  getRecentNodeIds: () => string[]
  /** Set type filter */
  setTypeFilter: (types: NodeType[]) => void
  /** Set status filter */
  setStatusFilter: (statuses: FilterableStatus[]) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Open template manager */
  openTemplateManager: () => void
  /** Undo last action */
  undo: () => void
  /** Redo last undone action */
  redo: () => void
  /** Get if undo is available */
  canUndo: () => boolean
  /** Get if redo is available */
  canRedo: () => boolean
}

/**
 * A registered command in the command palette
 */
export interface Command {
  /** Unique identifier for the command */
  id: string
  /** Display name shown in the palette */
  name: string
  /** Optional description/hint */
  description?: string
  /** Category for grouping */
  category: CommandCategory
  /** Keyboard shortcut (optional) */
  shortcut?: CommandShortcut
  /** Icon name from lucide-react (optional) */
  icon?: string
  /** Execute the command */
  execute: (context: CommandContext) => void | Promise<void>
  /** Whether the command is currently available (optional) */
  isAvailable?: (context: CommandContext) => boolean
  /** Keywords for fuzzy search (optional) */
  keywords?: string[]
}

/**
 * Input for registering a new command
 */
export type CommandInput = Omit<Command, 'id'> & {
  id?: string
}

/**
 * Command search result with score
 */
export interface CommandSearchResult {
  /** The matched command */
  command: Command
  /** Search relevance score between 0 (no match) and 1 (perfect match) */
  score: number
  /** Character indices in command.name that matched the query, for highlighting */
  matchedIndices: number[]
}

/**
 * Category display information with commands
 */
export interface CategoryWithCommands {
  category: CommandCategoryInfo
  commands: Command[]
}

/**
 * Mapping of category IDs to their display info
 */
export const COMMAND_CATEGORIES: Record<CommandCategory, CommandCategoryInfo> =
  {
    navigation: { id: 'navigation', label: 'Navigation', order: 1 },
    create: { id: 'create', label: 'Create', order: 2 },
    view: { id: 'view', label: 'View', order: 3 },
    actions: { id: 'actions', label: 'Actions', order: 4 },
    filter: { id: 'filter', label: 'Filter', order: 5 },
  }

/**
 * Get sorted category list
 */
export function getSortedCategories(): CommandCategoryInfo[] {
  return Object.values(COMMAND_CATEGORIES).sort((a, b) => a.order - b.order)
}
