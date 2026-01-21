import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error for testing
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error during error boundary tests
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('displays section name in error message', () => {
    render(
      <ErrorBoundary section="sidebar">
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/in sidebar/)).toBeInTheDocument()
  })

  it('logs error to console with stack trace', () => {
    render(
      <ErrorBoundary section="main">
        <ThrowError />
      </ErrorBoundary>
    )

    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary:main] Caught error:',
      expect.any(Error)
    )
    expect(console.error).toHaveBeenCalledWith(
      'Component stack:',
      expect.any(String)
    )
  })

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('provides a "Try again" button that resets the error state', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    function ConditionalError() {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Recovered content</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Stop throwing and click "Try again"
    shouldThrow = false
    await user.click(screen.getByRole('button', { name: /try again/i }))

    // Force rerender after state reset
    rerender(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Recovered content')).toBeInTheDocument()
  })

  it('has accessible error alert with aria-live', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('hides decorative icon from screen readers', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const icon = screen.getByRole('alert').querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
