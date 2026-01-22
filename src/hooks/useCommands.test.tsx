/**
 * Tests for useCommands hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCommands, useCommandHotkeys } from './useCommands'
import { useCommandRegistry } from '@/store/useCommandRegistry'
import { builtInCommands } from '@/lib/commands'

describe('useCommands', () => {
  beforeEach(() => {
    // Reset command registry before each test
    act(() => {
      useCommandRegistry.getState().clearCommands()
    })
    vi.clearAllMocks()
  })

  it('initializes built-in commands on mount', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const commandCount = useCommandRegistry.getState().getCommandCount()
    expect(commandCount).toBe(builtInCommands.length)
  })

  it('does not register commands multiple times on re-render', async () => {
    const { result, rerender } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const countBefore = useCommandRegistry.getState().getCommandCount()

    // Re-render the hook
    rerender()

    const countAfter = useCommandRegistry.getState().getCommandCount()
    expect(countAfter).toBe(countBefore)
  })

  describe('executeCommand', () => {
    it('executes a command by ID', async () => {
      const { result } = renderHook(() =>
        useCommands({
          callbacks: {
            onToggleDarkMode: vi.fn(),
          },
        })
      )

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const success = await result.current.executeCommand('toggle-dark-mode')
      expect(success).toBe(true)
    })

    it('returns false for non-existent command', async () => {
      const { result } = renderHook(() => useCommands())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const success = await result.current.executeCommand('non-existent')
      expect(success).toBe(false)
    })

    it('calls callback when command is executed', async () => {
      const onCreateNode = vi.fn()
      const { result } = renderHook(() =>
        useCommands({
          callbacks: { onCreateNode },
        })
      )

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      await result.current.executeCommand('create-task')
      expect(onCreateNode).toHaveBeenCalledWith('task')
    })
  })

  describe('searchCommands', () => {
    it('returns all commands when query is empty', async () => {
      const { result } = renderHook(() => useCommands())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const results = result.current.searchCommands('')
      expect(results.length).toBeGreaterThan(0)
    })

    it('filters commands by query', async () => {
      const { result } = renderHook(() => useCommands())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const results = result.current.searchCommands('export')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].command.id).toBe('export-project')
    })

    it('returns matched indices for highlighting', async () => {
      const { result } = renderHook(() => useCommands())

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const results = result.current.searchCommands('toggle')
      expect(results[0].matchedIndices.length).toBeGreaterThan(0)
    })
  })

  describe('getContext', () => {
    it('returns a valid command context', async () => {
      const callbacks = {
        onCreateNode: vi.fn(),
        onOpenExport: vi.fn(),
        onOpenImport: vi.fn(),
        onOpenSettings: vi.fn(),
        onToggleDarkMode: vi.fn(),
        getRecentNodeIds: vi.fn(() => ['node-1', 'node-2']),
        onSetTypeFilter: vi.fn(),
        onSetStatusFilter: vi.fn(),
        onClearFilters: vi.fn(),
        onOpenTemplateManager: vi.fn(),
      }

      const { result } = renderHook(() => useCommands({ callbacks }))

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const context = result.current.getContext()

      // Test all context methods exist
      expect(context.navigateToNode).toBeDefined()
      expect(context.createNode).toBeDefined()
      expect(context.setActiveView).toBeDefined()
      expect(context.toggleSidebar).toBeDefined()
      expect(context.openExportDialog).toBeDefined()
      expect(context.openImportDialog).toBeDefined()
      expect(context.toggleDarkMode).toBeDefined()
      expect(context.openSettings).toBeDefined()
      expect(context.getRecentNodeIds).toBeDefined()
      expect(context.setTypeFilter).toBeDefined()
      expect(context.setStatusFilter).toBeDefined()
      expect(context.clearFilters).toBeDefined()
      expect(context.openTemplateManager).toBeDefined()
      expect(context.undo).toBeDefined()
      expect(context.redo).toBeDefined()
      expect(context.canUndo).toBeDefined()
      expect(context.canRedo).toBeDefined()

      // Test that callbacks are called correctly
      context.createNode('decision')
      expect(callbacks.onCreateNode).toHaveBeenCalledWith('decision')

      context.openExportDialog()
      expect(callbacks.onOpenExport).toHaveBeenCalled()

      context.openImportDialog()
      expect(callbacks.onOpenImport).toHaveBeenCalled()

      context.toggleDarkMode()
      expect(callbacks.onToggleDarkMode).toHaveBeenCalled()

      context.openSettings()
      expect(callbacks.onOpenSettings).toHaveBeenCalled()

      expect(context.getRecentNodeIds()).toEqual(['node-1', 'node-2'])

      context.setTypeFilter(['task'])
      expect(callbacks.onSetTypeFilter).toHaveBeenCalledWith(['task'])

      context.setStatusFilter(['pending'])
      expect(callbacks.onSetStatusFilter).toHaveBeenCalledWith(['pending'])

      context.clearFilters()
      expect(callbacks.onClearFilters).toHaveBeenCalled()

      context.openTemplateManager()
      expect(callbacks.onOpenTemplateManager).toHaveBeenCalled()
    })

    it('handles missing callbacks gracefully', async () => {
      const { result } = renderHook(() => useCommands({ callbacks: {} }))

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      const context = result.current.getContext()

      // These should not throw even without callbacks
      expect(() => context.createNode('task')).not.toThrow()
      expect(() => context.openExportDialog()).not.toThrow()
      expect(() => context.openImportDialog()).not.toThrow()
      expect(() => context.toggleDarkMode()).not.toThrow()
      expect(() => context.openSettings()).not.toThrow()
      expect(() => context.setTypeFilter(['task'])).not.toThrow()
      expect(() => context.setStatusFilter(['pending'])).not.toThrow()
      expect(() => context.clearFilters()).not.toThrow()
      expect(context.getRecentNodeIds()).toEqual([])
    })
  })

  describe('callback updates', () => {
    it('uses updated callbacks without re-registering commands', async () => {
      const onCreateNode1 = vi.fn()
      const onCreateNode2 = vi.fn()

      const { result, rerender } = renderHook(
        (props: { onCreateNode: (type: string) => void }) =>
          useCommands({ callbacks: { onCreateNode: props.onCreateNode } }),
        { initialProps: { onCreateNode: onCreateNode1 } }
      )

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true)
      })

      // Execute with first callback
      await result.current.executeCommand('create-task')
      expect(onCreateNode1).toHaveBeenCalledWith('task')

      // Update callback
      rerender({ onCreateNode: onCreateNode2 })

      // Execute with second callback
      await result.current.executeCommand('create-decision')
      expect(onCreateNode2).toHaveBeenCalledWith('decision')
      expect(onCreateNode1).toHaveBeenCalledTimes(1) // Not called again
    })
  })
})

describe('command categories', () => {
  beforeEach(() => {
    act(() => {
      useCommandRegistry.getState().clearCommands()
    })
  })

  it('has navigation commands', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const navCommands = useCommandRegistry
      .getState()
      .getCommandsByCategory('navigation')
    expect(navCommands.length).toBeGreaterThan(0)
  })

  it('has create commands', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const createCommands = useCommandRegistry
      .getState()
      .getCommandsByCategory('create')
    expect(createCommands.length).toBeGreaterThan(0)
    expect(createCommands.map((c) => c.id)).toContain('create-task')
    expect(createCommands.map((c) => c.id)).toContain('create-decision')
    expect(createCommands.map((c) => c.id)).toContain('create-component')
    expect(createCommands.map((c) => c.id)).toContain('create-note')
  })

  it('has view commands', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const viewCommands = useCommandRegistry
      .getState()
      .getCommandsByCategory('view')
    expect(viewCommands.length).toBeGreaterThan(0)
    expect(viewCommands.map((c) => c.id)).toContain('switch-to-outline')
    expect(viewCommands.map((c) => c.id)).toContain('switch-to-graph')
    expect(viewCommands.map((c) => c.id)).toContain('toggle-sidebar')
    expect(viewCommands.map((c) => c.id)).toContain('toggle-dark-mode')
  })

  it('has action commands', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const actionCommands = useCommandRegistry
      .getState()
      .getCommandsByCategory('actions')
    expect(actionCommands.length).toBeGreaterThan(0)
    expect(actionCommands.map((c) => c.id)).toContain('export-project')
    expect(actionCommands.map((c) => c.id)).toContain('import-project')
    expect(actionCommands.map((c) => c.id)).toContain('undo')
    expect(actionCommands.map((c) => c.id)).toContain('redo')
  })

  it('has filter commands', async () => {
    const { result } = renderHook(() => useCommands())

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })

    const filterCommands = useCommandRegistry
      .getState()
      .getCommandsByCategory('filter')
    expect(filterCommands.length).toBeGreaterThan(0)
    expect(filterCommands.map((c) => c.id)).toContain('filter-decisions')
    expect(filterCommands.map((c) => c.id)).toContain('filter-tasks')
    expect(filterCommands.map((c) => c.id)).toContain('clear-filters')
  })
})

describe('useCommandHotkeys', () => {
  beforeEach(() => {
    act(() => {
      useCommandRegistry.getState().clearCommands()
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers command when shortcut matches', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-shortcut',
        name: 'Test Shortcut',
        category: 'actions',
        shortcut: { key: 't', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Simulate Ctrl+T keydown
    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalled()
    })
  })

  it('does not trigger command in input fields', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-shortcut',
        name: 'Test Shortcut',
        category: 'actions',
        shortcut: { key: 't', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Create and focus an input element
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    // Simulate Ctrl+T on the input
    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true,
      bubbles: true,
    })
    Object.defineProperty(event, 'target', { value: input })
    input.dispatchEvent(event)

    // Wait a bit to ensure no async execution
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(executeFn).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('does not trigger command in textareas', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-shortcut',
        name: 'Test Shortcut',
        category: 'actions',
        shortcut: { key: 't', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Create and focus a textarea element
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    // Simulate Ctrl+T on the textarea
    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true,
      bubbles: true,
    })
    Object.defineProperty(event, 'target', { value: textarea })
    textarea.dispatchEvent(event)

    // Wait a bit to ensure no async execution
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(executeFn).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it('does not trigger command in contenteditable elements', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-shortcut',
        name: 'Test Shortcut',
        category: 'actions',
        shortcut: { key: 't', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Create a contenteditable element with the property mocked for JSDOM
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    // JSDOM may not fully support isContentEditable, so we need to mock it
    Object.defineProperty(div, 'isContentEditable', {
      value: true,
      writable: false,
    })
    document.body.appendChild(div)
    div.focus()

    // Simulate Ctrl+T on the contenteditable - dispatch from the div
    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true,
      bubbles: true,
    })
    // Mock the target property to ensure it returns our div
    Object.defineProperty(event, 'target', {
      value: div,
      writable: false,
      configurable: true,
    })
    document.dispatchEvent(event)

    // Wait a bit to ensure no async execution
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(executeFn).not.toHaveBeenCalled()
    document.body.removeChild(div)
  })

  it('skips unavailable commands', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'unavailable-cmd',
        name: 'Unavailable Command',
        category: 'actions',
        shortcut: { key: 'u', ctrl: true },
        execute: executeFn,
        isAvailable: () => false,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Simulate Ctrl+U keydown
    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    // Wait a bit to ensure no async execution
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(executeFn).not.toHaveBeenCalled()
  })

  it('handles multiple modifiers correctly (ctrl+shift+key)', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-multi-mod',
        name: 'Test Multi Modifier',
        category: 'actions',
        shortcut: { key: 's', ctrl: true, shift: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Simulate Ctrl+Shift+S keydown
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalled()
    })
  })

  it('does not trigger without required modifiers', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-ctrl-only',
        name: 'Test Ctrl Only',
        category: 'actions',
        shortcut: { key: 't', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Simulate T without Ctrl
    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: false,
      bubbles: true,
    })
    document.dispatchEvent(event)

    // Wait a bit to ensure no async execution
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(executeFn).not.toHaveBeenCalled()
  })

  it('prevents default when command executes', async () => {
    const executeFn = vi.fn()
    act(() => {
      useCommandRegistry.getState().registerCommand({
        id: 'test-prevent',
        name: 'Test Prevent Default',
        category: 'actions',
        shortcut: { key: 'p', ctrl: true },
        execute: executeFn,
      })
    })

    renderHook(() => useCommandHotkeys())

    // Simulate Ctrl+P keydown
    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    document.dispatchEvent(event)

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalled()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})
