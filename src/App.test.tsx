import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /forge/i })).toBeInTheDocument()
  })

  it('renders Vite and React logos with proper alt text', () => {
    render(<App />)
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument()
    expect(screen.getByAltText('React logo')).toBeInTheDocument()
  })

  it('increments counter when button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: /count is 0/i })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(
      screen.getByRole('button', { name: /count is 1/i })
    ).toBeInTheDocument()

    await user.click(button)
    expect(
      screen.getByRole('button', { name: /count is 2/i })
    ).toBeInTheDocument()
  })
})
