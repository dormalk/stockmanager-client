import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import FundamentalsPanel from '../components/research/FundamentalsPanel'
import NewsPanel from '../components/research/NewsPanel'
import PriceChart from '../components/research/PriceChart'
import PatternsPanel from '../components/research/PatternsPanel'
import SignalCard from '../components/research/SignalCard'
import SignalBadge from '../components/ui/SignalBadge'
import MultiplesPanel from '../components/research/MultiplesPanel'
import NotesPanel from '../components/research/NotesPanel'
import AIPanel from '../components/research/AIPanel'
import AIChatPanel from '../components/research/AIChatPanel'
import CompetitorsCard from '../components/research/CompetitorsCard'
import SectorPerformanceChart from '../components/research/SectorPerformanceChart'
import { fetchFundamentals, fetchHistory, type ChartRange, type ChartPattern } from '../api/research'
import { fetchSignals } from '../api/signals'
import { fetchWatchlists, addToWatchlistById } from '../api/watchlists'
import './Research.css'

export default function Research() {
  const { ticker } = useParams<{ ticker: string }>()
  const sym = ticker?.toUpperCase() ?? ''
  const qc = useQueryClient()
  const [showWlDropdown, setShowWlDropdown] = useState(false)
  const [chartRange, setChartRange]         = useState<ChartRange>('D')
  const [focusPattern, setFocusPattern]     = useState<ChartPattern | null>(null)

  const { data: fundamentals } = useQuery({
    queryKey: ['fundamentals', sym],
    queryFn: () => fetchFundamentals(sym),
    enabled: !!sym,
  })

  // Share the same query key as PriceChart so patterns always match the visible candles
  const { data: history } = useQuery({
    queryKey: ['history', sym, chartRange],
    queryFn: () => fetchHistory(sym, chartRange),
    enabled: !!sym,
  })

  const { data: signals } = useQuery({
    queryKey: ['signals', sym],
    queryFn: () => fetchSignals(sym),
    enabled: !!sym,
  })

  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists'],
    queryFn: fetchWatchlists,
    enabled: !!sym,
  })

  const addToWlMut = useMutation({
    mutationFn: (watchlistId: number) => addToWatchlistById(watchlistId, sym),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      qc.invalidateQueries({ queryKey: ['watchlist-items'] })
      setShowWlDropdown(false)
    },
  })

  const onAnyWatchlist = watchlists.some(
    // We can't cheaply check item membership here without fetching all items;
    // show button as enabled always (idempotent add, server returns 409 for dups)
    () => false
  )
  void onAnyWatchlist  // suppress unused warning

  if (!sym) {
    return (
      <main className="page">
        <p className="text-body color-muted">Enter a ticker symbol to view research.</p>
      </main>
    )
  }

  return (
    <main className="page research-page">
      {/* Ticker header */}
      <div className="research-header">
        <div className="research-header__left">
          <span className="text-display research-header__ticker">{sym}</span>
          {fundamentals && (
            <span className="text-heading research-header__name color-muted">
              {fundamentals.company_name}
            </span>
          )}
        </div>
        <div className="research-header__right">
          <SignalBadge verdict={signals?.verdict} size="sm" />

          {/* AC-7: single watchlist → direct add; multiple → dropdown */}
          <div style={{ position: 'relative' }}>
            {watchlists.length <= 1 ? (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => watchlists[0] && addToWlMut.mutate(watchlists[0].id)}
                aria-label="Add to Watchlist"
              >
                Add to Watchlist
              </button>
            ) : (
              <>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShowWlDropdown(p => !p)}
                  aria-label="Add to Watchlist"
                  aria-expanded={showWlDropdown}
                >
                  Add to Watchlist ▾
                </button>
                {showWlDropdown && (
                  <div className="wl-add-dropdown" role="menu">
                    {watchlists.map(wl => (
                      <button
                        key={wl.id}
                        className="wl-add-dropdown__item text-caption"
                        role="menuitem"
                        onClick={() => addToWlMut.mutate(wl.id)}
                      >
                        Add to {wl.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="research-columns">
        {/* Left column */}
        <div className="research-col research-col--left">
          <SignalCard ticker={sym} />
          <FundamentalsPanel ticker={sym} />
          <NewsPanel ticker={sym} />
          <CompetitorsCard ticker={sym} />
          <NotesPanel ticker={sym} />
        </div>

        {/* Right column */}
        <div className="research-col research-col--right">
          <PriceChart
            ticker={sym}
            range={chartRange}
            onRangeChange={r => { setChartRange(r); setFocusPattern(null) }}
            focusPattern={focusPattern}
          />
          <SectorPerformanceChart ticker={sym} />
          <PatternsPanel
            patterns={history?.patterns ?? []}
            range={chartRange}
            onPatternClick={p => setFocusPattern(p)}
          />
          <MultiplesPanel ticker={sym} />
          <AIPanel ticker={sym} />
          <AIChatPanel ticker={sym} />
        </div>
      </div>
    </main>
  )
}
