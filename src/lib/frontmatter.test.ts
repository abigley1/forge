/**
 * Tests for YAML Frontmatter Parsing & Serialization
 */

import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  parseMarkdownBody,
  serializeFrontmatter,
  serializeFrontmatterData,
  extractWikiLinks,
  parseMarkdownFile,
} from './frontmatter'

// ============================================================================
// Sample Node Content for Testing
// ============================================================================

const SAMPLE_DECISION_NODE = `---
type: decision
status: pending
tags: [motor, electronics]
created: 2024-01-15
modified: 2024-01-20
---

# Motor Selection

Comparing different motor options for the gripper actuator.

See also: [[gripper-assembly]] and [[power-requirements]]

## Options

1. NEMA 17 Stepper
2. 12V DC Gearmotor
3. Servo Motor
`

const SAMPLE_COMPONENT_NODE = `---
type: component
status: selected
cost: 45.99
supplier: Pololu
partNumber: 2267
tags: [motor, actuator]
---

# 12V DC Gearmotor

Selected motor for the gripper.

Links to [[motor-selection]] decision.

## Specs

- Voltage: 12V
- Torque: 5 Nm
`

const SAMPLE_TASK_NODE = `---
type: task
status: in_progress
priority: high
depends_on: [motor-selection, power-requirements]
blocks: [final-assembly]
tags: [electronics, assembly]
---

# Wire Motor Controller

Connect the motor controller to the power supply and motor.

Depends on [[motor-selection]] and [[power-requirements]].

## Checklist

- [x] Identify wire gauge
- [ ] Cut wires to length
- [ ] Solder connections
`

const SAMPLE_NOTE_NODE = `---
type: note
tags: [research, reference]
---

# Motor Research Notes

General notes about motor options.

References [[motor-selection]] and [[12v-dc-gearmotor]].
`

// ============================================================================
// parseFrontmatter Tests
// ============================================================================

describe('parseFrontmatter', () => {
  describe('basic parsing', () => {
    it('parses frontmatter data and content', () => {
      const input = `---
type: task
status: pending
---

# My Task

Task content here.
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        type: 'task',
        status: 'pending',
      })
      expect(result.content.trim()).toContain('# My Task')
      expect(result.content).toContain('Task content here.')
    })

    it('parses arrays in frontmatter', () => {
      const input = `---
tags: [electronics, motor]
depends_on:
  - task-1
  - task-2
---

Content
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data.tags).toEqual(['electronics', 'motor'])
      expect(result.data.depends_on).toEqual(['task-1', 'task-2'])
    })

    it('parses numeric values', () => {
      const input = `---
cost: 45.99
quantity: 10
---

Content
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data.cost).toBe(45.99)
      expect(result.data.quantity).toBe(10)
    })

    it('parses boolean values', () => {
      const input = `---
completed: true
optional: false
---

Content
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data.completed).toBe(true)
      expect(result.data.optional).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles empty file', () => {
      const result = parseFrontmatter('')

      expect(result.error).toBeNull()
      expect(result.data).toEqual({})
      expect(result.content).toBe('')
    })

    it('handles whitespace-only file', () => {
      const result = parseFrontmatter('   \n\n  \t  ')

      expect(result.error).toBeNull()
      expect(result.data).toEqual({})
      expect(result.content).toBe('')
    })

    it('handles file with no frontmatter', () => {
      const input = `# Just a Heading

Some content without frontmatter.
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data).toEqual({})
      expect(result.content).toContain('# Just a Heading')
    })

    it('handles malformed YAML with error', () => {
      const input = `---
type: task
status: [incomplete: yaml
---

Content
`
      const result = parseFrontmatter(input)

      expect(result.error).not.toBeNull()
      expect(result.data).toEqual({})
      expect(result.content).toBe(input) // Returns original content on error
    })

    it('handles frontmatter with only delimiters', () => {
      const input = `---
---

Content after empty frontmatter.
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data).toEqual({})
      expect(result.content.trim()).toBe('Content after empty frontmatter.')
    })

    it('handles null values', () => {
      const input = `---
selected: null
supplier: ~
---

Content
`
      const result = parseFrontmatter(input)

      expect(result.error).toBeNull()
      expect(result.data.selected).toBeNull()
      expect(result.data.supplier).toBeNull()
    })
  })

  describe('all node types', () => {
    it('parses decision node', () => {
      const result = parseFrontmatter(SAMPLE_DECISION_NODE)

      expect(result.error).toBeNull()
      expect(result.data.type).toBe('decision')
      expect(result.data.status).toBe('pending')
      expect(result.data.tags).toEqual(['motor', 'electronics'])
    })

    it('parses component node', () => {
      const result = parseFrontmatter(SAMPLE_COMPONENT_NODE)

      expect(result.error).toBeNull()
      expect(result.data.type).toBe('component')
      expect(result.data.status).toBe('selected')
      expect(result.data.cost).toBe(45.99)
      expect(result.data.supplier).toBe('Pololu')
      expect(result.data.partNumber).toBe(2267)
    })

    it('parses task node', () => {
      const result = parseFrontmatter(SAMPLE_TASK_NODE)

      expect(result.error).toBeNull()
      expect(result.data.type).toBe('task')
      expect(result.data.status).toBe('in_progress')
      expect(result.data.priority).toBe('high')
      expect(result.data.depends_on).toEqual([
        'motor-selection',
        'power-requirements',
      ])
      expect(result.data.blocks).toEqual(['final-assembly'])
    })

    it('parses note node', () => {
      const result = parseFrontmatter(SAMPLE_NOTE_NODE)

      expect(result.error).toBeNull()
      expect(result.data.type).toBe('note')
      expect(result.data.tags).toEqual(['research', 'reference'])
    })
  })
})

