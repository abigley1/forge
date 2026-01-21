/**
 * Checklist parsing and serialization utilities
 */

import type { ChecklistItem } from '@/types'

/**
 * Parse markdown checklist syntax to ChecklistItem array
 *
 * Supports:
 * - [ ] Unchecked item
 * - [x] Checked item
 * - [X] Checked item (uppercase X)
 */
export function parseChecklist(markdown: string): ChecklistItem[] {
  const lines = markdown.split('\n')
  const items: ChecklistItem[] = []

  const checklistRegex = /^- \[([ xX])\] (.+)$/

  for (const line of lines) {
    const match = line.trim().match(checklistRegex)
    if (match) {
      const completed = match[1].toLowerCase() === 'x'
      const text = match[2]
      items.push({
        id: crypto.randomUUID(),
        text,
        completed,
      })
    }
  }

  return items
}

/**
 * Serialize ChecklistItem array to markdown checklist syntax
 */
export function serializeChecklist(items: ChecklistItem[]): string {
  return items
    .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
    .join('\n')
}
