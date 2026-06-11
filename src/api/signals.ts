import type { Verdict } from '../components/ui/SignalBadge'
import { apiBase } from './client'

export interface SignalRow {
  name: string
  direction: 'bull' | 'neutral' | 'bear'
  value: string
  score: number
  group: string
}

export interface SignalsData {
  verdict: Verdict | null
  signals: SignalRow[]
  score: number | null
  bullish: number
  neutral: number
  bearish: number
  insufficient_data: boolean
}

export async function fetchSignals(ticker: string): Promise<SignalsData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/signals`)
  if (!res.ok) throw new Error('Failed to load signals')
  return res.json()
}

export async function fetchBatchSignals(tickers: string[]): Promise<Record<string, Verdict | null>> {
  if (!tickers.length) return {}
  const res = await fetch(`${apiBase}/api/portfolio/signals?tickers=${tickers.join(',')}`)
  if (!res.ok) throw new Error('Failed to load signals')
  return res.json()
}
