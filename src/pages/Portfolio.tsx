import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import FAB from '../components/ui/FAB'
import AddTradeModal from '../components/modals/AddTradeModal'
import SummaryCard from '../components/ui/SummaryCard'
import PositionsTable from '../components/portfolio/PositionsTable'
import AllocationChart from '../components/portfolio/AllocationChart'
import SectorChart from '../components/portfolio/SectorChart'
import SlideOver from '../components/ui/SlideOver'
import NotesPanel from '../components/research/NotesPanel'
import Skeleton from '../components/ui/Skeleton'
import { fetchDashboard } from '../api/portfolio'
import { fetchBatchSignals } from '../api/signals'
import { fetchTickersWithNotes } from '../api/notes'
import { formatSigned, formatSignedCurrency } from '../utils/format'
import './Portfolio.css'

export default function Portfolio() {
  const [modalOpen, setModalOpen] = useState(false)
  const [notesTicker, setNotesTicker] = useState<string | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetchDashboard(),
    refetchInterval: 300_000, // re-fetch prices every 5 min
  })

  const summary = data?.summary
  const positions = data?.positions ?? []
  const hasStalePrice = positions.some(p => !p.is_closed && p.current_price == null)

  const openTickers = positions.filter(p => !p.is_closed).map(p => p.ticker)
  const { data: signalMap } = useQuery({
    queryKey: ['batch-signals', openTickers.join(',')],
    queryFn: () => fetchBatchSignals(openTickers),
    enabled: openTickers.length > 0,
  })

  const { data: notesData } = useQuery({
    queryKey: ['notes-tickers'],
    queryFn: fetchTickersWithNotes,
  })
  const tickersWithNotes = new Set(notesData?.tickers ?? [])

  const pnlClass = (n: number | undefined) => {
    if (n == null) return ''
    return n > 0 ? 'color-bull' : n < 0 ? 'color-bear' : ''
  }

  return (
    <main className="page portfolio-page">
      <div className="portfolio-header">
        <h1 className="text-label">Portfolio</h1>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="summary-card">
              <Skeleton height="13px" width="100px" />
              <Skeleton height="20px" width="140px" />
            </div>
          ))
        ) : (
          <>
            <SummaryCard
              label="Total Value"
              value={summary?.total_value ?? 0}
            />
            <SummaryCard
              label="Cost Basis"
              value={summary?.total_cost ?? 0}
            />
            <div className="summary-card">
              <span className="summary-card__label text-label">P&L $</span>
              <span className={`summary-card__value text-data-lg ${pnlClass(summary?.unrealized_pnl)}`}>
                {formatSignedCurrency(summary?.unrealized_pnl ?? 0)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-card__label text-label">P&L %</span>
              <span className={`summary-card__value text-data-lg ${pnlClass(summary?.unrealized_pnl_pct)}`}>
                {formatSigned(summary?.unrealized_pnl_pct ?? 0)}
              </span>
            </div>
          </>
        )}
      </div>

      {isError && (
        <p className="text-caption color-muted" style={{ margin: 'var(--space-sm) 0' }}>
          Failed to load portfolio data. Retrying…
        </p>
      )}

      {/* Positions table */}
      <PositionsTable
        positions={positions}
        loading={isLoading}
        hasStalePrice={hasStalePrice}
        signalMap={signalMap}
        tickersWithNotes={tickersWithNotes}
        onOpenNotes={setNotesTicker}
      />

      {notesTicker && (
        <SlideOver title={`Notes — ${notesTicker}`} onClose={() => setNotesTicker(null)}>
          <NotesPanel ticker={notesTicker} />
        </SlideOver>
      )}

      {/* Charts row */}
      {!isLoading && positions.filter(p => !p.is_closed).length > 0 && (
        <div className="portfolio-charts">
          <AllocationChart positions={positions} />
          <SectorChart positions={positions} />
        </div>
      )}

      <FAB onClick={() => setModalOpen(true)} />
      {modalOpen && (
        <AddTradeModal onClose={() => setModalOpen(false)} />
      )}
    </main>
  )
}
