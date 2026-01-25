/**
 * Built-in Commands
 *
 * Defines the default commands available in the command palette.
 * These cover navigation, creation, view switching, and common actions.
 */

import type { Command, CommandInput, FilterableStatus } from '@/types/commands'
import type { NodeType } from '@/types/nodes'

/**
 * Navigation commands - for moving around the app
 */
export const navigationCommands: CommandInput[] = [
  {
    id: 'navigate-recent-1',
    name: 'Go to Recent Node 1',
    description: 'Navigate to the most recently viewed node',
    category: 'navigation',
    shortcut: { key: '1', alt: true },
    icon: 'Clock',
    keywords: ['recent', 'history', 'last'],
    execute: (ctx) => {
      const recentIds = ctx.getRecentNodeIds()
      if (recentIds.length > 0) {
        ctx.navigateToNode(recentIds[0])
      }
    },
    isAvailable: (ctx) => ctx.getRecentNodeIds().length > 0,
  },
  {
    id: 'navigate-recent-2',
    name: 'Go to Recent Node 2',
    description: 'Navigate to the second most recently viewed node',
    category: 'navigation',
    shortcut: { key: '2', alt: true },
    icon: 'Clock',
    keywords: ['recent', 'history'],
    execute: (ctx) => {
      const recentIds = ctx.getRecentNodeIds()
      if (recentIds.length > 1) {
        ctx.navigateToNode(recentIds[1])
      }
    },
    isAvailable: (ctx) => ctx.getRecentNodeIds().length > 1,
  },
  {
    id: 'navigate-recent-3',
    name: 'Go to Recent Node 3',
    description: 'Navigate to the third most recently viewed node',
    category: 'navigation',
    shortcut: { key: '3', alt: true },
    icon: 'Clock',
    keywords: ['recent', 'history'],
    execute: (ctx) => {
      const recentIds = ctx.getRecentNodeIds()
      if (recentIds.length > 2) {
        ctx.navigateToNode(recentIds[2])
      }
    },
    isAvailable: (ctx) => ctx.getRecentNodeIds().length > 2,
  },
  {
    id: 'open-settings',
    name: 'Open Settings',
    description: 'Open the settings panel',
    category: 'navigation',
    shortcut: { key: ',', ctrl: true },
    icon: 'Settings',
    keywords: ['preferences', 'options', 'config', 'configuration'],
    execute: (ctx) => ctx.openSettings(),
  },
  {
    id: 'open-template-manager',
    name: 'Open Template Manager',
    description: 'Manage node templates',
    category: 'navigation',
    icon: 'FileText',
    keywords: ['templates', 'manage', 'edit'],
    execute: (ctx) => ctx.openTemplateManager(),
  },
]

/**
 * Create commands - for creating new nodes
 */
export const createCommands: CommandInput[] = [
  {
    id: 'create-decision',
    name: 'Create Decision',
    description: 'Create a new decision node',
    category: 'create',
    shortcut: { key: 'D', ctrl: true, shift: true },
    icon: 'Scale',
    keywords: ['new', 'add', 'decision'],
    execute: (ctx) => ctx.createNode('decision'),
  },
  {
    id: 'create-component',
    name: 'Create Component',
    description: 'Create a new component node',
    category: 'create',
    shortcut: { key: 'C', ctrl: true, shift: true },
    icon: 'Cpu',
    keywords: ['new', 'add', 'component', 'part'],
    execute: (ctx) => ctx.createNode('component'),
  },
  {
    id: 'create-task',
    name: 'Create Task',
    description: 'Create a new task node',
    category: 'create',
    shortcut: { key: 'T', ctrl: true, shift: true },
    icon: 'CheckSquare',
    keywords: ['new', 'add', 'task', 'todo'],
    execute: (ctx) => ctx.createNode('task'),
  },
  {
    id: 'create-note',
    name: 'Create Note',
    description: 'Create a new note node',
    category: 'create',
    icon: 'FileText',
    keywords: ['new', 'add', 'note'],
    execute: (ctx) => ctx.createNode('note'),
  },
  {
    id: 'create-node',
    name: 'Create New Node...',
    description: 'Open the create node dialog',
    category: 'create',
    // Note: No shortcut - Ctrl+Shift+N is used by Quick Capture
    icon: 'Plus',
    keywords: ['new', 'add', 'node', 'create'],
    execute: (ctx) => ctx.createNode('task'), // Opens create dialog; type can be changed in the dialog
  },
]

