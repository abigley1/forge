import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { workspaceFingerprint } from './fingerprint.js'

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, stdio: 'ignore' })

describe('workspaceFingerprint (git repos)', () => {
  it('changes when an already-dirty file is edited again', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-fp-git-'))
    git(dir, 'init', '-q')
    git(
      dir,
      '-c',
      'user.email=t@t',
      '-c',
      'user.name=t',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'init'
    )
    await fs.writeFile(path.join(dir, 'foo.ts'), 'a')
    git(dir, 'add', 'foo.ts')
    git(
      dir,
      '-c',
      'user.email=t@t',
      '-c',
      'user.name=t',
      'commit',
      '-q',
      '-m',
      'foo'
    )

    await fs.writeFile(path.join(dir, 'foo.ts'), 'b')
    const first = workspaceFingerprint(dir)
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(dir, 'foo.ts'), 'bb')
    expect(workspaceFingerprint(dir)).not.toBe(first)
  })

  it('changes when a file is added inside an untracked folder', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-fp-git-'))
    git(dir, 'init', '-q')
    git(
      dir,
      '-c',
      'user.email=t@t',
      '-c',
      'user.name=t',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'init'
    )
    await fs.mkdir(path.join(dir, 'cad'))
    await fs.writeFile(path.join(dir, 'cad', 'a.scad'), 'a')
    const first = workspaceFingerprint(dir)
    await new Promise((r) => setTimeout(r, 20))
    await fs.writeFile(path.join(dir, 'cad', 'b.scad'), 'b')
    expect(workspaceFingerprint(dir)).not.toBe(first)
  })

  it('is stable when nothing changes', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-fp-git-'))
    git(dir, 'init', '-q')
    await fs.writeFile(path.join(dir, 'x.txt'), 'x')
    expect(workspaceFingerprint(dir)).toBe(workspaceFingerprint(dir))
  })
})
