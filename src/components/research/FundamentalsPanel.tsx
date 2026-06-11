import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Skeleton from '../ui/Skeleton'
import Tooltip from '../ui/Tooltip'
import { fetchFundamentals, refreshFundamentals, type FundamentalMetric } from '../../api/research'
import './FundamentalsPanel.css'

const METRIC_LABELS: Record<string, string> = {
  pe_ttm:         'P/E (TTM)',
  forward_pe:     'Forward P/E',
  eps_ttm:        'EPS (TTM)',
  revenue_ttm:    'Revenue (TTM)',
  revenue_growth: 'Revenue Growth',
  gross_margin:   'Gross Margin',
  net_margin:     'Net Margin',
  debt_to_equity: 'Debt / Equity',
  roe:            'ROE',
  fcf:            'Free Cash Flow',
  market_cap:     'Market Cap',
  '52w_high':     '52W High',
  '52w_low':      '52W Low',
  dividend_yield: 'Dividend Yield',
  beta:           'Beta',
}

function formatMetricValue(key: string, value: number | null): string {
  if (value == null) return 'N/A'
  if (typeof value !== 'number') return String(value)
  const pct = ['revenue_growth', 'gross_margin', 'net_margin', 'roe', 'dividend_yield']
  const big = ['revenue_ttm', 'market_cap', 'fcf']
  const x   = ['pe_ttm', 'forward_pe', 'debt_to_equity', 'beta']
  if (pct.includes(key)) return `${(value * 100).toFixed(1)}%`
  if (big.includes(key)) {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    return `$${value.toLocaleString()}`
  }
  if (x.includes(key)) return value.toFixed(2)
  return value.toFixed(2)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props { ticker: string }

export default function FundamentalsPanel({ ticker }: Props) {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fundamentals', ticker],
    queryFn: () => fetchFundamentals(ticker),
  })

  const refreshMut = useMutation({
    mutationFn: () => refreshFundamentals(ticker),
    onSuccess: d => qc.setQueryData(['fundamentals', ticker], d),
  })

  const isStale = data
    ? Date.now() - new Date(data.fetched_at).getTime() > 24 * 3600 * 1000
    : false

  return (
    <section className="fund-panel" aria-label="Fundamentals">
      <div className="fund-panel__header">
        <span className="text-label">Fundamentals</span>
        <span className={`text-caption ${isStale ? 'color-amber' : 'color-muted'}`}>
          {data ? `Last updated ${relativeTime(data.fetched_at)}` : ''}
          {isStale && (
            <button
              className="link-btn text-caption"
              style={{ marginLeft: 8 }}
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
            >
              Force Refresh
            </button>
          )}
        </span>
      </div>

      <div className="fund-panel__legend text-caption">
        <span className="color-bull">● Green = favorable</span>
        {'  '}
        <span className="color-neutral">● Gray = neutral</span>
        {'  '}
        <span className="color-bear">● Red = concerning</span>
      </div>

      {isError && (
        <p className="text-caption color-muted fund-panel__error">
          Failed to load fundamentals.{' '}
          <button className="link-btn text-caption" onClick={() => qc.invalidateQueries({ queryKey: ['fundamentals', ticker] })}>
            Retry
          </button>
        </p>
      )}

      <div className="fund-panel__metrics">
        {isLoading
          ? Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="metric-row">
                <Skeleton width="100px" height="13px" />
                <Skeleton width="70px" height="13px" />
              </div>
            ))
          : data?.metrics.map((m: FundamentalMetric) => (
              <div key={m.key} className="metric-row">
                <Tooltip content={m.tooltip}>
                  <span className="metric-row__label text-body">
                    {METRIC_LABELS[m.key] ?? m.key}
                  </span>
                </Tooltip>
                <span
                  className={`metric-row__value text-data color-${m.value == null ? 'neutral' : m.verdict}`}
                  aria-label={`${METRIC_LABELS[m.key] ?? m.key}: ${formatMetricValue(m.key, m.value)}, ${m.verdict}`}
                >
                  {formatMetricValue(m.key, m.value)}
                </span>
              </div>
            ))
        }
      </div>
    </section>
  )
}
