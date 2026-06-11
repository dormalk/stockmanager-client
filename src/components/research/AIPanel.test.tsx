import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AIPanel from './AIPanel'

// Mock fetch for api-key-status
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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