// ============================================================================
// parseMarkdownBody Tests
// ============================================================================

describe('parseMarkdownBody', () => {
  it('extracts title from first # heading', () => {
    const content = `
# My Great Title

This is the body content.
`
    const result = parseMarkdownBody(content)

    expect(result.title).toBe('My Great Title')
    expect(result.body).toBe('This is the body content.')
  })

  it('ignores ## headings for title', () => {
    const content = `
## Not the Title

This is body content.

# The Real Title

More content.
`
    const result = parseMarkdownBody(content)

    expect(result.title).toBe('The Real Title')
  })

  it('returns null title for content without # heading', () => {
    const content = `
## Only H2 Here

Some content without H1.
`
    const result = parseMarkdownBody(content)

    expect(result.title).toBeNull()
    expect(result.body).toContain('## Only H2 Here')
  })

  it('handles empty content', () => {
    const result = parseMarkdownBody('')

    expect(result.title).toBeNull()
    expect(result.body).toBe('')
  })

  it('handles whitespace-only content', () => {
    const result = parseMarkdownBody('   \n\n  ')

    expect(result.title).toBeNull()
    expect(result.body).toBe('')
  })

  it('handles title at the beginning of content', () => {
    const content = `# First Line Title
Body starts here.
`
    const result = parseMarkdownBody(content)

    expect(result.title).toBe('First Line Title')
    expect(result.body).toBe('Body starts here.')
  })

  it('trims whitespace from title', () => {
    const content = `#    Spaced Title

Content.
`
    const result = parseMarkdownBody(content)

    expect(result.title).toBe('Spaced Title')
  })
})

// ============================================================================
// serializeFrontmatter Tests
// ============================================================================

describe('serializeFrontmatterData', () => {
  it('preserves field ordering (type first, then status)', () => {
    const data = {
      tags: ['a', 'b'],
      status: 'pending',
      type: 'task',
      customField: 'value',
    }

    const result = serializeFrontmatterData(data)
    const lines = result.split('\n')

    // type should come first
    expect(lines[0]).toMatch(/^type:/)
    // status should come second
    expect(lines[1]).toMatch(/^status:/)
  })

  it('formats string values correctly', () => {
    const data = { type: 'task', name: 'simple' }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('type: task')
    expect(result).toContain('name: simple')
  })

  it('quotes strings with special characters', () => {
    const data = { description: 'Has: colon', note: 'Has # hash' }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('description: "Has: colon"')
    expect(result).toContain('note: "Has # hash"')
  })

  it('formats numeric values', () => {
    const data = { cost: 45.99, quantity: 10 }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('cost: 45.99')
    expect(result).toContain('quantity: 10')
  })

  it('formats boolean values', () => {
    const data = { completed: true, optional: false }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('completed: true')
    expect(result).toContain('optional: false')
  })

  it('formats arrays', () => {
    const data = { tags: ['a', 'b', 'c'] }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('tags: ["a", "b", "c"]')
  })

  it('formats empty arrays', () => {
    const data = { tags: [] }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('tags: []')
  })

  it('formats null values', () => {
    const data = { selected: null }
    const result = serializeFrontmatterData(data)

    expect(result).toContain('selected: null')
  })

  it('returns empty string for empty data', () => {
    const result = serializeFrontmatterData({})
    expect(result).toBe('')
  })
})

