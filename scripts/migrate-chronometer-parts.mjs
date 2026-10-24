#!/usr/bin/env node
/**
 * One-off: turn the chronometer's component nodes into a project parts list.
 *
 *   FORGE_API_URL=<target api> [FORGE_SOURCE_API_URL=<api to read nodes from>] \
 *     node scripts/migrate-chronometer-parts.mjs [--nodes nodes.json] [--dry-run]
 *
 * Reads the project's component nodes (GET only; from FORGE_SOURCE_API_URL, which
 * defaults to FORGE_API_URL, or from a JSON array of nodes given with --nodes)
 * and writes them to /api/project-parts under the vault slug
 * `muzzle-brake-chronometer`, on FORGE_API_URL.
 *
 * Quantity comes from a "N units" line in the node's content (default 1). A part
 * is linked to an inventory item when the node's part number is the start of the
 * item's part number (OPA380 -> OPA380AIDGKT), or the item's part number appears
 * in the node title (BPW34). Anything else stays unlinked; link it by hand.
 * Idempotent: a part already on the list (same name) is left alone.
 */
import { readFile } from 'node:fs/promises'

const SOURCE_PROJECT = 'muzzle-break-chonometer' // Forge's own (misspelled) id
const SLUG = 'muzzle-brake-chronometer'
const target = (
  process.env.FORGE_API_URL || 'http://localhost:3000/api'
).replace(/\/$/, '')
const source = (process.env.FORGE_SOURCE_API_URL || target).replace(/\/$/, '')
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const nodesFile = argv.includes('--nodes')
  ? argv[argv.indexOf('--nodes') + 1]
  : null

async function api(base, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok || result.success === false)
    throw new Error(
      `${method} ${base}${path}: ${result.error || response.status}`
    )
  return result.data
}

export function quantityFrom(content) {
  const match = /(\d+)\s*(?:units?|pcs)\b/i.exec(content ?? '')
  return match ? Number(match[1]) : 1
}

export function matchItem(node, items) {
  const wanted = (node.part_number ?? '').toLowerCase()
  const title = node.title.toLowerCase()
  return items.find((item) => {
    const have = (item.part_number ?? '').toLowerCase()
    if (have.length < 4) return false
    return (
      (wanted.length >= 4 && have.startsWith(wanted)) || title.includes(have)
    )
  })
}

const nodes = nodesFile
  ? JSON.parse(await readFile(nodesFile, 'utf8'))
  : await api(source, 'GET', `/projects/${SOURCE_PROJECT}/nodes?type=component`)
const components = nodes.filter((n) => n.type === 'component')
const items = await api(target, 'GET', '/inventory')
const existing = new Set(
  (await api(target, 'GET', `/project-parts?project=${SLUG}`)).map((p) =>
    p.name.toLowerCase()
  )
)

let created = 0
let skipped = 0
for (const node of components) {
  if (existing.has(node.title.toLowerCase())) {
    skipped++
    continue
  }
  const item = matchItem(node, items)
  const part = {
    project: SLUG,
    name: node.title,
    quantityNeeded: quantityFrom(node.content),
    ...(item ? { itemId: item.id } : {}),
  }
  console.log(
    `${dryRun ? 'would add' : 'add'} ${part.name} x${part.quantityNeeded} -> ${item ? `${item.name} (${item.part_number})` : 'unlinked'}`
  )
  if (!dryRun) await api(target, 'POST', '/project-parts', part)
  created++
}
console.log(
  `${dryRun ? 'dry run: ' : ''}${created} added, ${skipped} already listed (${components.length} component nodes)`
)
