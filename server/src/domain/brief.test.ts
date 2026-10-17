import { describe, it, expect } from 'vitest'
import { buildBrief, type BriefInput, type BriefNode } from './brief.js'

const now = new Date('2026-10-20T12:00:00Z')
const node = (
  n: Partial<BriefNode> & Pick<BriefNode, 'id' | 'type' | 'title'>
): BriefNode => ({
  status: null,
  priority: null,
  modified_at: '2026-10-19T00:00:00Z',
  depends_on: [],
  part_number: null,
  ...n,
})

const input: BriefInput = {
  now,
  project: {
    id: 'p1',
    name: 'Desk risers',
    description: 'Motorized desk riser with two NEMA17s',
    modified_at: '2026-10-19T00:00:00Z',
  },
  nodes: [
    node({
      id: 'dec',
      type: 'decision',
      title: 'Lead screw pitch',
      status: 'pending',
    }),
    node({
      id: 't1',
      type: 'task',
      title: 'Print motor brackets',
      status: 'in_progress',
      priority: 'high',
    }),
    node({
      id: 't2',
      type: 'task',
      title: 'Wire drivers',
      status: 'pending',
      depends_on: ['dec'],
    }),
    node({
      id: 't3',
      type: 'task',
      title: 'Order screws',
      status: 'pending',
      priority: 'low',
    }),
    node({
      id: 't4',
      type: 'task',
      title: 'Old task',
      status: 'complete',
      modified_at: '2026-08-01T00:00:00Z',
    }),
    node({
      id: 'c1',
      type: 'component',
      title: 'NEMA17',
      status: 'selected',
      part_number: '17HS4401',
    }),
    node({
      id: 'c2',
      type: 'component',
      title: 'TMC2209',
      status: 'selected',
      part_number: 'TMC2209-LA',
    }),
  ],
  closeouts: [
    {
      session_id: 's1',
      client: 'codex',
      summary: 'Redesigned bracket v3',
      next_action: 'Print v3',
      uncertain: ['Clearance untested'],
      updated_at: '2026-10-19T10:00:00Z',
    },
  ],
  inventory: [
    {
      id: 'i1',
      name: 'Stepper motor',
      part_number: '17hs4401',
      quantity: 2,
      location: 'Bin A3',
      status: 'owned',
    },
  ],
}

describe('buildBrief', () => {
  const brief = buildBrief(input)

  it('orders next actions: in progress first, then priority, excluding blocked and complete', () => {
    expect(brief.next_actions.map((i) => i.id)).toEqual(['t1', 't3'])
  })

  it('lists blocked tasks with what they wait on', () => {
    expect(brief.blocked).toEqual([
      expect.objectContaining({ id: 't2', blocked_by: ['Lead screw pitch'] }),
    ])
  })

  it('lists open decisions and recent changes only within 14 days', () => {
    expect(brief.open_decisions.map((i) => i.id)).toEqual(['dec'])
    expect(brief.recent_changes.map((i) => i.id)).not.toContain('t4')
  })

  it('matches components to owned inventory case-insensitively and lists the rest as missing', () => {
    expect(brief.parts.owned).toEqual([
      {
        title: 'NEMA17',
        part_number: '17HS4401',
        quantity: 2,
        location: 'Bin A3',
      },
    ])
    expect(brief.parts.missing).toEqual([
      { title: 'TMC2209', part_number: 'TMC2209-LA', inventory_status: null },
    ])
  })

  it('renders markdown with project id, goal, last session, and uncertainty', () => {
    expect(brief.markdown).toContain('# Forge brief: Desk risers')
    expect(brief.markdown).toContain('Project ID: p1')
    expect(brief.markdown).toContain('Motorized desk riser')
    expect(brief.markdown).toContain('Redesigned bracket v3')
    expect(brief.markdown).toContain('Unverified: Clearance untested')
    expect(brief.truncated).toBe(false)
  })

  it('caps markdown at the limit and flags truncation', () => {
    const small = buildBrief(input, { markdownLimit: 300 })
    expect(small.markdown.length).toBeLessThanOrEqual(300)
    expect(small.truncated).toBe(true)
    expect(small.markdown).toContain('# Forge brief: Desk risers')
  })

  it('handles a project with no goal and no data', () => {
    const empty = buildBrief({
      ...input,
      project: { ...input.project, description: null },
      nodes: [],
      closeouts: [],
      inventory: [],
    })
    expect(empty.markdown).toContain('no goal recorded')
    expect(empty.next_actions).toEqual([])
  })
})

describe('buildBrief with verbose closeouts', () => {
  it('clips long next_action/uncertain and keeps later sections', () => {
    const long = 'x'.repeat(2500)
    const brief = buildBrief({
      ...input,
      closeouts: [
        {
          session_id: 'a',
          client: 'codex',
          summary: 'Long one',
          next_action: long,
          uncertain: [long, long, long, long, long, long, long],
          updated_at: '2026-10-19T10:00:00Z',
        },
        {
          session_id: 'b',
          client: 'codex',
          summary: 'Another',
          next_action: long,
          uncertain: [long],
          updated_at: '2026-10-18T10:00:00Z',
        },
      ],
    })
    expect(brief.markdown.length).toBeLessThanOrEqual(6000)
    expect(brief.markdown).toContain('## Next actions')
    expect(brief.markdown).toContain('## Open decisions')
  })
})
