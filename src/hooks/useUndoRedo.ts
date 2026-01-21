/**
 * useUndoRedo Hook
 *
 * Provides undo/redo functionality for node operations with keyboard shortcuts.
 * Integrates the undo store with the nodes store.
 */

import { useCallback } from 'react'

import { useNodesStore } from '@/store/useNodesStore'
import { useUndoStore, type UndoAction } from '@/store/useUndoStore'
import { useHotkey } from './useHotkey'
import type { ForgeNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface UseUndoRedoReturn {
  /** Perform undo operation */
  undo: () => void
  /** Perform redo operation */
  redo: () => void
  /** Check if undo is available */
  canUndo: boolean
  /** Check if redo is available */
  canRedo: boolean
  /** Number of actions that can be undone */
  undoCount: number
  /** Number of actions that can be redone */
  redoCount: number
  /** Description of the next undo action */
  undoDescription: string | null
  /** Description of the next redo action */
  redoDescription: string | null
  /** Clear all history */
  clearHistory: () => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for undo/redo functionality with keyboard shortcuts
 *
 * Automatically registers Ctrl/Cmd+Z for undo and Ctrl/Cmd+Shift+Z for redo.
 * Integrates with the nodes store to reverse node operations.
 *
 * @param options - Configuration options
 * @returns Undo/redo state and functions
 *
 * @example
 * function MyComponent() {
 *   const { undo, redo, canUndo, canRedo } = useUndoRedo()
 *
 *   return (
 *     <>
 *       <button onClick={undo} disabled={!canUndo}>Undo</button>
 *       <button onClick={redo} disabled={!canRedo}>Redo</button>
 *     </>
 *   )
 * }
 */
export function useUndoRedo(
  options: { enableHotkeys?: boolean } = {}
): UseUndoRedoReturn {
  const { enableHotkeys = true } = options

  // Get undo store state and actions
  const undoStack = useUndoStore((state) => state.undoStack)
  const redoStack = useUndoStore((state) => state.redoStack)
  const undoAction = useUndoStore((state) => state.undo)
  const redoAction = useUndoStore((state) => state.redo)
  const setUndoRedoInProgress = useUndoStore(
    (state) => state.setUndoRedoInProgress
  )
  const getUndoDescription = useUndoStore((state) => state.getUndoDescription)
  const getRedoDescription = useUndoStore((state) => state.getRedoDescription)
  const clearHistoryAction = useUndoStore((state) => state.clearHistory)

  // Get nodes store actions
  const addNode = useNodesStore((state) => state.addNode)
  const deleteNodeStore = useNodesStore((state) => state.deleteNode)
  const getNodeById = useNodesStore((state) => state.getNodeById)

  /**
   * Apply the reverse of an action (for undo)
   */
  const applyUndoAction = useCallback(
    (action: UndoAction) => {
      setUndoRedoInProgress(true)

      try {
        switch (action.type) {
          case 'addNode':
            // Undo add = delete the node
            deleteNodeStore(action.nodeId)
            break

          case 'updateNode': {
            // Undo update = restore previous state
            // We need to do a full replacement, not just an update
            const currentNode = getNodeById(action.nodeId)
            if (currentNode) {
              // Delete and re-add to fully replace
              deleteNodeStore(action.nodeId)
              addNode(action.previousState)
            }
            break
          }

          case 'deleteNode':
            // Undo delete = restore the node
            addNode(action.node)
            break
        }
      } finally {
        setUndoRedoInProgress(false)
      }
    },
    [deleteNodeStore, addNode, getNodeById, setUndoRedoInProgress]
  )

  /**
   * Apply an action (for redo - reapply the original action)
   */
  const applyRedoAction = useCallback(
    (action: UndoAction) => {
      setUndoRedoInProgress(true)

      try {
        switch (action.type) {
          case 'addNode':
            // Redo add = add the node again
            addNode(action.node)
            break

          case 'updateNode': {
            // Redo update = apply the new state
            const currentNode = getNodeById(action.nodeId)
            if (currentNode) {
              deleteNodeStore(action.nodeId)
              addNode(action.newState)
            }
            break
          }

          case 'deleteNode':
            // Redo delete = delete the node again
            deleteNodeStore(action.nodeId)
            break
        }
      } finally {
        setUndoRedoInProgress(false)
      }
    },
    [addNode, deleteNodeStore, getNodeById, setUndoRedoInProgress]
  )

  /**
   * Perform undo
   */
  const undo = useCallback(() => {
    const action = undoAction()
    if (action) {
      applyUndoAction(action)
    }
  }, [undoAction, applyUndoAction])

  /**
   * Perform redo
   */
  const redo = useCallback(() => {
    const action = redoAction()
    if (action) {
      applyRedoAction(action)
    }
  }, [redoAction, applyRedoAction])

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    clearHistoryAction()
  }, [clearHistoryAction])

  // Register keyboard shortcuts
  useHotkey('z', undo, {
    ctrl: true,
    enabled: enableHotkeys,
    preventDefault: true,
  })

  useHotkey('z', redo, {
    ctrl: true,
    shift: true,
    enabled: enableHotkeys,
    preventDefault: true,
  })

  // Also support Ctrl+Y for redo (common on Windows)
  useHotkey('y', redo, {
    ctrl: true,
    enabled: enableHotkeys,
    preventDefault: true,
  })

  return {
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    undoDescription: getUndoDescription(),
    redoDescription: getRedoDescription(),
    clearHistory,
  }
}

