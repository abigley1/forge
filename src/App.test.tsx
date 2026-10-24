import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { NuqsAdapter } from 'nuqs/adapters/react'
import App from './App'
import { ToastProvider } from '@/components/ui/Toast'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NuqsAdapter>
      <ToastProvider>{ui}</ToastProvider>
    </NuqsAdapter>
  )
}

describe('App', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<App />)
    // Wait for initial load to complete
    await waitFor(() => {
      const forgeHeadings = screen.getAllByRole('heading', {
        level: 1,
        name: /forge/i,
      })
      expect(forgeHeadings.length).toBeGreaterThan(0)
    })
  })

  it('renders the AppShell layout with main content', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  it('displays welcome screen', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })
  })

  it('opens the 3D Design tool from ?tool=3d-design', async () => {
    window.history.replaceState(null, '', '/?tool=3d-design')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { queueVersion: 0, projects: [], unassigned: [] },
        }),
      })
    )
    try {
      renderWithProviders(<App />)
      expect(
        await screen.findByRole('heading', { level: 1, name: '3D Design' })
      ).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
      window.history.replaceState(null, '', '/')
    }
  })

  it('shows the workshop tools and no project-tracking entry points', async () => {
    renderWithProviders(<App />)
    expect(
      await screen.findByRole('button', { name: 'Print queue' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Inventory' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new project/i })).toBeNull()
    expect(screen.queryByText(/nodes/i)).toBeNull()
  })

  it('has a 3D Design button on the landing page', async () => {
    renderWithProviders(<App />)
    expect(
      await screen.findByRole('button', { name: '3D Design' })
    ).toBeInTheDocument()
  })
})
