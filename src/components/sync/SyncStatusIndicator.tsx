/**
 * SyncStatusIndicator Component
 *
 * Shows the current sync status between IndexedDB and file system.
 * Displays different states: Synced (green), Syncing (spinner), Offline (gray), Error (red).
 * Clicking opens a popover with sync details and manual sync controls.
 */

import { useState, useCallback } from 'react'
import {
  Check,
  Loader2,
  CloudOff,
  AlertCircle,
  RefreshCw,
  Link2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, Button, Switch, useToast } from '@/components/ui'
import type { SyncResult } from '@/lib/filesystem'

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

/** Available sync interval options in seconds */
export const SYNC_INTERVALS = [
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
] as const

export type SyncInterval = (typeof SYNC_INTERVALS)[number]['value']

export interface SyncStatusIndicatorProps {
  /** Current sync status */
  status: SyncStatus
  /** Last successful sync time (timestamp) */
  lastSyncTime?: number
  /** Number of pending changes to sync */
  pendingChanges?: number
  /** Whether connected to file system */
  isConnected?: boolean
  /** Error message when status is 'error' */
  errorMessage?: string
  /** Callback to trigger manual sync */
  onSyncNow?: () => Promise<SyncResult | null | void>
  /** Callback to reconnect to file system */
  onReconnect?: () => Promise<boolean | void>
  /** Whether auto-sync is enabled */
  autoSyncEnabled?: boolean
  /** Current sync interval in seconds */
  syncInterval?: SyncInterval
  /** Callback when auto-sync setting changes */
  onAutoSyncChange?: (enabled: boolean) => void
  /** Callback when sync interval changes */
  onSyncIntervalChange?: (interval: SyncInterval) => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Status Configurations
// ============================================================================

const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: typeof Check | typeof Loader2 | typeof CloudOff | typeof AlertCircle
    label: string
    iconClass: string
    textClass: string
    bgClass: string
    animate?: boolean
  }
> = {
  synced: {
    icon: Check,
    label: 'Synced',
    iconClass: 'text-green-500',
    textClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    iconClass: 'text-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    animate: true,
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    iconClass: 'text-gray-400',
    textClass: 'text-gray-500 dark:text-gray-400',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
  },
  error: {
    icon: AlertCircle,
    label: 'Sync Error',
    iconClass: 'text-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
  },
}

// ============================================================================
// Helpers
// ============================================================================

