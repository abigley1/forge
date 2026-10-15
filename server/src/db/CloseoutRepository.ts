/**
 * Closeout Repository
 *
 * Session closeouts: one evidence-backed record per agent session per project.
 * Upserts on (project_id, session_id) so repeated closeouts never duplicate.
 */

import { randomUUID } from 'node:crypto'
import type { DatabaseInstance } from './index.js'
import type { SessionCloseoutRow } from './schema.js'

export const EVIDENCE_KINDS = [
  'commit',
  'file',
  'test',
  'url',
  'user_report',
  'observation',
] as const
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number]
export const CLOSEOUT_CLIENTS = ['claude-code', 'codex', 'other'] as const
export type CloseoutClient = (typeof CLOSEOUT_CLIENTS)[number]

export interface CloseoutEvidence {
  kind: EvidenceKind
  ref: string
  note?: string
}

export interface Closeout {
  id: string
  project_id: string
  session_id: string
  client: CloseoutClient
  workspace_path: string | null
  summary: string
  next_action: string | null
  evidence: CloseoutEvidence[]
  uncertain: string[]
  created_at: string
  updated_at: string
}

export interface UpsertCloseoutInput {
  project_id: string
  session_id: string
  client: CloseoutClient
  workspace_path: string | null
  summary: string
  next_action: string | null
  evidence: CloseoutEvidence[]
  uncertain: string[]
}

function toCloseout(row: SessionCloseoutRow): Closeout {
  return {
    ...row,
    client: row.client as CloseoutClient,
    evidence: JSON.parse(row.evidence) as CloseoutEvidence[],
    uncertain: JSON.parse(row.uncertain) as string[],
  }
}

export class CloseoutRepository {
  constructor(private db: DatabaseInstance) {}

  upsert(input: UpsertCloseoutInput): Closeout {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO session_closeouts
           (id, project_id, session_id, client, workspace_path, summary, next_action, evidence, uncertain, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, session_id) DO UPDATE SET
           client = excluded.client,
           workspace_path = excluded.workspace_path,
           summary = excluded.summary,
           next_action = excluded.next_action,
           evidence = excluded.evidence,
           uncertain = excluded.uncertain,
           updated_at = excluded.updated_at`
      )
      .run(
        randomUUID(),
        input.project_id,
        input.session_id,
        input.client,
        input.workspace_path,
        input.summary,
        input.next_action,
        JSON.stringify(input.evidence),
        JSON.stringify(input.uncertain),
        now,
        now
      )
    return this.findBySession(input.project_id, input.session_id)!
  }

  findBySession(projectId: string, sessionId: string): Closeout | null {
    const row = this.db
      .prepare(
        'SELECT * FROM session_closeouts WHERE project_id = ? AND session_id = ?'
      )
      .get(projectId, sessionId) as SessionCloseoutRow | undefined
    return row ? toCloseout(row) : null
  }

  listRecent(projectId: string, limit: number): Closeout[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM session_closeouts WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?'
      )
      .all(projectId, limit) as SessionCloseoutRow[]
    return rows.map(toCloseout)
  }
}