describe('serializeFrontmatter', () => {
  it('creates complete markdown file with frontmatter', () => {
    const data = { type: 'task', status: 'pending' }
    const content = '# My Task\n\nTask content here.'

    const result = serializeFrontmatter(data, content)

    expect(result).toContain('---')
    expect(result).toContain('type: task')
    expect(result).toContain('status: pending')
    expect(result).toContain('# My Task')
    expect(result).toContain('Task content here.')
  })

  it('returns just content if no frontmatter data', () => {
    const content = '# Just Content'
    const result = serializeFrontmatter({}, content)

    expect(result).toBe('# Just Content')
    expect(result).not.toContain('---')
  })
})

// ============================================================================
// Round-trip Tests
// ============================================================================

describe('round-trip parse/serialize', () => {
  it('preserves data through parse and serialize', () => {
    const originalData = {
      type: 'task',
      status: 'pending',
      priority: 'high',
      tags: ['electronics', 'motor'],
      cost: 45.99,
      completed: true,
    }

    // Serialize then parse
    const serialized = serializeFrontmatterData(originalData)
    const parsed = parseFrontmatter(`---\n${serialized}\n---\n\nContent`)

    expect(parsed.error).toBeNull()
    expect(parsed.data.type).toBe(originalData.type)
    expect(parsed.data.status).toBe(originalData.status)
    expect(parsed.data.priority).toBe(originalData.priority)
    expect(parsed.data.tags).toEqual(originalData.tags)
    expect(parsed.data.cost).toBe(originalData.cost)
    expect(parsed.data.completed).toBe(originalData.completed)
  })

  it('round-trips decision node frontmatter', () => {
    const { data } = parseFrontmatter(SAMPLE_DECISION_NODE)
    const serialized = serializeFrontmatterData(data)
    const reparsed = parseFrontmatter(`---\n${serialized}\n---\n\nContent`)

    expect(reparsed.data.type).toBe(data.type)
    expect(reparsed.data.status).toBe(data.status)
    expect(reparsed.data.tags).toEqual(data.tags)
  })

  it('round-trips component node frontmatter', () => {
    const { data } = parseFrontmatter(SAMPLE_COMPONENT_NODE)
    const serialized = serializeFrontmatterData(data)
    const reparsed = parseFrontmatter(`---\n${serialized}\n---\n\nContent`)

    expect(reparsed.data.type).toBe(data.type)
    expect(reparsed.data.cost).toBe(data.cost)
    expect(reparsed.data.supplier).toBe(data.supplier)
    expect(reparsed.data.partNumber).toBe(data.partNumber)
  })

  it('round-trips task node frontmatter', () => {
    const { data } = parseFrontmatter(SAMPLE_TASK_NODE)
    const serialized = serializeFrontmatterData(data)
    const reparsed = parseFrontmatter(`---\n${serialized}\n---\n\nContent`)

    expect(reparsed.data.type).toBe(data.type)
    expect(reparsed.data.priority).toBe(data.priority)
    expect(reparsed.data.depends_on).toEqual(data.depends_on)
    expect(reparsed.data.blocks).toEqual(data.blocks)
  })
})

// ============================================================================
// extractWikiLinks Tests
// ============================================================================

