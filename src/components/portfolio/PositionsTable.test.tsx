import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PositionsTable from './PositionsTable'
import type { EnrichedPosition } from '../../api/portfolio'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const POSITIONS: EnrichedPosition[] = [
  {
    id: 1, ticker: 'AAPL', company_name: 'Apple Inc.', sector: 'Technology',
    shares_held: 10, avg_cost_basis: 150, total_cost_basis: 1500,
    first_buy_date: '2024-01-01', is_closed: false,
    current_price: 185, current_value: 1850, day_change: 1.5, day_change_pct: 0.8,
    unrealized_pnl: 350, unrealized_pnl_pct: 23.33,
  },
  {
    id: 2, ticker: 'MSFT', company_name: 'Microsoft Corp.', sector: 'Technology',
    shares_held: 5, avg_cost_basis: 300, total_cost_basis: 1500,
    first_buy_date: '2024-02-01', is_closed: false,
    current_price: 280, current_value: 1400, day_change: -2, day_change_pct: -0.7,
    unrealized_pnl: -100, unrealized_pnl_pct: -6.67,
  },
]

function renderTable(props: Partial<Parameters<typeof PositionsTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PositionsTable positions={POSITIONS} loading={false} {...props} />
    </MemoryRouter>
  )
}

describe('PositionsTable', () => {
  it('renders all position rows', () => {
    renderTable()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('shows skeleton rows when loading', () => {
    renderTable({ loading: true, positions: [] })
    const skeletons = document.querySelectorAll('.skeleton-row')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no positions', () => {
    renderTable({ positions: [] })
    expect(screen.getByText(/No positions/)).toBeInTheDocument()
  })

  it('shows stale price warning when hasStalePrice', () => {
    renderTable({ hasStalePrice: true })
    expect(screen.getByText(/Prices may be stale/)).toBeInTheDocument()
  })

  it('bull-colors positive P&L', () => {
    renderTable()
    const pnlCell = screen.getAllByText('+$350.00')[0]
    expect(pnlCell).toHaveClass('color-bull')
  })

  it('bear-colors negative P&L', () => {
    renderTable()
    const bearCells = document.querySelectorAll('.color-bear')
    expect(bearCells.length).toBeGreaterThan(0)
  })

  it('navigates to research on row click', async () => {
    renderTable()
    const rows = document.querySelectorAll('.position-row')
    await userEvent.click(rows[0])
    expect(mockNavigate).toHaveBeenCalledWith('/research/AAPL')
  })

  it('sorts by ticker ascending on first header click', async () => {
    renderTable()
    await userEvent.click(screen.getByRole('columnheader', { name: /ticker/i }))
    const rows = document.querySelectorAll('.position-row')
    expect(rows[0].textContent).toContain('AAPL')
  })

  it('cycles sort: asc → desc → none', async () => {
    renderTable()
    const tickerHeader = screen.getByRole('columnheader', { name: /ticker/i })
    await userEvent.click(tickerHeader)
    expect(tickerHeader).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(tickerHeader)
    expect(tickerHeader).toHaveAttribute('aria-sort', 'descending')
    await userEvent.click(tickerHeader)
    expect(tickerHeader).not.toHaveAttribute('aria-sort')
  })

  it('hides closed positions by default', () => {
    const withClosed: EnrichedPosition[] = [
      ...POSITIONS,
      { ...POSITIONS[0], id: 3, ticker: 'OLD', is_closed: true, company_name: 'Old Corp.' },
    ]
    renderTable({ positions: withClosed })
    expect(screen.queryByText('OLD')).not.toBeInTheDocument()
  })

  it('shows closed positions after toggle', async () => {
    const withClosed: EnrichedPosition[] = [
      ...POSITIONS,
      { ...POSITIONS[0], id: 3, ticker: 'OLD', is_closed: true, company_name: 'Old Corp.' },
    ]
    renderTable({ positions: withClosed })
    await userEvent.click(screen.getByRole('checkbox', { name: /show closed/i }))
    expect(screen.getByText('OLD')).toBeInTheDocument()
  })
})
