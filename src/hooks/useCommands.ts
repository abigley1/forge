/**
 * useCommands Hook
 *
 * Initializes built-in commands and provides the command context
 * for executing commands with access to app state and actions.
 */

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useCommandRegistry } from '@/store/useCommandRegistry'
import { useNodesStore } from '@/store/useNodesStore'
import { useAppStore } from '@/store/useAppStore'
import { useUndoStore } from '@/store/useUndoStore'
import { builtInCommands } from '@/lib/commands'
import type {
  CommandContext,
  CommandSearchResult,
  FilterableStatus,
} from '@/types/commands'
import type { NodeType } from '@/types/nodes'

/**
 * Callbacks for command execution that need to be provided externally
 */
export interface CommandCallbacks {
  /** Called when a create node command is executed */
  onCreateNode?: (type: NodeType) => void
  /** Called when export dialog should open */
  onOpenExport?: () => void
  /** Called when import dialog should open */
  onOpenImport?: () => void
  /** Called when settings should open */
  onOpenSettings?: () => void
  /** Called when template manager should open */
  onOpenTemplateManager?: () => void
  /** Called to toggle dark mode */
  onToggleDarkMode?: () => void
  /** Get list of recent node IDs */
  getRecentNodeIds?: () => string[]
  /** Set type filter */
  onSetTypeFilter?: (types: NodeType[]) => void
  /** Set status filter */
  onSetStatusFilter?: (statuses: FilterableStatus[]) => void
  /** Clear all filters */
  onClearFilters?: () => void
}

export interface UseCommandsOptions {
  callbacks?: CommandCallbacks
}

export interface UseCommandsReturn {
  /** Execute a command by ID */
  executeCommand: (id: string) => Promise<boolean>
  /** Search for commands */
  searchCommands: (query: string) => CommandSearchResult[]
  /** Get the command context */
  getContext: () => CommandContext
  /** Whether commands are initialized */
  isInitialized: boolean
}

/**
 * Hook to initialize and use the command system
 */
export function useCommands(
  options: UseCommandsOptions = {}
): UseCommandsReturn {
  const { callbacks = {} } = options

  // Store refs to avoid stale closures
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  })

  // Get store actions
  const setActiveNode = useNodesStore((s) => s.setActiveNode)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const undo = useUndoStore((s) => s.undo)
  const redo = useUndoStore((s) => s.redo)
  const canUndo = useUndoStore((s) => s.canUndo)
  const canRedo = useUndoStore((s) => s.canRedo)

  // Command registry
  const registerCommands = useCommandRegistry((s) => s.registerCommands)
  const executeCommandAction = useCommandRegistry((s) => s.executeCommand)
  const searchCommandsAction = useCommandRegistry((s) => s.searchCommands)
  const commands = useCommandRegistry((s) => s.commands)

  // Track if commands are initialized - use command count from store
  const isInitialized = commands.size > 0
  const hasInitializedRef = useRef(false)

  // Create the command context
  // Note: Warnings for missing callbacks are logged to help catch misconfigurations
  const getContext = useCallback((): CommandContext => {
    const cbs = callbacksRef.current

    const warnMissingCallback = (name: string) => {
      console.warn(
        `Command callback "${name}" was invoked but not provided. ` +
          `Did you forget to pass it to useCommands?`
      )
    }

    return {
      navigateToNode: (nodeId: string) => {
        setActiveNode(nodeId)
      },
      createNode: (type: NodeType) => {
        if (cbs.onCreateNode) {
          cbs.onCreateNode(type)
        } else {
          warnMissingCallback('onCreateNode')
        }
      },
      setActiveView: (view: 'outline' | 'graph') => {
        setActiveView(view)
      },
      toggleSidebar: () => {
        toggleSidebar()
      },
      openExportDialog: () => {
        if (cbs.onOpenExport) {
          cbs.onOpenExport()
        } else {
          warnMissingCallback('onOpenExport')
        }
      },
      openImportDialog: () => {
        if (cbs.onOpenImport) {
          cbs.onOpenImport()
        } else {
          warnMissingCallback('onOpenImport')
        }
      },
      toggleDarkMode: () => {
        if (cbs.onToggleDarkMode) {
          cbs.onToggleDarkMode()
        } else {
          warnMissingCallback('onToggleDarkMode')
        }
      },
      openSettings: () => {
        if (cbs.onOpenSettings) {
          cbs.onOpenSettings()
        } else {
          warnMissingCallback('onOpenSettings')
        }
      },
      getRecentNodeIds: () => {
        return cbs.getRecentNodeIds?.() ?? []
      },
      setTypeFilter: (types: NodeType[]) => {
        if (cbs.onSetTypeFilter) {
          cbs.onSetTypeFilter(types)
        } else {
          warnMissingCallback('onSetTypeFilter')
        }
      },
      setStatusFilter: (statuses: FilterableStatus[]) => {
        if (cbs.onSetStatusFilter) {
          cbs.onSetStatusFilter(statuses)
        } else {
          warnMissingCallback('onSetStatusFilter')
        }
      },
      clearFilters: () => {
        if (cbs.onClearFilters) {
          cbs.onClearFilters()
        } else {
          warnMissingCallback('onClearFilters')
        }
      },
      openTemplateManager: () => {
        if (cbs.onOpenTemplateManager) {
          cbs.onOpenTemplateManager()
        } else {
          warnMissingCallback('onOpenTemplateManager')
        }
      },
      undo: () => {
        undo()
      },
      redo: () => {
        redo()
      },
      canUndo: () => {
        return canUndo()
      },
      canRedo: () => {
        return canRedo()
      },
    }
  }, [
    setActiveNode,
    setActiveView,
    toggleSidebar,
    undo,
    redo,
    canUndo,
    canRedo,
  ])

  // Execute a command
  const executeCommand = useCallback(
    async (id: string): Promise<boolean> => {
      const context = getContext()
      return executeCommandAction(id, context)
    },
    [executeCommandAction, getContext]
  )

  // Search commands
  const searchCommands = useCallback(
    (query: string): CommandSearchResult[] => {
      const context = getContext()
      return searchCommandsAction(query, context)
    },
    [searchCommandsAction, getContext]
  )

  // Register built-in commands on mount (only once)
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    registerCommands(builtInCommands)
  }, [registerCommands])

  return useMemo(
    () => ({
      executeCommand,
      searchCommands,
      getContext,
      isInitialized,
    }),
    [executeCommand, searchCommands, getContext, isInitialized]
  )
}

/**
 * Hook to register hotkeys for commands that have shortcuts
 */
export function useCommandHotkeys(callbacks?: CommandCallbacks): void {
  const { executeCommand, getContext } = useCommands({ callbacks })
  const getCommands = useCommandRegistry((s) => s.getCommands)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const commands = getCommands()
      const context = getContext()

      for (const command of commands) {
        if (!command.shortcut) continue
        if (command.isAvailable && !command.isAvailable(context)) continue

        const { key, ctrl, shift, alt, meta } = command.shortcut

        // Check modifiers
        const ctrlMatch = ctrl
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey
        const shiftMatch = shift ? e.shiftKey : !e.shiftKey
        const altMatch = alt ? e.altKey : !e.altKey
        const metaMatch = meta ? e.metaKey : true // meta is optional extra check

        // Check key
        const keyMatch = e.key.toLowerCase() === key.toLowerCase()

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          e.preventDefault()
          executeCommand(command.id)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [getCommands, getContext, executeCommand])
}
