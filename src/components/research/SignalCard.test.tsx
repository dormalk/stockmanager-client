import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SignalCard from './SignalCard'
import * as signalsApi from '../../api/signals'
import type { SignalsData } from '../../api/signals'

vi.mock('../../api/signals')

const MOCK_DATA: SignalsData = {
  verdict: 'Buy',
  score: 0.42,
  bullish: 6,
  neutral: 2,
  bearish: 2,
  insufficient_data: false,
  signals: [
    { name: 'P/E (TTM)',        direction: 'bear',    value: '28.50', score: -1, group: 'fundamental' },
    { name: 'Net Margin',       direction: 'bull',    value: '26.0%', score:  1, group: 'fundamental' },
    { name: 'RSI (14)',         direction: 'neutral', value: '55.0',  score:  0, group: 'technical'   },
    { name: 'Analyst Consensus',direction: 'bull',    value: 'Buy',   score:  1, group: 'analyst'     },
  ],
}

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SignalCard ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('SignalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows verdict badge when data loaded', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue(MOCK_DATA)
    renderCard()
    await waitFor(() => expect(screen.getByText('BUY')).toBeInTheDocument())
  })

  it('shows score counts', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue(MOCK_DATA)
    renderCard()
    await waitFor(() => expect(screen.getByText(/6 Bullish/)).toBeInTheDocument())
  })

  it('shows disclaimer text', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue(MOCK_DATA)
    renderCard()
    await waitFor(() => expect(screen.getByText(/quantitative summary tool/)).toBeInTheDocument())
  })

  it('shows insufficient data message when flagged', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue({
      ...MOCK_DATA, insufficient_data: true, verdict: null,
    })
    renderCard()
    await waitFor(() => expect(screen.getByText(/Insufficient data/)).toBeInTheDocument())
  })

  it('collapses signal list on toggle click', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue(MOCK_DATA)
    renderCard()
    // starts expanded (localStorage cleared → collapsed=false → "▼ Hide signals")
    await waitFor(() => screen.getByRole('button', { name: /hide signals/i }))
    expect(screen.getByText('P/E (TTM)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /hide signals/i }))
    // now collapsed
    expect(screen.getByRole('button', { name: /see all signals/i })).toBeInTheDocument()
  })

  it('persists collapse state to localStorage', async () => {
    vi.mocked(signalsApi.fetchSignals).mockResolvedValue(MOCK_DATA)
    renderCard()
    await waitFor(() => screen.getByRole('button', { name: /hide signals/i }))
    await userEvent.click(screen.getByRole('button', { name: /hide signals/i }))
    expect(localStorage.getItem('signal_card_collapsed')).toBe('true')
  })
})
