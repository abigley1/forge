import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { ForgeGraphNode } from './ForgeGraphNode'
import { TagCluster } from './TagCluster'
import { NodeContextMenu } from './NodeContextMenu'
import { GraphView } from './GraphView'
import {
  NodeType,
  type ForgeNode,
  type TaskNode,
  type DecisionNode,
  type NoteNode,
  type ComponentNode,
} from '@/types/nodes'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'

// Mock ResizeObserver for React Flow
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// Helper to create test nodes
function createTaskNode(id: string, title: string, content = ''): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

function createDecisionNode(
  id: string,
  title: string,
  content = ''
): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
  }
}

function createComponentNode(
  id: string,
  title: string,
  content = ''
): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
  }
}

function createNoteNode(id: string, title: string, content = ''): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    content,
    tags: [],
    dates: { created: new Date(), modified: new Date() },
  }
}

// Wrapper for React Flow components
function ReactFlowWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NuqsTestingAdapter>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </NuqsTestingAdapter>
  )
}

describe('ForgeGraphNode', () => {
  const mockNodeData = {
    label: 'Test Task',
    nodeType: NodeType.Task,
    status: 'pending',
    tags: ['test'],
    forgeNode: createTaskNode('task-1', 'Test Task'),
  }

  const mockNodeProps = {
    id: 'task-1',
    type: 'forgeNode',
    data: mockNodeData,
    xPos: 0,
    yPos: 0,
    selected: false,
    zIndex: 1,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  } as const

  it('renders node with title and type', () => {
    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...mockNodeProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    // Check for the type label (uppercase, in the header)
    expect(
      screen.getByRole('heading', { name: 'Test Task' })
    ).toBeInTheDocument()
  })

  it('shows status badge when status is provided', () => {
    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...mockNodeProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockNodeProps, selected: true }

    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...selectedProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    // Check for ring class indicating selection
    const nodeElement = container.querySelector('.ring-2')
    expect(nodeElement).toBeInTheDocument()
  })

  it('renders different node types with correct colors', () => {
    const decisionData = {
      ...mockNodeData,
      label: 'Test Decision',
      nodeType: NodeType.Decision,
      forgeNode: createDecisionNode('decision-1', 'Test Decision'),
    }
    const decisionProps = {
      ...mockNodeProps,
      id: 'decision-1',
      data: decisionData,
    }

    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...decisionProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('Test Decision')).toBeInTheDocument()
    // Check for blue color classes (decision)
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument()
  })

  it('does not show status badge for note nodes without status', () => {
    const noteData = {
      label: 'Test Note',
      nodeType: NodeType.Note,
      status: undefined,
      tags: [],
      forgeNode: createNoteNode('note-1', 'Test Note'),
    }
    const noteProps = { ...mockNodeProps, id: 'note-1', data: noteData }

    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...noteProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('Test Note')).toBeInTheDocument()
    // Should not have any status badge
    expect(screen.queryByText('pending')).not.toBeInTheDocument()
    expect(screen.queryByText('complete')).not.toBeInTheDocument()
  })

  it('has minimum 44px height for accessibility (WCAG 2.1 touch targets)', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <ForgeGraphNode {...mockNodeProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    // Check for the min-h-[44px] class on the node container
    const nodeContainer = container.querySelector('.min-h-\\[44px\\]')
    expect(nodeContainer).toBeInTheDocument()
  })
})

