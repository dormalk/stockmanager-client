import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MultiplesPanel from './MultiplesPanel'
import * as researchApi from '../../api/research'
import type { MultiplesData } from '../../api/research'

vi.mock('../../api/research')

let lastLayout: Record<string, unknown> | undefined

vi.mock('../ui/PlotComponent', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    lastLayout = props.layout
    return <div data-testid="plotly-chart" />
  },
}))

const MOCK_DATA: MultiplesData = {
  fetched_at: new Date().toISOString(),
  series: {
    pe_ttm:    [{ date: '2024-01-01', value: 28.5 }, { date: '2024-06-01', value: 25.0 }],
    ps_ratio:  [], ev_ebitda: [], fcf_yield: [],
    pb_ratio: [], p_fcf: [], p_cf: [], earnings_yield: [], forward_pe: [],
    ev_ebit: [], ev_revenue: [], ev_fcf: [], ev_gp: [], dividend_yield: [],
    shareholder_yield: [], peg: [], psg: [], rule_of_40: [],
  },
  group_structure: {
    'Price-Based': [{ key: 'pe_ttm', label: 'P/E TTM' }],
  },
}

const MOCK_FAVS = { favorites: ['pe_ttm'] }

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MultiplesPanel ticker="AAPL" />
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

describe('MultiplesPanel mobile legend toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastLayout = undefined
    vi.mocked(researchApi.fetchMultiples).mockResolvedValue(MOCK_DATA)
    vi.mocked(researchApi.fetchFavoriteMultiples).mockResolvedValue(MOCK_FAVS)
    vi.mocked(researchApi.saveFavoriteMultiples).mockResolvedValue(undefined)
  })

  afterEach(() => mockMobile(false))

  it('hides the legend by default on mobile so the chart is full-width', async () => {
    mockMobile(true)
    renderPanel()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    expect(lastLayout?.showlegend).toBe(false)
  })

  it('shows a Legend toggle button on mobile that reveals the legend when pressed', async () => {
    mockMobile(true)
    renderPanel()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    const toggle = screen.getByRole('button', { name: /toggle legend/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(lastLayout?.showlegend).toBe(true))
  })

  it('always shows the legend on desktop with no toggle button', async () => {
    mockMobile(false)
    renderPanel()
    await waitFor(() => screen.getByTestId('plotly-chart'))

    expect(lastLayout?.showlegend).toBe(true)
    expect(screen.queryByRole('button', { name: /toggle legend/i })).not.toBeInTheDocument()
  })
})
