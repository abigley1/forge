import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useHotkey,
  formatHotkey,
  getModifierKeyLabel,
  isMac,
} from './useHotkey'

// ============================================================================
// Test Setup
// ============================================================================

// Mock navigator.platform for platform-specific tests
const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')

function mockPlatform(platform: string) {
  Object.defineProperty(navigator, 'platform', {
    value: platform,
    configurable: true,
  })
}

function restorePlatform() {
  if (originalPlatform) {
    Object.defineProperty(navigator, 'platform', originalPlatform)
  }
}

// Helper to create keyboard events
function createKeyboardEvent(
  key: string,
  options: {
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
  } = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    bubbles: true,
    cancelable: true,
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('useHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    restorePlatform()
  })

  describe('basic functionality', () => {
    it('should call callback when key is pressed', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback))

      document.dispatchEvent(createKeyboardEvent('a'))

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should not call callback for different key', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback))

      document.dispatchEvent(createKeyboardEvent('b'))

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle uppercase key matching', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback))

      document.dispatchEvent(createKeyboardEvent('A'))

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('modifier keys', () => {
    describe('on Windows/Linux', () => {
      beforeEach(() => {
        mockPlatform('Win32')
      })

      it('should match Ctrl modifier', () => {
        const callback = vi.fn()

        renderHook(() => useHotkey('z', callback, { ctrl: true }))

        // Without Ctrl - should not trigger
        document.dispatchEvent(createKeyboardEvent('z'))
        expect(callback).not.toHaveBeenCalled()

        // With Ctrl - should trigger
        document.dispatchEvent(createKeyboardEvent('z', { ctrlKey: true }))
        expect(callback).toHaveBeenCalledTimes(1)
      })

      it('should match Ctrl+Shift combination', () => {
        const callback = vi.fn()

        renderHook(() => useHotkey('z', callback, { ctrl: true, shift: true }))

        // Ctrl only - should not trigger
        document.dispatchEvent(createKeyboardEvent('z', { ctrlKey: true }))
        expect(callback).not.toHaveBeenCalled()

        // Ctrl+Shift - should trigger
        document.dispatchEvent(
          createKeyboardEvent('z', { ctrlKey: true, shiftKey: true })
        )
        expect(callback).toHaveBeenCalledTimes(1)
      })

      it('should match Alt modifier', () => {
        const callback = vi.fn()

        renderHook(() => useHotkey('a', callback, { alt: true }))

        document.dispatchEvent(createKeyboardEvent('a', { altKey: true }))
        expect(callback).toHaveBeenCalledTimes(1)
      })
    })

    describe('on Mac', () => {
      beforeEach(() => {
        mockPlatform('MacIntel')
      })

      it('should use Cmd instead of Ctrl for ctrl option', () => {
        const callback = vi.fn()

        renderHook(() => useHotkey('z', callback, { ctrl: true }))

        // Ctrl key on Mac - should not trigger
        document.dispatchEvent(createKeyboardEvent('z', { ctrlKey: true }))
        expect(callback).not.toHaveBeenCalled()

        // Cmd key on Mac - should trigger
        document.dispatchEvent(createKeyboardEvent('z', { metaKey: true }))
        expect(callback).toHaveBeenCalledTimes(1)
      })

      it('should match Cmd+Shift combination', () => {
        const callback = vi.fn()

        renderHook(() => useHotkey('z', callback, { ctrl: true, shift: true }))

        document.dispatchEvent(
          createKeyboardEvent('z', { metaKey: true, shiftKey: true })
        )
        expect(callback).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('enabled option', () => {
    it('should not call callback when disabled', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback, { enabled: false }))

      document.dispatchEvent(createKeyboardEvent('a'))

      expect(callback).not.toHaveBeenCalled()
    })

    it('should call callback when re-enabled', () => {
      const callback = vi.fn()
      let enabled = false

      const { rerender } = renderHook(() =>
        useHotkey('a', callback, { enabled })
      )

      document.dispatchEvent(createKeyboardEvent('a'))
      expect(callback).not.toHaveBeenCalled()

      enabled = true
      rerender()

      document.dispatchEvent(createKeyboardEvent('a'))
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('preventDefault option', () => {
    it('should prevent default when preventDefault is true', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback, { preventDefault: true }))

      const event = createKeyboardEvent('a')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should not prevent default when preventDefault is false', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('a', callback, { preventDefault: false }))

      const event = createKeyboardEvent('a')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  describe('special keys', () => {
    it('should handle Escape key', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('Escape', callback))

      document.dispatchEvent(createKeyboardEvent('Escape'))

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should handle Enter key', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('Enter', callback))

      document.dispatchEvent(createKeyboardEvent('Enter'))

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should handle arrow keys', () => {
      const callback = vi.fn()

      renderHook(() => useHotkey('ArrowUp', callback))

      document.dispatchEvent(createKeyboardEvent('ArrowUp'))

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const callback = vi.fn()
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useHotkey('a', callback))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })
})

describe('formatHotkey', () => {
  afterEach(() => {
    restorePlatform()
  })

  describe('on Windows/Linux', () => {
    beforeEach(() => {
      mockPlatform('Win32')
    })

    it('should format simple key', () => {
      expect(formatHotkey('a')).toBe('A')
    })

    it('should format Ctrl modifier', () => {
      expect(formatHotkey('z', { ctrl: true })).toBe('Ctrl+Z')
    })

    it('should format Ctrl+Shift modifier', () => {
      expect(formatHotkey('z', { ctrl: true, shift: true })).toBe(
        'Ctrl+Shift+Z'
      )
    })

    it('should format Alt modifier', () => {
      expect(formatHotkey('a', { alt: true })).toBe('Alt+A')
    })

    it('should format all modifiers', () => {
      expect(formatHotkey('a', { ctrl: true, alt: true, shift: true })).toBe(
        'Ctrl+Alt+Shift+A'
      )
    })
  })

  describe('on Mac', () => {
    beforeEach(() => {
      mockPlatform('MacIntel')
    })

    it('should use ⌘ for ctrl modifier', () => {
      expect(formatHotkey('z', { ctrl: true })).toBe('⌘Z')
    })

    it('should use ⌘⇧ for ctrl+shift', () => {
      expect(formatHotkey('z', { ctrl: true, shift: true })).toBe('⌘⇧Z')
    })

    it('should use ⌥ for alt', () => {
      expect(formatHotkey('a', { alt: true })).toBe('⌥A')
    })
  })
})

describe('getModifierKeyLabel', () => {
  afterEach(() => {
    restorePlatform()
  })

  it('should return ⌘ on Mac', () => {
    mockPlatform('MacIntel')
    expect(getModifierKeyLabel()).toBe('⌘')
  })

  it('should return Ctrl on Windows', () => {
    mockPlatform('Win32')
    expect(getModifierKeyLabel()).toBe('Ctrl')
  })

  it('should return Ctrl on Linux', () => {
    mockPlatform('Linux x86_64')
    expect(getModifierKeyLabel()).toBe('Ctrl')
  })
})

describe('isMac', () => {
  afterEach(() => {
    restorePlatform()
  })

  it('should return true for Mac platforms', () => {
    mockPlatform('MacIntel')
    expect(isMac()).toBe(true)

    mockPlatform('MacPPC')
    expect(isMac()).toBe(true)
  })

  it('should return true for iOS platforms', () => {
    mockPlatform('iPhone')
    expect(isMac()).toBe(true)

    mockPlatform('iPad')
    expect(isMac()).toBe(true)
  })

  it('should return false for Windows', () => {
    mockPlatform('Win32')
    expect(isMac()).toBe(false)
  })

  it('should return false for Linux', () => {
    mockPlatform('Linux x86_64')
    expect(isMac()).toBe(false)
  })
})
