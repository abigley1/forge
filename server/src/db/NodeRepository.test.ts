import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, type DatabaseInstance } from './index.js'
import { NodeRepository } from './NodeRepository.js'
import { ProjectRepository } from './ProjectRepository.js'

describe('NodeRepository', () => {
  let db: DatabaseInstance
  let repo: NodeRepository
  let projectRepo: ProjectRepository
  let projectId: string

  beforeEach(() => {
    db = createTestDatabase()
    repo = new NodeRepository(db)
    projectRepo = new ProjectRepository(db)
    const project = projectRepo.create({ name: 'Test Project' })
    projectId = project.id
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a basic task node', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Test Task',
      })

      expect(node.id).toBeDefined()
      expect(node.project_id).toBe(projectId)
      expect(node.type).toBe('task')
      expect(node.title).toBe('Test Task')
      expect(node.tags).toEqual([])
      expect(node.depends_on).toEqual([])
    })

    it('should create a node with tags', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'note',
        title: 'Test Note',
        tags: ['important', 'review'],
      })

      expect(node.tags).toEqual(['important', 'review'])
    })

    it('should create a node with dependencies', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dependency',
      })

      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dependent',
        depends_on: [dep.id],
      })

      expect(node.depends_on).toEqual([dep.id])
    })

    it('should create a component with extras', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'component',
        title: 'Test Component',
        supplier: 'DigiKey',
        part_number: 'ABC-123',
        cost: 19.99,
      })

      expect(node.supplier).toBe('DigiKey')
      expect(node.part_number).toBe('ABC-123')
      expect(node.cost).toBe(19.99)
    })

    it('should create a decision with extras', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'decision',
        title: 'Test Decision',
        selected_option: 'Option A',
        selected_date: '2024-01-15T00:00:00.000Z',
        comparison_data: { options: ['A', 'B'], criteria: [] },
      })

      expect(node.selected_option).toBe('Option A')
      expect(node.selected_date).toBe('2024-01-15T00:00:00.000Z')
      expect(node.comparison_data).toEqual({
        options: ['A', 'B'],
        criteria: [],
      })
    })

    it('should create a task with checklist', () => {
      const checklist = [
        { id: 'item-1', text: 'Step 1', completed: true },
        { id: 'item-2', text: 'Step 2', completed: false },
      ]

      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task with Checklist',
        checklist,
      })

      expect(node.checklist).toEqual(checklist)
    })

    it('should create a component with custom fields', () => {
      const customFields = { torque: 5, voltage: 24, weight: '500g' }

      const node = repo.create({
        project_id: projectId,
        type: 'component',
        title: 'Motor',
        custom_fields: customFields,
      })

      expect(node.custom_fields).toEqual(customFields)
    })

    it('should throw for invalid node type', () => {
      expect(() =>
        repo.create({
          project_id: projectId,
          // @ts-expect-error Testing invalid type handling
          type: 'invalid',
          title: 'Test',
        })
      ).toThrow('Invalid node type')
    })
  })

  describe('findById', () => {
    it('should find existing node with all relations', () => {
      const created = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Test',
        tags: ['tag1'],
      })

      const found = repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.tags).toEqual(['tag1'])
    })

    it('should return null for non-existent node', () => {
      const found = repo.findById('non-existent')
      expect(found).toBeNull()
    })
  })

  describe('findByProject', () => {
    it('should return all nodes for a project', () => {
      repo.create({ project_id: projectId, type: 'task', title: 'Task 1' })
      repo.create({ project_id: projectId, type: 'task', title: 'Task 2' })

      const nodes = repo.findByProject(projectId)

      expect(nodes).toHaveLength(2)
    })

    it('should filter by type', () => {
      repo.create({ project_id: projectId, type: 'task', title: 'Task' })
      repo.create({ project_id: projectId, type: 'note', title: 'Note' })

      const nodes = repo.findByProject(projectId, { type: 'task' })

      expect(nodes).toHaveLength(1)
      expect(nodes[0].type).toBe('task')
    })

    it('should filter by multiple types', () => {
      repo.create({ project_id: projectId, type: 'task', title: 'Task' })
      repo.create({ project_id: projectId, type: 'note', title: 'Note' })
      repo.create({
        project_id: projectId,
        type: 'component',
        title: 'Component',
      })

      const nodes = repo.findByProject(projectId, { type: ['task', 'note'] })

      expect(nodes).toHaveLength(2)
    })

    it('should filter by status', () => {
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task 1',
        status: 'pending',
      })
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task 2',
        status: 'complete',
      })

      const nodes = repo.findByProject(projectId, { status: 'pending' })

      expect(nodes).toHaveLength(1)
      expect(nodes[0].status).toBe('pending')
    })

    it('should filter by tags', () => {
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task 1',
        tags: ['urgent'],
      })
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task 2',
        tags: ['low'],
      })

      const nodes = repo.findByProject(projectId, { tags: ['urgent'] })

      expect(nodes).toHaveLength(1)
      expect(nodes[0].tags).toContain('urgent')
    })

    it('should filter by query (title search)', () => {
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Important Task',
      })
      repo.create({ project_id: projectId, type: 'task', title: 'Other Task' })

      const nodes = repo.findByProject(projectId, { query: 'Important' })

      expect(nodes).toHaveLength(1)
      expect(nodes[0].title).toBe('Important Task')
    })
  })

  describe('update', () => {
    it('should update basic fields', () => {
      const created = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Original',
        status: 'pending',
      })

      const updated = repo.update(created.id, {
        title: 'Updated',
        status: 'complete',
      })

      expect(updated?.title).toBe('Updated')
      expect(updated?.status).toBe('complete')
    })

    it('should update tags', () => {
      const created = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Test',
        tags: ['old'],
      })

      const updated = repo.update(created.id, { tags: ['new1', 'new2'] })

      expect(updated?.tags).toEqual(['new1', 'new2'])
    })

    it('should update dependencies', () => {
      const dep1 = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dep 1',
      })
      const dep2 = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dep 2',
      })
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Node',
        depends_on: [dep1.id],
      })

      const updated = repo.update(node.id, { depends_on: [dep2.id] })

      expect(updated?.depends_on).toEqual([dep2.id])
    })

    it('should update component extras', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'component',
        title: 'Component',
        supplier: 'Old',
      })

      const updated = repo.update(node.id, { supplier: 'New', cost: 9.99 })

      expect(updated?.supplier).toBe('New')
      expect(updated?.cost).toBe(9.99)
    })

    it('should update component custom fields', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'component',
        title: 'Motor',
        custom_fields: { torque: 5 },
      })

      const updated = repo.update(node.id, {
        custom_fields: { torque: 10, voltage: 24 },
      })

      expect(updated?.custom_fields).toEqual({ torque: 10, voltage: 24 })
    })

    it('should update task checklist', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Task',
        checklist: [{ id: 'item-1', text: 'Step 1', completed: false }],
      })

      const updated = repo.update(node.id, {
        checklist: [{ id: 'item-1', text: 'Step 1', completed: true }],
      })

      expect(updated?.checklist?.[0]?.completed).toBe(true)
    })

    it('should update decision selected date', () => {
      const node = repo.create({
        project_id: projectId,
        type: 'decision',
        title: 'Decision',
      })

      const updated = repo.update(node.id, {
        selected_option: 'Option A',
        selected_date: '2024-01-20T00:00:00.000Z',
        selection_rationale: 'Best choice',
      })

      expect(updated?.selected_option).toBe('Option A')
      expect(updated?.selected_date).toBe('2024-01-20T00:00:00.000Z')
      expect(updated?.selection_rationale).toBe('Best choice')
    })

    it('should return null for non-existent node', () => {
      const result = repo.update('non-existent', { title: 'Test' })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete existing node', () => {
      const created = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Test',
      })

      const deleted = repo.delete(created.id)

      expect(deleted).toBe(true)
      expect(repo.findById(created.id)).toBeNull()
    })

    it('should return false for non-existent node', () => {
      const deleted = repo.delete('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('dependencies', () => {
    it('should add dependency', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dep',
      })
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Node',
      })

      repo.addDependency(node.id, dep.id)

      expect(repo.getDependencies(node.id)).toContain(dep.id)
    })

    it('should remove dependency', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dep',
      })
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Node',
        depends_on: [dep.id],
      })

      repo.removeDependency(node.id, dep.id)

      expect(repo.getDependencies(node.id)).not.toContain(dep.id)
    })

    it('should get dependents', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Dep',
      })
      const node = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Node',
        depends_on: [dep.id],
      })

      expect(repo.getDependents(dep.id)).toContain(node.id)
    })
  })

  describe('wouldCreateCycle', () => {
    it('should detect direct cycle', () => {
      const a = repo.create({ project_id: projectId, type: 'task', title: 'A' })
      const b = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'B',
        depends_on: [a.id],
      })

      expect(repo.wouldCreateCycle(a.id, b.id)).toBe(true)
    })

    it('should detect indirect cycle', () => {
      const a = repo.create({ project_id: projectId, type: 'task', title: 'A' })
      const b = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'B',
        depends_on: [a.id],
      })
      const c = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'C',
        depends_on: [b.id],
      })

      expect(repo.wouldCreateCycle(a.id, c.id)).toBe(true)
    })

    it('should allow non-cyclic dependency', () => {
      const a = repo.create({ project_id: projectId, type: 'task', title: 'A' })
      const b = repo.create({ project_id: projectId, type: 'task', title: 'B' })

      expect(repo.wouldCreateCycle(a.id, b.id)).toBe(false)
    })
  })

  describe('getBlockedTasks', () => {
    it('should return tasks blocked by incomplete dependencies', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Blocking Task',
        status: 'pending',
      })
      const blocked = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Blocked Task',
        status: 'pending',
        depends_on: [dep.id],
      })

      const blockedTasks = repo.getBlockedTasks(projectId)

      expect(blockedTasks).toHaveLength(1)
      expect(blockedTasks[0].id).toBe(blocked.id)
    })

    it('should not return tasks with complete dependencies', () => {
      const dep = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Complete Task',
        status: 'complete',
      })
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Not Blocked',
        status: 'pending',
        depends_on: [dep.id],
      })

      const blockedTasks = repo.getBlockedTasks(projectId)

      expect(blockedTasks).toHaveLength(0)
    })
  })

  describe('getCriticalPath', () => {
    it('should return longest chain of incomplete tasks', () => {
      // Create a chain: A -> B -> C
      const a = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'A',
        status: 'pending',
      })
      const b = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'B',
        status: 'pending',
        depends_on: [a.id],
      })
      const c = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'C',
        status: 'pending',
        depends_on: [b.id],
      })

      // Create a shorter chain: D -> E
      const d = repo.create({
        project_id: projectId,
        type: 'task',
        title: 'D',
        status: 'pending',
      })
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'E',
        status: 'pending',
        depends_on: [d.id],
      })

      const criticalPath = repo.getCriticalPath(projectId)

      expect(criticalPath).toHaveLength(3)
      expect(criticalPath.map((n) => n.id)).toEqual([a.id, b.id, c.id])
    })

    it('should return empty array when no incomplete tasks', () => {
      repo.create({
        project_id: projectId,
        type: 'task',
        title: 'Complete',
        status: 'complete',
      })

      const criticalPath = repo.getCriticalPath(projectId)

      expect(criticalPath).toHaveLength(0)
    })
  })
})
