import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'

import { useAppStore } from '@/store/useAppStore'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from './AppShell'

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    sidebarOpen: true,
    activeView: 'outline',
  })
})

describe('AppShell', () => {
  it('renders with two-column layout', () => {
    renderWithToast(<AppShell>Content</AppShell>)

    expect(
      screen.getByRole('complementary', { name: /sidebar/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders children in main content area', () => {
    renderWithToast(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    )

    const main = screen.getByRole('main')
    expect(main).toContainElement(screen.getByTestId('test-content'))
  })

  it('renders skip link that receives focus on Tab', async () => {
    const user = userEvent.setup()
    renderWithToast(<AppShell>Content</AppShell>)

    await user.tab()

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveFocus()
  })

  it('skip link targets the main content area', () => {
    renderWithToast(<AppShell>Content</AppShell>)

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })

  it('main content area has tabIndex for focus management', () => {
    renderWithToast(<AppShell>Content</AppShell>)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })

  it('renders custom sidebar when provided', () => {
    renderWithToast(
      <AppShell sidebar={<div data-testid="custom-sidebar">Custom</div>}>
        Content
      </AppShell>
    )

    expect(screen.getByTestId('custom-sidebar')).toBeInTheDocument()
  })

  it('uses semantic HTML landmarks', () => {
    renderWithToast(<AppShell>Content</AppShell>)

    // aside element for sidebar
    expect(
      screen.getByRole('complementary', { name: /sidebar/i })
    ).toBeInTheDocument()

    // main element for content
    expect(screen.getByRole('main')).toBeInTheDocument()

    // nav element inside sidebar
    expect(
      screen.getByRole('navigation', { name: /main navigation/i })
    ).toBeInTheDocument()
  })

  it('applies h-dvh class for dynamic viewport height', () => {
    const { container } = renderWithToast(<AppShell>Content</AppShell>)

    const rootDiv = container.firstChild as HTMLElement
    expect(rootDiv).toHaveClass('h-dvh')
  })

  describe('mobile responsive behavior', () => {
    it('renders mobile menu toggle button', () => {
      renderWithToast(<AppShell>Content</AppShell>)

      // Mobile menu button should exist (visible at mobile breakpoint via CSS)
      const menuButton = screen.getByRole('button', {
        name: /close sidebar|open sidebar/i,
      })
      expect(menuButton).toBeInTheDocument()
    })

    it('menu toggle button has aria-expanded attribute', () => {
      renderWithToast(<AppShell>Content</AppShell>)

      const menuButton = screen.getByRole('button', {
        name: /close sidebar|open sidebar/i,
      })
      expect(menuButton).toHaveAttribute('aria-expanded')
    })

    it('menu toggle toggles sidebar state', async () => {
      const user = userEvent.setup()
      renderWithToast(<AppShell>Content</AppShell>)

      // Initially sidebar is open
      expect(useAppStore.getState().sidebarOpen).toBe(true)

      const menuButton = screen.getByRole('button', {
        name: /close sidebar/i,
      })
      await user.click(menuButton)

      // Sidebar should now be closed
      expect(useAppStore.getState().sidebarOpen).toBe(false)

      // Button text should change
      const openButton = screen.getByRole('button', {
        name: /open sidebar/i,
      })
      expect(openButton).toBeInTheDocument()
    })

    it('sidebar has responsive positioning classes', () => {
      renderWithToast(<AppShell>Content</AppShell>)

      const sidebar = screen.getByRole('complementary', { name: /sidebar/i })

      // Should have transform classes for mobile
      expect(sidebar).toHaveClass('transform')
      expect(sidebar).toHaveClass('transition-transform')

      // Should have static positioning on desktop (md: prefix)
      expect(sidebar).toHaveClass('md:static')
    })

    it('shows backdrop when sidebar is open on mobile', () => {
      renderWithToast(<AppShell>Content</AppShell>)

      // When sidebar is open, backdrop should be present
      // (visibility controlled by CSS md:hidden class)
      const backdrop = document.querySelector(
        '[aria-hidden="true"].fixed.inset-0'
      )
      expect(backdrop).toBeInTheDocument()
    })

    it('clicking backdrop closes sidebar', async () => {
      const user = userEvent.setup()
      renderWithToast(<AppShell>Content</AppShell>)

      expect(useAppStore.getState().sidebarOpen).toBe(true)

      const backdrop = document.querySelector(
        '[aria-hidden="true"].fixed.inset-0'
      )
      expect(backdrop).toBeInTheDocument()

      await user.click(backdrop as Element)

      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('sidebar is translated off-screen when closed', () => {
      // Close sidebar before render
      useAppStore.setState({ sidebarOpen: false })

      renderWithToast(<AppShell>Content</AppShell>)

      const sidebar = screen.getByRole('complementary', { name: /sidebar/i })
      expect(sidebar).toHaveClass('-translate-x-full')
    })

    it('sidebar is visible when open', () => {
      renderWithToast(<AppShell>Content</AppShell>)

      const sidebar = screen.getByRole('complementary', { name: /sidebar/i })
      expect(sidebar).toHaveClass('translate-x-0')
    })
  })
})
