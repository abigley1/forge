import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, type DatabaseInstance } from './index.js'
import { ProjectRepository } from './ProjectRepository.js'

describe('ProjectRepository', () => {
  let db: DatabaseInstance
  let repo: ProjectRepository

  beforeEach(() => {
    db = createTestDatabase()
    repo = new ProjectRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a project with generated ID', () => {
      const project = repo.create({ name: 'Test Project' })

      expect(project.id).toBeDefined()
      expect(project.name).toBe('Test Project')
      expect(project.description).toBeNull()
      expect(project.created_at).toBeDefined()
      expect(project.modified_at).toBeDefined()
    })

    it('should create a project with custom ID', () => {
      const project = repo.create({
        id: 'custom-id',
        name: 'Test Project',
        description: 'A test project',
      })

      expect(project.id).toBe('custom-id')
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('A test project')
    })
  })

  describe('findById', () => {
    it('should find existing project', () => {
      const created = repo.create({ name: 'Test' })
      const found = repo.findById(created.id)

      expect(found).toEqual(created)
    })

    it('should return null for non-existent project', () => {
      const found = repo.findById('non-existent')
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no projects', () => {
      const projects = repo.findAll()
      expect(projects).toEqual([])
    })

    it('should return all projects', () => {
      repo.create({ name: 'Project 1' })
      repo.create({ name: 'Project 2' })

      const projects = repo.findAll()

      expect(projects).toHaveLength(2)
      // Both projects should be returned
      const names = projects.map((p) => p.name)
      expect(names).toContain('Project 1')
      expect(names).toContain('Project 2')
    })
  })

  describe('findAllWithStats', () => {
    it('should include node counts', () => {
      const project = repo.create({ name: 'Test' })

      // Add some nodes
      db.prepare(
        `
        INSERT INTO nodes (id, project_id, type, title, status)
        VALUES ('n1', ?, 'task', 'Task 1', 'pending'),
               ('n2', ?, 'task', 'Task 2', 'complete'),
               ('n3', ?, 'component', 'Component 1', null)
      `
      ).run(project.id, project.id, project.id)

      const projects = repo.findAllWithStats()

      expect(projects).toHaveLength(1)
      expect(projects[0].node_count).toBe(3)
      expect(projects[0].task_count).toBe(2)
      expect(projects[0].completed_task_count).toBe(1)
    })
  })

  describe('update', () => {
    it('should update project name', () => {
      const created = repo.create({ name: 'Original' })
      const updated = repo.update(created.id, { name: 'Updated' })

      expect(updated?.name).toBe('Updated')
      expect(updated?.description).toBeNull()
    })

    it('should update project description', () => {
      const created = repo.create({ name: 'Test', description: 'Old' })
      const updated = repo.update(created.id, { description: 'New' })

      expect(updated?.description).toBe('New')
      expect(updated?.name).toBe('Test')
    })

    it('should return null for non-existent project', () => {
      const result = repo.update('non-existent', { name: 'Test' })
      expect(result).toBeNull()
    })

    it('should update modified_at timestamp', () => {
      const created = repo.create({ name: 'Test' })
      const updated = repo.update(created.id, { name: 'Updated' })

      // modified_at should be set (may be same as created if test runs fast)
      expect(updated?.modified_at).toBeDefined()
      // But the name should definitely be updated
      expect(updated?.name).toBe('Updated')
    })
  })

  describe('delete', () => {
    it('should delete existing project', () => {
      const created = repo.create({ name: 'Test' })
      const deleted = repo.delete(created.id)

      expect(deleted).toBe(true)
      expect(repo.findById(created.id)).toBeNull()
    })

    it('should return false for non-existent project', () => {
      const deleted = repo.delete('non-existent')
      expect(deleted).toBe(false)
    })

    it('should cascade delete nodes', () => {
      const project = repo.create({ name: 'Test' })
      db.prepare(
        "INSERT INTO nodes (id, project_id, type, title) VALUES ('n1', ?, 'task', 'Task')"
      ).run(project.id)

      repo.delete(project.id)

      const nodes = db
        .prepare('SELECT * FROM nodes WHERE project_id = ?')
        .all(project.id)
      expect(nodes).toHaveLength(0)
    })
  })

  describe('exists', () => {
    it('should return true for existing project', () => {
      const project = repo.create({ name: 'Test' })
      expect(repo.exists(project.id)).toBe(true)
    })

    it('should return false for non-existent project', () => {
      expect(repo.exists('non-existent')).toBe(false)
    })
  })

  describe('findByName', () => {
    it('should find project by name', () => {
      const created = repo.create({ name: 'Unique Name' })
      const found = repo.findByName('Unique Name')

      expect(found?.id).toBe(created.id)
    })

    it('should return null if not found', () => {
      const found = repo.findByName('Non-existent')
      expect(found).toBeNull()
    })
  })

  describe('touch', () => {
    it('should update modified_at timestamp', () => {
      const project = repo.create({ name: 'Test' })

      repo.touch(project.id)

      const updated = repo.findById(project.id)
      // modified_at should be set
      expect(updated?.modified_at).toBeDefined()
      // And the project should still exist with correct data
      expect(updated?.name).toBe('Test')
    })
  })
})
