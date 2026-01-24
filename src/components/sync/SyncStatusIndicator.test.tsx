/**
 * SyncStatusIndicator Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { ToastProvider } from '@/components/ui'

// Wrapper with required providers
function renderWithProviders(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('SyncStatusIndicator', () => {
  describe('status display', () => {
    it('shows synced status with green check', () => {
      renderWithProviders(<SyncStatusIndicator status="synced" />)

      const indicator = screen.getByTestId('sync-status')
      expect(indicator).toHaveTextContent('Synced')
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Synced')
      )
    })

    it('shows syncing status with spinner', () => {
      renderWithProviders(<SyncStatusIndicator status="syncing" />)

      const indicator = screen.getByTestId('sync-status')
      expect(indicator).toHaveTextContent('Syncing')
    })

    it('shows offline status', () => {
      renderWithProviders(<SyncStatusIndicator status="offline" />)

      const indicator = screen.getByTestId('sync-status')
      expect(indicator).toHaveTextContent('Offline')
    })

    it('shows error status', () => {
      renderWithProviders(
        <SyncStatusIndicator status="error" errorMessage="Failed to sync" />
      )

      const indicator = screen.getByTestId('sync-status')
      expect(indicator).toHaveTextContent('Sync Error')
    })

    it('shows pending changes badge', () => {
      renderWithProviders(
        <SyncStatusIndicator status="synced" pendingChanges={3} />
      )

      const indicator = screen.getByTestId('sync-status')
      expect(indicator).toHaveTextContent('3')
      expect(screen.getByLabelText('3 pending changes')).toBeInTheDocument()
    })

    it('hides pending badge when syncing', () => {
      renderWithProviders(
        <SyncStatusIndicator status="syncing" pendingChanges={3} />
      )

      expect(screen.queryByLabelText(/pending change/)).not.toBeInTheDocument()
    })
  })

  describe('popover', () => {
    it('opens popover on click', async () => {
      const user = userEvent.setup()
      renderWithProviders(<SyncStatusIndicator status="synced" />)

      const trigger = screen.getByTestId('sync-status')
      await user.click(trigger)

      // Popover should be visible
      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(dialog).toBeInTheDocument()
    })

    it('shows last sync time in popover', async () => {
      const user = userEvent.setup()
      const lastSync = Date.now() - 60000 // 1 minute ago

      renderWithProviders(
        <SyncStatusIndicator status="synced" lastSyncTime={lastSync} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Last sync')).toBeInTheDocument()
      expect(within(dialog).getByText('1 minute ago')).toBeInTheDocument()
    })

    it('shows "Never" when no last sync time', async () => {
      const user = userEvent.setup()

      renderWithProviders(<SyncStatusIndicator status="offline" />)

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Never')).toBeInTheDocument()
    })

    it('shows pending changes count in popover', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator status="synced" pendingChanges={5} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Pending changes')).toBeInTheDocument()
      // The dl/dd structure should show 5
      const dd = within(dialog).getAllByRole('definition')
      expect(dd.some((el) => el.textContent === '5')).toBe(true)
    })

    it('shows connection status', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator status="synced" isConnected={true} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Connection')).toBeInTheDocument()
      expect(within(dialog).getByText('Connected')).toBeInTheDocument()
    })

    it('shows disconnected status', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator status="offline" isConnected={false} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Disconnected')).toBeInTheDocument()
    })

    it('shows error message in popover', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="error"
          errorMessage="Network connection lost"
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(
        within(dialog).getByText('Network connection lost')
      ).toBeInTheDocument()
    })

    it('closes popover on close button click', async () => {
      const user = userEvent.setup()

      renderWithProviders(<SyncStatusIndicator status="synced" />)

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(dialog).toBeInTheDocument()

      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)

      // Dialog should be gone
      expect(
        screen.queryByRole('dialog', { name: 'Sync details' })
      ).not.toBeInTheDocument()
    })
  })

  describe('sync now button', () => {
    it('shows sync now button when connected', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          isConnected={true}
          onSyncNow={vi.fn()}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(
        within(dialog).getByRole('button', { name: 'Sync Now' })
      ).toBeInTheDocument()
    })

    it('calls onSyncNow when clicked', async () => {
      const user = userEvent.setup()
      const onSyncNow = vi.fn().mockResolvedValue({
        success: true,
        syncedNodes: [
          { path: '/test.md', success: true, direction: 'toFileSystem' },
        ],
        failedNodes: [],
        startedAt: Date.now(),
        completedAt: Date.now(),
      })

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          isConnected={true}
          onSyncNow={onSyncNow}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const syncButton = within(dialog).getByRole('button', {
        name: 'Sync Now',
      })
      await user.click(syncButton)

      expect(onSyncNow).toHaveBeenCalled()
    })

    it('shows syncing state while sync in progress', async () => {
      const user = userEvent.setup()

      // Create a promise that we can control
      let resolveSync: (value: unknown) => void
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve
      })
      const onSyncNow = vi.fn().mockReturnValue(syncPromise)

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          isConnected={true}
          onSyncNow={onSyncNow}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const syncButton = within(dialog).getByRole('button', {
        name: 'Sync Now',
      })
      await user.click(syncButton)

      // Button should show syncing
      expect(
        within(dialog).getByRole('button', { name: 'Syncing...' })
      ).toBeDisabled()

      // Resolve the sync
      resolveSync!({ success: true, syncedNodes: [], failedNodes: [] })
    })
  })

  describe('reconnect button', () => {
    it('shows reconnect button when disconnected', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="offline"
          isConnected={false}
          onReconnect={vi.fn()}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(
        within(dialog).getByRole('button', { name: 'Reconnect' })
      ).toBeInTheDocument()
    })

    it('calls onReconnect when clicked', async () => {
      const user = userEvent.setup()
      const onReconnect = vi.fn().mockResolvedValue(undefined)

      renderWithProviders(
        <SyncStatusIndicator
          status="offline"
          isConnected={false}
          onReconnect={onReconnect}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const reconnectButton = within(dialog).getByRole('button', {
        name: 'Reconnect',
      })
      await user.click(reconnectButton)

      expect(onReconnect).toHaveBeenCalled()
    })
  })

  describe('time formatting', () => {
    it('shows "Just now" for recent sync', async () => {
      const user = userEvent.setup()
      const lastSync = Date.now() - 30000 // 30 seconds ago

      renderWithProviders(
        <SyncStatusIndicator status="synced" lastSyncTime={lastSync} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('Just now')).toBeInTheDocument()
    })

    it('shows minutes for sync within hour', async () => {
      const user = userEvent.setup()
      const lastSync = Date.now() - 5 * 60000 // 5 minutes ago

      renderWithProviders(
        <SyncStatusIndicator status="synced" lastSyncTime={lastSync} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('5 minutes ago')).toBeInTheDocument()
    })

    it('shows hours for sync within day', async () => {
      const user = userEvent.setup()
      const lastSync = Date.now() - 2 * 3600000 // 2 hours ago

      renderWithProviders(
        <SyncStatusIndicator status="synced" lastSyncTime={lastSync} />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(within(dialog).getByText('2 hours ago')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper aria-label on trigger', () => {
      renderWithProviders(<SyncStatusIndicator status="synced" />)

      const trigger = screen.getByTestId('sync-status')
      expect(trigger).toHaveAttribute(
        'aria-label',
        'Sync status: Synced. Click for details.'
      )
    })

    it('popover has proper role and label', async () => {
      const user = userEvent.setup()

      renderWithProviders(<SyncStatusIndicator status="synced" />)

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      expect(dialog).toBeInTheDocument()
    })

    it('close button has accessible name', async () => {
      const user = userEvent.setup()

      renderWithProviders(<SyncStatusIndicator status="synced" />)

      await user.click(screen.getByTestId('sync-status'))

      const closeButton = await screen.findByRole('button', { name: 'Close' })
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('sync settings', () => {
    it('shows auto-sync toggle in popover', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          autoSyncEnabled={true}
          syncInterval={30}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const toggle = within(dialog).getByRole('switch', {
        name: 'Enable auto-sync',
      })
      expect(toggle).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('calls onAutoSyncChange when toggle is clicked', async () => {
      const user = userEvent.setup()
      const onAutoSyncChange = vi.fn()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          autoSyncEnabled={true}
          syncInterval={30}
          onAutoSyncChange={onAutoSyncChange}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const toggle = within(dialog).getByRole('switch', {
        name: 'Enable auto-sync',
      })
      await user.click(toggle)

      expect(onAutoSyncChange).toHaveBeenCalled()
      expect(onAutoSyncChange.mock.calls[0][0]).toBe(false)
    })

    it('shows sync interval selector in popover', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          autoSyncEnabled={true}
          syncInterval={60}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const select = within(dialog).getByRole('combobox', {
        name: 'Sync interval',
      })
      expect(select).toBeInTheDocument()
      expect(select).toHaveValue('60')
    })

    it('calls onSyncIntervalChange when interval is changed', async () => {
      const user = userEvent.setup()
      const onSyncIntervalChange = vi.fn()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          autoSyncEnabled={true}
          syncInterval={30}
          onSyncIntervalChange={onSyncIntervalChange}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const select = within(dialog).getByRole('combobox', {
        name: 'Sync interval',
      })
      await user.selectOptions(select, '300')

      expect(onSyncIntervalChange).toHaveBeenCalledWith(300)
    })

    it('disables interval selector when auto-sync is disabled', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <SyncStatusIndicator
          status="synced"
          autoSyncEnabled={false}
          syncInterval={30}
        />
      )

      await user.click(screen.getByTestId('sync-status'))

      const dialog = await screen.findByRole('dialog', { name: 'Sync details' })
      const select = within(dialog).getByRole('combobox', {
        name: 'Sync interval',
      })
      expect(select).toBeDisabled()
    })
  })
})
