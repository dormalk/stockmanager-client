export interface EnrichedPosition {
  id: number
  ticker: string
  company_name: string
  sector: string
  shares_held: number
  avg_cost_basis: number
  total_cost_basis: number
  first_buy_date: string | null
  is_closed: boolean
  current_price: number | null
  current_value: number | null
  day_change: number | null
  day_change_pct: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  position_count: number
}

export interface DashboardData {
  summary: PortfolioSummary
  positions: EnrichedPosition[]
}

import { apiBase } from './client'

export async function fetchDashboard(includeClosed = false): Promise<DashboardData> {
  const res = await fetch(`${apiBase}/api/portfolio/dashboard?include_closed=${includeClosed}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}