describe('extractWikiLinks', () => {
  it('extracts simple wiki-links', () => {
    const markdown = 'See [[motor-selection]] for details.'
    const links = extractWikiLinks(markdown)

    expect(links).toEqual(['motor-selection'])
  })

  it('extracts multiple wiki-links', () => {
    const markdown = `
Link to [[first-node]] and [[second-node]].
Also see [[third-node]].
`
    const links = extractWikiLinks(markdown)

    expect(links).toEqual(['first-node', 'second-node', 'third-node'])
  })

  it('returns unique links only', () => {
    const markdown = `
See [[motor]] and [[motor]] again.
Also [[motor]] one more time.
`
    const links = extractWikiLinks(markdown)

    expect(links).toEqual(['motor'])
  })

  it('ignores wiki-links in fenced code blocks', () => {
    const markdown = `
Normal [[real-link]] here.

\`\`\`javascript
const link = [[fake-link-in-code]]
\`\`\`

Another [[another-real-link]].
`
    const links = extractWikiLinks(markdown)

    expect(links).toContain('real-link')
    expect(links).toContain('another-real-link')
    expect(links).not.toContain('fake-link-in-code')
  })

  it('ignores wiki-links in inline code', () => {
    const markdown =
      'Real [[link]] but not `[[in-code]]` or this [[other-real]].'
    const links = extractWikiLinks(markdown)

    expect(links).toContain('link')
    expect(links).toContain('other-real')
    expect(links).not.toContain('in-code')
  })

  it('ignores wiki-links in indented code blocks', () => {
    const markdown = `
Normal [[link]] here.

    // This is indented code
    [[code-link]]

Back to [[normal]].
`
    const links = extractWikiLinks(markdown)

    expect(links).toContain('link')
    expect(links).toContain('normal')
    expect(links).not.toContain('code-link')
  })

  it('handles empty content', () => {
    expect(extractWikiLinks('')).toEqual([])
    expect(extractWikiLinks('   ')).toEqual([])
  })

  it('handles content without wiki-links', () => {
    const markdown = 'Just regular content without any links.'
    const links = extractWikiLinks(markdown)

    expect(links).toEqual([])
  })

  it('handles links with spaces', () => {
    const markdown = 'See [[ spaced link ]] here.'
    const links = extractWikiLinks(markdown)

    expect(links).toEqual(['spaced link'])
  })

  it('extracts links from sample nodes', () => {
    const decisionLinks = extractWikiLinks(
      parseFrontmatter(SAMPLE_DECISION_NODE).content
    )
    expect(decisionLinks).toContain('gripper-assembly')
    expect(decisionLinks).toContain('power-requirements')

    const componentLinks = extractWikiLinks(
      parseFrontmatter(SAMPLE_COMPONENT_NODE).content
    )
    expect(componentLinks).toContain('motor-selection')

    const taskLinks = extractWikiLinks(
      parseFrontmatter(SAMPLE_TASK_NODE).content
    )
    expect(taskLinks).toContain('motor-selection')
    expect(taskLinks).toContain('power-requirements')

    const noteLinks = extractWikiLinks(
      parseFrontmatter(SAMPLE_NOTE_NODE).content
    )
    expect(noteLinks).toContain('motor-selection')
    expect(noteLinks).toContain('12v-dc-gearmotor')
  })
})

// ============================================================================
// parseMarkdownFile Tests
// ============================================================================

describe('parseMarkdownFile', () => {
  it('parses complete markdown file', () => {
    const result = parseMarkdownFile(SAMPLE_TASK_NODE)

    expect(result.error).toBeNull()
    expect(result.frontmatter.type).toBe('task')
    expect(result.title).toBe('Wire Motor Controller')
    expect(result.wikiLinks).toContain('motor-selection')
    expect(result.wikiLinks).toContain('power-requirements')
    expect(result.body).toContain('Connect the motor controller')
  })

  it('handles file with no frontmatter', () => {
    const input = `# Simple Note

Just some content with [[a-link]].
`
    const result = parseMarkdownFile(input)

    expect(result.error).toBeNull()
    expect(result.frontmatter).toEqual({})
    expect(result.title).toBe('Simple Note')
    expect(result.wikiLinks).toEqual(['a-link'])
  })

  it('handles empty file', () => {
    const result = parseMarkdownFile('')

    expect(result.error).toBeNull()
    expect(result.frontmatter).toEqual({})
    expect(result.title).toBeNull()
    expect(result.body).toBe('')
    expect(result.wikiLinks).toEqual([])
  })
})
