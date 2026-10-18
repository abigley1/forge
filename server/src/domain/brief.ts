/**
 * Builds the compact, source-linked project brief agents receive at session
 * start. Pure and dependency-free (beyond nodeRules) so it is easy to test.
 */

import { isDependencyResolved, type ForgeNodeType } from './nodeRules.js'

export const BRIEF_MARKDOWN_LIMIT = 6000
const RECENT_DAYS = 14
const TITLE_MAX = 120
const SUMMARY_MAX = 600
const NEXT_ACTION_MAX = 300
const UNCERTAIN_ITEM_MAX = 200
const UNCERTAIN_ITEMS = 5

export interface BriefNode {
  id: string
  type: ForgeNodeType
  title: string
  status: string | null
  priority: string | null
  modified_at: string
  depends_on: string[]
  part_number: string | null
}

export interface BriefCloseout {
  session_id: string
  client: string
  summary: string
  next_action: string | null
  uncertain: string[]
  updated_at: string
}

export interface BriefInventoryItem {
  id: string
  name: string
  part_number: string
  quantity: number
  location: string | null
  status: 'owned' | 'wishlist' | 'on_order'
}

export interface BriefInput {
  now: Date
  project: {
    id: string
    name: string
    description: string | null
    modified_at: string
  }
  nodes: BriefNode[]
  closeouts: BriefCloseout[]
  inventory: BriefInventoryItem[]
}

export interface BriefItem {
  id: string
  type: ForgeNodeType
  title: string
  status: string | null
  priority: string | null
}

