/**
 * Browser polyfills for Node.js APIs
 *
 * gray-matter library uses Buffer internally, which doesn't exist in browsers.
 * This polyfill provides Buffer support for browser environments.
 */

import { Buffer as BufferPolyfill } from 'buffer'

// Type declaration for global Buffer property
declare global {
  interface Window {
    Buffer?: typeof BufferPolyfill
  }

  var Buffer: typeof BufferPolyfill | undefined
}

// Make Buffer available globally for libraries that expect it
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  window.Buffer = BufferPolyfill
}

// Also set on globalThis for broader compatibility
if (
  typeof globalThis !== 'undefined' &&
  typeof globalThis.Buffer === 'undefined'
) {
  globalThis.Buffer = BufferPolyfill
}

export {}
