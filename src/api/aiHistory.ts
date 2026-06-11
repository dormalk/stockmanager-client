import { apiBase } from './client'

export interface AnalysisHistoryItem {
  id: number
  generated_at: string
  preview: string
}

export interface AnalysisHistoryDetail {
  id: number
  ticker: string
  content: string
  generated_at: string
}

export async function fetchAnalysisHistory(ticker: string): Promise<AnalysisHistoryItem[]> {
  const res = await fetch(`${apiBase}/api/ai/analysis/${ticker}/history`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchAnalysisHistoryItem(
  ticker: string,
  id: number,
): Promise<AnalysisHistoryDetail | null> {
  const res = await fetch(`${apiBase}/api/ai/analysis/${ticker}/history/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function deleteAnalysisHistoryItem(ticker: string, id: number): Promise<void> {
  await fetch(`${apiBase}/api/ai/analysis/${ticker}/history/${id}`, { method: 'DELETE' })
}
