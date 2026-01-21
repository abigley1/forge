import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDefaultWorkspaceConfig,
  createProjectMetadata,
  createProject,
  createWorkspace,
  getActiveProject,
  getProjectById,
  hasProjects,
  getNodeCountsByType,
  type Project,
  type Workspace,
  type WorkspaceConfig,
  type ProjectMetadata,
} from './project'
import {
  NodeType,
  type DecisionNode,
  type TaskNode,
  type NoteNode,
} from './nodes'

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestDecisionNode(id: string): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title: 'Test Decision',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
  }
}

function createTestTaskNode(id: string): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title: 'Test Task',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

function createTestNoteNode(id: string): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title: 'Test Note',
    tags: [],
    dates: { created: new Date(), modified: new Date() },
    content: '',
  }
}

function createTestProject(id: string, name: string): Project {
  return createProject(id, name, `/projects/${id}`, `Test project: ${name}`)
}

// ============================================================================
// WorkspaceConfig Tests
// ============================================================================

describe('WorkspaceConfig', () => {
  describe('createDefaultWorkspaceConfig', () => {
    it('should create config with system theme', () => {
      const config = createDefaultWorkspaceConfig()
      expect(config.theme).toBe('system')
    })

    it('should create config with auto-save delay of 2000ms', () => {
      const config = createDefaultWorkspaceConfig()
      expect(config.autoSaveDelay).toBe(2000)
    })

    it('should create config with showWelcome enabled', () => {
      const config = createDefaultWorkspaceConfig()
      expect(config.showWelcome).toBe(true)
    })

    it('should create config with outline as default view', () => {
      const config = createDefaultWorkspaceConfig()
      expect(config.defaultView).toBe('outline')
    })

    it('should create config with git disabled by default', () => {
      const config = createDefaultWorkspaceConfig()
      expect(config.git.enabled).toBe(false)
      expect(config.git.autoCommit).toBe(false)
    })

    it('should have all required properties', () => {
      const config = createDefaultWorkspaceConfig()

      expect(config).toHaveProperty('theme')
      expect(config).toHaveProperty('autoSaveDelay')
      expect(config).toHaveProperty('showWelcome')
      expect(config).toHaveProperty('defaultView')
      expect(config).toHaveProperty('git')
      expect(config.git).toHaveProperty('enabled')
      expect(config.git).toHaveProperty('autoCommit')
    })
  })

  describe('WorkspaceConfig type constraints', () => {
    it('should accept valid theme values', () => {
      const config: WorkspaceConfig = {
        ...createDefaultWorkspaceConfig(),
        theme: 'light',
      }
      expect(config.theme).toBe('light')

      config.theme = 'dark'
      expect(config.theme).toBe('dark')

      config.theme = 'system'
      expect(config.theme).toBe('system')
    })

    it('should accept valid defaultView values', () => {
      const config: WorkspaceConfig = {
        ...createDefaultWorkspaceConfig(),
        defaultView: 'graph',
      }
      expect(config.defaultView).toBe('graph')

      config.defaultView = 'outline'
      expect(config.defaultView).toBe('outline')
    })
  })
})

// ============================================================================
// ProjectMetadata Tests
// ============================================================================