/**
 * View commands - for switching views and toggling UI elements
 */
export const viewCommands: CommandInput[] = [
  {
    id: 'switch-to-outline',
    name: 'Switch to Outline View',
    description: 'Show the hierarchical outline view',
    category: 'view',
    shortcut: { key: '1', ctrl: true },
    icon: 'List',
    keywords: ['outline', 'list', 'tree', 'hierarchy'],
    execute: (ctx) => ctx.setActiveView('outline'),
  },
  {
    id: 'switch-to-graph',
    name: 'Switch to Graph View',
    description: 'Show the graph visualization view',
    category: 'view',
    shortcut: { key: '2', ctrl: true },
    icon: 'Share2',
    keywords: ['graph', 'network', 'visualization', 'nodes'],
    execute: (ctx) => ctx.setActiveView('graph'),
  },
  {
    id: 'switch-to-kanban',
    name: 'Switch to Kanban View',
    description: 'Show the Kanban board view for tasks',
    category: 'view',
    shortcut: { key: '3', ctrl: true },
    icon: 'Columns3',
    keywords: ['kanban', 'board', 'tasks', 'columns', 'status'],
    execute: (ctx) => ctx.setActiveView('kanban'),
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    category: 'view',
    shortcut: { key: 'B', ctrl: true },
    icon: 'PanelLeft',
    keywords: ['sidebar', 'panel', 'hide', 'show'],
    execute: (ctx) => ctx.toggleSidebar(),
  },
  {
    id: 'toggle-dark-mode',
    name: 'Toggle Dark Mode',
    description: 'Switch between light and dark themes',
    category: 'view',
    icon: 'Moon',
    keywords: ['dark', 'light', 'theme', 'mode', 'night'],
    execute: (ctx) => ctx.toggleDarkMode(),
  },
]

/**
 * Action commands - for common operations
 */
export const actionCommands: CommandInput[] = [
  {
    id: 'export-project',
    name: 'Export Project...',
    description: 'Export the project to JSON, Markdown, or CSV',
    category: 'actions',
    shortcut: { key: 'E', ctrl: true, shift: true },
    icon: 'Download',
    keywords: ['export', 'save', 'download', 'json', 'markdown', 'csv'],
    execute: (ctx) => ctx.openExportDialog(),
  },
  {
    id: 'import-project',
    name: 'Import Project...',
    description: 'Import a project from JSON or Markdown files',
    category: 'actions',
    shortcut: { key: 'I', ctrl: true, shift: true },
    icon: 'Upload',
    keywords: ['import', 'load', 'upload', 'json', 'markdown'],
    execute: (ctx) => ctx.openImportDialog(),
  },
  {
    id: 'undo',
    name: 'Undo',
    description: 'Undo the last action',
    category: 'actions',
    shortcut: { key: 'Z', ctrl: true },
    icon: 'Undo',
    keywords: ['undo', 'revert', 'back'],
    execute: (ctx) => ctx.undo(),
    isAvailable: (ctx) => ctx.canUndo(),
  },
  {
    id: 'redo',
    name: 'Redo',
    description: 'Redo the last undone action',
    category: 'actions',
    shortcut: { key: 'Z', ctrl: true, shift: true },
    icon: 'Redo',
    keywords: ['redo', 'forward'],
    execute: (ctx) => ctx.redo(),
    isAvailable: (ctx) => ctx.canRedo(),
  },
  {
    id: 'quick-capture',
    name: 'Quick Capture',
    description: 'Quickly capture a note without leaving the current view',
    category: 'actions',
    shortcut: { key: 'N', ctrl: true, shift: true },
    icon: 'FileText',
    keywords: ['quick', 'capture', 'note', 'inbox', 'idea'],
    execute: (ctx) => ctx.openQuickCapture(),
  },
]

/**
 * Filter commands - for filtering the view
 */