describe('TagCluster', () => {
  const mockClusterData = {
    tag: 'frontend',
    nodeCount: 3,
    expanded: false,
    nodeIds: ['task-1', 'task-2', 'task-3'],
  }

  const mockClusterProps = {
    id: 'cluster-frontend',
    type: 'tagCluster',
    data: mockClusterData,
    xPos: 0,
    yPos: 0,
    selected: false,
    zIndex: 1,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
  } as const

  it('renders cluster with tag name', () => {
    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...mockClusterProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('frontend')).toBeInTheDocument()
  })

  it('shows node count', () => {
    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...mockClusterProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('3 nodes')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // count badge
  })

  it('shows singular "node" for single node cluster', () => {
    const singleNodeData = {
      ...mockClusterData,
      nodeCount: 1,
      nodeIds: ['task-1'],
    }
    const singleNodeProps = { ...mockClusterProps, data: singleNodeData }

    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...singleNodeProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    expect(screen.getByText('1 node')).toBeInTheDocument()
  })

  it('has correct aria-label for accessibility', () => {
    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...mockClusterProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    const cluster = screen.getByRole('button')
    expect(cluster).toHaveAttribute(
      'aria-label',
      'frontend cluster with 3 nodes, collapsed'
    )
  })

  it('shows expanded state in aria-label', () => {
    const expandedData = { ...mockClusterData, expanded: true }
    const expandedProps = { ...mockClusterProps, data: expandedData }

    render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...expandedProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    const cluster = screen.getByRole('button')
    expect(cluster).toHaveAttribute(
      'aria-label',
      'frontend cluster with 3 nodes, expanded'
    )
    expect(cluster).toHaveAttribute('aria-expanded', 'true')
  })

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockClusterProps, selected: true }

    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...selectedProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    // Check for ring class indicating selection
    const clusterElement = container.querySelector('.ring-2')
    expect(clusterElement).toBeInTheDocument()
  })

  it('has minimum 44px height for accessibility (WCAG 2.1 touch targets)', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <foreignObject>
            <TagCluster {...mockClusterProps} />
          </foreignObject>
        </svg>
      </ReactFlowWrapper>
    )

    // Check for the min-h-[44px] class on the cluster container
    const clusterContainer = container.querySelector('.min-h-\\[44px\\]')
    expect(clusterContainer).toBeInTheDocument()
  })
})

describe('NodeContextMenu', () => {
  const defaultProps = {
    x: 100,
    y: 200,
    nodeId: 'test-node',
    nodeTitle: 'Test Node',
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
    onAddLink: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders at specified position', () => {
    const { container } = render(<NodeContextMenu {...defaultProps} />)

    const menu = container.querySelector('[role="menu"]')
    expect(menu).toHaveStyle({ left: '100px', top: '200px' })
  })

  it('displays node title', () => {
    render(<NodeContextMenu {...defaultProps} />)

    expect(screen.getByText('Test Node')).toBeInTheDocument()
  })

  it('renders all menu items', () => {
    render(<NodeContextMenu {...defaultProps} />)

    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Add Link')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onView when View is clicked', () => {
    render(<NodeContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText('View'))

    expect(defaultProps.onView).toHaveBeenCalledWith('test-node')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onEdit when Edit is clicked', () => {
    render(<NodeContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText('Edit'))

    expect(defaultProps.onEdit).toHaveBeenCalledWith('test-node')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onAddLink when Add Link is clicked', () => {
    render(<NodeContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText('Add Link'))

    expect(defaultProps.onAddLink).toHaveBeenCalledWith('test-node')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onDelete when Delete is clicked', () => {
    render(<NodeContextMenu {...defaultProps} />)

    fireEvent.click(screen.getByText('Delete'))

    expect(defaultProps.onDelete).toHaveBeenCalledWith('test-node')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('closes on Escape key', () => {
    render(<NodeContextMenu {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('has correct aria-label for accessibility', () => {
    render(<NodeContextMenu {...defaultProps} />)

    const menu = screen.getByRole('menu')
    expect(menu).toHaveAttribute('aria-label', 'Actions for Test Node')
  })
})

describe('GraphView', () => {
  beforeEach(() => {
    // Reset stores
    useNodesStore.getState().clearNodes()
    useProjectStore.getState().closeProject()
  })

  it('renders empty graph when no nodes', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView />
        </div>
      </ReactFlowWrapper>
    )

    // React Flow container should be present
    const reactFlowWrapper = container.querySelector('.react-flow')
    expect(reactFlowWrapper).toBeInTheDocument()
  })

  it('renders graph controls', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView />
        </div>
      </ReactFlowWrapper>
    )

    // Controls should be present
    const controls = container.querySelector('.react-flow__controls')
    expect(controls).toBeInTheDocument()
  })

  it('renders minimap when showMinimap is true', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView showMinimap />
        </div>
      </ReactFlowWrapper>
    )

    const minimap = container.querySelector('.react-flow__minimap')
    expect(minimap).toBeInTheDocument()
  })

  it('does not render minimap when showMinimap is false', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView showMinimap={false} />
        </div>
      </ReactFlowWrapper>
    )

    const minimap = container.querySelector('.react-flow__minimap')
    expect(minimap).not.toBeInTheDocument()
  })

  it('renders background when showBackground is true', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView showBackground />
        </div>
      </ReactFlowWrapper>
    )

    const background = container.querySelector('.react-flow__background')
    expect(background).toBeInTheDocument()
  })

  it('does not render background when showBackground is false', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView showBackground={false} />
        </div>
      </ReactFlowWrapper>
    )

    const background = container.querySelector('.react-flow__background')
    expect(background).not.toBeInTheDocument()
  })

  it('renders nodes from store', () => {
    // Add nodes to store
    const task = createTaskNode('task-1', 'Test Task')
    const decision = createDecisionNode('decision-1', 'Test Decision')

    useNodesStore.getState().setNodes(
      new Map<string, ForgeNode>([
        ['task-1', task],
        ['decision-1', decision],
      ])
    )

    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView />
        </div>
      </ReactFlowWrapper>
    )

    // Check that nodes are rendered
    const nodes = container.querySelectorAll('.react-flow__node')
    expect(nodes.length).toBe(2)
  })

  it('accepts onNodeSelect callback prop', () => {
    const onNodeSelect = vi.fn()

    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView onNodeSelect={onNodeSelect} />
        </div>
      </ReactFlowWrapper>
    )

    // The component should render without error with the callback
    expect(container.querySelector('.react-flow')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView className="custom-class" />
        </div>
      </ReactFlowWrapper>
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})

