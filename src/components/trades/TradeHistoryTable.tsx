import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmPopover from '../ui/ConfirmPopover'
import { formatCurrency, formatShares } from '../../utils/format'
import { deleteTrade, type TradeOut } from '../../api/trades'
import './TradeHistoryTable.css'

interface Props {
  trades: TradeOut[]
  filter: string
}

export default function TradeHistoryTable({ trades, filter }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirmId(null)
    },
  })

  const filtered = filter
    ? trades.filter(t => t.ticker.toLowerCase().includes(filter.toLowerCase()))
    : trades

  if (filtered.length === 0) {
    return (
      <p className="text-body color-muted" style={{ marginTop: 'var(--space-xl)' }}>
        No trades recorded.
      </p>
    )
  }

  return (
    <div className="table-scroll">
      <table className="trades-table" aria-label="Trade history">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Ticker</th>
            <th scope="col">Type</th>
            <th scope="col" className="align-right">Qty</th>
            <th scope="col" className="align-right">Price/Share</th>
            <th scope="col" className="align-right">Commission</th>
            <th scope="col" className="align-right">Total Value</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(trade => (
            <tr key={trade.id} className="trade-row">
              <td className="text-caption color-muted">{trade.trade_date}</td>
              <td className="ticker-cell">{trade.ticker}</td>
              <td>
                <span className={`type-badge type-badge--${trade.trade_type.toLowerCase()}`}>
                  {trade.trade_type}
                </span>
              </td>
              <td className="align-right">{formatShares(trade.quantity)}</td>
              <td className="align-right">{formatCurrency(trade.price_per_share)}</td>
              <td className="align-right">
                {trade.commission > 0 ? formatCurrency(trade.commission) : '—'}
              </td>
              <td className="align-right">
                {formatCurrency(trade.quantity * trade.price_per_share)}
              </td>
              <td className="action-cell">
                <button
                  className="trash-btn"
                  onClick={() => setConfirmId(trade.id)}
                  aria-label={`Delete trade ${trade.ticker} ${trade.trade_date}`}
                >
                  🗑
                </button>
                {confirmId === trade.id && (
                  <ConfirmPopover
                    message="Delete this trade?"
                    onConfirm={() => deleteMutation.mutate(trade.id)}
                    onCancel={() => setConfirmId(null)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
