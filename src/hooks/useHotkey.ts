/**
 * useHotkey Hook
 *
 * A hook for handling keyboard shortcuts with support for modifier keys.
 * Automatically handles platform differences (Cmd on Mac, Ctrl on Windows/Linux).
 */

import { useEffect, useCallback, useRef, useLayoutEffect } from 'react'

// ============================================================================
// Types
// ============================================================================

/**
 * Modifier keys that can be combined with the main key
 */
export interface HotkeyModifiers {
  /** Ctrl key (Windows/Linux) or Cmd key (Mac) */
  ctrl?: boolean
  /** Shift key */
  shift?: boolean
  /** Alt key (Windows/Linux) or Option key (Mac) */
  alt?: boolean
  /** Meta key (Cmd on Mac, Windows key on Windows) - use ctrl for cross-platform */
  meta?: boolean
}

/**
 * Options for the useHotkey hook
 */
export interface UseHotkeyOptions extends HotkeyModifiers {
  /** Whether the hotkey is currently enabled */
  enabled?: boolean
  /** Whether to prevent the default browser action */
  preventDefault?: boolean
  /** Whether to stop event propagation */
  stopPropagation?: boolean
  /** Target element (defaults to document) */
  target?: EventTarget | null
  /** Event type to listen for */
  eventType?: 'keydown' | 'keyup'
}

/**
 * Callback function type for hotkey handlers
 */
export type HotkeyCallback = (event: KeyboardEvent) => void

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if the current platform is Mac
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

/**
 * Check if the correct modifier keys are pressed
 */
function matchesModifiers(
  event: KeyboardEvent,
  options: HotkeyModifiers
): boolean {
  const mac = isMac()

  // ctrl option maps to Cmd on Mac, Ctrl on other platforms
  const ctrlMatch = options.ctrl
    ? mac
      ? event.metaKey
      : event.ctrlKey
    : mac
      ? !event.metaKey
      : !event.ctrlKey

  const shiftMatch = options.shift ? event.shiftKey : !event.shiftKey
  const altMatch = options.alt ? event.altKey : !event.altKey

  // meta option specifically requires the meta key (regardless of platform)
  const metaMatch =
    options.meta !== undefined
      ? options.meta
        ? event.metaKey
        : true // Don't check if not specified
      : true

  return ctrlMatch && shiftMatch && altMatch && metaMatch
}

/**
 * Normalize key name for comparison
 */
function normalizeKey(key: string): string {
  // Handle special cases
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    Spacebar: 'Space',
    Esc: 'Escape',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
  }

  const normalized = keyMap[key] || key

  // Normalize single letters to lowercase for comparison
  if (normalized.length === 1) {
    return normalized.toLowerCase()
  }

  return normalized
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for handling keyboard shortcuts
 *
 * @param key - The key to listen for (e.g., 'z', 'Enter', 'Escape')
 * @param callback - Function to call when the hotkey is triggered
 * @param options - Configuration options for the hotkey
 *
 * @example
 * // Undo: Ctrl/Cmd + Z
 * useHotkey('z', handleUndo, { ctrl: true })
 *
 * @example
 * // Redo: Ctrl/Cmd + Shift + Z
 * useHotkey('z', handleRedo, { ctrl: true, shift: true })
 *
 * @example
 * // Save: Ctrl/Cmd + S
 * useHotkey('s', handleSave, { ctrl: true, preventDefault: true })
 */
