import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Watchlist from './Watchlist'
import * as watchlistsApi from '../api/watchlists'
import * as signalsApi from '../api/signals'
import type { WatchlistMeta, WatchlistItemOut } from '../api/watchlists'

vi.mock('../api/watchlists')
vi.mock('../api/signals')
vi.mock('../api/notes', () => ({ fetchTickersWithNotes: vi.fn().mockResolvedValue({ tickers: [] }) }))

// Suppress localStorage calls in jsdom
const localStorageMock = (() => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => Object.keys(store).forEach(k => delete store[k]),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const MOCK_WATCHLISTS: WatchlistMeta[] = [
  { id: 1, name: 'Default', item_count: 2 },
]

const MOCK_ITEMS: WatchlistItemOut[] = [
  {
    id: 1, ticker: 'AAPL', watchlist_id: 1, date_added: '2024-01-15',
    company_name: 'Apple Inc.', current_price: 185, day_change: 1.5, day_change_pct: 0.82,
    week52_high: 200, week52_low: 130, alert_price: null, alert_direction: null,
    alert_fired: false, in_portfolio: true,
  },
  {
    id: 2, ticker: 'MSFT', watchlist_id: 1, date_added: '2024-01-16',
    company_name: 'Microsoft Corp.', current_price: 280, day_change: -2, day_change_pct: -0.7,
    week52_high: 300, week52_low: 220, alert_price: 270, alert_direction: 'Below',
    alert_fired: false, in_portfolio: false,
  },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.mocked(signalsApi.fetchBatchSignals).mockResolvedValue({})
    vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue(MOCK_WATCHLISTS)
    vi.mocked(watchlistsApi.fetchWatchlistItems).mockResolvedValue(MOCK_ITEMS)
  })

  it('shows empty state when watchlist has no items', async () => {
    vi.mocked(watchlistsApi.fetchWatchlistItems).mockResolvedValue([])
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/No tickers in this list/)).toBeInTheDocument()
    )
  })

  it('renders ticker rows', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('shows IN PORTFOLIO chip for portfolio tickers', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('IN PORTFOLIO')).toBeInTheDocument())
  })

  it('shows alert target when configured', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/Below/)).toBeInTheDocument())
  })

  it('renders the WatchlistSelector with Default tab', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Default/i })).toBeInTheDocument())
  })

  it('shows delete confirmation popover on trash click', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button', { name: /remove/i }))
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    await userEvent.click(removeBtns[0])
    expect(screen.getByRole('dialog', { name: /confirm/i })).toBeInTheDocument()
  })

  it('calls removeFromWatchlistById on confirm', async () => {
    vi.mocked(watchlistsApi.removeFromWatchlistById).mockResolvedValue()
    renderPage()
    await waitFor(() => screen.getAllByRole('button', { name: /remove/i }))
    await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() =>
      expect(watchlistsApi.removeFromWatchlistById).toHaveBeenCalledWith(1, 'AAPL')
    )
  })

  it('renders + New List button', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ New List/i })).toBeInTheDocument()
    )
  })

  it('shows new list input when + New List is clicked', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /\+ New List/i }))
    await userEvent.click(screen.getByRole('button', { name: /\+ New List/i }))
    expect(screen.getByRole('textbox', { name: /New watchlist name/i })).toBeInTheDocument()
  })

  it('shows tab for each watchlist in selector', async () => {
    vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([
      { id: 1, name: 'Default', item_count: 2 },
      { id: 2, name: 'Tech Picks', item_count: 1 },
    ])
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Default/i })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /Tech Picks/i })).toBeInTheDocument()
  })
})
