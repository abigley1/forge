/**
 * Tests for built-in commands and command utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  builtInCommands,
  navigationCommands,
  createCommands,
  viewCommands,
  actionCommands,
  filterCommands,
  getNodeTypeIcon,
  formatCommandShortcut,
} from './commands'
import type { CommandContext } from '@/types/commands'

// Create a mock context
function createMockContext(
  overrides: Partial<CommandContext> = {}
): CommandContext {
  return {
    navigateToNode: vi.fn(),
    createNode: vi.fn(),
    setActiveView: vi.fn(),
    toggleSidebar: vi.fn(),
    openExportDialog: vi.fn(),
    openImportDialog: vi.fn(),
    toggleDarkMode: vi.fn(),
    openSettings: vi.fn(),
    getRecentNodeIds: vi.fn(() => []),
    setTypeFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    clearFilters: vi.fn(),
    openTemplateManager: vi.fn(),
    openQuickCapture: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    ...overrides,
  }
}

describe('builtInCommands', () => {
  it('includes all command categories', () => {
    const categories = new Set(builtInCommands.map((c) => c.category))

    expect(categories.has('navigation')).toBe(true)
    expect(categories.has('create')).toBe(true)
    expect(categories.has('view')).toBe(true)
    expect(categories.has('actions')).toBe(true)
    expect(categories.has('filter')).toBe(true)
  })

  it('has unique IDs for all commands', () => {
    const ids = builtInCommands.map((c) => c.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('has all required fields for each command', () => {
    for (const cmd of builtInCommands) {
      expect(cmd.name).toBeDefined()
      expect(cmd.name.length).toBeGreaterThan(0)
      expect(cmd.category).toBeDefined()
      expect(cmd.execute).toBeDefined()
      expect(typeof cmd.execute).toBe('function')
    }
  })
})

describe('navigationCommands', () => {
  it('includes recent node navigation commands', () => {
    const recentCommands = navigationCommands.filter((c) =>
      c.id?.startsWith('navigate-recent')
    )
    expect(recentCommands.length).toBeGreaterThanOrEqual(3)
  })

  it('includes settings command', () => {
    const settings = navigationCommands.find((c) => c.id === 'open-settings')
    expect(settings).toBeDefined()
    expect(settings?.shortcut).toBeDefined()
  })

  describe('navigate-recent-1', () => {
    it('navigates to most recent node when available', () => {
      const ctx = createMockContext({
        getRecentNodeIds: vi.fn(() => ['node-1', 'node-2']),
      })
      const cmd = navigationCommands.find((c) => c.id === 'navigate-recent-1')!

      cmd.execute(ctx)

      expect(ctx.navigateToNode).toHaveBeenCalledWith('node-1')
    })

    it('does nothing when no recent nodes', () => {
      const ctx = createMockContext({
        getRecentNodeIds: vi.fn(() => []),
      })
      const cmd = navigationCommands.find((c) => c.id === 'navigate-recent-1')!

      cmd.execute(ctx)

      expect(ctx.navigateToNode).not.toHaveBeenCalled()
    })

    it('isAvailable returns false when no recent nodes', () => {
      const ctx = createMockContext({
        getRecentNodeIds: vi.fn(() => []),
      })
      const cmd = navigationCommands.find((c) => c.id === 'navigate-recent-1')!

      expect(cmd.isAvailable!(ctx)).toBe(false)
    })

    it('isAvailable returns true when recent nodes exist', () => {
      const ctx = createMockContext({
        getRecentNodeIds: vi.fn(() => ['node-1']),
      })
      const cmd = navigationCommands.find((c) => c.id === 'navigate-recent-1')!

      expect(cmd.isAvailable!(ctx)).toBe(true)
    })
  })

  describe('open-settings', () => {
    it('opens settings panel', () => {
      const ctx = createMockContext()
      const cmd = navigationCommands.find((c) => c.id === 'open-settings')!

      cmd.execute(ctx)

      expect(ctx.openSettings).toHaveBeenCalled()
    })
  })
})

describe('createCommands', () => {
  it('includes commands for all node types', () => {
    const nodeTypes = ['decision', 'component', 'task', 'note']
    for (const type of nodeTypes) {
      const cmd = createCommands.find((c) => c.id === `create-${type}`)
      expect(cmd).toBeDefined()
    }
  })

  it('creates decision node', () => {
    const ctx = createMockContext()
    const cmd = createCommands.find((c) => c.id === 'create-decision')!

    cmd.execute(ctx)

    expect(ctx.createNode).toHaveBeenCalledWith('decision')
  })

  it('creates component node', () => {
    const ctx = createMockContext()
    const cmd = createCommands.find((c) => c.id === 'create-component')!

    cmd.execute(ctx)

    expect(ctx.createNode).toHaveBeenCalledWith('component')
  })

  it('creates task node', () => {
    const ctx = createMockContext()
    const cmd = createCommands.find((c) => c.id === 'create-task')!

    cmd.execute(ctx)

    expect(ctx.createNode).toHaveBeenCalledWith('task')
  })

  it('creates note node', () => {
    const ctx = createMockContext()
    const cmd = createCommands.find((c) => c.id === 'create-note')!

    cmd.execute(ctx)

    expect(ctx.createNode).toHaveBeenCalledWith('note')
  })

  it('has keyboard shortcuts for main creation commands', () => {
    const decision = createCommands.find((c) => c.id === 'create-decision')
    const component = createCommands.find((c) => c.id === 'create-component')
    const task = createCommands.find((c) => c.id === 'create-task')

    expect(decision?.shortcut).toBeDefined()
    expect(component?.shortcut).toBeDefined()
    expect(task?.shortcut).toBeDefined()
  })
})

describe('viewCommands', () => {
  it('switches to outline view', () => {
    const ctx = createMockContext()
    const cmd = viewCommands.find((c) => c.id === 'switch-to-outline')!

    cmd.execute(ctx)

    expect(ctx.setActiveView).toHaveBeenCalledWith('outline')
  })

  it('switches to graph view', () => {
    const ctx = createMockContext()
    const cmd = viewCommands.find((c) => c.id === 'switch-to-graph')!

    cmd.execute(ctx)

    expect(ctx.setActiveView).toHaveBeenCalledWith('graph')
  })

  it('toggles sidebar', () => {
    const ctx = createMockContext()
    const cmd = viewCommands.find((c) => c.id === 'toggle-sidebar')!

    cmd.execute(ctx)

    expect(ctx.toggleSidebar).toHaveBeenCalled()
  })

  it('toggles dark mode', () => {
    const ctx = createMockContext()
    const cmd = viewCommands.find((c) => c.id === 'toggle-dark-mode')!

    cmd.execute(ctx)

    expect(ctx.toggleDarkMode).toHaveBeenCalled()
  })

  it('has shortcuts for view switching', () => {
    const outline = viewCommands.find((c) => c.id === 'switch-to-outline')
    const graph = viewCommands.find((c) => c.id === 'switch-to-graph')
    const sidebar = viewCommands.find((c) => c.id === 'toggle-sidebar')

    expect(outline?.shortcut).toBeDefined()
    expect(graph?.shortcut).toBeDefined()
    expect(sidebar?.shortcut).toBeDefined()
  })
})

describe('actionCommands', () => {
  it('opens export dialog', () => {
    const ctx = createMockContext()
    const cmd = actionCommands.find((c) => c.id === 'export-project')!

    cmd.execute(ctx)

    expect(ctx.openExportDialog).toHaveBeenCalled()
  })

  it('opens import dialog', () => {
    const ctx = createMockContext()
    const cmd = actionCommands.find((c) => c.id === 'import-project')!

    cmd.execute(ctx)

    expect(ctx.openImportDialog).toHaveBeenCalled()
  })

  describe('undo', () => {
    it('calls undo action', () => {
      const ctx = createMockContext()
      const cmd = actionCommands.find((c) => c.id === 'undo')!

      cmd.execute(ctx)

      expect(ctx.undo).toHaveBeenCalled()
    })

    it('isAvailable checks canUndo', () => {
      const ctx = createMockContext({ canUndo: vi.fn(() => true) })
      const cmd = actionCommands.find((c) => c.id === 'undo')!

      expect(cmd.isAvailable!(ctx)).toBe(true)
      expect(ctx.canUndo).toHaveBeenCalled()
    })

    it('isAvailable returns false when cannot undo', () => {
      const ctx = createMockContext({ canUndo: vi.fn(() => false) })
      const cmd = actionCommands.find((c) => c.id === 'undo')!

      expect(cmd.isAvailable!(ctx)).toBe(false)
    })
  })

  describe('redo', () => {
    it('calls redo action', () => {
      const ctx = createMockContext()
      const cmd = actionCommands.find((c) => c.id === 'redo')!

      cmd.execute(ctx)

      expect(ctx.redo).toHaveBeenCalled()
    })

    it('isAvailable checks canRedo', () => {
      const ctx = createMockContext({ canRedo: vi.fn(() => true) })
      const cmd = actionCommands.find((c) => c.id === 'redo')!

      expect(cmd.isAvailable!(ctx)).toBe(true)
      expect(ctx.canRedo).toHaveBeenCalled()
    })
  })
})

describe('filterCommands', () => {
  it('filters to decisions only', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-decisions')!

    cmd.execute(ctx)

    expect(ctx.setTypeFilter).toHaveBeenCalledWith(['decision'])
  })

  it('filters to components only', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-components')!

    cmd.execute(ctx)

    expect(ctx.setTypeFilter).toHaveBeenCalledWith(['component'])
  })

  it('filters to tasks only', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-tasks')!

    cmd.execute(ctx)

    expect(ctx.setTypeFilter).toHaveBeenCalledWith(['task'])
  })

  it('filters to notes only', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-notes')!

    cmd.execute(ctx)

    expect(ctx.setTypeFilter).toHaveBeenCalledWith(['note'])
  })

  it('filters to pending status', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-pending')!

    cmd.execute(ctx)

    expect(ctx.setStatusFilter).toHaveBeenCalledWith(['pending', 'in_progress'])
  })

  it('filters to completed status', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'filter-completed')!

    cmd.execute(ctx)

    expect(ctx.setStatusFilter).toHaveBeenCalledWith(['complete', 'selected'])
  })

  it('clears all filters', () => {
    const ctx = createMockContext()
    const cmd = filterCommands.find((c) => c.id === 'clear-filters')!

    cmd.execute(ctx)

    expect(ctx.clearFilters).toHaveBeenCalled()
  })
})

describe('getNodeTypeIcon', () => {
  it('returns correct icon for decision', () => {
    expect(getNodeTypeIcon('decision')).toBe('Scale')
  })

  it('returns correct icon for component', () => {
    expect(getNodeTypeIcon('component')).toBe('Cpu')
  })

  it('returns correct icon for task', () => {
    expect(getNodeTypeIcon('task')).toBe('CheckSquare')
  })

  it('returns correct icon for note', () => {
    expect(getNodeTypeIcon('note')).toBe('FileText')
  })
})

describe('formatCommandShortcut', () => {
  // Store original navigator
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    // Reset navigator mock
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  it('returns null for undefined shortcut', () => {
    expect(formatCommandShortcut(undefined)).toBeNull()
  })

  it('formats simple key on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'k' })
    expect(result).toBe('K')
  })

  it('formats Ctrl+key on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'k', ctrl: true })
    expect(result).toBe('Ctrl+K')
  })

  it('formats Ctrl+Shift+key on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'n', ctrl: true, shift: true })
    expect(result).toBe('Ctrl+Shift+N')
  })

  it('formats Alt+key on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: '1', alt: true })
    expect(result).toBe('Alt+1')
  })

  it('formats Ctrl+key as ⌘key on Mac', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'k', ctrl: true })
    expect(result).toBe('⌘K')
  })

  it('formats Ctrl+Shift+key as ⌘⇧key on Mac', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'n', ctrl: true, shift: true })
    expect(result).toBe('⌘⇧N')
  })

  it('formats Alt+key as ⌥key on Mac', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: '1', alt: true })
    expect(result).toBe('⌥1')
  })

  it('formats special keys on Mac', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    })

    expect(formatCommandShortcut({ key: 'Escape' })).toBe('⎋')
    expect(formatCommandShortcut({ key: 'Enter' })).toBe('↵')
    expect(formatCommandShortcut({ key: 'Backspace' })).toBe('⌫')
  })

  it('formats meta key without ctrl on Windows', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'k', meta: true })
    expect(result).toBe('Win+K')
  })

  it('formats meta key without ctrl on Mac', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    })

    const result = formatCommandShortcut({ key: 'k', meta: true })
    expect(result).toBe('⌘K')
  })

  it('does not add meta when ctrl is already present', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    })

    // When ctrl is true, meta should not add Win prefix
    const result = formatCommandShortcut({ key: 'k', ctrl: true, meta: true })
    expect(result).toBe('Ctrl+K')
  })
})