export interface Brief {
  project_id: string
  project_name: string
  goal: string | null
  generated_at: string
  last_sessions: BriefCloseout[]
  next_actions: BriefItem[]
  blocked: Array<BriefItem & { blocked_by: string[] }>
  open_decisions: BriefItem[]
  recent_changes: BriefItem[]
  parts: {
    owned: Array<{
      title: string
      part_number: string
      quantity: number
      location: string | null
    }>
    missing: Array<{
      title: string
      part_number: string
      inventory_status: 'wishlist' | 'on_order' | null
    }>
  }
  markdown: string
  truncated: boolean
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
const clip = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s
const item = (n: BriefNode): BriefItem => ({
  id: n.id,
  type: n.type,
  title: clip(n.title, TITLE_MAX),
  status: n.status,
  priority: n.priority,
})

export function buildBrief(
  input: BriefInput,
  options: { markdownLimit?: number } = {}
): Brief {
  const limit = options.markdownLimit ?? BRIEF_MARKDOWN_LIMIT
  const byId = new Map(input.nodes.map((n) => [n.id, n]))
  const unresolvedDeps = (n: BriefNode) =>
    n.depends_on
      .map((id) => byId.get(id))
      .filter(
        (d): d is BriefNode =>
          d !== undefined && !isDependencyResolved(d.type, d.status)
      )

  const openTasks = input.nodes.filter(
    (n) => n.type === 'task' && n.status !== 'complete'
  )

  const next_actions = openTasks
    .filter(
      (n) =>
        (n.status ?? 'pending') !== 'blocked' && unresolvedDeps(n).length === 0
    )
    .sort(
      (a, b) =>
        Number(b.status === 'in_progress') -
          Number(a.status === 'in_progress') ||
        (PRIORITY_RANK[a.priority ?? ''] ?? 3) -
          (PRIORITY_RANK[b.priority ?? ''] ?? 3) ||
        b.modified_at.localeCompare(a.modified_at)
    )
    .slice(0, 5)
    .map(item)

  const blocked = openTasks
    .map((n) => ({ n, deps: unresolvedDeps(n) }))
    .filter(({ n, deps }) => deps.length > 0 || n.status === 'blocked')
    .slice(0, 5)
    .map(({ n, deps }) => ({
      ...item(n),
      blocked_by: deps.map((d) => clip(d.title, TITLE_MAX)),
    }))

  const open_decisions = input.nodes
    .filter(
      (n) => n.type === 'decision' && (n.status ?? 'pending') === 'pending'
    )
    .slice(0, 5)
    .map(item)

  const cutoff = new Date(
    input.now.getTime() - RECENT_DAYS * 86_400_000
  ).toISOString()
  const recent_changes = input.nodes
    .filter((n) => n.modified_at >= cutoff)
    .sort((a, b) => b.modified_at.localeCompare(a.modified_at))
    .slice(0, 8)
    .map(item)

  const inventoryByPart = new Map<string, BriefInventoryItem[]>()
  for (const inv of input.inventory) {
    const key = inv.part_number.toLowerCase()
    inventoryByPart.set(key, [...(inventoryByPart.get(key) ?? []), inv])
  }
  const owned: Brief['parts']['owned'] = []
  const missing: Brief['parts']['missing'] = []
  for (const c of input.nodes) {
    if (c.type !== 'component' || !c.part_number || c.status === 'rejected')
      continue
    const matches = inventoryByPart.get(c.part_number.toLowerCase()) ?? []
    const have = matches.find((m) => m.status === 'owned' && m.quantity > 0)
    if (have) {
      owned.push({
        title: clip(c.title, TITLE_MAX),
        part_number: c.part_number,
        quantity: have.quantity,
        location: have.location,
      })
    } else {
      const pending = matches.find((m) => m.status !== 'owned')
      missing.push({
        title: clip(c.title, TITLE_MAX),
        part_number: c.part_number,
        inventory_status: pending
          ? (pending.status as 'wishlist' | 'on_order')
          : null,
      })
    }
  }

  const last_sessions = input.closeouts.slice(0, 2).map((c) => ({
    ...c,
    summary: clip(c.summary, SUMMARY_MAX),
    next_action: c.next_action ? clip(c.next_action, NEXT_ACTION_MAX) : null,
    uncertain: c.uncertain
      .slice(0, UNCERTAIN_ITEMS)
      .map((u) => clip(u, UNCERTAIN_ITEM_MAX)),
  }))
  const goal = input.project.description?.trim() || null

  const header = [
    `# Forge brief: ${input.project.name}`,
    `Project ID: ${input.project.id} · generated ${input.now.toISOString()}`,
    `Goal: ${goal ?? '(no goal recorded; ask the user and update the project description)'}`,
  ].join('\n')

  const section = (title: string, lines: string[]) =>
    lines.length ? `## ${title}\n${lines.join('\n')}` : ''
  const sections = [
    section(
      'Last sessions',
      last_sessions.map(
        (c) =>
          `- ${c.updated_at.slice(0, 10)} (${c.client}): ${c.summary}` +
          (c.next_action ? ` Next: ${c.next_action}` : '') +
          (c.uncertain.length ? ` Unverified: ${c.uncertain.join('; ')}` : '')
      )
    ),
    section(
      'Next actions',
      next_actions.map(
        (i) =>
          `- [${i.status ?? 'pending'}] ${i.title}${i.priority ? ` (${i.priority})` : ''} \`${i.id}\``
      )
    ),
    section(
      'Blocked',
      blocked.map(
        (i) =>
          `- ${i.title}: waiting on ${i.blocked_by.join(', ') || 'marked blocked'} \`${i.id}\``
      )
    ),
    section(
      'Open decisions',
      open_decisions.map((i) => `- ${i.title} \`${i.id}\``)
    ),
    section('Parts', [
      ...owned.map(
        (p) =>
          `- Owned: ${p.title} (${p.part_number}) ×${p.quantity} @ ${p.location ?? 'location unknown'}`
      ),
      ...missing.map(
        (p) =>
          `- Missing: ${p.title} (${p.part_number}): ${p.inventory_status?.replace('_', ' ') ?? 'not in inventory'}`
      ),
    ]),
    section(
      `Recent changes (${RECENT_DAYS} days)`,
      recent_changes.map((i) => `- ${i.type}: ${i.title} \`${i.id}\``)
    ),
  ].filter(Boolean)

  const footer = '\n\n_Brief truncated; use search_nodes/get_node for more._'
  let markdown = header.length > limit ? header.slice(0, limit) : header
  let truncated = header.length > limit
  for (const s of sections) {
    const candidate = `${markdown}\n\n${s}`
    if (candidate.length + footer.length > limit) {
      // Skip this section but keep trying smaller later ones.
      truncated = true
      continue
    }
    markdown = candidate
  }
  if (truncated && markdown.length + footer.length <= limit) markdown += footer

  return {
    project_id: input.project.id,
    project_name: input.project.name,
    goal,
    generated_at: input.now.toISOString(),
    last_sessions,
    next_actions,
    blocked,
    open_decisions,
    recent_changes,
    parts: { owned: owned.slice(0, 10), missing: missing.slice(0, 10) },
    markdown,
    truncated,
  }
}
