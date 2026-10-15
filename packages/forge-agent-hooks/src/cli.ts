#!/usr/bin/env node
/**
 * forge-hook session-start|stop --client claude-code|codex
 *
 * Reads the hook JSON on stdin and writes the hook response on stdout.
 * Env: FORGE_API_URL (required), FORGE_HOOK_STATE_DIR (default ~/.forge/hook-state)
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { sessionStart, stop, type HookInput, type HookDeps } from './hooks.js'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2)
  const clientArg = process.argv[process.argv.indexOf('--client') + 1]
  const apiUrl = process.env.FORGE_API_URL
  const isStop = command === 'stop'

  try {
    if (!apiUrl || (command !== 'session-start' && !isStop))
      throw new Error('misconfigured')
    const input = JSON.parse(await readStdin()) as HookInput
    if (typeof input.session_id !== 'string' || typeof input.cwd !== 'string')
      throw new Error('bad input')

    const deps: HookDeps = {
      apiUrl,
      client: clientArg === 'codex' ? 'codex' : 'claude-code',
      stateDir:
        process.env.FORGE_HOOK_STATE_DIR ??
        join(homedir(), '.forge', 'hook-state'),
    }

    if (isStop) {
      process.stdout.write(JSON.stringify(await stop(input, deps)))
    } else {
      const text = await sessionStart(input, deps)
      if (text) process.stdout.write(text)
    }
  } catch {
    // Fail open: never disturb the agent session.
    if (isStop) process.stdout.write('{}')
  }
  process.exit(0)
}

void main()
