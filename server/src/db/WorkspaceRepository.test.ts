import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDatabase, type DatabaseInstance } from './index.js'
import { ProjectRepository } from './ProjectRepository.js'
import {
  WorkspaceRepository,
  normalizeGitRemote,
  isPathWithin,
} from './WorkspaceRepository.js'

describe('WorkspaceRepository', () => {
  let db: DatabaseInstance
  let repo: WorkspaceRepository
  let forgeId: string
  let risersId: string

  beforeEach(() => {
    db = createTestDatabase()
    const projects = new ProjectRepository(db)
    forgeId = projects.create({ name: 'Forge' }).id
    risersId = projects.create({ name: 'Desk risers' }).id
    repo = new WorkspaceRepository(db)
  })

  it('normalizes ssh and https remotes to the same key', () => {
    expect(normalizeGitRemote('git@github.com:abigley1/forge.git')).toBe(
      'github.com/abigley1/forge'
    )
    expect(normalizeGitRemote('https://github.com/abigley1/Forge/')).toBe(
      'github.com/abigley1/forge'
    )
  })

  it('matches nested folders of a linked path', () => {
    repo.link(risersId, 'path', '/Users/a/deskrisers/')
    expect(repo.resolve('/Users/a/deskrisers/cad/brackets')?.project_id).toBe(
      risersId
    )
  })

  it('does not match sibling prefixes', () => {
    repo.link(risersId, 'path', '/Users/a/desk')
    expect(repo.resolve('/Users/a/deskrisers')).toBeNull()
    expect(isPathWithin('/Users/a/deskrisers', '/Users/a/desk')).toBe(false)
  })

  it('prefers the longest path match, then git remote', () => {
    repo.link(forgeId, 'path', '/Users/a/Projects')
    repo.link(risersId, 'path', '/Users/a/Projects/risers')
    repo.link(forgeId, 'git_remote', 'git@github.com:abigley1/forge.git')
    expect(repo.resolve('/Users/a/Projects/risers/x')?.project_id).toBe(
      risersId
    )
    expect(
      repo.resolve('/tmp/clone', 'https://github.com/abigley1/forge')
        ?.project_id
    ).toBe(forgeId)
  })

  it('relinking a value moves it to the new project', () => {
    repo.link(forgeId, 'path', '/Users/a/scratch')
    repo.link(risersId, 'path', '/Users/a/scratch')
    expect(repo.resolve('/Users/a/scratch')?.project_id).toBe(risersId)
    expect(repo.list()).toHaveLength(1)
  })
})
