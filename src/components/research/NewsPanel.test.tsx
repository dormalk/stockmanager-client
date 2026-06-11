import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewsPanel from './NewsPanel'
import * as researchApi from '../../api/research'
import type { NewsData } from '../../api/research'

vi.mock('../../api/research')

const MOCK_DATA: NewsData = {
  fetched_at: new Date().toISOString(),
  analyst: {
    consensus: 'Buy',
    analyst_count: 32,
    target_mean: 210.0,
    target_high: 240.0,
    target_low: 175.0,
  },
  news: [
    { title: 'Apple reports record earnings', link: 'https://example.com/1',
      publisher: 'Reuters', published_at: new Date(Date.now() - 3 * 3600000).toISOString() },
    { title: 'iPhone 16 demand strong', link: 'https://example.com/2',
      publisher: 'Bloomberg', published_at: new Date(Date.now() - 86400000).toISOString() },
  ],
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <NewsPanel ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('NewsPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows skeleton while loading', () => {
    vi.mocked(researchApi.fetchNews).mockImplementation(() => new Promise(() => {}))
    renderPanel()
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('renders analyst consensus with bull color', async () => {
    vi.mocked(researchApi.fetchNews).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => expect(screen.getByText('Buy')).toBeInTheDocument())
    expect(screen.getByText('Buy')).toHaveClass('color-bull')
  })

  it('renders analyst count and target prices', async () => {
    vi.mocked(researchApi.fetchNews).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText(/32 analysts/))
    expect(screen.getByText(/Mean:/)).toBeInTheDocument()
    expect(screen.getByText(/Range:/)).toBeInTheDocument()
  })

  it('renders news headlines as external links', async () => {
    vi.mocked(researchApi.fetchNews).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText('Apple reports record earnings'))
    const link = screen.getByRole('link', { name: /Apple reports record earnings/ })
    expect(link).toHaveAttribute('href', 'https://example.com/1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders relative timestamps', async () => {
    vi.mocked(researchApi.fetchNews).mockResolvedValue(MOCK_DATA)
    renderPanel()
    await waitFor(() => screen.getByText(/h ago/))
  })

  it('shows empty state when no news', async () => {
    vi.mocked(researchApi.fetchNews).mockResolvedValue({ ...MOCK_DATA, news: [] })
    renderPanel()
    await waitFor(() => expect(screen.getByText(/No recent news found/)).toBeInTheDocument())
  })

  it('shows inline error on failure', async () => {
    vi.mocked(researchApi.fetchNews).mockRejectedValue(new Error('fetch failed'))
    renderPanel()
    await waitFor(() => expect(screen.getByText(/Failed to load news/)).toBeInTheDocument())
  })
})
