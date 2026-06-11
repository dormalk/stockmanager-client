export interface WatchlistMeta {
  id: number
  name: string
  item_count: number
}

export interface WatchlistItemOut {
  id: number
  ticker: string
  watchlist_id: number
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

export async function fetchWatchlists(): Promise<WatchlistMeta[]> {
  const res = await fetch(`${apiBase}/api/watchlists`)
  if (!res.ok) throw new Error('Failed to fetch watchlists')
  return res.json()
}

export async function createWatchlist(name: string): Promise<WatchlistMeta> {
  const res = await fetch(`${apiBase}/api/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create watchlist')
  return res.json()
}

export async function renameWatchlist(id: number, name: string): Promise<WatchlistMeta> {
  const res = await fetch(`${apiBase}/api/watchlists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to rename watchlist')
  return res.json()
}

export async function deleteWatchlist(id: number): Promise<void> {
  const res = await fetch(`${apiBase}/api/watchlists/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to delete watchlist')
  }
}

export async function fetchWatchlistItems(watchlistId: number): Promise<WatchlistItemOut[]> {
  const res = await fetch(`${apiBase}/api/watchlists/${watchlistId}/items`)
  if (!res.ok) throw new Error('Failed to fetch watchlist items')
  return res.json()
}

export async function addToWatchlistById(watchlistId: number, ticker: string): Promise<{ ticker: string; id: number }> {
  const res = await fetch(`${apiBase}/api/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  })
  if (res.status === 409) throw { status: 409, detail: `${ticker} already in this watchlist` }
  if (!res.ok) throw new Error('Failed to add to watchlist')
  return res.json()
}

export async function removeFromWatchlistById(watchlistId: number, ticker: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/watchlists/${watchlistId}/items/${ticker}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove from watchlist')
}

export async function patchItemAlert(
  watchlistId: number,
  ticker: string,
  alertPrice: number | null,
  alertDirection: string | null,
): Promise<void> {
  await fetch(`${apiBase}/api/watchlists/${watchlistId}/items/${ticker}/alert`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_price: alertPrice, alert_direction: alertDirection }),
  })
}

export async function resetItemAlert(watchlistId: number, ticker: string): Promise<void> {
  await fetch(`${apiBase}/api/watchlists/${watchlistId}/items/${ticker}/alert/reset`, {
    method: 'POST',
  })
}

export interface ActiveAlert {
  watchlist_id: number
  watchlist_name: string
  ticker: string
  alert_price: number
  alert_direction: string | null
  current_price: number | null
}

export async function fetchActiveAlerts(): Promise<ActiveAlert[]> {
  const res = await fetch(`${apiBase}/api/watchlists/alerts/active`)
  if (!res.ok) return []
  return res.json()
}

export async function markItemAlertFired(watchlistId: number, ticker: string): Promise<void> {
  await fetch(`${apiBase}/api/watchlists/${watchlistId}/items/${ticker}/alert`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_fired: true }),
  })
}
