import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PriceChart from './PriceChart'
import * as researchApi from '../../api/research'
import type { OHLCVData } from '../../api/research'

vi.mock('../../api/research')
vi.mock('react-plotly.js', () => ({
  default: ({ 'aria-label': label }: { 'aria-label'?: string }) => (
    <div data-testid="plotly-chart">{label}</div>
  ),
}))

const MOCK_DATA: OHLCVData = {
  range: 'D',
  fetched_at: new Date().toISOString(),
  candles: [
    { date: '2024-01-01', open: 150, high: 155, low: 148, close: 153, volume: 1_000_000 },
    { date: '2024-01-02', open: 153, high: 158, low: 151, close: 156, volume: 1_200_000 },
  ],
  sma50:  [{ date: '2024-01-01', value: 150 }],
  sma200: [{ date: '2024-01-01', value: 145 }],
  rsi:    [{ date: '2024-01-01', value: 55 }, { date: '2024-01-02', value: 60 },
           { date: '2024-01-03', value: 65 }, { date: '2024-01-04', value: 50 },
           { date: '2024-01-05', value: 45 }],
  macd:   [{ date: '2024-01-01', macd: 1.2, signal: 0.8, histogram: 0.4 },
           { date: '2024-01-02', macd: 1.5, signal: 1.0, histogram: 0.5 },
           { date: '2024-01-03', macd: 1.1, signal: 1.2, histogram: -0.1 },
           { date: '2024-01-04', macd: 0.9, signal: 1.1, histogram: -0.2 },
           { date: '2024-01-05', macd: 0.7, signal: 1.0, histogram: -0.3 }],
  patterns: [],
}

function renderChart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PriceChart ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('PriceChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all 6 range selector buttons', () => {
    vi.mocked(researchApi.fetchHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    for (const r of ['5m', '15m', '1H', 'D', 'W', 'M']) {
      expect(screen.getByRole('button', { name: r })).toBeInTheDocument()
    }
  })

  it('defaults to D selected', () => {
    vi.mocked(researchApi.fetchHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    expect(screen.getByRole('button', { name: 'D' })).toHaveClass('range-btn--active')
  })

  it('renders SMA toggle checkboxes', () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    expect(screen.getByRole('checkbox', { name: /SMA 50/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /SMA 200/i })).toBeInTheDocument()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(researchApi.fetchHistory).mockImplementation(() => new Promise(() => {}))
    renderChart()
    expect(document.querySelector('.skeleton')).toBeInTheDocument()
  })

  it('changes active range on button click', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    await userEvent.click(screen.getByRole('button', { name: 'W' }))
    expect(screen.getByRole('button', { name: 'W' })).toHaveClass('range-btn--active')
    expect(screen.getByRole('button', { name: 'D' })).not.toHaveClass('range-btn--active')
  })

  it('shows error state on fetch failure', async () => {
    vi.mocked(researchApi.fetchHistory).mockRejectedValue(new Error('Network error'))
    renderChart()
    await waitFor(() => expect(screen.getByText(/Failed to load price data/)).toBeInTheDocument())
  })

  it('renders RSI section header', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    await waitFor(() => expect(screen.getByRole('button', { name: /RSI/i })).toBeInTheDocument())
  })

  it('collapses RSI section on header click', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    await waitFor(() => screen.getByRole('button', { name: /RSI/i }))
    const rsiHeader = screen.getByRole('button', { name: /RSI/i })
    expect(rsiHeader).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(rsiHeader)
    expect(rsiHeader).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders MACD section header', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    await waitFor(() => expect(screen.getByRole('button', { name: /MACD/i })).toBeInTheDocument())
  })

  it('collapses MACD section on header click', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue(MOCK_DATA)
    renderChart()
    await waitFor(() => screen.getByRole('button', { name: /MACD/i }))
    const macdHeader = screen.getByRole('button', { name: /MACD/i })
    await userEvent.click(macdHeader)
    expect(macdHeader).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows insufficient data message when rsi is empty', async () => {
    vi.mocked(researchApi.fetchHistory).mockResolvedValue({ ...MOCK_DATA, candles: MOCK_DATA.candles, rsi: [] })
    renderChart()
    await waitFor(() => expect(screen.getByText(/Insufficient data/i)).toBeInTheDocument())
  })
})
