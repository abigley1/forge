#!/usr/bin/env node
/**
 * Import owned filament (docs/materials-p2s/inventory.json) into Forge inventory.
 *
 *   FORGE_API_URL=http://localhost:3000/api node scripts/import-filament.mjs [inventory.json] [--dry-run]
 *
 * Items go in category `consumables`, subcategory `consumables-filament`, keyed
 * by partNumber = material id. Quantity is grams: stock.value when the stock is
 * in grams, otherwise remaining_mass_g (the file's own metre-to-gram estimate;
 * the original string and the approximate flag are kept in the notes).
 * Idempotent: a material whose partNumber already exists is skipped, so a
 * re-run never overwrites stock that has since been consumed.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = (process.env.FORGE_API_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  ''
)
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const file =
  args.find((a) => !a.startsWith('--')) ??
  fileURLToPath(
    new URL('../docs/materials-p2s/inventory.json', import.meta.url)
  )
const CATEGORY = 'consumables'
const SUBCATEGORY = 'consumables-filament'

async function api(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok)
    throw new Error(`${method} ${path}: ${result.error || response.status}`)
  return result.data
}

export function filamentItem(material, asOf) {
  const { stock } = material
  const grams = stock.unit === 'g' ? stock.value : material.remaining_mass_g
  if (!Number.isFinite(grams) || grams < 0)
    throw new Error(`${material.id}: no usable mass in grams`)
  const approximate = Boolean(stock.approximate || material.mass_is_approximate)
  return {
    name: material.name,
    category_id: CATEGORY,
    subcategory_id: SUBCATEGORY,
    status: 'owned',
    quantity: Math.round(grams),
    supplier: material.vendor,
    part_number: material.id,
    notes: [
      `Filament stock in grams as of ${asOf}${approximate ? ' (approximate)' : ''}.`,
      `Reported stock: ${stock.original} (${stock.value} ${stock.unit}).`,
      `Type ${material.type}. Source: docs/materials-p2s/inventory.json.`,
    ].join(' '),
    tags: ['filament', material.type],
  }
}

const data = JSON.parse(await readFile(file, 'utf8'))
const categories = await api('GET', '/inventory/categories')
const category = categories.find((c) => c.id === CATEGORY)
if (!category) throw new Error(`Inventory category "${CATEGORY}" not found.`)
if (!category.subcategories.some((s) => s.id === SUBCATEGORY)) {
  if (dryRun) console.log(`would create subcategory ${SUBCATEGORY}`)
  else {
    await api('POST', `/inventory/categories/${CATEGORY}/subcategories`, {
      id: SUBCATEGORY,
      name: 'Filament',
      sort_order: 4,
    })
    console.log(`created subcategory ${SUBCATEGORY}`)
  }
}

const existing = new Set(
  (await api('GET', `/inventory?subcategory=${SUBCATEGORY}`)).map(
    (i) => i.part_number
  )
)
let created = 0
let skipped = 0
for (const material of data.materials) {
  if (existing.has(material.id)) {
    skipped++
    continue
  }
  const item = filamentItem(material, data.as_of)
  if (dryRun)
    console.log(`would create ${item.part_number}: ${item.quantity} g`)
  else {
    await api('POST', '/inventory', item)
    console.log(`created ${item.part_number}: ${item.quantity} g`)
  }
  created++
}
console.log(
  `${dryRun ? 'dry run: ' : ''}${created} created, ${skipped} already present (${data.materials.length} materials)`
)
