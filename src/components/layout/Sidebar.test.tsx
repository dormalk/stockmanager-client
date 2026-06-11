import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './Sidebar'

vi.mock('../../components/ui/TickerInput', () => ({
  default: ({ value, onChange, onEnter, ariaLabel, placeholder, className }: {
    value: string; onChange: (v: string) => void; onEnter?: () => void;
    ariaLabel?: string; placeholder?: string; className?: string;
  }) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value.toUpperCase())}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
    />
  ),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderSidebar(initialPath = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    document.documentElement.className = 'dark'
  })

  it('renders 5 navigation items', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /portfolio/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /watchlist/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /compare/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trade history/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search ticker/i })).toBeInTheDocument()
  })

  it('navigates to /research/{TICKER} when ticker entered and Enter pressed', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const input = screen.getByRole('textbox', { name: /search ticker/i })
    await user.type(input, 'aapl{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/research/AAPL')
  })

  it('auto-uppercases ticker input', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const input = screen.getByRole('textbox', { name: /search ticker/i })
    await user.type(input, 'msft')
    expect((input as HTMLInputElement).value).toBe('MSFT')
  })

  it('collapses sidebar when collapse button clicked', async () => {
    const user = userEvent.setup()
    const { container } = renderSidebar()
    const sidebar = container.querySelector('.sidebar')
    expect(sidebar).not.toHaveClass('sidebar--collapsed')
    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }))
    expect(sidebar).toHaveClass('sidebar--collapsed')
  })

  it('persists collapse state to localStorage', async () => {
    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }))
    expect(localStorage.getItem('sidebar_collapsed')).toBe('true')
  })

  it('theme toggle button has aria-label', () => {
    renderSidebar()
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('toggles theme class on <html> when theme button clicked', async () => {
    const user = userEvent.setup()
    renderSidebar()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
