import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Skeleton from '../ui/Skeleton'
import { fetchCompetitors } from '../../api/research'
import './CompetitorsCard.css'

interface Props { ticker: string }

const MAX_PEERS = 2 // current ticker is always included → total max 3

function formatChange(pct: number | null): { text: string; cls: string } {
  if (pct == null) return { text: '—', cls: 'color-muted' }
  const sign = pct >= 0 ? '+' : ''
  return { text: `${sign}${pct.toFixed(2)}%`, cls: pct >= 0 ? 'color-bull' : 'color-bear' }
}

export default function CompetitorsCard({ ticker }: Props) {
  const navigate = useNavigate()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['competitors', ticker],
    queryFn: () => fetchCompetitors(ticker),
  })

  function enterSelectMode() {
    setSelected(new Set())
    setSelectMode(true)
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function toggleSelect(sym: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(sym)) {
        next.delete(sym)
      } else if (next.size < MAX_PEERS) {
        next.add(sym)
      }
      return next
    })
  }

  function handleSubmit() {
    const tickers = [ticker, ...Array.from(selected)]
    const params = new URLSearchParams({ tickers: tickers.join(',') })
    navigate(`/compare?${params}`)
  }

  if (isLoading) {
    return (
      <section className="competitors-card" aria-label="Competitors">
        <div className="competitors-card__header">
          <span className="text-label">Competitors</span>
        </div>
        <Skeleton height="120px" />
      </section>
    )
  }

  if (!data || data.length === 0) {
    return (
      <section className="competitors-card" aria-label="Competitors">
        <span className="text-label">Competitors</span>
        <p className="text-caption color-muted">No competitor data available.</p>
      </section>
    )
  }

  return (
    <section className="competitors-card" aria-label="Competitors">
      <div className="competitors-card__header">
        <span className="text-label">Competitors</span>
        <div className="competitors-card__actions">
          {selectMode ? (
            <>
              <button className="btn btn--ghost btn--sm" onClick={exitSelectMode}>
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleSubmit}
                disabled={selected.size === 0}
              >
                Compare{selected.size > 0 ? ` (${selected.size + 1})` : ''}
              </button>
            </>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={enterSelectMode}>
              Compare
            </button>
          )}
        </div>
      </div>

      {selectMode && (
        <p className="competitors-hint text-caption color-muted">
          Select up to {MAX_PEERS} to compare with {ticker}
        </p>
      )}

      <div className="competitors-list">
        {data.map(c => {
          const { text, cls } = formatChange(c.day_change_pct)
          const isChecked = selected.has(c.ticker)
          const isDisabled = !isChecked && selected.size >= MAX_PEERS

          if (selectMode) {
            return (
              <label
                key={c.ticker}
                className={`competitor-row competitor-row--selectable${isDisabled ? ' competitor-row--disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  className="competitor-checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => toggleSelect(c.ticker)}
                />
                <div className="competitor-row__info">
                  <span className="competitor-row__ticker text-body">{c.ticker}</span>
                  <span className="competitor-row__name text-caption color-muted">{c.name}</span>
                </div>
                <div className="competitor-row__price">
                  {c.current_price != null && (
                    <span className="text-body">${c.current_price.toFixed(2)}</span>
                  )}
                  <span className={`text-caption ${cls}`}>{text}</span>
                </div>
              </label>
            )
          }

          return (
            <div
              key={c.ticker}
              className="competitor-row"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/research/${c.ticker}`)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/research/${c.ticker}`)}
            >
              <div className="competitor-row__info">
                <span className="competitor-row__ticker text-body">{c.ticker}</span>
                <span className="competitor-row__name text-caption color-muted">{c.name}</span>
              </div>
              <div className="competitor-row__price">
                {c.current_price != null && (
                  <span className="text-body">${c.current_price.toFixed(2)}</span>
                )}
                <span className={`text-caption ${cls}`}>{text}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
