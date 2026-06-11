export interface TradeIn {
  ticker: string
  trade_type: 'BUY' | 'SELL'
  trade_date: string
  price_per_share: number
  quantity: number
  commission?: number
}

export interface TradeOut {
  id: number
  ticker: string
  trade_type: 'BUY' | 'SELL'
  trade_date: string
  price_per_share: number
  quantity: number
  commission: number
}

export interface PositionOut {
  id: number
  ticker: string
  shares_held: number
  avg_cost_basis: number
  total_cost_basis: number
  first_buy_date: string | null
  is_closed: boolean
}

import { apiBase } from './client'

export async function createTrade(body: TradeIn): Promise<{ trade: TradeOut; position: PositionOut }> {
  const res = await fetch(`${apiBase}/api/trades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw { status: res.status, detail: err.detail ?? 'Unknown error' }
  }
  return res.json()
}

export async function deleteTrade(id: number): Promise<{ position: PositionOut | null }> {
  const res = await fetch(`${apiBase}/api/trades/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete trade')
  return res.json()
}

export async function fetchTrades(ticker?: string): Promise<TradeOut[]> {
  const url = ticker ? `${apiBase}/api/trades?ticker=${ticker}` : `${apiBase}/api/trades`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch trades')
  return res.json()
}

export async function fetchPositions(includeClosed = false): Promise<PositionOut[]> {
  const res = await fetch(`${apiBase}/api/portfolio/positions?include_closed=${includeClosed}`)
  if (!res.ok) throw new Error('Failed to fetch positions')
  return res.json()
}
