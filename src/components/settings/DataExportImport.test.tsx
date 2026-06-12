import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DataExportImport from './DataExportImport'
import * as exportImportApi from '../../api/exportImport'

vi.mock('../../api/exportImport', async () => {
  const actual = await vi.importActual<typeof import('../../api/exportImport')>('../../api/exportImport')
  return {
    ...actual,
    exportData: vi.fn(),
    importData: vi.fn(),
  }
})

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <DataExportImport />
    </QueryClientProvider>
  )
}

describe('DataExportImport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders export category checkboxes all checked by default', () => {
    renderComponent()
    const exportCheckboxes = screen.getAllByRole('checkbox')
    // 6 export + 6 import checkboxes
    expect(exportCheckboxes).toHaveLength(12)
    expect(exportCheckboxes.slice(0, 6).every(cb => (cb as HTMLInputElement).checked)).toBe(true)
    expect(exportCheckboxes.slice(6).every(cb => (cb as HTMLInputElement).checked)).toBe(false)
  })

  it('Export Selected calls exportData with selected categories', async () => {
    renderComponent()
    await userEvent.click(screen.getByRole('button', { name: /export selected/i }))
    expect(exportImportApi.exportData).toHaveBeenCalledWith([
      'trades', 'watchlists', 'notes', 'ai_history', 'comparisons', 'preferences',
    ])
  })

  it('Import Selected is disabled until a file and category are chosen', async () => {
    renderComponent()
    const importBtn = screen.getByRole('button', { name: /import selected/i })
    expect(importBtn).toBeDisabled()

    const importCheckboxes = screen.getAllByRole('checkbox').slice(6)
    await userEvent.click(importCheckboxes[0])
    expect(importBtn).toBeDisabled() // still no file

    const fileInput = screen.getByLabelText(/import file/i) as HTMLInputElement
    const file = new File(['{}'], 'export.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)

    expect(importBtn).toBeEnabled()
  })

  it('shows confirmation modal before importing and imports on confirm', async () => {
    vi.mocked(exportImportApi.importData).mockResolvedValue({
      imported: { trades: 2 },
      skipped: [],
    })

    renderComponent()
    const importCheckboxes = screen.getAllByRole('checkbox').slice(6)
    await userEvent.click(importCheckboxes[0]) // trades

    const fileInput = screen.getByLabelText(/import file/i) as HTMLInputElement
    const file = new File(['{}'], 'export.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: /import selected/i }))

    expect(screen.getByRole('dialog', { name: /confirm import/i })).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /replace data/i }))

    await waitFor(() => {
      expect(exportImportApi.importData).toHaveBeenCalledWith(file, ['trades'])
    })
    expect(await screen.findByText(/imported 2/i)).toBeInTheDocument()
  })

  it('cancelling the confirmation modal does not call importData', async () => {
    renderComponent()
    const importCheckboxes = screen.getAllByRole('checkbox').slice(6)
    await userEvent.click(importCheckboxes[0])

    const fileInput = screen.getByLabelText(/import file/i) as HTMLInputElement
    const file = new File(['{}'], 'export.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: /import selected/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('dialog', { name: /confirm import/i })).not.toBeInTheDocument()
    expect(exportImportApi.importData).not.toHaveBeenCalled()
  })

  it('shows error message when import fails', async () => {
    vi.mocked(exportImportApi.importData).mockRejectedValue(new Error('Validation error: bad file'))

    renderComponent()
    const importCheckboxes = screen.getAllByRole('checkbox').slice(6)
    await userEvent.click(importCheckboxes[0])

    const fileInput = screen.getByLabelText(/import file/i) as HTMLInputElement
    const file = new File(['{}'], 'export.json', { type: 'application/json' })
    await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByRole('button', { name: /import selected/i }))
    await userEvent.click(screen.getByRole('button', { name: /replace data/i }))

    expect(await screen.findByText(/validation error: bad file/i)).toBeInTheDocument()
  })
})
