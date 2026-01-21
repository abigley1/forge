/**
 * Nodes Store for Forge
 *
 * Zustand store for managing node CRUD operations.
 * Provides a centralized state for all nodes with actions and selectors.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { ForgeNode, NodeType } from '@/types/nodes'
import {
  type LinkIndex,
  buildLinkIndex,
  createEmptyLinkIndex,
  getOutgoingLinks,
  getIncomingLinks,
} from '@/lib/links'

// ============================================================================
// Types
// ============================================================================

/**
 * State shape for the nodes store
 */
export interface NodesState {
  /** Map of all nodes, keyed by node ID */
  nodes: Map<string, ForgeNode>
  /** ID of the currently active/selected node */
  activeNodeId: string | null
  /** Set of node IDs that have been modified since last save */
  dirtyNodeIds: Set<string>
  /** Bidirectional link index for wiki-links between nodes */
  linkIndex: LinkIndex
}

/**
 * Actions available on the nodes store
 */
export interface NodesActions {
  // CRUD Actions
  /** Add a new node to the store */
  addNode: (node: ForgeNode) => void
  /** Update an existing node */
  updateNode: (id: string, updates: Partial<ForgeNode>) => void
  /** Delete a node by ID */
  deleteNode: (id: string) => void
  /** Set the active node */
  setActiveNode: (id: string | null) => void
  /** Replace all nodes (used when loading a project) */
  setNodes: (nodes: Map<string, ForgeNode>) => void
  /** Clear all nodes */
  clearNodes: () => void
  /** Mark a node as dirty (modified) */
  markDirty: (id: string) => void
  /** Mark a node as clean (saved) */
  markClean: (id: string) => void
  /** Clear all dirty flags */
  clearDirty: () => void
  /** Rebuild the link index from current nodes */
  rebuildLinkIndex: () => void
}

/**
 * Selectors for querying the nodes store
 */
export interface NodesSelectors {
  /** Get a node by ID */
  getNodeById: (id: string) => ForgeNode | undefined
  /** Get all nodes of a specific type */
  getNodesByType: (type: NodeType) => ForgeNode[]
  /** Get all nodes as an array */
  getAllNodes: () => ForgeNode[]
  /** Check if a node exists */
  hasNode: (id: string) => boolean
  /** Get count of nodes by type */
  getNodeCountsByType: () => Record<NodeType, number>
  /** Check if a specific node is dirty */
  isNodeDirty: (id: string) => boolean
  /** Check if any nodes are dirty */
  hasDirtyNodes: () => boolean
  /** Get all dirty node IDs */
  getDirtyNodeIds: () => string[]
  /** Get outgoing links for a node (nodes it links to) */
  getOutgoingLinks: (id: string) => string[]
  /** Get incoming links for a node (nodes that link to it) */
  getIncomingLinks: (id: string) => string[]
}

/**
 * Combined store type
 */
export type NodesStore = NodesState & NodesActions & NodesSelectors

// ============================================================================
// Initial State
// ============================================================================

