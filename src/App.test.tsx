import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Forge heading appears in sidebar and mobile header
    const forgeHeadings = screen.getAllByRole('heading', {
      level: 1,
      name: /forge/i,
    })
    expect(forgeHeadings.length).toBeGreaterThan(0)
  })

  it('renders the AppShell layout with sidebar and main content', () => {
    render(<App />)
    expect(
      screen.getByRole('complementary', { name: /sidebar/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays welcome message', () => {
    render(<App />)
    expect(screen.getByText(/welcome to forge/i)).toBeInTheDocument()
  })
})
