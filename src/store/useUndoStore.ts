/**
 * Undo/Redo Store for Forge
 *
 * Zustand store for managing action history with undo/redo support.
 * Records node operations and allows reversing them.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { ForgeNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

/**
 * Types of undoable actions
 */
export type UndoActionType = 'addNode' | 'updateNode' | 'deleteNode'

/**
 * Base interface for all undoable actions
 */
interface BaseUndoAction {
  type: UndoActionType
  timestamp: number
}

/**
 * Action for adding a node (undo = delete the node)
 */
export interface AddNodeAction extends BaseUndoAction {
  type: 'addNode'
  nodeId: string
  node: ForgeNode
}

/**
 * Action for updating a node (undo = restore previous state)
 */
export interface UpdateNodeAction extends BaseUndoAction {
  type: 'updateNode'
  nodeId: string
  previousState: ForgeNode
  newState: ForgeNode
}

/**
 * Action for deleting a node (undo = restore the node)
 */
export interface DeleteNodeAction extends BaseUndoAction {
  type: 'deleteNode'
  nodeId: string
  node: ForgeNode
}

/**
 * Union type for all undoable actions
 */
export type UndoAction = AddNodeAction | UpdateNodeAction | DeleteNodeAction

/**
 * Input type for recording actions (without timestamp)
 */
export type AddNodeActionInput = Omit<AddNodeAction, 'timestamp'>
export type UpdateNodeActionInput = Omit<UpdateNodeAction, 'timestamp'>
export type DeleteNodeActionInput = Omit<DeleteNodeAction, 'timestamp'>
export type UndoActionInput =
  | AddNodeActionInput
  | UpdateNodeActionInput
  | DeleteNodeActionInput

/**
 * State shape for the undo store
 */
export interface UndoState {
  /** Stack of actions that can be undone (most recent last) */
  undoStack: UndoAction[]
  /** Stack of actions that can be redone (most recent last) */
  redoStack: UndoAction[]
  /** Maximum number of actions to keep in history */
  maxHistorySize: number
  /** Whether undo/redo is currently in progress (prevents recording) */
  isUndoRedoInProgress: boolean
}

/**
 * Actions available on the undo store
 */
export interface UndoActions {
  /** Record a new action (clears redo stack) */
  recordAction: (action: UndoActionInput) => void
  /** Undo the last action */
  undo: () => UndoAction | null
  /** Redo the last undone action */
  redo: () => UndoAction | null
  /** Clear all history */
  clearHistory: () => void
  /** Set whether undo/redo is in progress */
  setUndoRedoInProgress: (inProgress: boolean) => void
}

/**
 * Selectors for querying the undo store
 */
export interface UndoSelectors {
  /** Check if undo is available */
  canUndo: () => boolean
  /** Check if redo is available */
  canRedo: () => boolean
  /** Get the number of actions that can be undone */
  undoCount: () => number
  /** Get the number of actions that can be redone */
  redoCount: () => number
  /** Get a description of the next undo action */
  getUndoDescription: () => string | null
  /** Get a description of the next redo action */
  getRedoDescription: () => string | null
}

/**
 * Combined store type
 */
export type UndoStore = UndoState & UndoActions & UndoSelectors

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_HISTORY_SIZE = 50

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a human-readable description of an action
 */
function getActionDescription(action: UndoAction): string {
  switch (action.type) {
    case 'addNode':
      return `Add "${action.node.title}"`
    case 'updateNode':
      return `Edit "${action.previousState.title}"`
    case 'deleteNode':
      return `Delete "${action.node.title}"`
  }
}

// ============================================================================
// Initial State
// ============================================================================

const initialUndoState: UndoState = {
  undoStack: [],
  redoStack: [],
  maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,
  isUndoRedoInProgress: false,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUndoStore = create<UndoStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialUndoState,

      // ========================================================================
      // Actions
      // ========================================================================

      recordAction: (action) => {
        // Don't record if undo/redo is in progress
        if (get().isUndoRedoInProgress) {
          return
        }

        const fullAction: UndoAction = {
          ...action,
          timestamp: Date.now(),
        } as UndoAction

        set(
          (state) => {
            const newUndoStack = [...state.undoStack, fullAction]

            // Trim to max size
            if (newUndoStack.length > state.maxHistorySize) {
              newUndoStack.shift()
            }

            return {
              undoStack: newUndoStack,
              // Clear redo stack when a new action is recorded
              redoStack: [],
            }
          },
          false,
          'recordAction'
        )
      },

      undo: () => {
        const { undoStack } = get()

        if (undoStack.length === 0) {
          return null
        }

        const action = undoStack[undoStack.length - 1]

        set(
          (state) => ({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, action],
          }),
          false,
          'undo'
        )

        return action
      },

      redo: () => {
        const { redoStack } = get()

        if (redoStack.length === 0) {
          return null
        }

        const action = redoStack[redoStack.length - 1]

        set(
          (state) => ({
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, action],
          }),
          false,
          'redo'
        )

        return action
      },

      clearHistory: () => {
        set(
          {
            undoStack: [],
            redoStack: [],
          },
          false,
          'clearHistory'
        )
      },

      setUndoRedoInProgress: (inProgress) => {
        set(
          { isUndoRedoInProgress: inProgress },
          false,
          'setUndoRedoInProgress'
        )
      },

      // ========================================================================
      // Selectors
      // ========================================================================

      canUndo: () => {
        return get().undoStack.length > 0
      },

      canRedo: () => {
        return get().redoStack.length > 0
      },

      undoCount: () => {
        return get().undoStack.length
      },

      redoCount: () => {
        return get().redoStack.length
      },

      getUndoDescription: () => {
        const { undoStack } = get()
        if (undoStack.length === 0) {
          return null
        }
        return getActionDescription(undoStack[undoStack.length - 1])
      },

      getRedoDescription: () => {
        const { redoStack } = get()
        if (redoStack.length === 0) {
          return null
        }
        return getActionDescription(redoStack[redoStack.length - 1])
      },
    }),
    {
      name: 'forge-undo-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Standalone Selectors
// ============================================================================

/**
 * Selector to check if undo is available
 */
export const selectCanUndo = (state: UndoStore) => state.undoStack.length > 0

/**
 * Selector to check if redo is available
 */
export const selectCanRedo = (state: UndoStore) => state.redoStack.length > 0

/**
 * Selector to get undo stack length
 */
export const selectUndoCount = (state: UndoStore) => state.undoStack.length

/**
 * Selector to get redo stack length
 */
export const selectRedoCount = (state: UndoStore) => state.redoStack.length
