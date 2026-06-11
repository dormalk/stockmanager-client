export interface CompareData {
  tickers: string[]
  data: Record<string, Record<string, unknown>>
  best: Record<string, string | null>
  rows: { key: string; label: string }[]
}

export interface SavedComparison {
  id: number
  label: string
  tickers: string[]
  created_at: string
}

import { apiBase } from './client'

export async function fetchComparison(tickers: string[]): Promise<CompareData> {
  const res = await fetch(`${apiBase}/api/compare?tickers=${tickers.join(',')}`)
  if (!res.ok) throw new Error('Comparison failed')
  return res.json()
}

export async function fetchSavedComparisons(): Promise<SavedComparison[]> {
  const res = await fetch(`${apiBase}/api/compare/saved`)
  if (!res.ok) return []
  return res.json()
}

export async function saveComparison(label: string, tickers: string[]): Promise<SavedComparison> {
  const res = await fetch(`${apiBase}/api/compare/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, tickers }),
  })
  if (!res.ok) throw new Error('Failed to save')
  return res.json()
}

export async function deleteSavedComparison(id: number): Promise<void> {
  await fetch(`${apiBase}/api/compare/saved/${id}`, { method: 'DELETE' })
}

export type PriceHistoryRange = '1M' | '3M' | '6M' | '1Y'

export interface PriceHistoryPoint {
  date: string
  value: number
}

export interface PriceHistoryData {
  tickers: string[]
  series: Record<string, PriceHistoryPoint[]>
}

export async function fetchComparePriceHistory(
  tickers: string[],
  range: PriceHistoryRange,
): Promise<PriceHistoryData> {
  const res = await fetch(`${apiBase}/api/compare/price-history?tickers=${tickers.join(',')}&range=${range}`)
  if (!res.ok) throw new Error('Price history fetch failed')
  return res.json()
}
