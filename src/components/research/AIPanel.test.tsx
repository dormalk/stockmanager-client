import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AIPanel from './AIPanel'

// Mock fetch for api-key-status
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('../../api/aiHistory', () => ({
  fetchAnalysisHistory: vi.fn().mockResolvedValue([]),
  fetchAnalysisHistoryItem: vi.fn().mockResolvedValue(null),
  deleteAnalysisHistoryItem: vi.fn().mockResolvedValue(undefined),
}))

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AIPanel ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('AIPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows disabled button when API key not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /generate ai analysis/i })
      expect(btn).toBeDisabled()
    })
  })

  it('shows no-key message when key not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    await waitFor(() => expect(screen.getByText(/GEMINI_API_KEY/)).toBeInTheDocument())
  })

  it('shows enabled button when API key configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /generate ai analysis/i })
      expect(btn).not.toBeDisabled()
    })
  })

  it('renders panel with AI Analysis label', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
  })
})

describe('AIPanel — analysis history', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows History button with count when past reports exist', async () => {
    const { fetchAnalysisHistory } = await import('../../api/aiHistory')
    vi.mocked(fetchAnalysisHistory).mockResolvedValue([
      { id: 2, generated_at: '2026-06-10T00:00:00Z', preview: 'Second report' },
      { id: 1, generated_at: '2026-06-09T00:00:00Z', preview: 'First report' },
    ])
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /toggle analysis history/i })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: /toggle analysis history/i })).toHaveTextContent('History (2)')
  })

  it('clicking History reveals saved report previews', async () => {
    const { fetchAnalysisHistory } = await import('../../api/aiHistory')
    vi.mocked(fetchAnalysisHistory).mockResolvedValue([
      { id: 1, generated_at: '2026-06-09T00:00:00Z', preview: 'First report preview' },
    ])
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByRole('button', { name: /toggle analysis history/i }))
    fireEvent.click(screen.getByRole('button', { name: /toggle analysis history/i }))
    expect(screen.getByText('First report preview')).toBeInTheDocument()
  })

  it('does not show History button when there is no saved history', async () => {
    const { fetchAnalysisHistory } = await import('../../api/aiHistory')
    vi.mocked(fetchAnalysisHistory).mockResolvedValue([])
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByRole('button', { name: /generate ai analysis/i }))
    expect(screen.queryByRole('button', { name: /toggle analysis history/i })).not.toBeInTheDocument()
  })
})
