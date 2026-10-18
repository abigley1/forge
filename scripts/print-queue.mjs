#!/usr/bin/env node
/** Small agent-friendly client. Uses Forge's existing HTTP API, never a printer. */
import { readFile } from 'node:fs/promises'
const base = (
  process.env.FORGE_API_URL || 'http://192.168.1.130:8099/api'
).replace(/\/$/, '')
const [command = 'list', argument, target] = process.argv.slice(2)
async function request(method = 'GET', suffix = '', body) {
  const response = await fetch(`${base}/print-queue${suffix}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok || !result.success)
    throw new Error(result.error || `HTTP ${response.status}`)
  return result.data
}
try {
  let queue = await request()
  if (command === 'add') {
    const plate = JSON.parse(await readFile(argument, 'utf8'))
    queue = await request('POST', '', { version: queue.version, plate })
  } else if (command === 'edit') {
    const plate = queue.plates.find((p) => p.id === argument)
    if (!plate) throw new Error('Plate ID not found.')
    const patch = JSON.parse(await readFile(target, 'utf8'))
    queue = await request('PUT', `/${plate.id}`, {
      version: queue.version,
      plate: { ...plate, ...patch },
    })
  } else if (command === 'move') {
    const index = Number(target) - 1
    const plate = queue.plates.find((p) => p.id === argument)
    if (
      !plate ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= queue.plates.length
    )
      throw new Error('Use move PLATE_ID POSITION (1-based).')
    const ids = queue.plates.filter((p) => p.id !== argument).map((p) => p.id)
    ids.splice(index, 0, plate.id)
    queue = await request('POST', '/reorder', { version: queue.version, ids })
  } else if (command === 'seed') {
    const plates = JSON.parse(await readFile(argument, 'utf8'))
    for (const plate of plates) {
      if (
        queue.plates.some(
          (p) =>
            p.name === plate.name &&
            p.project === plate.project &&
            p.revision === plate.revision
        )
      )
        continue
      queue = await request('POST', '', { version: queue.version, plate })
    }
  } else if (command !== 'list')
    throw new Error(
      'Usage: print-queue.mjs list | add FILE.json | edit ID PATCH.json | move ID POSITION | seed FILE.json'
    )
  console.log(JSON.stringify(queue, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
