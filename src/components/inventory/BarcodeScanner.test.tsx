import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarcodeScanner } from './BarcodeScanner'

// Mock html5-qrcode - use vi.hoisted() for variables used in vi.mock()
const { mockStart, mockStop, MockHtml5Qrcode } = vi.hoisted(() => {
  const mockStart = vi.fn()
  const mockStop = vi.fn()
  const mockClear = vi.fn()

  // Create a proper class mock that can be used with `new`
  class MockHtml5Qrcode {
    start = mockStart
    stop = mockStop
    clear = mockClear
  }

  return { mockStart, mockStop, mockClear, MockHtml5Qrcode }
})

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: MockHtml5Qrcode,
  Html5QrcodeSupportedFormats: {
    UPC_A: 1,
    UPC_E: 2,
    EAN_8: 3,
    EAN_13: 4,
    QR_CODE: 5,
  },
}))

// Mock fetch for barcode lookup
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('BarcodeScanner', () => {
  const mockOnScan = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockStart.mockResolvedValue(undefined)
    mockStop.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial render', () => {
    it('should render scan button when not scanning', () => {
      render(<BarcodeScanner onScan={mockOnScan} />)

      expect(
        screen.getByRole('button', { name: /scan barcode/i })
      ).toBeInTheDocument()
    })

    it('should not show scanner view initially', () => {
      render(<BarcodeScanner onScan={mockOnScan} />)

      expect(
        screen.queryByTestId('barcode-scanner-view')
      ).not.toBeInTheDocument()
    })
  })

  describe('starting scanner', () => {
    it('should show scanner view when button is clicked', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      expect(screen.getByTestId('barcode-scanner-view')).toBeInTheDocument()
    })

    it('should show close button when scanning', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      expect(
        screen.getByRole('button', { name: /close|cancel|stop/i })
      ).toBeInTheDocument()
    })

    it('should initialize html5-qrcode scanner', async () => {
      const user = userEvent.setup()

      render(<BarcodeScanner onScan={mockOnScan} />)
      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      // Verify scanner was started (which implies it was initialized)
      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled()
      })
    })
  })

  describe('stopping scanner', () => {
    it('should hide scanner view when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      // Start scanning
      await user.click(screen.getByRole('button', { name: /scan barcode/i }))
      expect(screen.getByTestId('barcode-scanner-view')).toBeInTheDocument()

      // Stop scanning
      await user.click(
        screen.getByRole('button', { name: /close|cancel|stop/i })
      )

      await waitFor(() => {
        expect(
          screen.queryByTestId('barcode-scanner-view')
        ).not.toBeInTheDocument()
      })
    })

    it('should stop html5-qrcode when closing', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))
      await user.click(
        screen.getByRole('button', { name: /close|cancel|stop/i })
      )

      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled()
      })
    })

    it('should call onClose callback if provided', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} onClose={mockOnClose} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))
      await user.click(
        screen.getByRole('button', { name: /close|cancel|stop/i })
      )

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('barcode detection', () => {
    it('should call barcode lookup API when barcode is detected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            found: true,
            name: 'Test Product',
            barcode: '5901234123457',
          },
        }),
      })

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      // Simulate barcode detection by calling the success callback
      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled()
      })

      // Get the success callback that was passed to start()
      // start(cameraConfig, scanConfig, successCallback, errorCallback)
      const startCall = mockStart.mock.calls[0]
      const successCallback = startCall[2]

      // Simulate successful scan
      successCallback('5901234123457')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/inventory/lookup-barcode',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ barcode: '5901234123457' }),
          })
        )
      })
    })

    it('should call onScan with lookup result when product is found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            found: true,
            name: 'Test Product',
            supplier: 'Test Brand',
            imageUrl: 'https://example.com/image.jpg',
            barcode: '5901234123457',
          },
        }),
      })

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      const successCallback = mockStart.mock.calls[0][2]
      successCallback('5901234123457')

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          found: true,
          name: 'Test Product',
          supplier: 'Test Brand',
          imageUrl: 'https://example.com/image.jpg',
          barcode: '5901234123457',
        })
      })
    })

    it('should call onScan with not-found result when product is not in database', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            found: false,
            barcode: '000000000000',
          },
        }),
      })

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      const successCallback = mockStart.mock.calls[0][2]
      successCallback('000000000000')

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          found: false,
          barcode: '000000000000',
        })
      })
    })

    it('should stop scanner after successful detection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { found: true, name: 'Product', barcode: '123456789012' },
        }),
      })

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      const successCallback = mockStart.mock.calls[0][2]
      successCallback('123456789012')

      await waitFor(() => {
        expect(mockStop).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('should show error message when camera access is denied', async () => {
      mockStart.mockRejectedValueOnce(new Error('NotAllowedError'))

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      // Look for the visible error message (not the sr-only status)
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/camera.*denied|permission/i)
        expect(errorMessages.length).toBeGreaterThanOrEqual(1)
        // At least one should be visible (not sr-only)
        expect(
          errorMessages.some((el) => !el.classList.contains('sr-only'))
        ).toBe(true)
      })
    })

    it('should show error message when API lookup fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      const successCallback = mockStart.mock.calls[0][2]
      successCallback('5901234123457')

      // There may be multiple elements (sr-only status + visible error message)
      await waitFor(() => {
        const errorElements = screen.getAllByText(/lookup.*failed|error/i)
        expect(errorElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should allow retry after error', async () => {
      mockStart.mockRejectedValueOnce(new Error('NotAllowedError'))
      mockStart.mockResolvedValueOnce(undefined)

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      // Wait for error state (there may be multiple elements with the error text)
      await waitFor(() => {
        const errorElements = screen.getAllByText(/camera.*denied|permission/i)
        expect(errorElements.length).toBeGreaterThanOrEqual(1)
      })

      // Should be able to try again
      await user.click(screen.getByRole('button', { name: /try again|retry/i }))

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('loading states', () => {
    it('should show loading indicator while looking up barcode', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      const successCallback = mockStart.mock.calls[0][2]
      successCallback('5901234123457')

      // There may be multiple elements (sr-only status + visible indicator)
      await waitFor(() => {
        const loadingElements = screen.getAllByText(/looking up|searching/i)
        expect(loadingElements.length).toBeGreaterThanOrEqual(1)
      })

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({
          data: { found: false, barcode: '5901234123457' },
        }),
      })
    })
  })

  describe('accessibility', () => {
    it('should have appropriate aria labels', () => {
      render(<BarcodeScanner onScan={mockOnScan} />)

      const button = screen.getByRole('button', { name: /scan barcode/i })
      expect(button).toBeInTheDocument()
    })

    it('should announce scanner status to screen readers', async () => {
      const user = userEvent.setup()
      render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      // Should have a status region for accessibility
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('should clean up scanner when component unmounts', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<BarcodeScanner onScan={mockOnScan} />)

      await user.click(screen.getByRole('button', { name: /scan barcode/i }))

      await waitFor(() => expect(mockStart).toHaveBeenCalled())

      unmount()

      expect(mockStop).toHaveBeenCalled()
    })
  })
})
