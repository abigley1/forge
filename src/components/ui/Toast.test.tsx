import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function TestComponent({
  onToast,
}: {
  onToast?: (toast: ReturnType<typeof useToast>) => void
}) {
  const toast = useToast()

  return (
    <div>
      <button
        onClick={() => {
          toast.success({ title: 'Success message' })
        }}
      >
        Show Success
      </button>
      <button
        onClick={() => {
          toast.error({
            title: 'Error message',
            description: 'Something went wrong',
          })
        }}
      >
        Show Error
      </button>
      <button
        onClick={() => {
          toast.info({ title: 'Info message' })
        }}
      >
        Show Info
      </button>
      <button
        onClick={() => {
          toast.undo({
            title: 'Item deleted',
            onUndo: () => onToast?.(toast),
          })
        }}
      >
        Show Undo
      </button>
      <button
        onClick={() => {
          toast.success({ title: 'Custom duration', duration: 100 })
        }}
      >
        Show Custom Duration
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('throws error when useToast is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })

  it('renders success toast when triggered', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('renders error toast with description', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Error' }).click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Info' }).click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('renders undo toast with undo button', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Undo' }).click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Item deleted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('calls onUndo callback when undo button is clicked', () => {
    const onUndo = vi.fn()

    render(
      <ToastProvider>
        <TestComponent onToast={onUndo} />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Undo' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'Undo' }).click()
    })

    expect(onUndo).toHaveBeenCalled()
  })

  it('dismisses toast when dismiss button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click()
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: 'Dismiss notification' }).click()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('auto-dismisses toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Custom Duration' }).click()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'Show Error' }).click()
    })

    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
  })

  it('has accessible toast container with aria-live', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click()
    })

    const region = screen.getByRole('region', { name: 'Notifications' })
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('has accessible dismiss button with aria-label', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click()
    })

    expect(
      screen.getByRole('button', { name: 'Dismiss notification' })
    ).toBeInTheDocument()
  })

  it('returns toast id when creating toast', () => {
    let toastId: string | undefined

    function TestIdComponent() {
      const toast = useToast()

      return (
        <button
          onClick={() => {
            toastId = toast.success({ title: 'Test' })
          }}
        >
          Create Toast
        </button>
      )
    }

    render(
      <ToastProvider>
        <TestIdComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByRole('button', { name: 'Create Toast' }).click()
    })

    expect(toastId).toBeDefined()
    expect(toastId).toMatch(/^toast-/)
  })
})
