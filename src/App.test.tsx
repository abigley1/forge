import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Sidebar contains the h1 "Forge" heading
    expect(
      screen.getByRole('heading', { level: 1, name: /forge/i })
    ).toBeInTheDocument()
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
