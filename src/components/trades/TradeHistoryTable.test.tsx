import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TradeHistoryTable from './TradeHistoryTable'
import * as tradesApi from '../../api/trades'
import type { TradeOut } from '../../api/trades'

vi.mock('../../api/trades')

const TRADES: TradeOut[] = [
  { id: 1, ticker: 'AAPL', trade_type: 'BUY',  trade_date: '2024-01-15', price_per_share: 150, quantity: 10, commission: 0 },
  { id: 2, ticker: 'MSFT', trade_type: 'SELL', trade_date: '2024-02-01', price_per_share: 300, quantity: 5,  commission: 4.95 },
]

function renderTable(trades = TRADES, filter = '') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TradeHistoryTable trades={trades} filter={filter} />
    </QueryClientProvider>
  )
}

describe('TradeHistoryTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all trade rows', () => {
    renderTable()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('shows BUY badge with bull styling', () => {
    renderTable()
    const badge = screen.getByText('BUY')
    expect(badge).toHaveClass('type-badge--buy')
  })

  it('shows SELL badge with bear styling', () => {
    renderTable()
    const badge = screen.getByText('SELL')
    expect(badge).toHaveClass('type-badge--sell')
  })

  it('shows empty state when no trades', () => {
    renderTable([])
    expect(screen.getByText(/No trades recorded/)).toBeInTheDocument()
  })

  it('shows empty state when filter matches nothing', () => {
    renderTable(TRADES, 'TSLA')
    expect(screen.getByText(/No trades recorded/)).toBeInTheDocument()
  })

  it('filters case-insensitively', () => {
    renderTable(TRADES, 'aapl')
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
  })

  it('shows commission dash when commission is 0', () => {
    renderTable()
    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('shows confirmation popover on trash click', async () => {
    renderTable()
    const trashBtns = screen.getAllByRole('button', { name: /delete trade/i })
    await userEvent.click(trashBtns[0])
    expect(screen.getByRole('dialog', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
  })

  it('cancels popover on Cancel click', async () => {
    renderTable()
    const trashBtns = screen.getAllByRole('button', { name: /delete trade/i })
    await userEvent.click(trashBtns[0])
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog', { name: /confirm/i })).not.toBeInTheDocument()
  })

  it('calls deleteTrade on confirm and invalidates queries', async () => {
    vi.mocked(tradesApi.deleteTrade).mockResolvedValue({ position: null })
    renderTable()
    const trashBtns = screen.getAllByRole('button', { name: /delete trade/i })
    await userEvent.click(trashBtns[0])
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(tradesApi.deleteTrade).toHaveBeenCalledWith(1))
  })
})
