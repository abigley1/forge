import { config } from './config'

type LogFn = (...args: unknown[]) => void

type Debugger = LogFn & {
  namespace: string
  enabled: boolean
}

const debuggers = new Map<string, Debugger>()

function getEnabledNamespaces(): string[] {
  const fromEnv = config.debug
  const fromStorage =
    typeof window !== 'undefined' ? (localStorage.getItem('debug') ?? '') : ''

  const combined = [fromEnv, fromStorage].filter(Boolean).join(',')
  return combined
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isNamespaceEnabled(namespace: string): boolean {
  const enabled = getEnabledNamespaces()

  if (enabled.length === 0) return false
  if (enabled.includes('*')) return true

  return enabled.some((pattern) => {
    if (pattern.endsWith('*')) {
      return namespace.startsWith(pattern.slice(0, -1))
    }
    return namespace === pattern
  })
}

function createDebugger(namespace: string): Debugger {
  const log: LogFn = (...args) => {
    if (!isNamespaceEnabled(namespace)) return
    const prefix = `[${namespace}]`
    console.log(prefix, ...args)
  }

  const debugFn = log as Debugger
  debugFn.namespace = namespace
  Object.defineProperty(debugFn, 'enabled', {
    get: () => isNamespaceEnabled(namespace),
  })

  return debugFn
}

export function debug(namespace: string): Debugger {
  const existing = debuggers.get(namespace)
  if (existing) return existing

  const debugFn = createDebugger(namespace)
  debuggers.set(namespace, debugFn)
  return debugFn
}

export function enableDebug(namespaces: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('debug', namespaces)
  }
}

export function disableDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('debug')
  }
}