describe('GraphView integration', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
    useProjectStore.getState().closeProject()
  })

  it('filters nodes based on filter state', () => {
    // Add nodes of different types
    const task = createTaskNode('task-1', 'Test Task')
    const decision = createDecisionNode('decision-1', 'Test Decision')
    const component = createComponentNode('component-1', 'Test Component')

    useNodesStore.getState().setNodes(
      new Map<string, ForgeNode>([
        ['task-1', task],
        ['decision-1', decision],
        ['component-1', component],
      ])
    )

    // Render with filters (will use nuqs query state)
    const { container } = render(
      <NuqsTestingAdapter searchParams="?types=task">
        <ReactFlowProvider>
          <div style={{ width: 800, height: 600 }}>
            <GraphView />
          </div>
        </ReactFlowProvider>
      </NuqsTestingAdapter>
    )

    // When filtering by task, only task nodes should be visible
    const nodes = container.querySelectorAll('.react-flow__node')
    expect(nodes.length).toBe(1)
  })

  it('renders nodes with active node from store', () => {
    const task = createTaskNode('task-1', 'Test Task')
    const task2 = createTaskNode('task-2', 'Test Task 2')
    useNodesStore.getState().setNodes(
      new Map([
        ['task-1', task],
        ['task-2', task2],
      ])
    )

    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView />
        </div>
      </ReactFlowWrapper>
    )

    // Both nodes should render
    const nodes = container.querySelectorAll('.react-flow__node')
    expect(nodes.length).toBe(2)
  })
})

describe('GraphView clustering', () => {
  beforeEach(() => {
    useNodesStore.getState().clearNodes()
    useProjectStore.getState().closeProject()
  })

  it('renders without clustering by default', () => {
    const task1: TaskNode = {
      ...createTaskNode('task-1', 'Task 1'),
      tags: ['frontend'],
    }
    const task2: TaskNode = {
      ...createTaskNode('task-2', 'Task 2'),
      tags: ['frontend'],
    }

    useNodesStore.getState().setNodes(
      new Map([
        ['task-1', task1],
        ['task-2', task2],
      ])
    )

    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView enableClustering={false} />
        </div>
      </ReactFlowWrapper>
    )

    // Both individual nodes should render, no clusters
    const nodes = container.querySelectorAll('.react-flow__node')
    expect(nodes.length).toBe(2)
  })

  it('accepts enableClustering prop', () => {
    const task1: TaskNode = {
      ...createTaskNode('task-1', 'Task 1'),
      tags: ['frontend'],
    }

    useNodesStore.getState().setNodes(new Map([['task-1', task1]]))

    // Should render without error with clustering enabled
    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView enableClustering={true} />
        </div>
      </ReactFlowWrapper>
    )

    expect(container.querySelector('.react-flow')).toBeInTheDocument()
  })

  it('accepts onClusterToggle callback prop', () => {
    const onClusterToggle = vi.fn()

    const { container } = render(
      <ReactFlowWrapper>
        <div style={{ width: 800, height: 600 }}>
          <GraphView
            enableClustering={true}
            onClusterToggle={onClusterToggle}
          />
        </div>
      </ReactFlowWrapper>
    )

    expect(container.querySelector('.react-flow')).toBeInTheDocument()
  })
})

