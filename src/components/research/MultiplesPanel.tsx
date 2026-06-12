import { useState, useEffect, type KeyboardEvent } from 'react'
import Plot from '../ui/PlotComponent'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Skeleton from '../ui/Skeleton'
import {
  fetchMultiples, fetchFavoriteMultiples, saveFavoriteMultiples, fetchMultiplesCompare,
  type MultiplePoint,
} from '../../api/research'
import { useChartHeight } from '../../hooks/useChartHeight'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import './MultiplesPanel.css'


const DARK = {
  paper_bgcolor: '#161B22',
  plot_bgcolor:  '#161B22',
  font:   { family: "'JetBrains Mono', monospace", color: '#6E7681', size: 11 },
  gridcolor: '#21262D',
  linecolor:  '#30363D',
}

const COLORS = ['#00B562','#D29922','#F85149','#58A6FF','#BC8CFF','#FF7B72']

type DisplayMode = 'absolute' | 'pct'

interface Props { ticker: string }

export default function MultiplesPanel({ ticker }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<DisplayMode>('absolute')
  const [compTickers, setCompTickers] = useState<string[]>([])
  const [tickerInput, setTickerInput] = useState('')
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set())
  const [showLegend, setShowLegend] = useState(false)
  const qc = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const chartHeight = useChartHeight(260, 220, 180)

  const isCompareMode = compTickers.length > 0
  // In compare mode, only allow single multiple selection
  const compareMetric = selected[0] ?? 'pe_ttm'

  const { data: multiplesData, isLoading, isError } = useQuery({
    queryKey: ['multiples', ticker],
    queryFn: () => fetchMultiples(ticker),
  })

  const { data: favData } = useQuery({
    queryKey: ['favorites-multiples'],
    queryFn: fetchFavoriteMultiples,
  })

  useEffect(() => {
    if (favData && selected.length === 0) setSelected(favData.favorites)
  }, [favData])

  const saveMut = useMutation({
    mutationFn: saveFavoriteMultiples,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites-multiples'] }),
  })

  const { data: compareData } = useQuery({
    queryKey: ['multiples-compare', ticker, ...compTickers, compareMetric],
    queryFn: () => fetchMultiplesCompare(compareMetric, [ticker, ...compTickers]),
    enabled: isCompareMode,
  })

  function addCompTicker() {
    const t = tickerInput.trim().toUpperCase()
    if (t && !compTickers.includes(t) && t !== ticker && compTickers.length < 4) {
      setCompTickers(prev => [...prev, t])
    }
    setTickerInput('')
  }

  function removeCompTicker(t: string) {
    setCompTickers(prev => prev.filter(x => x !== t))
  }

  function handleTickerKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addCompTicker()
  }

  const favorites = favData?.favorites ?? ['pe_ttm', 'ev_ebitda', 'fcf_yield', 'ps_ratio']
  const groups = multiplesData?.group_structure ?? {}
  const series = multiplesData?.series ?? {}

  function toggleFav(key: string) {
    const next = favorites.includes(key)
      ? favorites.filter(f => f !== key)
      : [...favorites, key]
    saveMut.mutate(next)
  }

  function toggleSelected(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Build Plotly traces
  let traces: Plotly.Data[] = []

  if (isCompareMode && compareData) {
    const allTickers = [ticker, ...compTickers]
    traces = allTickers
      .filter(t => !hiddenTickers.has(t))
      .map((t, i) => {
        const pts = compareData[t] ?? []
        const dates = pts.map(p => p.date)
        let values = pts.map(p => p.value)
        if (mode === 'pct' && values.length > 0) {
          const base = values[0]
          values = values.map(v => base ? ((v - base) / base) * 100 : 0)
        }
        const color = COLORS[i % COLORS.length]
        const dash = pts.length < 10 ? 'dash' : 'solid'
        return {
          type: 'scatter', mode: 'lines', x: dates, y: values,
          name: t, line: { color, width: 2, dash },
          hovertemplate: `${t}: %{y:.2f}${mode === 'pct' ? '%' : 'x'}<extra></extra>`,
        } as Plotly.Data
      })
  } else {
    traces = selected
      .filter(k => (series[k] ?? []).length > 0)
      .map((key, i) => {
        const pts: MultiplePoint[] = series[key] ?? []
        const dates = pts.map(p => p.date)
        let values = pts.map(p => p.value)
        if (mode === 'pct' && values.length > 0) {
          const base = values[0]
          values = values.map(v => base !== 0 ? ((v - base) / base) * 100 : 0)
        }
        const sorted = [...values].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0
        const color = COLORS[i % COLORS.length]
        const label = Object.values(groups).flat().find(m => m.key === key)?.label ?? key
        return [
          { type: 'scatter', mode: 'lines', x: dates, y: values,
            name: label, line: { color, width: 2 },
            hovertemplate: `${label}: %{y:.2f}${mode === 'pct' ? '%' : 'x'}<extra></extra>`,
          } as Plotly.Data,
          { type: 'scatter', mode: 'lines', x: [dates[0], dates[dates.length - 1]],
            y: [median, median], name: `Median: ${median.toFixed(1)}${mode === 'pct' ? '%' : 'x'}`,
            line: { color, width: 1, dash: 'dash' }, showlegend: false, hoverinfo: 'skip',
          } as Plotly.Data,
        ]
      })
      .flat()
  }

  return (
    <section className="multiples-panel" aria-label="Valuation multiples chart">
      <div className="multiples-panel__header">
        <span className="text-label">Valuation Multiples</span>
        <div className="multiples-mode-toggle">
          <button className={`mode-btn${mode === 'absolute' ? ' mode-btn--active' : ''}`}
            onClick={() => setMode('absolute')}>Absolute</button>
          <button className={`mode-btn${mode === 'pct' ? ' mode-btn--active' : ''}`}
            onClick={() => setMode('pct')}>% Change</button>
          {isMobile && (
            <button
              className={`mode-btn${showLegend ? ' mode-btn--active' : ''}`}
              onClick={() => setShowLegend(p => !p)}
              aria-pressed={showLegend}
              aria-label="Toggle legend"
            >Legend</button>
          )}
        </div>
      </div>

      {isError && (
        <p className="text-caption color-muted">
          Failed to load multiples.{' '}
          <button className="link-btn text-caption"
            onClick={() => qc.invalidateQueries({ queryKey: ['multiples', ticker] })}>Retry</button>
        </p>
      )}

      {/* Multiple selector */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="28px" />)}
        </div>
      ) : (
        <div className="multiples-groups">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="multiples-group">
              <span className="multiples-group__label text-caption color-muted">{group}</span>
              {items.map(({ key, label }) => {
                const hasSeries = (series[key] ?? []).length > 0
                const isFav = favorites.includes(key)
                const isSel = selected.includes(key)
                return (
                  <div key={key}
                    className={`multiple-item${isSel ? ' multiple-item--selected' : ''}${!hasSeries ? ' multiple-item--unavail' : ''}`}
                    onClick={() => hasSeries && toggleSelected(key)}
                  >
                    <button
                      className={`fav-btn${isFav ? ' fav-btn--active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFav(key) }}
                      aria-label={`${isFav ? 'Unstar' : 'Star'} ${label}`}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                    <span className="text-caption">{label}</span>
                    {!hasSeries && <span className="text-caption color-muted"> (N/A)</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {!isLoading && traces.length > 0 && (
        <div className="multiples-chart-container">
          <Plot
            data={traces}
            layout={{
              ...DARK,
              margin: isMobile ? { t: 8, b: 40, l: 40, r: 8 } : { t: 8, b: 40, l: 55, r: 8 },
              height: chartHeight,
              showlegend: isMobile ? showLegend : true,
              legend: isMobile
                ? { orientation: 'h' as const, x: 0, y: -0.25, font: { size: 10, color: '#8B949E' }, bgcolor: 'transparent' }
                : { font: { size: 10, color: '#8B949E' }, bgcolor: 'transparent' },
              hovermode: 'x unified',
              xaxis: { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor },
              yaxis: {
                gridcolor: DARK.gridcolor, linecolor: DARK.linecolor,
                ticksuffix: mode === 'pct' ? '%' : 'x',
              },
            } as unknown as Plotly.Layout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {!isLoading && selected.length > 0 && traces.length === 0 && (
        <p className="text-caption color-muted" style={{ padding: 'var(--space-md)' }}>
          No data available for the selected multiples.
        </p>
      )}

      {/* Comparison ticker input */}
      <div className="comp-toolbar">
        <span className="text-caption color-muted">{ticker}</span>
        {compTickers.map(t => (
          <span key={t} className="comp-chip text-caption">
            {t}
            <button className="comp-chip__remove" onClick={() => removeCompTicker(t)}
              aria-label={`Remove ${t}`}>×</button>
          </span>
        ))}
        {compTickers.length < 4 && (
          <div className="comp-add">
            <input
              className="comp-input"
              placeholder="+ Add Stock"
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value.toUpperCase())}
              onKeyDown={handleTickerKey}
              maxLength={10}
              aria-label="Add comparison ticker"
            />
          </div>
        )}
        {isCompareMode && (
          <button className="link-btn text-caption" onClick={() => setCompTickers([])}>
            Clear all
          </button>
        )}
      </div>

      {/* Comparison ticker visibility toggles */}
      {isCompareMode && (
        <div className="comp-legend">
          {[ticker, ...compTickers].map((t, i) => (
            <label key={t} className="comp-legend-item text-caption">
              <input type="checkbox" checked={!hiddenTickers.has(t)}
                onChange={() => setHiddenTickers(prev => {
                  const next = new Set(prev)
                  next.has(t) ? next.delete(t) : next.add(t)
                  return next
                })} />
              <span style={{ color: COLORS[i % COLORS.length] }}> {t}</span>
              {(compareData?.[t]?.length ?? 0) < 5 && (
                <span className="color-muted"> (limited data)</span>
              )}
            </label>
          ))}
        </div>
      )}

      {!isLoading && selected.length === 0 && (
        <p className="text-caption color-muted" style={{ padding: 'var(--space-md)' }}>
          Select one or more multiples above to view the chart.
        </p>
      )}
    </section>
  )
}
