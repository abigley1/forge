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
 */

import { useEffect } from 'react'
import { useNodesStore, useProjectStore } from '@/store'
import type { ForgeNode } from '@/types/nodes'

// Extend Window interface for E2E communication
declare global {
  interface Window {
    __e2eNodeCount?: number
    __e2eReady?: boolean
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

      // Also set a fake project so the app shows the main UI
      useProjectStore.setState({
        project: {
          id: 'e2e-test-project',
          name: 'E2E Test Project',
          path: '/e2e-test',
          nodes: nodesMap,
          metadata: {
            createdAt: new Date(),
            modifiedAt: new Date(),
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

    // Add event listeners
    window.addEventListener(
      'e2e-setup-nodes',
      handleSetupNodes as EventListener
    )
    window.addEventListener('e2e-clear-nodes', handleClearNodes)
    window.addEventListener('e2e-get-node-count', handleGetNodeCount)

    // Mark app as ready for E2E tests
    window.__e2eReady = true

    return () => {
      window.removeEventListener(
        'e2e-setup-nodes',
        handleSetupNodes as EventListener
      )
      window.removeEventListener('e2e-clear-nodes', handleClearNodes)
      window.removeEventListener('e2e-get-node-count', handleGetNodeCount)
      window.__e2eReady = false
    }
  }, [setNodes, clearNodes, nodes.size])

  return null
}
