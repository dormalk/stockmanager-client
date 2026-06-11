export interface WatchlistItemOut {
  id: number
  ticker: string
  date_added: string | null
  alert_price: number | null
  alert_direction: string | null
  alert_fired: boolean
  company_name: string
  current_price: number | null
  day_change: number | null
  day_change_pct: number | null
  week52_high: number | null
  week52_low: number | null
  in_portfolio: boolean
}

import { apiBase } from './client'

export async function fetchWatchlist(): Promise<WatchlistItemOut[]> {
  const res = await fetch(`${apiBase}/api/watchlist`)
  if (!res.ok) throw new Error('Failed to fetch watchlist')
  return res.json()
}

export async function addToWatchlist(ticker: string): Promise<{ ticker: string; id: number }> {
  const res = await fetch(`${apiBase}/api/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  })
  if (res.status === 409) throw { status: 409, detail: `${ticker} already on watchlist` }
  if (!res.ok) throw new Error('Failed to add to watchlist')
  return res.json()
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/watchlist/${ticker}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove from watchlist')
}

export async function fetchWatchlistTickers(): Promise<{ tickers: string[] }> {
  const res = await fetch(`${apiBase}/api/watchlist/tickers`)
  if (!res.ok) throw new Error('Failed to fetch watchlist tickers')
  return res.json()
}

export async function patchAlert(
  ticker: string,
  alertPrice: number | null,
  alertDirection: string | null,
): Promise<void> {
  await fetch(`${apiBase}/api/watchlist/${ticker}/alert`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_price: alertPrice, alert_direction: alertDirection }),
  })
}

export async function resetAlert(ticker: string): Promise<void> {
  await fetch(`${apiBase}/api/watchlist/${ticker}/alert`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_fired: false }),
  })
}

export async function fetchActiveAlerts(): Promise<{ ticker: string; alert_price: number; alert_direction: string }[]> {
  const res = await fetch(`${apiBase}/api/watchlist/alerts/active`)
  if (!res.ok) return []
  return res.json()
}