function formatLastSyncTime(timestamp?: number): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp

  // Less than a minute
  if (diff < 60000) {
    return 'Just now'
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // Format as date
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ============================================================================
// SyncStatusIndicator Component
// ============================================================================

export function SyncStatusIndicator({
  status,
  lastSyncTime,
  pendingChanges = 0,
  isConnected = true,
  errorMessage,
  onSyncNow,
  onReconnect,
  autoSyncEnabled = true,
  syncInterval = 30,
  onAutoSyncChange,
  onSyncIntervalChange,
  className,
}: SyncStatusIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const toast = useToast()

  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  // Derive effective status from sync state
  const effectiveStatus = isSyncing ? 'syncing' : status
  const effectiveConfig = STATUS_CONFIG[effectiveStatus]
  const EffectiveIcon = effectiveConfig.icon

  const handleSyncNow = useCallback(async () => {
    if (!onSyncNow || isSyncing) return

    setIsSyncing(true)
    try {
      const result = await onSyncNow()
      if (result && result.success) {
        toast.success({
          title: 'Sync Complete',
          description: `Synced ${result.syncedNodes.length} file${result.syncedNodes.length !== 1 ? 's' : ''}`,
        })
      } else if (result && !result.success) {
        toast.error({
          title: 'Sync Failed',
          description:
            result.failedNodes[0]?.error ?? 'Unknown error during sync',
        })
      }
    } catch (error) {
      toast.error({
        title: 'Sync Failed',
        description:
          error instanceof Error ? error.message : 'Unknown error during sync',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [onSyncNow, isSyncing, toast])

  const handleReconnect = useCallback(async () => {
    if (!onReconnect || isReconnecting) return

    setIsReconnecting(true)
    try {
      const success = await onReconnect()
      if (success) {
        toast.success({
          title: 'Reconnected',
          description: 'File system connection restored',
        })
      } else {
        toast.error({
          title: 'Reconnection Failed',
          description: 'Could not reconnect to file system. Please try again.',
        })
      }
    } catch (error) {
      toast.error({
        title: 'Reconnection Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not reconnect to file system',
      })
    } finally {
      setIsReconnecting(false)
    }
  }, [onReconnect, isReconnecting, toast])

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1',
          'text-sm transition-colors',
          effectiveConfig.bgClass,
          effectiveConfig.textClass,
          'hover:opacity-80',
          className
        )}
        data-testid="sync-status"
        aria-label={`Sync status: ${effectiveConfig.label}. Click for details.`}
      >
        <EffectiveIcon
          className={cn(
            'h-4 w-4',
            effectiveConfig.iconClass,
            effectiveConfig.animate && 'animate-spin'
          )}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{effectiveConfig.label}</span>
        {pendingChanges > 0 && effectiveStatus !== 'syncing' && (
          <span
            className={cn(
              'ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
              'bg-amber-100 text-xs font-medium text-amber-700',
              'dark:bg-amber-900/50 dark:text-amber-300'
            )}
            aria-label={`${pendingChanges} pending change${pendingChanges > 1 ? 's' : ''}`}
          >
            {pendingChanges}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup role="dialog" aria-label="Sync details">
            <Popover.Arrow />

            <div className="relative">
              <Popover.Close aria-label="Close">
                <X className="h-4 w-4" aria-hidden="true" />
              </Popover.Close>

              <Popover.Title>Sync Status</Popover.Title>

              <div className="mt-3 space-y-3">
                {/* Current Status */}
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      config.iconClass,
                      config.animate && 'animate-spin'
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn('font-medium', config.textClass)}>
                    {config.label}
                  </span>
                </div>

                {/* Error Message */}
                {status === 'error' && errorMessage && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errorMessage}
                  </p>
                )}

                {/* Stats */}
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500 dark:text-gray-400">
                    Last sync
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {formatLastSyncTime(lastSyncTime)}
                  </dd>

                  <dt className="text-gray-500 dark:text-gray-400">
                    Pending changes
                  </dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {pendingChanges}
                  </dd>

                  <dt className="text-gray-500 dark:text-gray-400">
                    Connection
                  </dt>
                  <dd
                    className={cn(
                      isConnected
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </dd>
                </dl>

                {/* Actions */}
                <div className="flex flex-col gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                  {isConnected ? (
                    <Button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className={cn(
                        'inline-flex w-full items-center justify-center gap-2',
                        'rounded-md px-3 py-2 text-sm font-medium',
                        'bg-gray-900 text-white hover:bg-gray-800',
                        'dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                        'dark:focus-visible:ring-gray-300'
                      )}
                    >
                      <RefreshCw
                        className={cn('h-4 w-4', isSyncing && 'animate-spin')}
                        aria-hidden="true"
                      />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleReconnect}
                      disabled={isReconnecting}
                      className={cn(
                        'inline-flex w-full items-center justify-center gap-2',
                        'rounded-md px-3 py-2 text-sm font-medium',
                        'bg-blue-600 text-white hover:bg-blue-700',
                        'dark:bg-blue-500 dark:hover:bg-blue-600',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'focus-visible:ring-2 focus-visible:ring-blue-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                        'dark:focus-visible:ring-blue-300'
                      )}
                    >
                      <Link2
                        className={cn(
                          'h-4 w-4',
                          isReconnecting && 'animate-pulse'
                        )}
                        aria-hidden="true"
                      />
                      {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
                    </Button>
                  )}
                </div>

                {/* Sync Settings */}
                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <p className="text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    Settings
                  </p>

                  {/* Auto-sync toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-sync
                    </span>
                    <Switch
                      checked={autoSyncEnabled}
                      onCheckedChange={onAutoSyncChange}
                      aria-label="Enable auto-sync"
                    />
                  </div>

                  {/* Sync interval selector */}
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="sync-interval"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      Interval
                    </label>
                    <select
                      id="sync-interval"
                      value={syncInterval}
                      onChange={(e) =>
                        onSyncIntervalChange?.(
                          Number(
                            e.target.value
                          ) as (typeof SYNC_INTERVALS)[number]['value']
                        )
                      }
                      disabled={!autoSyncEnabled}
                      aria-label="Sync interval"
                      className={cn(
                        'rounded-md border border-gray-300 px-2 py-1 text-sm',
                        'bg-white text-gray-900',
                        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                        'focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 focus:outline-none',
                        'dark:focus:ring-gray-300',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      {SYNC_INTERVALS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
