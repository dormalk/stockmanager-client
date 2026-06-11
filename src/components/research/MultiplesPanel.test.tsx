import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MultiplesPanel from './MultiplesPanel'
import * as researchApi from '../../api/research'
import type { MultiplesData } from '../../api/research'

vi.mock('../../api/research')
vi.mock('react-plotly.js', () => ({ default: () => <div data-testid="plotly" /> }))

const MOCK_DATA: MultiplesData = {
  fetched_at: new Date().toISOString(),
  series: {
    pe_ttm:    [{ date: '2024-01-01', value: 28.5 }, { date: '2024-06-01', value: 25.0 }],
    ps_ratio:  [{ date: '2024-01-01', value: 7.2  }],
    ev_ebitda: [],
    fcf_yield: [],
    pb_ratio: [], p_fcf: [], p_cf: [], earnings_yield: [], forward_pe: [],
    ev_ebit: [], ev_revenue: [], ev_fcf: [], ev_gp: [], dividend_yield: [],
    shareholder_yield: [], peg: [], psg: [], rule_of_40: [],
  },
  group_structure: {
    'Price-Based': [
      { key: 'pe_ttm', label: 'P/E TTM' },
      { key: 'ps_ratio', label: 'P/S' },
      { key: 'pb_ratio', label: 'P/B' },
    ],
    'EV-Based': [
      { key: 'ev_ebitda', label: 'EV/EBITDA' },
    ],
  },
}

const MOCK_FAVS = { favorites: ['pe_ttm', 'ev_ebitda', 'fcf_yield', 'ps_ratio'] }

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MultiplesPanel ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('MultiplesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(researchApi.fetchMultiples).mockResolvedValue(MOCK_DATA)
    vi.mocked(researchApi.fetchFavoriteMultiples).mockResolvedValue(MOCK_FAVS)
    vi.mocked(researchApi.saveFavoriteMultiples).mockResolvedValue(undefined)
  })

  it('shows skeleton while loading', () => {
    vi.mocked(researchApi.fetchMultiples).mockImplementation(() => new Promise(() => {}))
    vi.mocked(researchApi.fetchFavoriteMultiples).mockImplementation(() => new Promise(() => {}))
    renderPanel()
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('renders multiple group labels', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByText('Price-Based')).toBeInTheDocument())
    expect(screen.getByText('EV-Based')).toBeInTheDocument()
  })

  it('renders individual multiple labels', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByText('P/E TTM')).toBeInTheDocument())
    expect(screen.getByText('P/S')).toBeInTheDocument()
  })

  it('renders Absolute and % Change toggle buttons', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByText('Absolute')).toBeInTheDocument())
    expect(screen.getByText('% Change')).toBeInTheDocument()
  })

  it('Absolute is active by default', async () => {
    renderPanel()
    await waitFor(() => screen.getByText('Absolute'))
    expect(screen.getByText('Absolute')).toHaveClass('mode-btn--active')
  })

  it('toggles to % Change mode', async () => {
    renderPanel()
    await waitFor(() => screen.getByText('% Change'))
    await userEvent.click(screen.getByText('% Change'))
    expect(screen.getByText('% Change')).toHaveClass('mode-btn--active')
    expect(screen.getByText('Absolute')).not.toHaveClass('mode-btn--active')
  })

  it('marks favorited items with filled star', async () => {
    renderPanel()
    await waitFor(() => screen.getByText('P/E TTM'))
    const favBtns = document.querySelectorAll('.fav-btn--active')
    expect(favBtns.length).toBeGreaterThan(0)
  })

  it('shows N/A for multiples with no data', async () => {
    renderPanel()
    await waitFor(() => screen.getAllByText(/N\/A/))
  })

  it('renders + Add Stock input field', async () => {
    renderPanel()
    await waitFor(() => screen.getByRole('textbox', { name: /add comparison ticker/i }))
  })

  it('adds comparison ticker on Enter', async () => {
    vi.mocked(researchApi.fetchMultiplesCompare).mockResolvedValue({ 'AAPL': [], 'MSFT': [] })
    renderPanel()
    await waitFor(() => screen.getByRole('textbox', { name: /add comparison ticker/i }))
    const input = screen.getByRole('textbox', { name: /add comparison ticker/i })
    await userEvent.type(input, 'MSFT{Enter}')
    await waitFor(() => expect(screen.getAllByText(/MSFT/).length).toBeGreaterThan(0))
  })
})
