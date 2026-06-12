import { apiBase } from './client'

export const EXPORT_CATEGORIES = [
  { key: 'trades', label: 'Trades & Positions' },
  { key: 'watchlists', label: 'Watchlists' },
  { key: 'notes', label: 'Notes' },
  { key: 'ai_history', label: 'AI History' },
  { key: 'comparisons', label: 'Saved Comparisons' },
  { key: 'preferences', label: 'Preferences' },
] as const

export type ExportCategory = typeof EXPORT_CATEGORIES[number]['key']

export interface ImportResult {
  imported: Record<string, number>
  skipped: string[]
}

export async function exportData(categories: ExportCategory[]): Promise<void> {
  const res = await fetch(`${apiBase}/api/export?categories=${categories.join(',')}`)
  if (!res.ok) throw new Error('Failed to export data')

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename=([^;]+)/)
  const filename = match ? match[1].trim() : `stockmanager-export-${new Date().toISOString().slice(0, 10)}.json`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importData(file: File, categories: ExportCategory[]): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('categories', categories.join(','))

  const res = await fetch(`${apiBase}/api/import`, { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to import data')
  }
  return res.json()
}