// ============================================================================
// Edge Component Tests (Task 5.3)
// ============================================================================

import { DependencyEdge } from './DependencyEdge'
import { ReferenceEdge } from './ReferenceEdge'
import { forgeEdgeTypes } from './edgeTypes'
import { Position } from 'reactflow'

describe('DependencyEdge', () => {
  const defaultProps = {
    id: 'dep-edge-1',
    source: 'node-1',
    target: 'node-2',
    sourceX: 100,
    sourceY: 100,
    targetX: 300,
    targetY: 200,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { linkType: 'dependency' as const },
    selected: false,
  }

  it('renders edge path', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <DependencyEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toBeInTheDocument()
    expect(path).toHaveAttribute('d')
  })

  it('applies blue color to edge', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <DependencyEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ stroke: '#3b82f6' }) // blue-500
  })

  it('applies darker blue when selected', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <DependencyEdge {...defaultProps} selected={true} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ stroke: '#1d4ed8' }) // blue-700
  })

  it('has 2px stroke width', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <DependencyEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ strokeWidth: 2 })
  })

  it('has solid line (no dash array)', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <DependencyEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    // Solid line should not have strokeDasharray
    expect(path?.style.strokeDasharray).toBeFalsy()
  })

  it('renders without error when given valid props', () => {
    // EdgeLabelRenderer uses a portal, so we just verify component renders
    expect(() => {
      render(
        <ReactFlowWrapper>
          <svg>
            <DependencyEdge {...defaultProps} />
          </svg>
        </ReactFlowWrapper>
      )
    }).not.toThrow()
  })
})

describe('ReferenceEdge', () => {
  const defaultProps = {
    id: 'ref-edge-1',
    source: 'node-1',
    target: 'node-2',
    sourceX: 100,
    sourceY: 100,
    targetX: 300,
    targetY: 200,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { linkType: 'reference' as const },
    selected: false,
  }

  it('renders edge path', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toBeInTheDocument()
    expect(path).toHaveAttribute('d')
  })

  it('applies gray color to edge', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ stroke: '#94a3b8' }) // gray-400
  })

  it('applies darker gray when selected', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} selected={true} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ stroke: '#4b5563' }) // gray-600
  })

  it('has 1px stroke width', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ strokeWidth: 1 })
  })

  it('has dashed line', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const path = container.querySelector('path')
    expect(path).toHaveStyle({ strokeDasharray: '5 3' })
  })

  it('renders circle marker at target', () => {
    const { container } = render(
      <ReactFlowWrapper>
        <svg>
          <ReferenceEdge {...defaultProps} />
        </svg>
      </ReactFlowWrapper>
    )

    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveAttribute('cx', '300')
    expect(circle).toHaveAttribute('cy', '200')
    expect(circle).toHaveAttribute('r', '4')
  })

  it('renders without error when given valid props', () => {
    // EdgeLabelRenderer uses a portal, so we just verify component renders
    expect(() => {
      render(
        <ReactFlowWrapper>
          <svg>
            <ReferenceEdge {...defaultProps} />
          </svg>
        </ReactFlowWrapper>
      )
    }).not.toThrow()
  })
})

describe('forgeEdgeTypes', () => {
  it('includes dependency edge type', () => {
    expect(forgeEdgeTypes.dependency).toBe(DependencyEdge)
  })

  it('includes reference edge type', () => {
    expect(forgeEdgeTypes.reference).toBe(ReferenceEdge)
  })

  it('has correct number of edge types', () => {
    expect(Object.keys(forgeEdgeTypes)).toHaveLength(2)
  })
})
