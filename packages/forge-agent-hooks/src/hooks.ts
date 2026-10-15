/**
 * SessionStart / Stop hook logic shared by Claude Code and Codex.
 * Both clients add SessionStart stdout to context and accept
 * {"decision":"block","reason":...} from Stop to continue the turn.
 */

import { forgeFetch, type ResolveResult } from './forge.js'
import { gitRemote, workspaceFingerprint } from './fingerprint.js'
import { readState, writeState } from './state.js'

export interface HookInput {
  session_id: string
  cwd: string
  stop_hook_active?: boolean
  source?: string
}

export interface HookDeps {
  apiUrl: string
  client: 'claude-code' | 'codex'
  stateDir: string
  timeoutMs?: number
}

export type StopOutput =
  | Record<string, never>
  | { decision: 'block'; reason: string }

const DEFAULT_TIMEOUT = 2500

async function resolve(
  input: HookInput,
  deps: HookDeps
): Promise<ResolveResult | null> {
  return forgeFetch<ResolveResult>(deps.apiUrl, '/workspaces/resolve', {
    method: 'POST',
    body: { cwd: input.cwd, git_remote: gitRemote(input.cwd) },
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT,
  })
}

export async function sessionStart(
  input: HookInput,
  deps: HookDeps
): Promise<string> {
  try {
    const resolved = await resolve(input, deps)
    if (!resolved) return ''

    writeState(deps.stateDir, input.session_id, {
      projectId: resolved.project?.id ?? null,
      baseline: workspaceFingerprint(input.cwd),
    })

    if (!resolved.project) {
      if (resolved.candidates.length === 0) return ''
      const list = resolved.candidates
        .map((p) => `- ${p.name} (project_id="${p.id}")`)
        .join('\n')
      return [
        'Forge: this folder is not linked to a Forge project.',
        "If the user's task clearly belongs to one of these, call the Forge `link_workspace` tool with that project_id and",
        `path="${input.cwd}", then \`get_brief\`. Otherwise ignore this.`,
        list,
      ].join('\n')
    }

    const brief = await forgeFetch<{ markdown: string }>(
      deps.apiUrl,
      `/projects/${encodeURIComponent(resolved.project.id)}/brief`,
      { timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT }
    )
    if (!brief) return ''
    return [
      brief.markdown,
      '',
      `Forge session: project_id="${resolved.project.id}" session_id="${input.session_id}" client="${deps.client}".`,
      'Use this brief instead of asking the user to re-explain the project. Pass project_id on every Forge tool call.',
    ].join('\n')
  } catch {
    return ''
  }
}

export async function stop(
  input: HookInput,
  deps: HookDeps
): Promise<StopOutput> {
  try {
    if (input.stop_hook_active) return {}
    const state = readState(deps.stateDir, input.session_id)
    if (!state) return {}

    let projectId = state.projectId
    if (!projectId) {
      const resolved = await resolve(input, deps)
      projectId = resolved?.project?.id ?? null
      if (!projectId) return {}
    }

    const current = workspaceFingerprint(input.cwd)
    if (current === state.baseline) return {}

    writeState(deps.stateDir, input.session_id, {
      projectId,
      baseline: current,
    })
    return {
      decision: 'block',
      reason: [
        'Forge: files in this workspace changed this session. Call the Forge `record_closeout` tool with',
        `project_id="${projectId}", session_id="${input.session_id}", client="${deps.client}", workspace_path="${input.cwd}",`,
        'a 1-4 sentence summary, the single best next_action, evidence for claims (commits, files, tests, user reports),',
        'and uncertain items (anything not physically or independently verified).',
        'If you already recorded one this session, call it again with the same session_id to update it. Then finish your reply.',
      ].join(' '),
    }
  } catch {
    return {}
  }
}
