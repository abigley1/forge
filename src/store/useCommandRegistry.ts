/**
 * Command Registry Store
 *
 * Zustand store for managing registered commands.
 * Commands can be registered dynamically and executed via the command palette.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  Command,
  CommandCategory,
  CommandContext,
  CommandInput,
  CommandSearchResult,
  CategoryWithCommands,
} from '@/types/commands'
import { COMMAND_CATEGORIES, getSortedCategories } from '@/types/commands'
import { fuzzyMatchScore, findMatchedIndices } from '@/lib/fuzzySearch'

/**
 * Command Registry State
 */
export interface CommandRegistryState {
  /** Map of command ID to command */
  commands: Map<string, Command>
}

/**
 * Command Registry Actions
 */
export interface CommandRegistryActions {
  /** Register a new command */
  registerCommand: (command: CommandInput) => string
  /** Register multiple commands at once */
  registerCommands: (commands: CommandInput[]) => string[]
  /** Unregister a command by ID */
  unregisterCommand: (id: string) => boolean
  /** Clear all registered commands */
  clearCommands: () => void
  /** Execute a command by ID */
  executeCommand: (id: string, context: CommandContext) => Promise<boolean>
}

/**
 * Command Registry Selectors
 */
export interface CommandRegistrySelectors {
  /** Get a command by ID */
  getCommand: (id: string) => Command | undefined
  /** Get all registered commands */
  getCommands: () => Command[]
  /** Get commands by category */
  getCommandsByCategory: (category: CommandCategory) => Command[]
  /** Get all commands grouped by category */
  getCommandsGroupedByCategory: () => CategoryWithCommands[]
  /** Search commands by query */
  searchCommands: (
    query: string,
    context?: CommandContext,
    options?: { limit?: number; threshold?: number }
  ) => CommandSearchResult[]
  /** Get available commands (filtered by isAvailable) */
  getAvailableCommands: (context: CommandContext) => Command[]
  /** Check if a command exists */
  hasCommand: (id: string) => boolean
  /** Get total command count */
  getCommandCount: () => number
}

export type CommandRegistryStore = CommandRegistryState &
  CommandRegistryActions &
  CommandRegistrySelectors

const initialState: CommandRegistryState = {
  commands: new Map(),
}

/**
 * Generate a unique command ID from the name
 */
function generateCommandId(name: string, existingIds: Set<string>): string {
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!existingIds.has(baseId)) {
    return baseId
  }

  // Add numeric suffix if ID exists
  let counter = 1
  while (existingIds.has(`${baseId}-${counter}`)) {
    counter++
  }
  return `${baseId}-${counter}`
}

/**
 * Calculate search score for a command against a query
 */
function scoreCommand(
  command: Command,
  query: string,
  threshold: number
): CommandSearchResult | null {
  const lowerQuery = query.toLowerCase()

  // Check name match
  const nameScore = fuzzyMatchScore(command.name, query)
  const nameMatches = findMatchedIndices(command.name, query)

  // Check description match
  const descScore = command.description
    ? fuzzyMatchScore(command.description, query) * 0.7
    : 0

  // Check keyword matches
  let keywordScore = 0
  if (command.keywords) {
    for (const keyword of command.keywords) {
      const kScore = fuzzyMatchScore(keyword, query)
      if (kScore > keywordScore) {
        keywordScore = kScore
      }
    }
    keywordScore *= 0.8
  }

  // Check category match
  const categoryScore = command.category.toLowerCase().includes(lowerQuery)
    ? 0.5
    : 0

  // Take best score
  const score = Math.max(nameScore, descScore, keywordScore, categoryScore)

  if (score < threshold) {
    return null
  }

  return {
    command,
    score,
    matchedIndices: nameMatches,
  }
}

