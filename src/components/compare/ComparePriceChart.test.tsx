import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ComparePriceChart from './ComparePriceChart'
import * as compareApi from '../../api/compare'

vi.mock('../../api/compare')

// Stub PlotComponent so dynamic plotly.js-dist-min import doesn't hang in jsdom
vi.mock('../ui/PlotComponent', () => ({
  default: () => <div data-testid="plotly-chart" />,
}))

const MOCK_HISTORY: compareApi.PriceHistoryData = {
  tickers: ['AAPL', 'MSFT'],
  series: {
    AAPL: [
      { date: '2024-01-01', value: 0.0 },
      { date: '2024-02-01', value: 5.0 },
      { date: '2024-03-01', value: 8.5 },
    ],
    MSFT: [
      { date: '2024-01-01', value: 0.0 },
      { date: '2024-02-01', value: 3.2 },
      { date: '2024-03-01', value: 11.0 },
    ],
  },
}

function renderChart(tickers = ['AAPL', 'MSFT']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ComparePriceChart tickers={tickers} />
    </QueryClientProvider>
  )
}

describe('ComparePriceChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders range selector buttons 1M 3M 6M 1Y', () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    for (const r of ['1M', '3M', '6M', '1Y']) {
      expect(screen.getByRole('button', { name: r })).toBeInTheDocument()
    }
  })

  it('defaults to 1Y active range', () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    expect(screen.getByRole('button', { name: '1Y' })).toHaveClass('range-btn--active')
    expect(screen.getByRole('button', { name: '1M' })).not.toHaveClass('range-btn--active')
  })

  it('shows skeleton while loading', () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    expect(document.querySelector('.skeleton')).toBeInTheDocument()
  })

  it('shows error message and retry button on failure', async () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockRejectedValue(new Error('fail'))
    renderChart()
    await waitFor(() => expect(screen.getByText(/Failed to load price history/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
  })

  it('renders section with correct aria-label', () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    expect(screen.getByRole('region', { name: /Price performance comparison chart, 1Y/i }))
      .toBeInTheDocument()
  })

  it('renders chart section label', async () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockResolvedValue(MOCK_HISTORY)
    renderChart()
    await waitFor(() => expect(screen.getByText('Price Performance')).toBeInTheDocument())
  })

  it('changes active range on button click', async () => {
    vi.mocked(compareApi.fetchComparePriceHistory).mockResolvedValue(MOCK_HISTORY)
    renderChart()
    await userEvent.click(screen.getByRole('button', { name: '3M' }))
    expect(screen.getByRole('button', { name: '3M' })).toHaveClass('range-btn--active')
    expect(screen.getByRole('button', { name: '1Y' })).not.toHaveClass('range-btn--active')
  })
})
