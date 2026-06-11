import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Compare from './Compare'
import * as compareApi from '../api/compare'

vi.mock('../api/compare')

const MOCK_DATA: compareApi.CompareData = {
  tickers: ['AAPL', 'MSFT'],
  rows: [
    { key: 'company_name', label: 'Company Name' },
    { key: 'pe_ttm',       label: 'P/E (TTM)'    },
  ],
  data: {
    AAPL: { company_name: 'Apple Inc.', pe_ttm: 28.5 },
    MSFT: { company_name: 'Microsoft', pe_ttm: 35.0 },
  },
  best: { company_name: null, pe_ttm: 'AAPL' },
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Compare /></MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Compare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(compareApi.fetchSavedComparisons).mockResolvedValue([])
  })

  it('shows empty state initially', () => {
    renderPage()
    expect(screen.getByText(/Enter 2–3 tickers/)).toBeInTheDocument()
  })

  it('renders ticker inputs', () => {
    renderPage()
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(2)
  })

  it('renders comparison table after comparing', async () => {
    vi.mocked(compareApi.fetchComparison).mockResolvedValue(MOCK_DATA)
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], 'AAPL')
    await userEvent.type(inputs[1], 'MSFT')
    await userEvent.click(screen.getByRole('button', { name: /^compare$/i }))
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    expect(screen.getByText('Microsoft')).toBeInTheDocument()
  })

  it('highlights best-value cell', async () => {
    vi.mocked(compareApi.fetchComparison).mockResolvedValue(MOCK_DATA)
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], 'AAPL')
    await userEvent.type(inputs[1], 'MSFT')
    await userEvent.click(screen.getByRole('button', { name: /^compare$/i }))
    await waitFor(() => screen.getByText('P/E (TTM)'))
    const bestCells = document.querySelectorAll('.best-cell')
    expect(bestCells.length).toBeGreaterThan(0)
  })

  it('shows Save Comparison button after compare', async () => {
    vi.mocked(compareApi.fetchComparison).mockResolvedValue(MOCK_DATA)
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], 'AAPL')
    await userEvent.type(inputs[1], 'MSFT')
    await userEvent.click(screen.getByRole('button', { name: /^compare$/i }))
    await waitFor(() => expect(screen.getByText('Save Comparison')).toBeInTheDocument())
  })
})