// ============================================================================
// Node Operation Wrappers
// ============================================================================

/**
 * Higher-level functions that perform node operations and record them for undo.
 * These should be used instead of directly calling the nodes store actions.
 */

/**
 * Add a node and record the action for undo
 */
export function useUndoableAddNode() {
  const addNode = useNodesStore((state) => state.addNode)
  const recordAction = useUndoStore((state) => state.recordAction)
  const isUndoRedoInProgress = useUndoStore(
    (state) => state.isUndoRedoInProgress
  )

  return useCallback(
    (node: ForgeNode) => {
      addNode(node)

      if (!isUndoRedoInProgress) {
        recordAction({
          type: 'addNode',
          nodeId: node.id,
          node,
        })
      }
    },
    [addNode, recordAction, isUndoRedoInProgress]
  )
}

/**
 * Update a node and record the action for undo
 */
export function useUndoableUpdateNode() {
  const nodes = useNodesStore((state) => state.nodes)
  const updateNode = useNodesStore((state) => state.updateNode)
  const recordAction = useUndoStore((state) => state.recordAction)
  const isUndoRedoInProgress = useUndoStore(
    (state) => state.isUndoRedoInProgress
  )

  return useCallback(
    (id: string, updates: Partial<ForgeNode>) => {
      const previousState = nodes.get(id)
      if (!previousState) {
        console.warn(`Cannot update non-existent node: ${id}`)
        return
      }

      // Create the new state for recording
      const newState = {
        ...previousState,
        ...updates,
        id: previousState.id,
        type: previousState.type,
        dates: {
          ...previousState.dates,
          modified: new Date(),
        },
      } as ForgeNode

      updateNode(id, updates)

      if (!isUndoRedoInProgress) {
        recordAction({
          type: 'updateNode',
          nodeId: id,
          previousState,
          newState,
        })
      }
    },
    [nodes, updateNode, recordAction, isUndoRedoInProgress]
  )
}

/**
 * Delete a node and record the action for undo
 */
export function useUndoableDeleteNode() {
  const nodes = useNodesStore((state) => state.nodes)
  const deleteNode = useNodesStore((state) => state.deleteNode)
  const recordAction = useUndoStore((state) => state.recordAction)
  const isUndoRedoInProgress = useUndoStore(
    (state) => state.isUndoRedoInProgress
  )

  return useCallback(
    (id: string) => {
      const node = nodes.get(id)
      if (!node) {
        console.warn(`Cannot delete non-existent node: ${id}`)
        return
      }

      deleteNode(id)

      if (!isUndoRedoInProgress) {
        recordAction({
          type: 'deleteNode',
          nodeId: id,
          node,
        })
      }
    },
    [nodes, deleteNode, recordAction, isUndoRedoInProgress]
  )
}

/**
 * Hook that provides all undoable node operations
 */
export function useUndoableNodeOperations() {
  const addNode = useUndoableAddNode()
  const updateNode = useUndoableUpdateNode()
  const deleteNode = useUndoableDeleteNode()

  return {
    addNode,
    updateNode,
    deleteNode,
  }
}
