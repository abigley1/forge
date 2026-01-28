import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { NuqsAdapter } from 'nuqs/adapters/react'
import App from './App'
import { ToastProvider } from '@/components/ui/Toast'

// Mock the API module to prevent network calls during tests
vi.mock('@/lib/api', () => ({
  api: {
    listProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createProject: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}))

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
      // Forge heading appears in sidebar and mobile header
      const forgeHeadings = screen.getAllByRole('heading', {
        level: 1,
        name: /forge/i,
      })
      expect(forgeHeadings.length).toBeGreaterThan(0)
    })
  })

  it('renders the AppShell layout with sidebar and main content', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('complementary', { name: /sidebar/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  it('displays welcome message', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(screen.getByText(/welcome to forge/i)).toBeInTheDocument()
    })
  })
})
