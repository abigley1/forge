/**
 * Tests for checklist parsing and serialization utilities
 */

import { describe, it, expect } from 'vitest'
import { parseChecklist, serializeChecklist } from './checklist'

describe('parseChecklist', () => {
  it('parses unchecked items', () => {
    const markdown = '- [ ] First item\n- [ ] Second item'
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('First item')
    expect(result[0].completed).toBe(false)
    expect(result[1].text).toBe('Second item')
    expect(result[1].completed).toBe(false)
  })

  it('parses checked items with lowercase x', () => {
    const markdown = '- [x] Completed item'
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Completed item')
    expect(result[0].completed).toBe(true)
  })

  it('parses checked items with uppercase X', () => {
    const markdown = '- [X] Completed item'
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(1)
    expect(result[0].completed).toBe(true)
  })

  it('parses mixed checked and unchecked items', () => {
    const markdown = '- [ ] Todo\n- [x] Done\n- [ ] Another todo'
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(3)
    expect(result[0].completed).toBe(false)
    expect(result[1].completed).toBe(true)
    expect(result[2].completed).toBe(false)
  })

  it('ignores non-checklist lines', () => {
    const markdown = `# Heading
Some text
- [ ] Actual item
- Regular list item
More text`
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Actual item')
  })

  it('handles empty input', () => {
    const result = parseChecklist('')
    expect(result).toHaveLength(0)
  })

  it('handles input with no checklist items', () => {
    const markdown = '# Just a heading\n\nSome text'
    const result = parseChecklist(markdown)
    expect(result).toHaveLength(0)
  })

  it('assigns unique IDs to items', () => {
    const markdown = '- [ ] Item 1\n- [ ] Item 2'
    const result = parseChecklist(markdown)

    expect(result[0].id).toBeDefined()
    expect(result[1].id).toBeDefined()
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('trims whitespace from lines', () => {
    const markdown = '  - [ ] Indented item  '
    const result = parseChecklist(markdown)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Indented item')
  })

  it('preserves item text with special characters', () => {
    const markdown = '- [ ] Item with [brackets] and (parens)'
    const result = parseChecklist(markdown)

    expect(result[0].text).toBe('Item with [brackets] and (parens)')
  })
})

describe('serializeChecklist', () => {
  it('serializes unchecked items', () => {
    const items = [
      { id: '1', text: 'First', completed: false },
      { id: '2', text: 'Second', completed: false },
    ]
    const result = serializeChecklist(items)

    expect(result).toBe('- [ ] First\n- [ ] Second')
  })

  it('serializes checked items', () => {
    const items = [{ id: '1', text: 'Done', completed: true }]
    const result = serializeChecklist(items)

    expect(result).toBe('- [x] Done')
  })

  it('serializes mixed items', () => {
    const items = [
      { id: '1', text: 'Todo', completed: false },
      { id: '2', text: 'Done', completed: true },
      { id: '3', text: 'Also todo', completed: false },
    ]
    const result = serializeChecklist(items)

    expect(result).toBe('- [ ] Todo\n- [x] Done\n- [ ] Also todo')
  })

  it('handles empty array', () => {
    const result = serializeChecklist([])
    expect(result).toBe('')
  })

  it('preserves item order', () => {
    const items = [
      { id: '3', text: 'Third', completed: false },
      { id: '1', text: 'First', completed: true },
      { id: '2', text: 'Second', completed: false },
    ]
    const result = serializeChecklist(items)

    expect(result).toBe('- [ ] Third\n- [x] First\n- [ ] Second')
  })
})

describe('round-trip parsing', () => {
  it('round-trips simple checklist', () => {
    const original = '- [ ] First\n- [x] Second\n- [ ] Third'
    const parsed = parseChecklist(original)
    const serialized = serializeChecklist(parsed)

    expect(serialized).toBe(original)
  })

  it('normalizes uppercase X to lowercase', () => {
    const original = '- [X] Done'
    const parsed = parseChecklist(original)
    const serialized = serializeChecklist(parsed)

    expect(serialized).toBe('- [x] Done')
  })
})
