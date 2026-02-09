import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/Button'
import { X, Camera, Loader2 } from 'lucide-react'

/**
 * Result from barcode lookup API
 */
export interface BarcodeLookupResult {
  found: boolean
  name?: string
  supplier?: string | null
  imageUrl?: string | null
  category?: string | null
  barcode: string
}

interface BarcodeScannerProps {
  onScan: (result: BarcodeLookupResult) => void
  onClose?: () => void
}

type ScannerState = 'idle' | 'scanning' | 'looking-up' | 'error'

/**
 * BarcodeScanner component - uses device camera to scan barcodes
 * and looks them up via the barcode lookup API
 */
export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [state, setState] = useState<ScannerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'barcode-scanner-container'

  // Cleanup scanner on unmount or when stopping
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // Ignore errors during cleanup
      }
      scannerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // Lookup barcode via API
  const lookupBarcode = useCallback(
    async (barcode: string) => {
      setState('looking-up')

      try {
        const response = await fetch('/api/inventory/lookup-barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode }),
        })

        if (!response.ok) {
          throw new Error('Lookup failed')
        }

        const data = await response.json()
        await stopScanner()
        setState('idle')
        onScan(data.data)
      } catch {
        setState('error')
        setError('Barcode lookup failed. Please try again.')
      }
    },
    [onScan, stopScanner]
  )

  // Start scanning
  const startScanner = useCallback(async () => {
    setState('scanning')
    setError(null)

    try {
      const scanner = new Html5Qrcode(scannerContainerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        // Success callback - barcode detected
        (decodedText) => {
          lookupBarcode(decodedText)
        },
        // Error callback - ignore scan errors (normal during scanning)
        () => {}
      )
    } catch (err) {
      setState('error')
      if (
        err instanceof Error &&
        (err.message.includes('NotAllowed') ||
          err.message.includes('Permission'))
      ) {
        setError('Camera permission denied. Please allow camera access.')
      } else {
        setError('Failed to start camera. Please try again.')
      }
    }
  }, [lookupBarcode])

  // Handle close button
  const handleClose = useCallback(async () => {
    await stopScanner()
    setState('idle')
    setError(null)
    onClose?.()
  }, [stopScanner, onClose])

  // Retry after error
  const handleRetry = useCallback(() => {
    setError(null)
    startScanner()
  }, [startScanner])

  // Idle state - show scan button
  if (state === 'idle') {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={startScanner}
        className="w-full"
      >
        <Camera className="mr-2 h-4 w-4" />
        Scan Barcode
      </Button>
    )
  }

  // Active states - show scanner view
  return (
    <div
      data-testid="barcode-scanner-view"
      className="relative rounded-lg border bg-gray-900 p-4"
    >
      {/* Close button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="absolute top-2 right-2 z-10 h-8 w-8 p-0 text-white hover:bg-gray-700"
        aria-label="Close scanner"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Status announcement for screen readers */}
      <div role="status" className="sr-only">
        {state === 'scanning' && 'Scanner active. Point camera at barcode.'}
        {state === 'looking-up' && 'Looking up barcode...'}
        {state === 'error' && error}
      </div>

      {/* Scanner container */}
      <div
        id={scannerContainerId}
        className="mx-auto aspect-video max-w-md overflow-hidden rounded"
      />

      {/* Looking up indicator */}
      {state === 'looking-up' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Looking up barcode...</span>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && error && (
        <div className="mt-4 space-y-3 text-center">
          <p className="text-red-400">{error}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRetry}
            className="text-white"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Instructions */}
      {state === 'scanning' && (
        <p className="mt-4 text-center text-sm text-gray-400">
          Point your camera at a barcode
        </p>
      )}
    </div>
  )
}
