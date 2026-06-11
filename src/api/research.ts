export interface FundamentalMetric {
  key: string
  value: number | null
  verdict: 'bull' | 'neutral' | 'bear'
  tooltip: string
}

export interface FundamentalsData {
  company_name: string
  sector: string
  metrics: FundamentalMetric[]
  fetched_at: string
  is_stale: boolean
}

import { apiBase } from './client'

export async function fetchFundamentals(ticker: string): Promise<FundamentalsData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/fundamentals`)
  if (!res.ok) throw new Error('Failed to load fundamentals')
  return res.json()
}

export async function refreshFundamentals(ticker: string): Promise<FundamentalsData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/fundamentals/refresh`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to refresh fundamentals')
  return res.json()
}

export interface AnalystData {
  consensus: 'Buy' | 'Hold' | 'Sell' | null
  analyst_count: number | null
  target_mean: number | null
  target_high: number | null
  target_low: number | null
}

export interface NewsItem {
  title: string
  link: string
  publisher: string
  published_at: string | null
}

export interface NewsData {
  analyst: AnalystData
  news: NewsItem[]
  fetched_at: string
}

export async function fetchNews(ticker: string): Promise<NewsData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/news`)
  if (!res.ok) throw new Error('Failed to load news')
  return res.json()
}

export type ChartRange = '5m' | '15m' | '1H' | 'D' | 'W' | 'M'

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface SMAPoint {
  date: string
  value: number
}

export interface RSIPoint {
  date: string
  value: number
}

export interface MACDPoint {
  date: string
  macd: number
  signal: number | null
  histogram: number | null
}

export interface ChartPattern {
  name: string
  classification: 'Bullish' | 'Bearish' | 'Neutral'
  description: string
  date_start: string
  date_end: string
  confidence: 'High' | 'Medium' | 'Low'
}

export interface OHLCVData {
  candles: Candle[]
  sma50: SMAPoint[]
  sma200: SMAPoint[]
  rsi: RSIPoint[]
  macd: MACDPoint[]
  patterns: ChartPattern[]
  range: ChartRange
  fetched_at: string
}

export async function fetchHistory(ticker: string, range: ChartRange = 'D'): Promise<OHLCVData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/history?range=${range}`)
  if (!res.ok) throw new Error('Failed to load price data')
  return res.json()
}

export interface MultiplePoint { date: string; value: number }

export interface MultiplesData {
  series: Record<string, MultiplePoint[]>
  group_structure: Record<string, { key: string; label: string }[]>
  fetched_at: string
}

export async function fetchMultiples(ticker: string): Promise<MultiplesData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/multiples`)
  if (!res.ok) throw new Error('Failed to load multiples')
  return res.json()
}

export async function fetchFavoriteMultiples(): Promise<{ favorites: string[] }> {
  const res = await fetch(`${apiBase}/api/preferences/favorite-multiples`)
  if (!res.ok) throw new Error('Failed to load favorites')
  return res.json()
}

export async function saveFavoriteMultiples(favorites: string[]): Promise<void> {
  await fetch(`${apiBase}/api/preferences/favorite-multiples`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorites }),
  })
}

export interface CompetitorInfo {
  ticker: string
  name: string
  current_price: number | null
  day_change_pct: number | null
}

export async function fetchCompetitors(ticker: string): Promise<CompetitorInfo[]> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/competitors`)
  if (!res.ok) throw new Error('Failed to load competitors')
  return res.json()
}

export interface SectorPerformanceData {
  ticker: string
  etf: string
  etf_label: string
  sector: string
  series: Record<string, { date: string; value: number }[]>
}

export async function fetchSectorPerformance(
  ticker: string,
  range: string,
): Promise<SectorPerformanceData> {
  const res = await fetch(`${apiBase}/api/research/${ticker}/sector-performance?range=${range}`)
  if (!res.ok) throw new Error('Failed to load sector performance')
  return res.json()
}

export async function fetchMultiplesCompare(
  metric: string,
  tickers: string[],
): Promise<Record<string, MultiplePoint[]>> {
  const res = await fetch(
    `${apiBase}/api/research/multiples/compare?tickers=${tickers.join(',')}&metric=${metric}`
  )
  if (!res.ok) throw new Error('Failed to load comparison data')
  return res.json()
}
