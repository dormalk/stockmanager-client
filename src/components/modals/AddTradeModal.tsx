import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTrade, type TradeIn } from '../../api/trades'
import type { DashboardData, EnrichedPosition } from '../../api/portfolio'
import TickerInput from '../ui/TickerInput'
import './AddTradeModal.css'

interface Props {
  onClose: () => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AddTradeModal({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [ticker, setTicker] = useState('')
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')
  const [tradeDate, setTradeDate] = useState(todayISO())
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [commission, setCommission] = useState('')
  const [showCommission, setShowCommission] = useState(false)
  const [qtyError, setQtyError] = useState('')
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (body: TradeIn) => createTrade(body),
    onSuccess: (result) => {
      const pos = result.position
      if (pos) {
        // Immediately patch the cache so the table updates before the background refetch
        queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
          if (!old) return old
          const existing = old.positions.find(p => p.ticker === pos.ticker)
          const newPositions: EnrichedPosition[] = existing
            ? old.positions.map(p => {
                if (p.ticker !== pos.ticker) return p
                const currentValue = p.current_price != null ? p.current_price * pos.shares_held : null
                const pnl = currentValue != null ? currentValue - pos.total_cost_basis : null
                const pnlPct = pnl != null && pos.total_cost_basis > 0
                  ? (pnl / pos.total_cost_basis) * 100 : null
                return { ...p, ...pos, current_value: currentValue, unrealized_pnl: pnl, unrealized_pnl_pct: pnlPct }
              })
            : [...old.positions, {
                ...pos,
                company_name: pos.ticker,
                sector: 'Unknown',
                current_price: null,
                current_value: null,
                day_change: null,
                day_change_pct: null,
                unrealized_pnl: null,
                unrealized_pnl_pct: null,
              }]
          return { ...old, positions: newPositions }
        })
      }
      // Background refetch for full enriched data (prices, company name, sector)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: { status: number; detail: string }) => {
      if (err.status === 422) {
        setQtyError(err.detail)
        qtyRef.current?.focus()
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setQtyError('')
    mutation.mutate({
      ticker: ticker.trim().toUpperCase(),
      trade_type: tradeType,
      trade_date: tradeDate,
      price_per_share: parseFloat(price),
      quantity: parseFloat(quantity),
      commission: commission ? parseFloat(commission) : 0,
    })
  }

  const isSubmitting = mutation.isPending

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add trade">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span className="text-label">Add Trade</span>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="trade-ticker" className="field__label">Ticker</label>
            <TickerInput
              id="trade-ticker"
              value={ticker}
              onChange={setTicker}
              placeholder="AAPL"
              ariaLabel="Stock ticker symbol"
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field__label">Type</label>
            <div className="segmented">
              <button
                type="button"
                className={`segmented__btn${tradeType === 'BUY' ? ' segmented__btn--active segmented__btn--bull' : ''}`}
                onClick={() => setTradeType('BUY')}
              >BUY</button>
              <button
                type="button"
                className={`segmented__btn${tradeType === 'SELL' ? ' segmented__btn--active segmented__btn--bear' : ''}`}
                onClick={() => setTradeType('SELL')}
              >SELL</button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="trade-date" className="field__label">Date</label>
            <input
              id="trade-date"
              className="field__input"
              type="date"
              value={tradeDate}
              onChange={e => setTradeDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="price" className="field__label">Price Per Share</label>
            <input
              id="price"
              className="field__input"
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              min="0.000001"
              step="any"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="quantity" className="field__label">Quantity</label>
            <input
              id="quantity"
              ref={qtyRef}
              className={`field__input${qtyError ? ' field__input--error' : ''}`}
              type="number"
              value={quantity}
              onChange={e => { setQuantity(e.target.value); setQtyError('') }}
              placeholder="0"
              min="0.000001"
              step="any"
              required
              aria-describedby={qtyError ? 'qty-error' : undefined}
            />
            {qtyError && (
              <span id="qty-error" className="field__error" role="alert">{qtyError}</span>
            )}
          </div>

          {!showCommission && (
            <button
              type="button"
              className="link-btn text-caption"
              onClick={() => setShowCommission(true)}
            >
              + Add Commission
            </button>
          )}

          {showCommission && (
            <div className="field">
              <label htmlFor="commission" className="field__label">Commission</label>
              <input
                id="commission"
                className="field__input"
                type="number"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
              />
            </div>
          )}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting || !!qtyError}
            >
              {isSubmitting ? 'Saving…' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
