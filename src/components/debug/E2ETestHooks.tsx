/**
 * E2E Test Hooks Component
 *
 * Provides hooks for E2E tests to interact with the app state.
 * Only active in development mode.
 *
 * Events:
 * - e2e-setup-nodes: Set up nodes from provided data
 * - e2e-clear-nodes: Clear all nodes
 * - e2e-get-node-count: Get current node count
 * - e2e-setup-workspace: Set up workspace with multiple projects
 */

import { useEffect } from 'react'
import { useNodesStore, useProjectStore, useWorkspaceStore } from '@/store'
import type { ForgeNode } from '@/types/nodes'

// Extend Window interface for E2E communication
declare global {
  interface Window {
    __e2eNodeCount?: number
    __e2eReady?: boolean
    __e2eNodesByType?: Record<string, number>
    __e2eChildNodes?: string[]
  }
}

interface E2ENodeData {
  id: string
  type: string
  title: string
  tags: string[]
  dates: {
    created: string
    modified: string
  }
  content: string
  status?: string
  selected?: string | null
  options?: Array<{ id: string; name: string; values: Record<string, unknown> }>
  criteria?: unknown[]
  rationale?: string | null
  selectedDate?: string | null
  cost?: number | null
  supplier?: string | null
  partNumber?: string | null
  customFields?: Record<string, string>
  priority?: string
  dependsOn?: string[]
  blocks?: string[]
  checklist?: Array<{ text: string; completed: boolean }>
}

interface E2EProjectData {
  id: string
  name: string
  path: string
  nodeCount: number
  modifiedAt: string
  description?: string
}

interface E2EWorkspaceData {
  projects: E2EProjectData[]
  activeProjectId: string
}

interface E2ESwitchProjectData {
  projectId: string
  nodes: E2ENodeData[]
}

