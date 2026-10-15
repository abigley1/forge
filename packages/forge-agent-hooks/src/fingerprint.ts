/**
 * Cheap "did this workspace change?" signal. Git repos: HEAD + porcelain status.
 * Anything else (e.g. dated Codex task folders): newest mtime under cwd.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, statSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

const SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  '.venv',
  '__pycache__',
  '.next',
])
const MAX_ENTRIES = 5000
const MAX_DEPTH = 4

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 1500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export function gitRemote(cwd: string): string | undefined {
  return git(cwd, ['remote', 'get-url', 'origin']) ?? undefined
}

function newestMtime(root: string): number {
  let newest = 0
  let seen = 0
  const walk = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH || seen > MAX_ENTRIES) return
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (++seen > MAX_ENTRIES) return
      if (SKIP.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, depth + 1)
      else if (entry.isFile()) {
        try {
          newest = Math.max(newest, statSync(full).mtimeMs)
        } catch {
          // file vanished mid-walk
        }
      }
    }
  }
  walk(root, 0)
  return newest
}

export function workspaceFingerprint(cwd: string): string {
  const head = git(cwd, ['rev-parse', 'HEAD'])
  const raw =
    head !== null
      ? `git:${head}:${git(cwd, ['status', '--porcelain']) ?? ''}`
      : `mtime:${newestMtime(cwd)}`
  return createHash('sha1').update(raw).digest('hex')
}
