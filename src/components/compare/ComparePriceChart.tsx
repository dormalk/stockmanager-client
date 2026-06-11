import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Plot, { type PlotClickPoint } from '../ui/PlotComponent'
import Skeleton from '../ui/Skeleton'
import { fetchComparePriceHistory, type PriceHistoryRange } from '../../api/compare'
import { useChartHeight } from '../../hooks/useChartHeight'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import './ComparePriceChart.css'

const RANGES: PriceHistoryRange[] = ['1M', '3M', '6M', '1Y']
const SERIES_COLORS = ['#00B562', '#58A6FF', '#F0883E', '#BC8CFF']

const DARK = {
  paper_bgcolor: '#161B22',
  plot_bgcolor:  '#161B22',
  font:          { family: "'JetBrains Mono', monospace", color: '#6E7681', size: 11 },
  gridcolor:     '#21262D',
  linecolor:     '#30363D',
}

interface Snapshot { date: string; entries: { name: string; value: number; color: string }[] }

function fmtDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props { tickers: string[] }

export default function ComparePriceChart({ tickers }: Props) {
  const [range, setRange] = useState<PriceHistoryRange>('1Y')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const qc = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const chartHeight = useChartHeight(300, 260, 220)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['compare-price-history', tickers.join(','), range],
    queryFn: () => fetchComparePriceHistory(tickers, range),
    enabled: tickers.length >= 2,
  })

  const maxLen = data
    ? Math.max(...Object.values(data.series).map(s => s.length))
    : 0

  const traces = tickers.map((ticker, i) => {
    const series = data?.series[ticker] ?? []
    const isPartial = series.length > 0 && series.length < maxLen
    return {
      type: 'scatter' as const,
      mode: 'lines' as const,
      x: series.map(p => p.date),
      y: series.map(p => p.value),
      name: isPartial ? `${ticker} (partial)` : ticker,
      line: {
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        width: 1.5,
        dash: isPartial ? ('dot' as const) : ('solid' as const),
      },
    }
  })

  // Vertical line at clicked date
  const clickShape = snapshot ? [{
    type: 'line' as const,
    x0: snapshot.date, x1: snapshot.date,
    y0: 0, y1: 1,
    xref: 'x' as const, yref: 'paper' as const,
    line: { color: 'rgba(230,237,243,0.35)', width: 1, dash: 'dot' as const },
  }] : []

  const layout = {
    ...DARK,
    margin: isMobile ? { t: 8, b: 60, l: 44, r: 4 } : { t: 16, b: 48, l: 60, r: 16 },
    height:     chartHeight,
    showlegend: true,
    legend: isMobile
      ? { orientation: 'h' as const, x: 0, y: -0.25, bgcolor: 'transparent', font: { color: '#6E7681', size: 10 } }
      : { bgcolor: 'transparent', font: { color: '#6E7681', size: 11 } },
    hovermode:  'x unified' as const,
    shapes:     clickShape,
    xaxis: { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor },
    yaxis: {
      gridcolor:  DARK.gridcolor,
      linecolor:  DARK.linecolor,
      title:      isMobile ? undefined : { text: '% Return', font: { color: '#6E7681', size: 11 } },
      ticksuffix: '%',
      tickfont:   { size: isMobile ? 9 : 11 },
    },
  }

  function handleClick(points: PlotClickPoint[]) {
    if (!points.length) return
    const date = points[0].x
    const entries = points
      .filter(p => p.seriesName)
      .map(p => {
        const tickerName = p.seriesName.replace(' (partial)', '')
        const i = tickers.findIndex(t => t === tickerName || `${t} (partial)` === p.seriesName)
        return { name: tickerName, value: p.y, color: SERIES_COLORS[i >= 0 ? i : 0] }
      })
    setSnapshot({ date, entries })
  }

  return (
    <section
      className="compare-chart-section"
      aria-label={`Price performance comparison chart, ${range}`}
    >
      <div className="compare-chart-header">
        <span className="text-label color-muted">Price Performance</span>
        <div className="range-selector">
          {RANGES.map(r => (
            <button key={r}
              className={`range-btn${range === r ? ' range-btn--active' : ''}`}
              onClick={() => { setRange(r); setSnapshot(null) }}
              aria-pressed={range === r}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Snapshot bar */}
      {snapshot && (
        <div className="chart-snapshot">
          <span className="chart-snapshot__date">{fmtDate(snapshot.date)}</span>
          {snapshot.entries.map(e => (
            <span key={e.name} className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: e.color }} />
              <span style={{ color: e.color }}>{e.name}:</span>
              <span style={{ color: e.value >= 0 ? '#2EA043' : '#F85149' }}>
                {e.value >= 0 ? '+' : ''}{e.value.toFixed(2)}%
              </span>
            </span>
          ))}
          <button className="chart-snapshot__dismiss" onClick={() => setSnapshot(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {isError && (
        <p className="text-caption color-muted compare-chart-error">
          Failed to load price history.{' '}
          <button className="link-btn text-caption"
            onClick={() => qc.invalidateQueries({ queryKey: ['compare-price-history', tickers.join(','), range] })}>
            Retry
          </button>
        </p>
      )}

      {isLoading ? (
        <Skeleton width="100%" height="300px" className="compare-chart-skeleton" />
      ) : !isError && data ? (
        <Plot
          data={traces}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
          onPlotClick={handleClick}
        />
      ) : null}
    </section>
  )
}
