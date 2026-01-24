/**
 * Offline Mode Banner
 *
 * Displays a banner when the app is operating in offline mode
 * (IndexedDB only, no file system connection).
 *
 * Provides a reconnect button to prompt for file system access.
 */

import { CloudOff, Link2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button, useToast } from '@/components/ui'

export interface OfflineBannerProps {
  /** Whether to show the banner */
  show: boolean
  /** Whether permission request is needed (stored handle exists) */
  needsPermission?: boolean
  /** Callback to request permission for stored handle */
  onRequestPermission?: () => Promise<boolean>
  /** Callback to open folder picker */
  onConnectToFileSystem?: () => Promise<boolean>
  /** Additional CSS classes */
  className?: string
}

export function OfflineBanner({
  show,
  needsPermission = false,
  onRequestPermission,
  onConnectToFileSystem,
  className,
}: OfflineBannerProps) {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const toast = useToast()

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true)
    try {
      // If we have a stored handle, request permission first
      if (needsPermission && onRequestPermission) {
        const success = await onRequestPermission()
        if (success) {
          toast.success({
            title: 'Reconnected',
            description: 'File system connection restored',
          })
          return
        }
        // Permission denied or failed - provide feedback
        toast.info({
          title: 'Permission Not Granted',
          description:
            'Click "Allow" when prompted to reconnect to your project folder.',
        })
        return
      }

      // Otherwise, open folder picker
      if (onConnectToFileSystem) {
        const success = await onConnectToFileSystem()
        if (success) {
          toast.success({
            title: 'Connected',
            description: 'File system connection established',
          })
        } else {
          // User cancelled or connection failed without throwing
          toast.info({
            title: 'Connection Cancelled',
            description: 'Select a project folder to enable file sync.',
          })
        }
      }
    } catch (error) {
      toast.error({
        title: 'Connection Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not connect to file system',
      })
    } finally {
      setIsReconnecting(false)
    }
  }, [needsPermission, onRequestPermission, onConnectToFileSystem, toast])

  if (!show) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2',
        'border-b border-amber-200 bg-amber-50 text-amber-800',
        'dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200',
        className
      )}
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
    >
      <div className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm">
          {needsPermission
            ? 'File system access needed. Click Reconnect to restore sync.'
            : 'Working offline. Changes are saved locally.'}
        </span>
      </div>

      <Button
        onClick={handleReconnect}
        disabled={isReconnecting}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium',
          'rounded-md transition-colors',
          'bg-amber-600 text-white hover:bg-amber-700',
          'dark:bg-amber-500 dark:hover:bg-amber-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:outline-none'
        )}
      >
        <Link2
          className={cn('h-3.5 w-3.5', isReconnecting && 'animate-pulse')}
          aria-hidden="true"
        />
        {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
      </Button>
    </div>
  )
}
