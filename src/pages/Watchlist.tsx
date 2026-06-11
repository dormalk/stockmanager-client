import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmPopover from '../components/ui/ConfirmPopover'
import AlertPopover from '../components/ui/AlertPopover'
import SignalBadge from '../components/ui/SignalBadge'
import TickerInput from '../components/ui/TickerInput'
import WatchlistSelector from '../components/watchlist/WatchlistSelector'
import {
  fetchWatchlists, fetchWatchlistItems, fetchActiveAlerts,
  addToWatchlistById, removeFromWatchlistById,
  patchItemAlert, resetItemAlert, markItemAlertFired,
  createWatchlist,
} from '../api/watchlists'
import { fetchBatchSignals } from '../api/signals'
import { fetchTickersWithNotes } from '../api/notes'
import { useActiveWatchlist } from '../hooks/useActiveWatchlist'
import { formatCurrency, formatSigned } from '../utils/format'
import './Watchlist.css'

const POLL_INTERVAL = 5 * 60 * 1000

export default function Watchlist() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeId, setActiveId } = useActiveWatchlist()
  const [tickerInput, setTickerInput] = useState('')
  const [addError, setAddError] = useState('')
  const [confirmKey, setConfirmKey] = useState<string | null>(null)   // "wlId:ticker"
  const [alertKey, setAlertKey] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  // ── Background price polling — only fetches items with configured alerts ──
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    async function checkAlerts() {
      if (document.visibilityState !== 'visible') return
      try {
        const alerts = await fetchActiveAlerts()
        const fired = alerts.filter(alert =>
          alert.current_price != null &&
          alert.alert_direction != null && (
            (alert.alert_direction === 'Above' && alert.current_price >= alert.alert_price) ||
            (alert.alert_direction === 'Below' && alert.current_price <= alert.alert_price)
          )
        )
        if (fired.length > 0 && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission()
        }
        await Promise.allSettled(fired.map(async alert => {
          await markItemAlertFired(alert.watchlist_id, alert.ticker)
          qc.invalidateQueries({ queryKey: ['watchlist-items', alert.watchlist_id] })
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${alert.ticker} reached $${alert.current_price!.toFixed(2)}`, {
              body: `${alert.watchlist_name}: ${alert.alert_direction} $${alert.alert_price.toFixed(2)}`,
            })
          }
        }))
      } catch (e) {
        console.warn('[alert-check] failed:', e)
      }
    }

    checkAlerts()
    timer = setInterval(checkAlerts, POLL_INTERVAL)
    document.addEventListener('visibilitychange', checkAlerts)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', checkAlerts)
    }
  }, [qc])

  const { data: watchlists = [], isLoading: isWatchlistsLoading } = useQuery({
    queryKey: ['watchlists'],
    queryFn: fetchWatchlists,
  })

  // Fall back to the first available watchlist when the stored id no longer exists
  const validActiveId = watchlists.some(w => w.id === activeId)
    ? activeId
    : watchlists[0]?.id ?? activeId

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ['watchlist-items', validActiveId],
    queryFn: () => fetchWatchlistItems(validActiveId),
    enabled: watchlists.length > 0,
  })

  const tickers = items.map(i => i.ticker)
  const { data: notesData } = useQuery({
    queryKey: ['notes-tickers'],
    queryFn: fetchTickersWithNotes,
  })
  const tickersWithNotes = new Set(notesData?.tickers ?? [])

  const { data: signalMap } = useQuery({
    queryKey: ['watchlist-signals', tickers.join(',')],
    queryFn: () => fetchBatchSignals(tickers),
    enabled: tickers.length > 0,
  })

  const addMut = useMutation({
    mutationFn: (t: string) => addToWatchlistById(validActiveId, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist-items', validActiveId] })
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      setTickerInput('')
      setAddError('')
    },
    onError: (err: { status?: number; detail?: string }) => {
      setAddError(err.detail ?? 'Failed to add ticker')
    },
  })

  const removeMut = useMutation({
    mutationFn: ({ wlId, ticker }: { wlId: number; ticker: string }) =>
      removeFromWatchlistById(wlId, ticker),
    onSuccess: (_, { wlId }) => {
      qc.invalidateQueries({ queryKey: ['watchlist-items', wlId] })
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      setConfirmKey(null)
    },
  })

  const alertMut = useMutation({
    mutationFn: ({ wlId, ticker, price, dir }: { wlId: number; ticker: string; price: number | null; dir: string | null }) =>
      patchItemAlert(wlId, ticker, price, dir),
    onSuccess: (_, { wlId }) => {
      qc.invalidateQueries({ queryKey: ['watchlist-items', wlId] })
      setAlertKey(null)
    },
  })

  const resetAlertMut = useMutation({
    mutationFn: ({ wlId, ticker }: { wlId: number; ticker: string }) =>
      resetItemAlert(wlId, ticker),
    onSuccess: (_, { wlId }) => qc.invalidateQueries({ queryKey: ['watchlist-items', wlId] }),
  })

  const createFirstListMut = useMutation({
    mutationFn: (name: string) => createWatchlist(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['watchlists'] })
      setActiveId(data.id)
      setNewListName('')
    },
  })

  function handleAdd() {
    const t = tickerInput.trim().toUpperCase()
    if (t) addMut.mutate(t)
  }

  const activeWl = watchlists.find(w => w.id === validActiveId)
  const noLists = watchlists.length === 0 && !isWatchlistsLoading

  return (
    <main className="page watchlist-page">
      {/* Header */}
      <div className="watchlist-header">
        <div className="watchlist-header__top">
          <h1 className="text-label">Watchlist</h1>
          {watchlists.length > 0 && (
            <WatchlistSelector
              watchlists={watchlists}
              activeId={validActiveId}
              onSelect={setActiveId}
            />
          )}
        </div>
        {watchlists.length > 0 && (
          <div className="watchlist-add">
            <TickerInput
              value={tickerInput}
              onChange={v => { setTickerInput(v); setAddError('') }}
              onEnter={handleAdd}
              onSelect={sym => { setTickerInput(sym); addMut.mutate(sym) }}
              placeholder="TICKER"
              ariaLabel={`Add ticker to ${activeWl?.name ?? 'watchlist'}`}
            />
            <button className="btn btn--primary btn--sm" onClick={handleAdd}>Add</button>
          </div>
        )}
      </div>
      {addError && <p className="text-caption color-bear">{addError}</p>}

      {/* No lists yet — create-first-list empty state */}
      {noLists && (
        <div className="watchlist-empty-state">
          <p className="text-body color-muted">No watchlists yet.</p>
          <div className="watchlist-add" style={{ marginTop: 'var(--space-md)' }}>
            <input
              className="field__input"
              placeholder="List name…"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newListName.trim() && createFirstListMut.mutate(newListName.trim())}
              aria-label="New watchlist name"
              autoFocus
            />
            <button
              className="btn btn--primary btn--sm"
              onClick={() => newListName.trim() && createFirstListMut.mutate(newListName.trim())}
            >
              Create List
            </button>
          </div>
        </div>
      )}

      {!noLists && isItemsLoading ? (
        <p className="text-caption color-muted">Loading…</p>
      ) : !noLists && items.length === 0 ? (
        <p className="text-body color-muted" style={{ marginTop: 'var(--space-xl)' }}>
          No tickers in this list. Search a ticker in the sidebar to add one.
        </p>
      ) : !noLists ? (
        <div className="table-scroll">
          <table className="watchlist-table" aria-label={`${activeWl?.name ?? 'Watchlist'} items`}>
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Company</th>
                <th scope="col" className="align-right">Price</th>
                <th scope="col" className="align-right col-day-dollar">Day $</th>
                <th scope="col" className="align-right">Day %</th>
                <th scope="col" className="align-right col-52w-high">52W High</th>
                <th scope="col" className="align-right col-52w-low">52W Low</th>
                <th scope="col">Alert</th>
                <th scope="col">Signal</th>
                <th scope="col">Notes</th>
                <th scope="col" className="col-date-added">Added</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const itemKey = `${item.watchlist_id}:${item.ticker}`
                return (
                  <tr key={itemKey}
                    className={`watchlist-row${item.alert_fired ? ' watchlist-row--fired' : ''}`}
                    onClick={() => navigate(`/research/${item.ticker}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="ticker-cell">{item.ticker}</td>
                    <td>
                      {item.company_name}
                      {item.in_portfolio && (
                        <span className="portfolio-chip text-caption">IN PORTFOLIO</span>
                      )}
                    </td>
                    <td className="align-right">
                      {item.current_price != null ? formatCurrency(item.current_price) : '—'}
                    </td>
                    <td className={`align-right col-day-dollar ${item.day_change != null ? (item.day_change >= 0 ? 'color-bull' : 'color-bear') : ''}`}>
                      {item.day_change != null ? (item.day_change >= 0 ? '+' : '') + formatCurrency(item.day_change) : '—'}
                    </td>
                    <td className={`align-right ${item.day_change_pct != null ? (item.day_change_pct >= 0 ? 'color-bull' : 'color-bear') : ''}`}>
                      {item.day_change_pct != null ? formatSigned(item.day_change_pct) : '—'}
                    </td>
                    <td className="align-right col-52w-high">
                      {item.week52_high != null ? formatCurrency(item.week52_high) : '—'}
                    </td>
                    <td className="align-right col-52w-low">
                      {item.week52_low != null ? formatCurrency(item.week52_low) : '—'}
                    </td>
                    <td className="text-caption color-muted">
                      {item.alert_price != null
                        ? `${item.alert_direction} ${formatCurrency(item.alert_price)}`
                        : '—'}
                    </td>
                    <td>
                      <SignalBadge verdict={signalMap?.[item.ticker] ?? null} size="sm" />
                    </td>
                    <td>
                      {tickersWithNotes.has(item.ticker) && (
                        <button className="notes-icon-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/research/${item.ticker}`) }}
                          aria-label={`View note for ${item.ticker}`}
                          title={`View note for ${item.ticker}`}>📄</button>
                      )}
                    </td>
                    <td className="text-caption color-muted col-date-added">{item.date_added ?? '—'}</td>
                    <td className="action-cell" onClick={e => e.stopPropagation()}>
                      {item.alert_fired ? (
                        <button className="reset-btn text-caption"
                          onClick={() => resetAlertMut.mutate({ wlId: item.watchlist_id, ticker: item.ticker })}
                          aria-label={`Reset alert for ${item.ticker}`}>
                          Reset Alert
                        </button>
                      ) : (
                        <button className="bell-btn"
                          onClick={() => setAlertKey(itemKey)}
                          aria-label={`Set alert for ${item.ticker}`}>🔔</button>
                      )}
                      {alertKey === itemKey && (
                        <AlertPopover
                          ticker={item.ticker}
                          currentPrice={item.current_price}
                          currentTarget={item.alert_price}
                          currentDirection={item.alert_direction}
                          onSave={(price, dir) => alertMut.mutate({ wlId: item.watchlist_id, ticker: item.ticker, price, dir })}
                          onClose={() => setAlertKey(null)}
                        />
                      )}
                      <button
                        className="trash-btn"
                        onClick={() => setConfirmKey(itemKey)}
                        aria-label={`Remove ${item.ticker} from watchlist`}
                      >🗑</button>
                      {confirmKey === itemKey && (
                        <ConfirmPopover
                          message={`Remove ${item.ticker}?`}
                          onConfirm={() => removeMut.mutate({ wlId: item.watchlist_id, ticker: item.ticker })}
                          onCancel={() => setConfirmKey(null)}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  )
}