export function useHotkey(
  key: string,
  callback: HotkeyCallback,
  options: UseHotkeyOptions = {}
): void {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta,
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    target,
    eventType = 'keydown',
  } = options

  // Use ref to always have the latest callback without re-registering listener
  const callbackRef = useRef(callback)
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  const normalizedKey = normalizeKey(key)

  const handleKeyEvent = useCallback(
    (event: Event) => {
      if (!enabled) return

      const keyEvent = event as KeyboardEvent

      // Check if the key matches
      const eventKey = normalizeKey(keyEvent.key)
      if (eventKey !== normalizedKey) return

      // Check if modifiers match
      if (!matchesModifiers(keyEvent, { ctrl, shift, alt, meta })) return

      // Don't trigger if user is typing in an input/textarea
      const target = keyEvent.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape in inputs
        if (normalizedKey !== 'Escape') return
      }

      if (preventDefault) {
        keyEvent.preventDefault()
      }

      if (stopPropagation) {
        keyEvent.stopPropagation()
      }

      callbackRef.current(keyEvent)
    },
    [
      normalizedKey,
      ctrl,
      shift,
      alt,
      meta,
      enabled,
      preventDefault,
      stopPropagation,
    ]
  )

  useEffect(() => {
    const targetElement =
      target ?? (typeof document !== 'undefined' ? document : null)

    if (!targetElement || !enabled) return

    targetElement.addEventListener(eventType, handleKeyEvent)

    return () => {
      targetElement.removeEventListener(eventType, handleKeyEvent)
    }
  }, [target, enabled, eventType, handleKeyEvent])
}

/**
 * Hook for handling multiple hotkeys at once
 *
 * @param hotkeys - Array of hotkey configurations
 *
 * @example
 * useHotkeys([
 *   { key: 'z', callback: handleUndo, options: { ctrl: true } },
 *   { key: 'z', callback: handleRedo, options: { ctrl: true, shift: true } },
 * ])
 */
export function useHotkeys(
  hotkeys: Array<{
    key: string
    callback: HotkeyCallback
    options?: UseHotkeyOptions
  }>
): void {
  // Use a single event listener for all hotkeys
  const hotkeysRef = useRef(hotkeys)
  useLayoutEffect(() => {
    hotkeysRef.current = hotkeys
  })

  const handleKeyEvent = useCallback((event: Event) => {
    const keyEvent = event as KeyboardEvent
    const eventKey = normalizeKey(keyEvent.key)

    for (const hotkey of hotkeysRef.current) {
      const { key, callback, options = {} } = hotkey
      const {
        ctrl = false,
        shift = false,
        alt = false,
        meta,
        enabled = true,
        preventDefault = true,
        stopPropagation = false,
      } = options

      if (!enabled) continue

      const normalizedKey = normalizeKey(key)
      if (eventKey !== normalizedKey) continue

      if (!matchesModifiers(keyEvent, { ctrl, shift, alt, meta })) continue

      // Don't trigger if user is typing in an input/textarea
      const target = keyEvent.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (normalizedKey !== 'Escape') continue
      }

      if (preventDefault) {
        keyEvent.preventDefault()
      }

      if (stopPropagation) {
        keyEvent.stopPropagation()
      }

      callback(keyEvent)
      break // Only trigger the first matching hotkey
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    document.addEventListener('keydown', handleKeyEvent)

    return () => {
      document.removeEventListener('keydown', handleKeyEvent)
    }
  }, [handleKeyEvent])
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Check if the current platform is Mac
 */
export { isMac }

/**
 * Get the modifier key label for the current platform
 * Returns "⌘" on Mac, "Ctrl" on other platforms
 */
export function getModifierKeyLabel(): string {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * Format a hotkey for display
 *
 * @example
 * formatHotkey('z', { ctrl: true }) // "⌘Z" on Mac, "Ctrl+Z" on Windows
 * formatHotkey('z', { ctrl: true, shift: true }) // "⌘⇧Z" on Mac, "Ctrl+Shift+Z" on Windows
 */
export function formatHotkey(
  key: string,
  modifiers: HotkeyModifiers = {}
): string {
  const mac = isMac()
  const parts: string[] = []

  if (modifiers.ctrl) {
    parts.push(mac ? '⌘' : 'Ctrl')
  }

  if (modifiers.alt) {
    parts.push(mac ? '⌥' : 'Alt')
  }

  if (modifiers.shift) {
    parts.push(mac ? '⇧' : 'Shift')
  }

  // Capitalize single letter keys
  const displayKey = key.length === 1 ? key.toUpperCase() : key

  if (mac) {
    return parts.join('') + displayKey
  }

  parts.push(displayKey)
  return parts.join('+')
}
