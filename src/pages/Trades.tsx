import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FAB from '../components/ui/FAB'
import AddTradeModal from '../components/modals/AddTradeModal'
import TradeHistoryTable from '../components/trades/TradeHistoryTable'
import { fetchTrades } from '../api/trades'
import './Trades.css'

export default function Trades() {
  const [searchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState(() => searchParams.get('ticker')?.toUpperCase() ?? '')

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => fetchTrades(),
  })

  return (
    <main className="page trades-page">
      <div className="trades-header">
        <h1 className="text-label">Trade History</h1>
        <input
          className="filter-input"
          type="text"
          placeholder="Filter by ticker…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter trades by ticker"
        />
      </div>

      {isLoading ? (
        <p className="text-caption color-muted">Loading…</p>
      ) : (
        <TradeHistoryTable trades={trades} filter={filter} />
      )}

      <FAB onClick={() => setModalOpen(true)} />
      {modalOpen && <AddTradeModal onClose={() => setModalOpen(false)} />}
    </main>
  )
}
