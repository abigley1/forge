#!/usr/bin/env node
/** Agent-friendly client for 3D design projects. Uses Forge's HTTP API; reads
 * the current version before each write and never retries a 409. */
const base = (process.env.FORGE_API_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  ''
)
// Stage and stage note are written only by the vault (FORGE_WRITER=vault-bot).
const writer = process.env.FORGE_WRITER
const [command = 'list', ...args] = process.argv.slice(2)
async function request(method = 'GET', suffix = '', body) {
  const response = await fetch(`${base}/design-projects${suffix}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(writer ? { 'X-Forge-Writer': writer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok || !result.success)
    throw new Error(result.error || `HTTP ${response.status}`)
  return result.data
}
try {
  let output
  if (command === 'list') {
    output = await request()
  } else if (command === 'add') {
    const [name, stage, stageNote = ''] = args
    output = await request('POST', '', { project: { name, stage, stageNote } })
  } else if (command === 'stage' || command === 'rename') {
    const [id, value, stageNote] = args
    const current = (await request()).projects.find((p) => p.id === id)
    if (!current) throw new Error('Design project ID not found.')
    const project = {
      name: current.name,
      stage: current.stage,
      stageNote: current.stageNote,
    }
    if (command === 'stage') {
      project.stage = value
      if (stageNote !== undefined) project.stageNote = stageNote
    } else project.name = value
    output = await request('PUT', `/${id}`, {
      version: current.version,
      project,
    })
  } else
    throw new Error(
      'Usage: design-projects.mjs list | add NAME STAGE [NOTE] | stage ID STAGE [NOTE] | rename ID NEW_NAME'
    )
  console.log(JSON.stringify(output, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
