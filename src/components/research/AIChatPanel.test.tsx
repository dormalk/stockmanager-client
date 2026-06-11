import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AIChatPanel from './AIChatPanel'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock streamChat so tests don't hit the real network
vi.mock('../../api/chat', () => ({
  streamChat: vi.fn(),
}))

function renderPanel(ticker = 'AAPL') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AIChatPanel ticker={ticker} />
    </QueryClientProvider>
  )
}

describe('AIChatPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders section label', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
  })

  it('shows disabled state message when API key not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    await waitFor(() =>
      expect(screen.getByText(/AI Chat requires an Anthropic API key/i)).toBeInTheDocument()
    )
  })

  it('does not show chips when API key not configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: false }),
    })
    renderPanel()
    await waitFor(() => expect(screen.queryByText('Is this stock overvalued?')).not.toBeInTheDocument())
  })

  it('shows quick-start chips when API key is configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() =>
      expect(screen.getByText('Is this stock overvalued?')).toBeInTheDocument()
    )
    expect(screen.getByText('What are the key risks?')).toBeInTheDocument()
    expect(screen.getByText('Summarize the bull case')).toBeInTheDocument()
  })

  it('shows input textarea when API key is configured', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/ask anything about this stock/i)).toBeInTheDocument()
    )
  })

  it('Send button is disabled when input is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByRole('button', { name: /send/i }))
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('Send button enables when input has text', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByPlaceholderText(/ask anything/i))
    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), {
      target: { value: 'What are the risks?' },
    })
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })

  it('chip click calls streamChat with chip text as user message', async () => {
    const { streamChat } = await import('../../api/chat')
    const mockStream = vi.mocked(streamChat)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByText('What are the key risks?'))

    fireEvent.click(screen.getByText('What are the key risks?'))

    expect(mockStream).toHaveBeenCalledWith(
      'AAPL',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'What are the key risks?' }),
      ]),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(AbortSignal),
    )
  })

  it('chips disappear and user bubble appears after chip click', async () => {
    vi.mocked((await import('../../api/chat')).streamChat).mockImplementation(
      (_ticker, _msgs, _onToken, onDone) => { onDone(); return Promise.resolve() }
    )
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
    renderPanel()
    await waitFor(() => screen.getByText('Summarize the bull case'))
    fireEvent.click(screen.getByText('Summarize the bull case'))

    await waitFor(() => expect(screen.queryByText('Is this stock overvalued?')).not.toBeInTheDocument())
    expect(screen.getByText('Summarize the bull case')).toBeInTheDocument()
  })
})

// ── Story 6.3: Multi-Turn & Session Management ──────────────────────────────

describe('AIChatPanel — multi-turn & session management', () => {
  beforeEach(() => vi.clearAllMocks())

  async function setupWithKey() {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gemini_api_key_configured: true }),
    })
  }

  it('AC-1: second message includes all prior completed turns in history', async () => {
    const { streamChat } = await import('../../api/chat')
    const mockStream = vi.mocked(streamChat)

    // First call: complete immediately with a response
    let callCount = 0
    mockStream.mockImplementation((_ticker, _msgs, onToken, onDone) => {
      callCount++
      onToken('First answer')
      onDone()
      return Promise.resolve()
    })

    await setupWithKey()
    renderPanel()
    await waitFor(() => screen.getByPlaceholderText(/ask anything/i))

    // Send first message
    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), {
      target: { value: 'What are the risks?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(callCount).toBe(1))

    // Send second message
    await waitFor(() => screen.getByPlaceholderText(/ask anything/i))
    fireEvent.change(screen.getByPlaceholderText(/ask anything/i), {
      target: { value: 'Tell me more' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(callCount).toBe(2))

    // Second call should include prior user + assistant turns
    const secondCallMessages = mockStream.mock.calls[1][1]
    expect(secondCallMessages.length).toBe(3) // user1 + assistant1 + user2
    expect(secondCallMessages[0]).toMatchObject({ role: 'user', content: 'What are the risks?' })
    expect(secondCallMessages[1]).toMatchObject({ role: 'assistant', content: 'First answer' })
    expect(secondCallMessages[2]).toMatchObject({ role: 'user', content: 'Tell me more' })
  })

  it('AC-3: Clear button not shown when no messages exist', async () => {
    await setupWithKey()
    renderPanel()
    await waitFor(() => screen.getByText('Is this stock overvalued?'))
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('AC-3: Clear button appears after first message is sent', async () => {
    const { streamChat } = await import('../../api/chat')
    vi.mocked(streamChat).mockImplementation((_t, _m, _on, onDone) => { onDone(); return Promise.resolve() })

    await setupWithKey()
    renderPanel()
    await waitFor(() => screen.getByText('What are the key risks?'))
    fireEvent.click(screen.getByText('What are the key risks?'))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    )
  })

  it('AC-4: Clear resets to chips state without confirmation', async () => {
    const { streamChat } = await import('../../api/chat')
    vi.mocked(streamChat).mockImplementation((_t, _m, _on, onDone) => { onDone(); return Promise.resolve() })

    await setupWithKey()
    renderPanel()
    await waitFor(() => screen.getByText('What are the key risks?'))
    fireEvent.click(screen.getByText('What are the key risks?'))

    // Wait for Clear button to appear (message sent)
    await waitFor(() => screen.getByRole('button', { name: /clear/i }))

    // Click Clear — no confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))

    // Chips should reappear, message list gone, Clear button gone
    await waitFor(() =>
      expect(screen.getByText('Is this stock overvalued?')).toBeInTheDocument()
    )
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('AC-6: changing ticker resets chat to initial chips state', async () => {
    const { streamChat } = await import('../../api/chat')
    vi.mocked(streamChat).mockImplementation((_t, _m, _on, onDone) => { onDone(); return Promise.resolve() })

    await setupWithKey()
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AIChatPanel ticker="AAPL" />
      </QueryClientProvider>
    )

    await waitFor(() => screen.getByText('What are the key risks?'))
    fireEvent.click(screen.getByText('What are the key risks?'))
    await waitFor(() => screen.getByRole('button', { name: /clear/i }))

    // Switch ticker — rerender with MSFT
    act(() => {
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AIChatPanel ticker="MSFT" />
        </QueryClientProvider>
      )
    })

    // Chat should reset: chips visible, Clear button gone
    await waitFor(() =>
      expect(screen.getByText('Is this stock overvalued?')).toBeInTheDocument()
    )
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('AC-5: no localStorage writes during chat session', async () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')
    const { streamChat } = await import('../../api/chat')
    vi.mocked(streamChat).mockImplementation((_t, _m, _on, onDone) => { onDone(); return Promise.resolve() })

    await setupWithKey()
    renderPanel()
    await waitFor(() => screen.getByText('What are the key risks?'))
    fireEvent.click(screen.getByText('What are the key risks?'))
    await waitFor(() => screen.getByRole('button', { name: /clear/i }))

    // No chat-related keys written to localStorage
    const chatKeys = setItemSpy.mock.calls
      .map(([key]) => key as string)
      .filter(k => k.includes('chat') || k.includes('message') || k.includes('history'))
    expect(chatKeys).toHaveLength(0)

    setItemSpy.mockRestore()
  })
})
