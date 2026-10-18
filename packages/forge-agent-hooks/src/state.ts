/**
 * Per-session hook state, kept outside the workspace.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SessionState {
  projectId: string | null
  /** Fingerprint at the last point we considered the workspace "recorded". */
  baseline: string
}

const file = (dir: string, sessionId: string) =>
  join(dir, `${sessionId.replace(/[^\w.-]/g, '_')}.json`)

export function readState(dir: string, sessionId: string): SessionState | null {
  try {
    return JSON.parse(
      readFileSync(file(dir, sessionId), 'utf8')
    ) as SessionState
  } catch {
    return null
  }
}

export function writeState(
  dir: string,
  sessionId: string,
  state: SessionState
): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(file(dir, sessionId), JSON.stringify(state), { mode: 0o600 })
}