export function E2ETestHooks(): null {
  const setNodes = useNodesStore((state) => state.setNodes)
  const clearNodes = useNodesStore((state) => state.clearNodes)
  const nodes = useNodesStore((state) => state.nodes)

  useEffect(() => {
    // Only enable in development
    if (import.meta.env.PROD) return

    const handleSetupNodes = (event: CustomEvent<{ nodes: E2ENodeData[] }>) => {
      const { nodes: nodeData } = event.detail

      const nodesMap = new Map<string, ForgeNode>()

      nodeData.forEach((node) => {
        const processedNode = {
          ...node,
          dates: {
            created: new Date(node.dates.created),
            modified: new Date(node.dates.modified),
          },
        } as unknown as ForgeNode

        // Handle selectedDate for decisions
        if (node.selectedDate) {
          ;(processedNode as unknown as Record<string, unknown>).selectedDate =
            new Date(node.selectedDate)
        }

        nodesMap.set(node.id, processedNode)
      })

      setNodes(nodesMap)

      // Get active project info from workspace store if available
      const workspaceState = useWorkspaceStore.getState()
      const activeProject = workspaceState.projects.find(
        (p) => p.id === workspaceState.activeProjectId
      )

      // Set up project store with proper project info
      useProjectStore.setState({
        project: {
          id: activeProject?.id || 'e2e-test-project',
          name: activeProject?.name || 'E2E Test Project',
          path: activeProject?.path || '/e2e-test',
          nodes: nodesMap,
          metadata: {
            createdAt: new Date(),
            modifiedAt: activeProject?.modifiedAt || new Date(),
          },
        },
        isDirty: false,
        error: null,
        parseErrors: [],
      })
    }

    const handleClearNodes = () => {
      clearNodes()
      useProjectStore.setState({
        project: null,
        isDirty: false,
        error: null,
        parseErrors: [],
      })
    }

    const handleGetNodeCount = () => {
      window.__e2eNodeCount = nodes.size
    }

    const handleGetNodesByType = (event: CustomEvent<{ types: string[] }>) => {
      const { types } = event.detail
      const result: Record<string, number> = {}

      types.forEach((type) => {
        result[type] = useNodesStore
          .getState()
          .getNodesByType(type as never).length
      })

      window.__e2eNodesByType = result
    }

    const handleGetChildNodes = (
      event: CustomEvent<{ parentTitle: string }>
    ) => {
      const { parentTitle } = event.detail
      const allNodes = useNodesStore.getState().getAllNodes()

      // Find the parent node by title
      const parentNode = allNodes.find((n) => n.title === parentTitle)

      if (parentNode) {
        const children = useNodesStore.getState().getChildNodes(parentNode.id)
        window.__e2eChildNodes = children.map((c) => c.id)
      } else {
        window.__e2eChildNodes = []
      }
    }

    const handleSetTaskParent = (
      event: CustomEvent<{ taskTitle: string; parentTitle: string }>
    ) => {
      const { taskTitle, parentTitle } = event.detail
      const allNodes = useNodesStore.getState().getAllNodes()

      const task = allNodes.find((n) => n.title === taskTitle)
      const parent = allNodes.find((n) => n.title === parentTitle)

      if (task && parent) {
        useNodesStore.getState().updateNode(task.id, {
          parent: parent.id,
        } as unknown as Partial<ForgeNode>)
      }
    }

    const handleSwitchProject = (event: CustomEvent<E2ESwitchProjectData>) => {
      const { projectId, nodes: nodeData } = event.detail

      // Update workspace store to reflect new active project
      useWorkspaceStore.setState((state) => ({
        activeProjectId: projectId,
        recentProjectIds: [
          projectId,
          ...state.recentProjectIds.filter((id) => id !== projectId),
        ].slice(0, 5),
      }))

      // Load the new project's nodes
      const nodesMap = new Map<string, ForgeNode>()
      nodeData.forEach((node) => {
        const processedNode = {
          ...node,
          dates: {
            created: new Date(node.dates.created),
            modified: new Date(node.dates.modified),
          },
        } as unknown as ForgeNode

        if (node.selectedDate) {
          ;(processedNode as unknown as Record<string, unknown>).selectedDate =
            new Date(node.selectedDate)
        }

        nodesMap.set(node.id, processedNode)
      })

      setNodes(nodesMap)

      // Update project store with new project info
      const project = useWorkspaceStore
        .getState()
        .projects.find((p) => p.id === projectId)
      if (project) {
        useProjectStore.setState({
          project: {
            id: project.id,
            name: project.name,
            path: project.path,
            nodes: nodesMap,
            metadata: {
              createdAt: new Date(),
              modifiedAt: project.modifiedAt,
            },
          },
          isDirty: false,
          error: null,
          parseErrors: [],
        })
      }
    }

    const handleAddNode = (event: CustomEvent<{ node: E2ENodeData }>) => {
      const { node } = event.detail
      const processedNode = {
        ...node,
        dates: {
          created: new Date(node.dates.created),
          modified: new Date(node.dates.modified),
        },
      } as unknown as ForgeNode

      if (node.selectedDate) {
        ;(processedNode as unknown as Record<string, unknown>).selectedDate =
          new Date(node.selectedDate)
      }

      useNodesStore.getState().addNode(processedNode)
    }

    const handleDeleteNode = (event: CustomEvent<{ nodeId: string }>) => {
      const { nodeId } = event.detail
      useNodesStore.getState().deleteNode(nodeId)
    }

    const handleCreateLink = (
      event: CustomEvent<{
        sourceId: string
        targetId: string
        type: 'dependency' | 'reference'
      }>
    ) => {
      const { sourceId, targetId, type } = event.detail

      if (type === 'dependency') {
        // For dependencies, add targetId to sourceId's dependsOn array
        const sourceNode = useNodesStore.getState().nodes.get(sourceId)
        if (sourceNode && sourceNode.type === 'task') {
          const currentDeps =
            (sourceNode as { dependsOn?: string[] }).dependsOn || []
          if (!currentDeps.includes(targetId)) {
            useNodesStore.getState().updateNode(sourceId, {
              dependsOn: [...currentDeps, targetId],
            } as unknown as Partial<ForgeNode>)
          }
        }
      }
      // For reference links, we'd update the content with a wiki-link
      // but that's more complex - dependencies are sufficient for layout testing
    }

    const handleRemoveLink = (
      event: CustomEvent<{
        sourceId: string
        targetId: string
        type: 'dependency' | 'reference'
      }>
    ) => {
      const { sourceId, targetId, type } = event.detail

      if (type === 'dependency') {
        const sourceNode = useNodesStore.getState().nodes.get(sourceId)
        if (sourceNode && sourceNode.type === 'task') {
          const currentDeps =
            (sourceNode as { dependsOn?: string[] }).dependsOn || []
          useNodesStore.getState().updateNode(sourceId, {
            dependsOn: currentDeps.filter((id) => id !== targetId),
          } as unknown as Partial<ForgeNode>)
        }
      }
    }

    const handleSetupWorkspace = (event: CustomEvent<E2EWorkspaceData>) => {
      const { projects, activeProjectId } = event.detail

      // Convert project data to ProjectSummary format
      const projectSummaries = projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        nodeCount: p.nodeCount,
        modifiedAt: new Date(p.modifiedAt),
        description: p.description,
      }))

      // Set workspace store state
      useWorkspaceStore.setState({
        projects: projectSummaries,
        activeProjectId,
        recentProjectIds: [activeProjectId],
      })
    }

    // Add event listeners
    window.addEventListener(
      'e2e-setup-nodes',
      handleSetupNodes as EventListener
    )
    window.addEventListener('e2e-clear-nodes', handleClearNodes)
    window.addEventListener('e2e-get-node-count', handleGetNodeCount)
    window.addEventListener(
      'e2e-setup-workspace',
      handleSetupWorkspace as EventListener
    )
    window.addEventListener(
      'e2e-get-nodes-by-type',
      handleGetNodesByType as EventListener
    )
    window.addEventListener(
      'e2e-get-child-nodes',
      handleGetChildNodes as EventListener
    )
    window.addEventListener(
      'e2e-set-task-parent',
      handleSetTaskParent as EventListener
    )
    window.addEventListener(
      'e2e-switch-project',
      handleSwitchProject as EventListener
    )
    window.addEventListener('e2e-add-node', handleAddNode as EventListener)
    window.addEventListener(
      'e2e-delete-node',
      handleDeleteNode as EventListener
    )
    window.addEventListener(
      'e2e-create-link',
      handleCreateLink as EventListener
    )
    window.addEventListener(
      'e2e-remove-link',
      handleRemoveLink as EventListener
    )

    // Mark app as ready for E2E tests
    window.__e2eReady = true

    return () => {
      window.removeEventListener(
        'e2e-setup-nodes',
        handleSetupNodes as EventListener
      )
      window.removeEventListener('e2e-clear-nodes', handleClearNodes)
      window.removeEventListener('e2e-get-node-count', handleGetNodeCount)
      window.removeEventListener(
        'e2e-setup-workspace',
        handleSetupWorkspace as EventListener
      )
      window.removeEventListener(
        'e2e-get-nodes-by-type',
        handleGetNodesByType as EventListener
      )
      window.removeEventListener(
        'e2e-get-child-nodes',
        handleGetChildNodes as EventListener
      )
      window.removeEventListener(
        'e2e-set-task-parent',
        handleSetTaskParent as EventListener
      )
      window.removeEventListener(
        'e2e-switch-project',
        handleSwitchProject as EventListener
      )
      window.removeEventListener('e2e-add-node', handleAddNode as EventListener)
      window.removeEventListener(
        'e2e-delete-node',
        handleDeleteNode as EventListener
      )
      window.removeEventListener(
        'e2e-create-link',
        handleCreateLink as EventListener
      )
      window.removeEventListener(
        'e2e-remove-link',
        handleRemoveLink as EventListener
      )
      window.__e2eReady = false
    }
  }, [setNodes, clearNodes, nodes.size])

  return null
}
