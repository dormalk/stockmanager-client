import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SectorPerformanceChart from './SectorPerformanceChart'
import * as researchApi from '../../api/research'

vi.mock('../../api/research')

let lastLayout: Record<string, unknown> | undefined

vi.mock('../ui/PlotComponent', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    lastLayout = props.layout
    return <div data-testid="plotly-chart" />
  },
}))

const MOCK_DATA: researchApi.SectorPerformanceData = {
  ticker: 'AAPL',
  etf: 'XLK',
  etf_label: 'Technology',
  sector: 'Technology',
  series: {
    AAPL: [{ date: '2024-01-01', value: 1 }, { date: '2024-02-01', value: 2 }],
    XLK:  [{ date: '2024-01-01', value: 0.5 }, { date: '2024-02-01', value: 1.5 }],
  },
}

function renderChart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SectorPerformanceChart ticker="AAPL" />
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

describe('SectorPerformanceChart mobile legend toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastLayout = undefined
    vi.mocked(researchApi.fetchSectorPerformance).mockResolvedValue(MOCK_DATA)
  })

  afterEach(() => mockMobile(false))

  it('hides the legend by default on mobile so the chart is full-width', async () => {
    mockMobile(true)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    expect(lastLayout?.showlegend).toBe(false)
  })

  it('shows a Legend toggle button on mobile that reveals the legend when pressed', async () => {
    mockMobile(true)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    const toggle = screen.getByRole('button', { name: /toggle legend/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(lastLayout?.showlegend).toBe(true))
  })

  it('always shows the legend on desktop with no toggle button', async () => {
    mockMobile(false)
    renderChart()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    expect(lastLayout?.showlegend).toBe(true)
    expect(screen.queryByRole('button', { name: /toggle legend/i })).not.toBeInTheDocument()
  })
})
