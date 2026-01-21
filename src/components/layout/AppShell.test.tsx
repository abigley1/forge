import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders with two-column layout', () => {
    render(<AppShell>Content</AppShell>)

    expect(
      screen.getByRole('complementary', { name: /sidebar/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders children in main content area', () => {
    render(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    )

    const main = screen.getByRole('main')
    expect(main).toContainElement(screen.getByTestId('test-content'))
  })

  it('renders skip link that receives focus on Tab', async () => {
    const user = userEvent.setup()
    render(<AppShell>Content</AppShell>)

    await user.tab()

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveFocus()
  })

  it('skip link targets the main content area', () => {
    render(<AppShell>Content</AppShell>)

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })

  it('main content area has tabIndex for focus management', () => {
    render(<AppShell>Content</AppShell>)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })

  it('renders custom sidebar when provided', () => {
    render(
      <AppShell sidebar={<div data-testid="custom-sidebar">Custom</div>}>
        Content
      </AppShell>
    )

    expect(screen.getByTestId('custom-sidebar')).toBeInTheDocument()
  })

  it('uses semantic HTML landmarks', () => {
    render(<AppShell>Content</AppShell>)

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
    const { container } = render(<AppShell>Content</AppShell>)

    const rootDiv = container.firstChild as HTMLElement
    expect(rootDiv).toHaveClass('h-dvh')
  })
})
