import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SkeletonRow } from '../ui/Skeleton'
import SignalBadge, { type Verdict } from '../ui/SignalBadge'
import { formatCurrency, formatSigned, formatSignedCurrency, formatShares } from '../../utils/format'
import type { EnrichedPosition } from '../../api/portfolio'
import './PositionsTable.css'

type SortCol = 'ticker' | 'company_name' | 'shares_held' | 'avg_cost_basis' | 'current_price' |
  'current_value' | 'total_cost_basis' | 'unrealized_pnl' | 'unrealized_pnl_pct' | 'sector' | null
type SortDir = 'asc' | 'desc'

interface Props {
  positions: EnrichedPosition[]
  loading: boolean
  hasStalePrice?: boolean
  signalMap?: Record<string, Verdict | null>
  tickersWithNotes?: Set<string>
  onOpenNotes?: (ticker: string) => void
}

const COLS: { key: SortCol; label: string; numeric: boolean }[] = [
  { key: 'ticker',          label: 'Ticker',       numeric: false },
  { key: 'company_name',    label: 'Company',       numeric: false },
  { key: 'shares_held',     label: 'Shares',        numeric: true  },
  { key: 'avg_cost_basis',  label: 'Avg Cost',      numeric: true  },
  { key: 'current_price',   label: 'Price',         numeric: true  },
  { key: 'current_value',   label: 'Value',         numeric: true  },
  { key: 'total_cost_basis',label: 'Total Cost',    numeric: true  },
  { key: 'unrealized_pnl',  label: 'P&L $',         numeric: true  },
  { key: 'unrealized_pnl_pct', label: 'P&L %',     numeric: true  },
  { key: 'sector',          label: 'Sector',        numeric: false },
  { key: null,              label: 'Signal',        numeric: false },
  { key: null,              label: 'Notes',         numeric: false },
]

export default function PositionsTable({ positions, loading, hasStalePrice, signalMap, tickersWithNotes, onOpenNotes }: Props) {
  const [showClosed, setShowClosed] = useState(false)
  const [showAllCols, setShowAllCols] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const navigate = useNavigate()

  function handleSort(col: SortCol) {
    if (col === null) return
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortCol(null) }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = showClosed ? positions : positions.filter(p => !p.is_closed)

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const va = a[sortCol as keyof EnrichedPosition] ?? ''
        const vb = b[sortCol as keyof EnrichedPosition] ?? ''
        if (va === null || va === undefined) return 1
        if (vb === null || vb === undefined) return -1
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  function pnlClass(n: number | null | undefined) {
    if (n == null) return ''
    return n > 0 ? 'color-bull' : n < 0 ? 'color-bear' : ''
  }

  return (
    <div className="positions-wrap">
      <div className="positions-toolbar">
        <label className="toggle-label text-caption">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={e => setShowClosed(e.target.checked)}
          />
          {' '}Show Closed Positions
        </label>
        {hasStalePrice && (
          <span className="text-caption color-muted">⚠ Prices may be stale</span>
        )}
        {/* AC-7: mobile column toggle */}
        <button className="btn btn--ghost btn--sm show-cols-btn text-caption"
          onClick={() => setShowAllCols(p => !p)}
          aria-pressed={showAllCols}
        >
          {showAllCols ? 'Fewer Columns' : 'All Columns'}
        </button>
      </div>

      <div className="table-scroll">
        <table className={`positions-table${showAllCols ? ' show-all-cols' : ''}`} aria-label="Portfolio positions">
          <thead>
            <tr>
              {COLS.map(col => {
                const mobileClass = col.key === 'avg_cost_basis' ? ' col-avg-cost'
                  : col.key === 'total_cost_basis' ? ' col-total-cost'
                  : col.key === 'sector' ? ' col-sector' : ''
                return (
                  <th
                    key={col.label}
                    className={`${col.numeric ? 'align-right' : ''}${sortCol === col.key ? ' sorted' : ''}${col.key ? ' sortable' : ''}${mobileClass}`}
                    onClick={() => handleSort(col.key)}
                    aria-sort={
                      sortCol === col.key
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : undefined
                    }
                    scope="col"
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span className="sort-glyph">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} cols={COLS.length} />
            ))}

            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="empty-state text-body color-muted">
                  No positions. Log a trade to get started.
                </td>
              </tr>
            )}

            {!loading && sorted.map(pos => (
              <tr
                key={pos.ticker}
                className={`position-row${pos.is_closed ? ' position-row--closed' : ''}`}
                onClick={() => navigate(`/research/${pos.ticker}`)}
                role="link"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/research/${pos.ticker}`)}
                aria-label={`View research for ${pos.ticker}`}
              >
                <td className="ticker-cell">
                  {pos.ticker}
                  {pos.is_closed && <span className="closed-chip">CLOSED</span>}
                </td>
                <td>{pos.company_name}</td>
                <td className="align-right">{formatShares(pos.shares_held)}</td>
                <td className="align-right col-avg-cost">{formatCurrency(pos.avg_cost_basis)}</td>
                <td className="align-right">
                  {pos.current_price != null ? formatCurrency(pos.current_price) : '—'}
                </td>
                <td className="align-right">
                  {pos.current_value != null ? formatCurrency(pos.current_value) : '—'}
                </td>
                <td className="align-right col-total-cost">{formatCurrency(pos.total_cost_basis)}</td>
                <td className={`align-right ${pnlClass(pos.unrealized_pnl)}`}>
                  {pos.unrealized_pnl != null ? formatSignedCurrency(pos.unrealized_pnl) : '—'}
                </td>
                <td className={`align-right ${pnlClass(pos.unrealized_pnl_pct)}`}>
                  {pos.unrealized_pnl_pct != null ? formatSigned(pos.unrealized_pnl_pct) : '—'}
                </td>
                <td className="col-sector">{pos.sector}</td>
                <td className="align-right">
                  <SignalBadge verdict={signalMap?.[pos.ticker] ?? null} size="sm" />
                </td>
                <td className="align-right">
                  {tickersWithNotes?.has(pos.ticker) && (
                    <button
                      type="button"
                      className="notes-icon-btn"
                      onClick={e => { e.stopPropagation(); onOpenNotes?.(pos.ticker) }}
                      aria-label={`View note for ${pos.ticker}`}
                      title={`View note for ${pos.ticker}`}
                    >📄</button>
                  )}
                  <button
                    type="button"
                    className="manage-trades-btn"
                    onClick={e => {
                      e.stopPropagation()
                      if (pos.ticker) navigate(`/trades?ticker=${encodeURIComponent(pos.ticker)}`)
                    }}
                    aria-label={`Manage trades for ${pos.ticker}`}
                    title={`Manage trades for ${pos.ticker}`}
                  >🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