describe('ProjectMetadata', () => {
  describe('createProjectMetadata', () => {
    it('should create metadata with current timestamp', () => {
      const before = new Date()
      const metadata = createProjectMetadata()
      const after = new Date()

      expect(metadata.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
      expect(metadata.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(metadata.modifiedAt.getTime()).toBe(metadata.createdAt.getTime())
    })

    it('should create metadata without description by default', () => {
      const metadata = createProjectMetadata()
      expect(metadata.description).toBeUndefined()
    })

    it('should create metadata with description when provided', () => {
      const metadata = createProjectMetadata('A test project')
      expect(metadata.description).toBe('A test project')
    })

    it('should not have nodeOrder by default', () => {
      const metadata = createProjectMetadata()
      expect(metadata.nodeOrder).toBeUndefined()
    })

    it('should not have nodePositions by default', () => {
      const metadata = createProjectMetadata()
      expect(metadata.nodePositions).toBeUndefined()
    })
  })

  describe('ProjectMetadata type', () => {
    it('should accept optional nodeOrder', () => {
      const metadata: ProjectMetadata = {
        createdAt: new Date(),
        modifiedAt: new Date(),
        nodeOrder: ['node-1', 'node-2', 'node-3'],
      }
      expect(metadata.nodeOrder).toHaveLength(3)
    })

    it('should accept optional nodePositions', () => {
      const metadata: ProjectMetadata = {
        createdAt: new Date(),
        modifiedAt: new Date(),
        nodePositions: {
          'node-1': { x: 100, y: 200 },
          'node-2': { x: 300, y: 400 },
        },
      }
      expect(metadata.nodePositions?.['node-1']).toEqual({ x: 100, y: 200 })
    })
  })
})

// ============================================================================
// Project Tests
// ============================================================================

describe('Project', () => {
  describe('createProject', () => {
    it('should create a project with the given id', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project'
      )
      expect(project.id).toBe('my-project')
    })

    it('should create a project with the given name', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project'
      )
      expect(project.name).toBe('My Project')
    })

    it('should create a project with the given path', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project'
      )
      expect(project.path).toBe('/path/to/project')
    })

    it('should create a project with empty nodes map', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project'
      )
      expect(project.nodes).toBeInstanceOf(Map)
      expect(project.nodes.size).toBe(0)
    })

    it('should create a project with metadata', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project'
      )
      expect(project.metadata).toBeDefined()
      expect(project.metadata.createdAt).toBeInstanceOf(Date)
      expect(project.metadata.modifiedAt).toBeInstanceOf(Date)
    })

    it('should include description in metadata when provided', () => {
      const project = createProject(
        'my-project',
        'My Project',
        '/path/to/project',
        'A sample project'
      )
      expect(project.metadata.description).toBe('A sample project')
    })
  })

  describe('Project with nodes', () => {
    let project: Project

    beforeEach(() => {
      project = createTestProject('test-project', 'Test Project')
      project.nodes.set('decision-1', createTestDecisionNode('decision-1'))
      project.nodes.set('task-1', createTestTaskNode('task-1'))
      project.nodes.set('task-2', createTestTaskNode('task-2'))
      project.nodes.set('note-1', createTestNoteNode('note-1'))
    })

    it('should store nodes in the map', () => {
      expect(project.nodes.size).toBe(4)
    })

    it('should retrieve nodes by id', () => {
      const node = project.nodes.get('decision-1')
      expect(node).toBeDefined()
      expect(node?.type).toBe(NodeType.Decision)
    })

    it('should return undefined for non-existent nodes', () => {
      const node = project.nodes.get('non-existent')
      expect(node).toBeUndefined()
    })

    it('should allow deleting nodes', () => {
      project.nodes.delete('task-1')
      expect(project.nodes.size).toBe(3)
      expect(project.nodes.has('task-1')).toBe(false)
    })

    it('should allow updating nodes', () => {
      const updatedTask: TaskNode = {
        ...createTestTaskNode('task-1'),
        status: 'complete',
      }
      project.nodes.set('task-1', updatedTask)
      const retrieved = project.nodes.get('task-1') as TaskNode
      expect(retrieved.status).toBe('complete')
    })
  })
})

// ============================================================================
// Workspace Tests
// ============================================================================

