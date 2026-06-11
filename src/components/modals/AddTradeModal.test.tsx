import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddTradeModal from './AddTradeModal'
import * as tradesApi from '../../api/trades'

vi.mock('../../api/trades')

function renderModal(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AddTradeModal onClose={onClose} />
    </QueryClientProvider>
  )
}

describe('AddTradeModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all required fields', () => {
    renderModal()
    expect(screen.getByLabelText(/ticker/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price per share/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('closes when Escape pressed', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when backdrop clicked', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('auto-uppercases ticker input', async () => {
    renderModal()
    const input = screen.getByLabelText(/ticker/i)
    await userEvent.type(input, 'msft')
    expect((input as HTMLInputElement).value).toBe('MSFT')
  })

  it('defaults trade type to BUY', () => {
    renderModal()
    const buyBtn = screen.getByText('BUY')
    expect(buyBtn).toHaveClass('segmented__btn--active')
  })

  it('commission field hidden by default, shown after link click', async () => {
    renderModal()
    expect(screen.queryByLabelText(/commission/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByText(/add commission/i))
    expect(screen.getByLabelText(/commission/i)).toBeInTheDocument()
  })

  it('submits trade and calls onClose on success', async () => {
    vi.mocked(tradesApi.createTrade).mockResolvedValue({
      trade: { id: 1, ticker: 'AAPL', trade_type: 'BUY', trade_date: '2024-01-15', price_per_share: 180, quantity: 10, commission: 0 },
      position: { id: 1, ticker: 'AAPL', shares_held: 10, avg_cost_basis: 180, total_cost_basis: 1800, first_buy_date: '2024-01-15', is_closed: false },
    })
    const onClose = vi.fn()
    renderModal(onClose)
    await userEvent.type(screen.getByLabelText(/ticker/i), 'AAPL')
    await userEvent.type(screen.getByLabelText(/price per share/i), '180')
    await userEvent.type(screen.getByLabelText(/quantity/i), '10')
    await userEvent.click(screen.getByRole('button', { name: /save trade/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('shows inline error on 422 sell-blocked response', async () => {
    vi.mocked(tradesApi.createTrade).mockRejectedValue({ status: 422, detail: 'Sell blocked — you hold 5 shares of AAPL' })
    renderModal()
    await userEvent.click(screen.getByText('SELL'))
    await userEvent.type(screen.getByLabelText(/ticker/i), 'AAPL')
    await userEvent.type(screen.getByLabelText(/price per share/i), '200')
    await userEvent.type(screen.getByLabelText(/quantity/i), '99')
    await userEvent.click(screen.getByRole('button', { name: /save trade/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sell blocked'))
  })

  it('submit button disabled when qty error is showing', async () => {
    vi.mocked(tradesApi.createTrade).mockRejectedValue({ status: 422, detail: 'Sell blocked — you hold 5 shares of AAPL' })
    renderModal()
    await userEvent.click(screen.getByText('SELL'))
    await userEvent.type(screen.getByLabelText(/ticker/i), 'AAPL')
    await userEvent.type(screen.getByLabelText(/price per share/i), '200')
    await userEvent.type(screen.getByLabelText(/quantity/i), '99')
    await userEvent.click(screen.getByRole('button', { name: /save trade/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /save trade/i })).toBeDisabled())
  })
})
