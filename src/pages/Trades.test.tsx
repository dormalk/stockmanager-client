import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Trades from './Trades'
import * as tradesApi from '../api/trades'
import type { TradeOut } from '../api/trades'

vi.mock('../api/trades')

const MOCK_TRADES: TradeOut[] = [
  { id: 1, ticker: 'AAPL', trade_type: 'BUY', trade_date: '2024-01-01', price_per_share: 150, quantity: 10, commission: 0 },
  { id: 2, ticker: 'MSFT', trade_type: 'BUY', trade_date: '2024-02-01', price_per_share: 300, quantity: 5, commission: 0 },
]

function renderTrades(initialEntries: string[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Trades />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Trades page', () => {
  beforeEach(() => {
    vi.mocked(tradesApi.fetchTrades).mockResolvedValue(MOCK_TRADES)
  })

  it('shows all trades when no ticker query param is present', async () => {
    renderTrades(['/trades'])
    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter trades by ticker/i)).toHaveValue('')
  })

  it('pre-fills and filters by the ticker query param', async () => {
    renderTrades(['/trades?ticker=AAPL'])
    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/filter trades by ticker/i)).toHaveValue('AAPL')
  })

  it('uppercases a lowercase ticker query param', async () => {
    renderTrades(['/trades?ticker=aapl'])
    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/filter trades by ticker/i)).toHaveValue('AAPL')
  })

  it('shows all trades when the ticker query param is empty', async () => {
    renderTrades(['/trades?ticker='])
    expect(await screen.findByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter trades by ticker/i)).toHaveValue('')
  })

  it('filter input remains editable after being pre-filled', async () => {
    renderTrades(['/trades?ticker=AAPL'])
    await screen.findByText('AAPL')

    const input = screen.getByLabelText(/filter trades by ticker/i)
    await userEvent.clear(input)
    expect(input).toHaveValue('')
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })
})
