import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CompareMultipleChart from './CompareMultipleChart'
import * as researchApi from '../../api/research'

vi.mock('../../api/research')

// Stub PlotComponent so dynamic plotly.js-dist-min import doesn't hang in jsdom
vi.mock('../ui/PlotComponent', () => ({
  default: () => <div data-testid="plotly-chart" />,
}))

const MOCK_DATA: Record<string, researchApi.MultiplePoint[]> = {
  AAPL: [{ date: '2024-01-01', value: 10 }, { date: '2024-02-01', value: 12 }],
  MSFT: [{ date: '2024-01-01', value: 20 }, { date: '2024-02-01', value: 22 }],
}

function renderChart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CompareMultipleChart tickers={['AAPL', 'MSFT']} metric="pe" metricLabel="P/E" />
    </QueryClientProvider>
  )
}

function mockMobile(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('CompareMultipleChart mobile layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(researchApi.fetchMultiplesCompare).mockResolvedValue(MOCK_DATA)
  })

  afterEach(() => mockMobile(false))

  it('renders the chart full-width with no horizontal padding on mobile', async () => {
    mockMobile(true)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    const wrapper = screen.getByLabelText(/P\/E comparison chart/i)
    expect(wrapper.getAttribute('style')).toContain('padding: var(--space-sm) 0 0')
  })

  it('keeps the range selector padded for readability on mobile', async () => {
    mockMobile(true)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    const rangeSelector = screen.getByRole('button', { name: '1Y' }).parentElement
    expect(rangeSelector?.getAttribute('style')).toContain('padding: 0 var(--space-md)')
  })

  it('has no inline padding override on desktop', async () => {
    mockMobile(false)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    const wrapper = screen.getByLabelText(/P\/E comparison chart/i)
    expect(wrapper).not.toHaveAttribute('style')
  })
})
