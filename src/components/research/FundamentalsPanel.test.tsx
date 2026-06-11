import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FundamentalsPanel from './FundamentalsPanel'
import * as researchApi from '../../api/research'
import type { FundamentalsData } from '../../api/research'

vi.mock('../../api/research')

const MOCK_DATA: FundamentalsData = {
  company_name: 'Apple Inc.',
  sector: 'Technology',
  fetched_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
  is_stale: false,
  metrics: [
    { key: 'pe_ttm',      value: 28.5, verdict: 'bear',    tooltip: 'P/E tooltip' },
    { key: 'net_margin',  value: 0.26, verdict: 'bull',    tooltip: 'Margin tooltip' },
    { key: 'beta',        value: null, verdict: 'neutral', tooltip: 'Beta tooltip' },
  ],
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <FundamentalsPanel ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('FundamentalsPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows skeleton while loading', () => {
    vi.mocked(researchApi.fetchFundamentals).mockImplementation(
      () => new Promise(() => {})
    )
    renderPanel()
    const skeletons = document.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders metric rows after load', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => expect(screen.getByText('P/E (TTM)')).toBeInTheDocument())
    expect(screen.getByText('Net Margin')).toBeInTheDocument()
  })

  it('applies bull color class to favorable metrics', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText('Net Margin'))
    const bullValue = document.querySelector('.color-bull')
    expect(bullValue).toBeInTheDocument()
  })

  it('applies bear color class to concerning metrics', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText('P/E (TTM)'))
    const bearValue = document.querySelector('.color-bear')
    expect(bearValue).toBeInTheDocument()
  })

  it('shows N/A for null values in neutral color', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText('Beta'))
    const naEl = screen.getByText('N/A')
    expect(naEl).toHaveClass('color-neutral')
  })

  it('shows legend at panel top', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => expect(screen.getByText(/Green = favorable/)).toBeInTheDocument())
  })

  it('shows freshness timestamp', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => expect(screen.getByText(/Last updated/)).toBeInTheDocument())
  })

  it('shows inline error on fetch failure', async () => {
    vi.mocked(researchApi.fetchFundamentals).mockRejectedValue(new Error('Network error'))
    renderPanel()
    await waitFor(() => expect(screen.getByText(/Failed to load fundamentals/)).toBeInTheDocument())
  })
})
