/**
 * Tests for useCommandRegistry store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useCommandRegistry } from './useCommandRegistry'
import type { CommandContext, CommandInput } from '@/types/commands'

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
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    ...overrides,
  }
}

// Sample test commands
const testCommand1: CommandInput = {
  id: 'test-command-1',
  name: 'Test Command 1',
  description: 'A test command',
  category: 'actions',
  execute: vi.fn(),
}

const testCommand2: CommandInput = {
  id: 'test-command-2',
  name: 'Test Command 2',
  category: 'navigation',
  shortcut: { key: 'T', ctrl: true },
  execute: vi.fn(),
}

const testCommand3: CommandInput = {
  name: 'Auto ID Command',
  category: 'view',
  execute: vi.fn(),
}

describe('useCommandRegistry', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useCommandRegistry.getState().clearCommands()
    })
    vi.clearAllMocks()
  })

  describe('registerCommand', () => {
    it('registers a command with the given ID', () => {
      const { registerCommand, getCommand } = useCommandRegistry.getState()

      const id = registerCommand(testCommand1)

      expect(id).toBe('test-command-1')
      const cmd = getCommand('test-command-1')
      expect(cmd).toBeDefined()
      expect(cmd?.name).toBe('Test Command 1')
      expect(cmd?.category).toBe('actions')
    })

    it('generates an ID from the name if not provided', () => {
      const { registerCommand, getCommand } = useCommandRegistry.getState()

      const id = registerCommand(testCommand3)

      expect(id).toBe('auto-id-command')
      const cmd = getCommand('auto-id-command')
      expect(cmd).toBeDefined()
      expect(cmd?.name).toBe('Auto ID Command')
    })

    it('generates unique IDs for duplicate names', () => {
      const { registerCommand, getCommand } = useCommandRegistry.getState()

      const id1 = registerCommand({
        name: 'Duplicate',
        category: 'actions',
        execute: vi.fn(),
      })
      const id2 = registerCommand({
        name: 'Duplicate',
        category: 'actions',
        execute: vi.fn(),
      })
      const id3 = registerCommand({
        name: 'Duplicate',
        category: 'actions',
        execute: vi.fn(),
      })

      expect(id1).toBe('duplicate')
      expect(id2).toBe('duplicate-1')
      expect(id3).toBe('duplicate-2')
      expect(getCommand('duplicate')).toBeDefined()
      expect(getCommand('duplicate-1')).toBeDefined()
      expect(getCommand('duplicate-2')).toBeDefined()
    })

    it('overwrites existing command when re-registering with same explicit ID', () => {
      const { registerCommand, getCommand } = useCommandRegistry.getState()

      registerCommand({
        id: 'my-cmd',
        name: 'Original',
        category: 'actions',
        execute: vi.fn(),
      })
      registerCommand({
        id: 'my-cmd',
        name: 'Updated',
        category: 'actions',
        execute: vi.fn(),
      })

      expect(getCommand('my-cmd')?.name).toBe('Updated')
    })
  })

  describe('registerCommands', () => {
    it('registers multiple commands at once', () => {
      const { registerCommands, getCommandCount, getCommand } =
        useCommandRegistry.getState()

      const ids = registerCommands([testCommand1, testCommand2])

      expect(ids).toHaveLength(2)
      expect(ids).toContain('test-command-1')
      expect(ids).toContain('test-command-2')
      expect(getCommandCount()).toBe(2)
      expect(getCommand('test-command-1')).toBeDefined()
      expect(getCommand('test-command-2')).toBeDefined()
    })
  })

  describe('unregisterCommand', () => {
    it('removes a registered command', () => {
      const {
        registerCommand,
        unregisterCommand,
        getCommand,
        getCommandCount,
      } = useCommandRegistry.getState()

      registerCommand(testCommand1)
      expect(getCommandCount()).toBe(1)

      const result = unregisterCommand('test-command-1')

      expect(result).toBe(true)
      expect(getCommand('test-command-1')).toBeUndefined()
      expect(getCommandCount()).toBe(0)
    })

    it('returns false for non-existent command', () => {
      const { unregisterCommand } = useCommandRegistry.getState()

      const result = unregisterCommand('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('clearCommands', () => {
    it('removes all commands', () => {
      const { registerCommands, clearCommands, getCommandCount } =
        useCommandRegistry.getState()

      registerCommands([testCommand1, testCommand2])
      expect(getCommandCount()).toBe(2)

      clearCommands()

      expect(getCommandCount()).toBe(0)
    })
  })

  describe('executeCommand', () => {
    it('executes a registered command', async () => {
      const executeFn = vi.fn()
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()

      registerCommand({ ...testCommand1, execute: executeFn })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(true)
      expect(executeFn).toHaveBeenCalledWith(context)
    })

    it('returns false for non-existent command', async () => {
      const { executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()

      const result = await executeCommand('non-existent', context)

      expect(result).toBe(false)
    })

    it('checks isAvailable before executing', async () => {
      const executeFn = vi.fn()
      const isAvailable = vi.fn(() => false)
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()

      registerCommand({ ...testCommand1, execute: executeFn, isAvailable })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(false)
      expect(isAvailable).toHaveBeenCalledWith(context)
      expect(executeFn).not.toHaveBeenCalled()
    })

    it('executes when isAvailable returns true', async () => {
      const executeFn = vi.fn()
      const isAvailable = vi.fn(() => true)
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()

      registerCommand({ ...testCommand1, execute: executeFn, isAvailable })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(true)
      expect(executeFn).toHaveBeenCalled()
    })

    it('handles async execute functions', async () => {
      const executeFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()

      registerCommand({ ...testCommand1, execute: executeFn })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(true)
      expect(executeFn).toHaveBeenCalled()
    })

    it('returns false on execution error', async () => {
      const executeFn = vi.fn(() => {
        throw new Error('Test error')
      })
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registerCommand({ ...testCommand1, execute: executeFn })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('returns false on async execution error', async () => {
      const executeFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw new Error('Async test error')
      })
      const { registerCommand, executeCommand } = useCommandRegistry.getState()
      const context = createMockContext()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registerCommand({ ...testCommand1, execute: executeFn })

      const result = await executeCommand('test-command-1', context)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getCommand', () => {
    it('returns undefined for non-existent command', () => {
      const { getCommand } = useCommandRegistry.getState()

      expect(getCommand('non-existent')).toBeUndefined()
    })

    it('returns the command by ID', () => {
      const { registerCommand, getCommand } = useCommandRegistry.getState()

      registerCommand(testCommand1)

      const cmd = getCommand('test-command-1')
      expect(cmd?.id).toBe('test-command-1')
      expect(cmd?.name).toBe('Test Command 1')
    })
  })

  describe('getCommands', () => {
    it('returns empty array when no commands', () => {
      const { getCommands } = useCommandRegistry.getState()

      expect(getCommands()).toEqual([])
    })

    it('returns all registered commands', () => {
      const { registerCommands, getCommands } = useCommandRegistry.getState()

      registerCommands([testCommand1, testCommand2])

      const commands = getCommands()
      expect(commands).toHaveLength(2)
      expect(commands.map((c) => c.id)).toContain('test-command-1')
      expect(commands.map((c) => c.id)).toContain('test-command-2')
    })
  })

  describe('getCommandsByCategory', () => {
    it('returns commands filtered by category', () => {
      const { registerCommands, getCommandsByCategory } =
        useCommandRegistry.getState()

      registerCommands([testCommand1, testCommand2, testCommand3])

      const actions = getCommandsByCategory('actions')
      expect(actions).toHaveLength(1)
      expect(actions[0].id).toBe('test-command-1')

      const navigation = getCommandsByCategory('navigation')
      expect(navigation).toHaveLength(1)
      expect(navigation[0].id).toBe('test-command-2')

      const view = getCommandsByCategory('view')
      expect(view).toHaveLength(1)
    })

    it('returns empty array for empty category', () => {
      const { registerCommand, getCommandsByCategory } =
        useCommandRegistry.getState()

      registerCommand(testCommand1)

      const create = getCommandsByCategory('create')
      expect(create).toEqual([])
    })
  })

  describe('getCommandsGroupedByCategory', () => {
    it('groups commands by category in order', () => {
      const { registerCommands, getCommandsGroupedByCategory } =
        useCommandRegistry.getState()

      registerCommands([
        { id: 'nav1', name: 'Nav 1', category: 'navigation', execute: vi.fn() },
        {
          id: 'create1',
          name: 'Create 1',
          category: 'create',
          execute: vi.fn(),
        },
        {
          id: 'action1',
          name: 'Action 1',
          category: 'actions',
          execute: vi.fn(),
        },
        { id: 'nav2', name: 'Nav 2', category: 'navigation', execute: vi.fn() },
      ])

      const grouped = getCommandsGroupedByCategory()

      // Should be in category order: navigation, create, view, actions, filter
      expect(grouped[0].category.id).toBe('navigation')
      expect(grouped[0].commands).toHaveLength(2)
      expect(grouped[1].category.id).toBe('create')
      expect(grouped[1].commands).toHaveLength(1)
      expect(grouped[2].category.id).toBe('actions')
      expect(grouped[2].commands).toHaveLength(1)
    })

    it('excludes empty categories', () => {
      const { registerCommand, getCommandsGroupedByCategory } =
        useCommandRegistry.getState()

      registerCommand(testCommand1)

      const grouped = getCommandsGroupedByCategory()
      expect(grouped).toHaveLength(1)
      expect(grouped[0].category.id).toBe('actions')
    })

    it('sorts commands alphabetically within category', () => {
      const { registerCommands, getCommandsGroupedByCategory } =
        useCommandRegistry.getState()

      registerCommands([
        { id: 'z', name: 'Zebra', category: 'actions', execute: vi.fn() },
        { id: 'a', name: 'Apple', category: 'actions', execute: vi.fn() },
        { id: 'm', name: 'Mango', category: 'actions', execute: vi.fn() },
      ])

      const grouped = getCommandsGroupedByCategory()
      const names = grouped[0].commands.map((c) => c.name)
      expect(names).toEqual(['Apple', 'Mango', 'Zebra'])
    })
  })

  describe('searchCommands', () => {
    beforeEach(() => {
      const { registerCommands } = useCommandRegistry.getState()
      registerCommands([
        {
          id: 'export',
          name: 'Export Project',
          description: 'Export the project to JSON',
          category: 'actions',
          keywords: ['download', 'save'],
          execute: vi.fn(),
        },
        {
          id: 'import',
          name: 'Import Project',
          description: 'Import a project from file',
          category: 'actions',
          keywords: ['upload', 'load'],
          execute: vi.fn(),
        },
        {
          id: 'toggle-sidebar',
          name: 'Toggle Sidebar',
          category: 'view',
          execute: vi.fn(),
        },
        {
          id: 'create-task',
          name: 'Create Task',
          category: 'create',
          execute: vi.fn(),
        },
      ])
    })

    it('returns all commands when query is empty', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('')

      expect(results).toHaveLength(4)
    })

    it('matches by name', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('export')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].command.id).toBe('export')
    })

    it('matches by description', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('JSON')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].command.id).toBe('export')
    })

    it('matches by keywords', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('download')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].command.id).toBe('export')
    })

    it('respects limit option', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('', undefined, { limit: 2 })

      expect(results).toHaveLength(2)
    })

    it('filters unavailable commands when context provided', () => {
      const { registerCommand, searchCommands } = useCommandRegistry.getState()

      registerCommand({
        id: 'unavailable',
        name: 'Unavailable Command',
        category: 'actions',
        execute: vi.fn(),
        isAvailable: () => false,
      })

      const context = createMockContext()
      const results = searchCommands('unavailable', context)

      expect(results).toHaveLength(0)
    })

    it('includes available commands when context provided', () => {
      const { registerCommand, searchCommands } = useCommandRegistry.getState()

      registerCommand({
        id: 'available',
        name: 'Available Command',
        category: 'actions',
        execute: vi.fn(),
        isAvailable: () => true,
      })

      const context = createMockContext()
      const results = searchCommands('available', context)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].command.id).toBe('available')
    })

    it('returns matched indices for highlighting', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('export')

      expect(results[0].matchedIndices).toBeDefined()
      expect(results[0].matchedIndices.length).toBeGreaterThan(0)
    })

    it('sorts results by score', () => {
      const { searchCommands } = useCommandRegistry.getState()

      const results = searchCommands('project')

      // All results should have scores
      for (const result of results) {
        expect(result.score).toBeDefined()
        expect(result.score).toBeGreaterThan(0)
      }

      // Should be sorted descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('getAvailableCommands', () => {
    it('filters out unavailable commands', () => {
      const { registerCommands, getAvailableCommands } =
        useCommandRegistry.getState()
      const context = createMockContext()

      registerCommands([
        {
          id: 'available',
          name: 'Available',
          category: 'actions',
          execute: vi.fn(),
          isAvailable: () => true,
        },
        {
          id: 'unavailable',
          name: 'Unavailable',
          category: 'actions',
          execute: vi.fn(),
          isAvailable: () => false,
        },
        {
          id: 'no-check',
          name: 'No Check',
          category: 'actions',
          execute: vi.fn(),
          // No isAvailable, should be included
        },
      ])

      const available = getAvailableCommands(context)

      expect(available).toHaveLength(2)
      expect(available.map((c) => c.id)).toContain('available')
      expect(available.map((c) => c.id)).toContain('no-check')
      expect(available.map((c) => c.id)).not.toContain('unavailable')
    })
  })

  describe('hasCommand', () => {
    it('returns true for existing command', () => {
      const { registerCommand, hasCommand } = useCommandRegistry.getState()

      registerCommand(testCommand1)

      expect(hasCommand('test-command-1')).toBe(true)
    })

    it('returns false for non-existent command', () => {
      const { hasCommand } = useCommandRegistry.getState()

      expect(hasCommand('non-existent')).toBe(false)
    })
  })

  describe('getCommandCount', () => {
    it('returns 0 when no commands', () => {
      const { getCommandCount } = useCommandRegistry.getState()

      expect(getCommandCount()).toBe(0)
    })

    it('returns correct count', () => {
      const { registerCommands, getCommandCount } =
        useCommandRegistry.getState()

      registerCommands([testCommand1, testCommand2])

      expect(getCommandCount()).toBe(2)
    })
  })
})