export const useCommandRegistry = create<CommandRegistryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Actions
      registerCommand: (input: CommandInput): string => {
        const state = get()
        const existingIds = new Set(state.commands.keys())
        const id = input.id ?? generateCommandId(input.name, existingIds)

        const command: Command = {
          ...input,
          id,
        }

        set(
          (state) => {
            const newCommands = new Map(state.commands)
            newCommands.set(id, command)
            return { commands: newCommands }
          },
          false,
          'registerCommand'
        )

        return id
      },

      registerCommands: (inputs: CommandInput[]): string[] => {
        const ids: string[] = []
        const state = get()
        const existingIds = new Set(state.commands.keys())
        const newCommands = new Map(state.commands)

        for (const input of inputs) {
          const id = input.id ?? generateCommandId(input.name, existingIds)
          existingIds.add(id)
          ids.push(id)

          const command: Command = {
            ...input,
            id,
          }
          newCommands.set(id, command)
        }

        set({ commands: newCommands }, false, 'registerCommands')
        return ids
      },

      unregisterCommand: (id: string): boolean => {
        const state = get()
        if (!state.commands.has(id)) {
          return false
        }

        set(
          (state) => {
            const newCommands = new Map(state.commands)
            newCommands.delete(id)
            return { commands: newCommands }
          },
          false,
          'unregisterCommand'
        )

        return true
      },

      clearCommands: (): void => {
        set({ commands: new Map() }, false, 'clearCommands')
      },

      executeCommand: async (
        id: string,
        context: CommandContext
      ): Promise<boolean> => {
        const command = get().commands.get(id)
        if (!command) {
          console.warn(`Command not found: ${id}`)
          return false
        }

        // Check if command is available
        if (command.isAvailable && !command.isAvailable(context)) {
          console.warn(`Command not available: ${id}`)
          return false
        }

        try {
          await command.execute(context)
          return true
        } catch (error) {
          console.error(`Error executing command ${id}:`, error)
          return false
        }
      },

      // Selectors
      getCommand: (id: string): Command | undefined => {
        return get().commands.get(id)
      },

      getCommands: (): Command[] => {
        return Array.from(get().commands.values())
      },

      getCommandsByCategory: (category: CommandCategory): Command[] => {
        return Array.from(get().commands.values()).filter(
          (cmd) => cmd.category === category
        )
      },

      getCommandsGroupedByCategory: (): CategoryWithCommands[] => {
        const commands = get().getCommands()
        const categories = getSortedCategories()
        const result: CategoryWithCommands[] = []

        for (const category of categories) {
          const categoryCommands = commands
            .filter((cmd) => cmd.category === category.id)
            .sort((a, b) => a.name.localeCompare(b.name))

          if (categoryCommands.length > 0) {
            result.push({
              category,
              commands: categoryCommands,
            })
          }
        }

        return result
      },

      searchCommands: (
        query: string,
        context?: CommandContext,
        options?: { limit?: number; threshold?: number }
      ): CommandSearchResult[] => {
        const { limit = 20, threshold = 0.1 } = options ?? {}
        const commands = get().getCommands()

        // Filter to available commands if context provided
        const availableCommands = context
          ? commands.filter(
              (cmd) => !cmd.isAvailable || cmd.isAvailable(context)
            )
          : commands

        // If no query, return all commands sorted by category then name
        if (!query.trim()) {
          return availableCommands
            .sort((a, b) => {
              const catA = COMMAND_CATEGORIES[a.category].order
              const catB = COMMAND_CATEGORIES[b.category].order
              if (catA !== catB) return catA - catB
              return a.name.localeCompare(b.name)
            })
            .slice(0, limit)
            .map((command) => ({
              command,
              score: 1,
              matchedIndices: [],
            }))
        }

        // Score and filter commands
        const results: CommandSearchResult[] = []
        for (const command of availableCommands) {
          const result = scoreCommand(command, query, threshold)
          if (result) {
            results.push(result)
          }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score)

        return results.slice(0, limit)
      },

      getAvailableCommands: (context: CommandContext): Command[] => {
        return get()
          .getCommands()
          .filter((cmd) => !cmd.isAvailable || cmd.isAvailable(context))
      },

      hasCommand: (id: string): boolean => {
        return get().commands.has(id)
      },

      getCommandCount: (): number => {
        return get().commands.size
      },
    }),
    { name: 'command-registry', enabled: true }
  )
)

// Standalone selectors for use with useStore(selector)
export const selectCommands = (state: CommandRegistryStore) => state.commands
export const selectCommandCount = (state: CommandRegistryStore) =>
  state.commands.size