describe('Workspace', () => {
  describe('createWorkspace', () => {
    it('should create a workspace with empty projects array', () => {
      const workspace = createWorkspace()
      expect(workspace.projects).toEqual([])
    })

    it('should create a workspace with null activeProjectId', () => {
      const workspace = createWorkspace()
      expect(workspace.activeProjectId).toBeNull()
    })

    it('should create a workspace with default config', () => {
      const workspace = createWorkspace()
      expect(workspace.config).toEqual(createDefaultWorkspaceConfig())
    })
  })

  describe('Workspace with projects', () => {
    let workspace: Workspace

    beforeEach(() => {
      workspace = createWorkspace()
      workspace.projects.push(createTestProject('project-1', 'Project One'))
      workspace.projects.push(createTestProject('project-2', 'Project Two'))
      workspace.activeProjectId = 'project-1'
    })

    it('should store multiple projects', () => {
      expect(workspace.projects).toHaveLength(2)
    })

    it('should have an active project', () => {
      expect(workspace.activeProjectId).toBe('project-1')
    })

    it('should allow changing the active project', () => {
      workspace.activeProjectId = 'project-2'
      expect(workspace.activeProjectId).toBe('project-2')
    })

    it('should allow setting activeProjectId to null', () => {
      workspace.activeProjectId = null
      expect(workspace.activeProjectId).toBeNull()
    })
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('helper functions', () => {
  describe('getActiveProject', () => {
    it('should return undefined when no projects exist', () => {
      const workspace = createWorkspace()
      expect(getActiveProject(workspace)).toBeUndefined()
    })

    it('should return undefined when activeProjectId is null', () => {
      const workspace = createWorkspace()
      workspace.projects.push(createTestProject('project-1', 'Project One'))
      workspace.activeProjectId = null
      expect(getActiveProject(workspace)).toBeUndefined()
    })

    it('should return the active project', () => {
      const workspace = createWorkspace()
      const project = createTestProject('project-1', 'Project One')
      workspace.projects.push(project)
      workspace.activeProjectId = 'project-1'
      expect(getActiveProject(workspace)).toBe(project)
    })

    it('should return undefined when activeProjectId does not match any project', () => {
      const workspace = createWorkspace()
      workspace.projects.push(createTestProject('project-1', 'Project One'))
      workspace.activeProjectId = 'non-existent'
      expect(getActiveProject(workspace)).toBeUndefined()
    })
  })

  describe('getProjectById', () => {
    it('should return undefined when no projects exist', () => {
      const workspace = createWorkspace()
      expect(getProjectById(workspace, 'any-id')).toBeUndefined()
    })

    it('should return the project with matching id', () => {
      const workspace = createWorkspace()
      const project1 = createTestProject('project-1', 'Project One')
      const project2 = createTestProject('project-2', 'Project Two')
      workspace.projects.push(project1, project2)

      expect(getProjectById(workspace, 'project-1')).toBe(project1)
      expect(getProjectById(workspace, 'project-2')).toBe(project2)
    })

    it('should return undefined when id does not match', () => {
      const workspace = createWorkspace()
      workspace.projects.push(createTestProject('project-1', 'Project One'))
      expect(getProjectById(workspace, 'non-existent')).toBeUndefined()
    })
  })

  describe('hasProjects', () => {
    it('should return false for empty workspace', () => {
      const workspace = createWorkspace()
      expect(hasProjects(workspace)).toBe(false)
    })

    it('should return true when workspace has projects', () => {
      const workspace = createWorkspace()
      workspace.projects.push(createTestProject('project-1', 'Project One'))
      expect(hasProjects(workspace)).toBe(true)
    })
  })

  describe('getNodeCountsByType', () => {
    it('should return zero counts for empty project', () => {
      const project = createTestProject('empty', 'Empty Project')
      const counts = getNodeCountsByType(project)

      expect(counts.decision).toBe(0)
      expect(counts.component).toBe(0)
      expect(counts.task).toBe(0)
      expect(counts.note).toBe(0)
    })

    it('should count nodes by type correctly', () => {
      const project = createTestProject('test', 'Test Project')
      project.nodes.set('d1', createTestDecisionNode('d1'))
      project.nodes.set('d2', createTestDecisionNode('d2'))
      project.nodes.set('t1', createTestTaskNode('t1'))
      project.nodes.set('t2', createTestTaskNode('t2'))
      project.nodes.set('t3', createTestTaskNode('t3'))
      project.nodes.set('n1', createTestNoteNode('n1'))

      const counts = getNodeCountsByType(project)

      expect(counts.decision).toBe(2)
      expect(counts.component).toBe(0)
      expect(counts.task).toBe(3)
      expect(counts.note).toBe(1)
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('should handle project with very long name', () => {
    const longName = 'A'.repeat(1000)
    const project = createProject('long-name', longName, '/path')
    expect(project.name).toBe(longName)
  })

  it('should handle project with special characters in path', () => {
    const path = '/path/with spaces/and-dashes/and_underscores'
    const project = createProject('special', 'Special', path)
    expect(project.path).toBe(path)
  })

  it('should handle workspace config modification', () => {
    const workspace = createWorkspace()
    workspace.config.theme = 'dark'
    workspace.config.autoSaveDelay = 5000
    workspace.config.git.enabled = true
    workspace.config.git.autoCommit = true

    expect(workspace.config.theme).toBe('dark')
    expect(workspace.config.autoSaveDelay).toBe(5000)
    expect(workspace.config.git.enabled).toBe(true)
    expect(workspace.config.git.autoCommit).toBe(true)
  })

  it('should handle adding nodes to project after creation', () => {
    const project = createProject('test', 'Test', '/path')

    const node1 = createTestDecisionNode('node-1')
    const node2 = createTestTaskNode('node-2')

    project.nodes.set(node1.id, node1)
    project.nodes.set(node2.id, node2)

    expect(project.nodes.size).toBe(2)
    expect(project.nodes.get('node-1')?.type).toBe(NodeType.Decision)
    expect(project.nodes.get('node-2')?.type).toBe(NodeType.Task)
  })
})