export const filterCommands: CommandInput[] = [
  {
    id: 'filter-decisions',
    name: 'Show Only Decisions',
    description: 'Filter to show only decision nodes',
    category: 'filter',
    icon: 'Scale',
    keywords: ['filter', 'decisions', 'type'],
    execute: (ctx) => ctx.setTypeFilter(['decision']),
  },
  {
    id: 'filter-components',
    name: 'Show Only Components',
    description: 'Filter to show only component nodes',
    category: 'filter',
    icon: 'Cpu',
    keywords: ['filter', 'components', 'parts', 'type'],
    execute: (ctx) => ctx.setTypeFilter(['component']),
  },
  {
    id: 'filter-tasks',
    name: 'Show Only Tasks',
    description: 'Filter to show only task nodes',
    category: 'filter',
    icon: 'CheckSquare',
    keywords: ['filter', 'tasks', 'todos', 'type'],
    execute: (ctx) => ctx.setTypeFilter(['task']),
  },
  {
    id: 'filter-notes',
    name: 'Show Only Notes',
    description: 'Filter to show only note nodes',
    category: 'filter',
    icon: 'FileText',
    keywords: ['filter', 'notes', 'type'],
    execute: (ctx) => ctx.setTypeFilter(['note']),
  },
  {
    id: 'filter-pending',
    name: 'Show Pending Items',
    description: 'Filter to show only pending/in-progress items',
    category: 'filter',
    icon: 'Clock',
    keywords: ['filter', 'pending', 'in-progress', 'status', 'active'],
    execute: (ctx) =>
      ctx.setStatusFilter(['pending', 'in_progress'] as FilterableStatus[]),
  },
  {
    id: 'filter-completed',
    name: 'Show Completed Items',
    description: 'Filter to show only completed items',
    category: 'filter',
    icon: 'CheckCircle',
    keywords: ['filter', 'completed', 'done', 'finished', 'status'],
    execute: (ctx) =>
      ctx.setStatusFilter(['complete', 'selected'] as FilterableStatus[]),
  },
  {
    id: 'clear-filters',
    name: 'Clear All Filters',
    description: 'Remove all active filters',
    category: 'filter',
    shortcut: { key: 'Escape', shift: true },
    icon: 'X',
    keywords: ['clear', 'reset', 'all', 'filters'],
    execute: (ctx) => ctx.clearFilters(),
  },
]

/**
 * All built-in commands combined
 */
export const builtInCommands: CommandInput[] = [
  ...navigationCommands,
  ...createCommands,
  ...viewCommands,
  ...actionCommands,
  ...filterCommands,
]

/**
 * Get the icon name for a node type
 */
export function getNodeTypeIcon(type: NodeType): string {
  switch (type) {
    case 'decision':
      return 'Scale'
    case 'component':
      return 'Cpu'
    case 'task':
      return 'CheckSquare'
    case 'note':
      return 'FileText'
    default:
      return 'File'
  }
}

/**
 * Format a command shortcut for display using platform-aware symbols
 */
export function formatCommandShortcut(
  shortcut: Command['shortcut']
): string | null {
  if (!shortcut) return null

  const isMacPlatform =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const parts: string[] = []

  if (shortcut.ctrl) {
    parts.push(isMacPlatform ? '⌘' : 'Ctrl')
  }

  if (shortcut.alt) {
    parts.push(isMacPlatform ? '⌥' : 'Alt')
  }

  if (shortcut.shift) {
    parts.push(isMacPlatform ? '⇧' : 'Shift')
  }

  if (shortcut.meta && !shortcut.ctrl) {
    parts.push(isMacPlatform ? '⌘' : 'Win')
  }

  // Capitalize single letter keys, format special keys
  let displayKey = shortcut.key
  if (displayKey.length === 1) {
    displayKey = displayKey.toUpperCase()
  } else {
    // Map special keys to symbols on Mac
    if (isMacPlatform) {
      const keyMap: Record<string, string> = {
        Escape: '⎋',
        Enter: '↵',
        Backspace: '⌫',
        Delete: '⌦',
        Tab: '⇥',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
      }
      displayKey = keyMap[displayKey] ?? displayKey
    }
  }

  if (isMacPlatform) {
    return parts.join('') + displayKey
  }

  parts.push(displayKey)
  return parts.join('+')
}