const initialNodesState: NodesState = {
  nodes: new Map(),
  activeNodeId: null,
  dirtyNodeIds: new Set(),
  linkIndex: createEmptyLinkIndex(),
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useNodesStore = create<NodesStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialNodesState,

      // ========================================================================
      // CRUD Actions
      // ========================================================================

      addNode: (node) => {
        set(
          (state) => {
            const newNodes = new Map(state.nodes)
            newNodes.set(node.id, node)
            const newDirty = new Set(state.dirtyNodeIds)
            newDirty.add(node.id)
            return {
              nodes: newNodes,
              dirtyNodeIds: newDirty,
              linkIndex: buildLinkIndex(newNodes),
            }
          },
          false,
          'addNode'
        )
      },

      updateNode: (id, updates) => {
        set(
          (state) => {
            const existingNode = state.nodes.get(id)
            if (!existingNode) {
              console.warn(`Attempted to update non-existent node: ${id}`)
              return state
            }

            const newNodes = new Map(state.nodes)
            const updatedNode = {
              ...existingNode,
              ...updates,
              // Always preserve the ID and type
              id: existingNode.id,
              type: existingNode.type,
              // Update the modified date
              dates: {
                ...existingNode.dates,
                modified: new Date(),
              },
            } as ForgeNode

            newNodes.set(id, updatedNode)
            const newDirty = new Set(state.dirtyNodeIds)
            newDirty.add(id)

            // Only rebuild link index if content changed (contains wiki-links)
            const contentChanged = updates.content !== undefined
            return {
              nodes: newNodes,
              dirtyNodeIds: newDirty,
              linkIndex: contentChanged
                ? buildLinkIndex(newNodes)
                : state.linkIndex,
            }
          },
          false,
          'updateNode'
        )
      },

      deleteNode: (id) => {
        set(
          (state) => {
            if (!state.nodes.has(id)) {
              console.warn(`Attempted to delete non-existent node: ${id}`)
              return state
            }

            const newNodes = new Map(state.nodes)
            newNodes.delete(id)

            // Clear from dirty set
            const newDirty = new Set(state.dirtyNodeIds)
            newDirty.delete(id)

            // Clear active if it was the deleted node
            const newActiveId =
              state.activeNodeId === id ? null : state.activeNodeId

            return {
              nodes: newNodes,
              dirtyNodeIds: newDirty,
              activeNodeId: newActiveId,
              linkIndex: buildLinkIndex(newNodes),
            }
          },
          false,
          'deleteNode'
        )
      },

      setActiveNode: (id) => {
        set(
          (state) => {
            // Validate the ID exists (or is null)
            if (id !== null && !state.nodes.has(id)) {
              console.warn(
                `Attempted to set active to non-existent node: ${id}`
              )
              return state
            }
            return { activeNodeId: id }
          },
          false,
          'setActiveNode'
        )
      },

      setNodes: (nodes) => {
        const newNodes = new Map(nodes)
        set(
          {
            nodes: newNodes,
            activeNodeId: null,
            dirtyNodeIds: new Set(),
            linkIndex: buildLinkIndex(newNodes),
          },
          false,
          'setNodes'
        )
      },

      clearNodes: () => {
        set(
          {
            ...initialNodesState,
            linkIndex: createEmptyLinkIndex(),
          },
          false,
          'clearNodes'
        )
      },

      // ========================================================================
      // Dirty State Management
      // ========================================================================

      markDirty: (id) => {
        set(
          (state) => {
            const newDirty = new Set(state.dirtyNodeIds)
            newDirty.add(id)
            return { dirtyNodeIds: newDirty }
          },
          false,
          'markDirty'
        )
      },

      markClean: (id) => {
        set(
          (state) => {
            const newDirty = new Set(state.dirtyNodeIds)
            newDirty.delete(id)
            return { dirtyNodeIds: newDirty }
          },
          false,
          'markClean'
        )
      },

      clearDirty: () => {
        set({ dirtyNodeIds: new Set() }, false, 'clearDirty')
      },

      rebuildLinkIndex: () => {
        set(
          (state) => ({
            linkIndex: buildLinkIndex(state.nodes),
          }),
          false,
          'rebuildLinkIndex'
        )
      },

      // ========================================================================
      // Selectors
      // ========================================================================

      getNodeById: (id) => {
        return get().nodes.get(id)
      },

      getNodesByType: (type) => {
        const nodes = get().nodes
        const result: ForgeNode[] = []
        nodes.forEach((node) => {
          if (node.type === type) {
            result.push(node)
          }
        })
        return result
      },

      getAllNodes: () => {
        return Array.from(get().nodes.values())
      },

      hasNode: (id) => {
        return get().nodes.has(id)
      },

      getNodeCountsByType: () => {
        const counts = {
          decision: 0,
          component: 0,
          task: 0,
          note: 0,
        } as Record<NodeType, number>

        get().nodes.forEach((node) => {
          counts[node.type]++
        })

        return counts
      },

      isNodeDirty: (id) => {
        return get().dirtyNodeIds.has(id)
      },

      hasDirtyNodes: () => {
        return get().dirtyNodeIds.size > 0
      },

      getDirtyNodeIds: () => {
        return Array.from(get().dirtyNodeIds)
      },

      getOutgoingLinks: (id) => {
        return getOutgoingLinks(get().linkIndex, id)
      },

      getIncomingLinks: (id) => {
        return getIncomingLinks(get().linkIndex, id)
      },
    }),
    {
      name: 'forge-nodes-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Standalone Selectors (for use with shallow comparison)
// ============================================================================

/**
 * Selector to get just the nodes Map
 */
export const selectNodes = (state: NodesStore) => state.nodes

/**
 * Selector to get the active node ID
 */
export const selectActiveNodeId = (state: NodesStore) => state.activeNodeId

/**
 * Selector to get the active node
 */
export const selectActiveNode = (state: NodesStore) => {
  if (!state.activeNodeId) return undefined
  return state.nodes.get(state.activeNodeId)
}

/**
 * Selector to get node count
 */
export const selectNodeCount = (state: NodesStore) => state.nodes.size

/**
 * Selector to check if there are dirty nodes
 */
export const selectHasDirtyNodes = (state: NodesStore) =>
  state.dirtyNodeIds.size > 0

/**
 * Selector to get the link index
 */
export const selectLinkIndex = (state: NodesStore) => state.linkIndex
