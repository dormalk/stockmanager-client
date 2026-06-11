import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotesPanel from './NotesPanel'
import * as notesApi from '../../api/notes'
import type { NoteData } from '../../api/notes'

vi.mock('../../api/notes')

const EMPTY_NOTE: NoteData = { ticker: 'AAPL', user_notes: null, updated_at: null }
const SAVED_NOTE: NoteData = {
  ticker: 'AAPL',
  user_notes: 'Bull Case: Strong FCF',
  updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <NotesPanel ticker="AAPL" />
    </QueryClientProvider>
  )
}

describe('NotesPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows placeholder when no note exists', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(EMPTY_NOTE)
    renderPanel()
    await waitFor(() => {
      const ta = screen.getByRole('textbox')
      expect((ta as HTMLTextAreaElement).placeholder).toContain('No thesis written')
    })
  })

  it('pre-populates existing note content', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(SAVED_NOTE)
    renderPanel()
    await waitFor(() => {
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(ta.value).toBe('Bull Case: Strong FCF')
    })
  })

  it('shows Last updated timestamp for saved note', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(SAVED_NOTE)
    renderPanel()
    await waitFor(() => expect(screen.getByText(/Last updated/)).toBeInTheDocument())
  })

  it('renders Insert Bull/Bear Template button', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(EMPTY_NOTE)
    renderPanel()
    expect(screen.getByRole('button', { name: /insert bull\/bear template/i })).toBeInTheDocument()
  })

  it('inserts template on button click', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(EMPTY_NOTE)
    vi.mocked(notesApi.saveNote).mockResolvedValue({ ticker: 'AAPL', user_notes: '## Bull Case\n-', updated_at: null })
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: /insert bull\/bear template/i }))
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    await waitFor(() => expect(ta.value).toContain('## Bull Case'))
    expect(ta.value).toContain('## Bear Case')
  })
})
