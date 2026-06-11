import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Plot, { type PlotClickPoint } from '../ui/PlotComponent'
import Skeleton from '../ui/Skeleton'
import { fetchSectorPerformance } from '../../api/research'
import { useChartHeight } from '../../hooks/useChartHeight'
import '../compare/ComparePriceChart.css'

type Range = '1M' | '3M' | '6M' | '1Y'
const RANGES: Range[] = ['1M', '3M', '6M', '1Y']

const STOCK_COLOR  = '#58A6FF'
const SECTOR_COLOR = '#F0883E'

const DARK = {
  paper_bgcolor: '#161B22',
  plot_bgcolor:  '#161B22',
  font:          { family: "'JetBrains Mono', monospace", color: '#6E7681', size: 11 },
  gridcolor:     '#21262D',
  linecolor:     '#30363D',
}

interface Snapshot { date: string; stockVal: number; etfVal: number }

function fmtDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props { ticker: string }

export default function SectorPerformanceChart({ ticker }: Props) {
  const [range, setRange] = useState<Range>('1Y')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const qc = useQueryClient()
  const chartHeight = useChartHeight(280, 240, 200)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sector-perf', ticker, range],
    queryFn: () => fetchSectorPerformance(ticker, range),
    enabled: !!ticker,
  })

  const etf        = data?.etf       ?? ''
  const etfLabel   = data?.etf_label ?? ''
  const stockSeries  = data?.series[ticker] ?? []
  const sectorSeries = data?.series[etf]    ?? []

  const traces: Plotly.Data[] = [
    {
      type: 'scatter', mode: 'lines',
      x: stockSeries.map(p => p.date),
      y: stockSeries.map(p => p.value),
      name: ticker,
      line: { color: STOCK_COLOR, width: 2 },
    } as Plotly.Data,
    {
      type: 'scatter', mode: 'lines',
      x: sectorSeries.map(p => p.date),
      y: sectorSeries.map(p => p.value),
      name: etfLabel || etf,
      line: { color: SECTOR_COLOR, width: 1.5, dash: 'dot' },
    } as Plotly.Data,
  ]

  const clickShape = snapshot ? [{
    type: 'line' as const,
    x0: snapshot.date, x1: snapshot.date,
    y0: 0, y1: 1,
    xref: 'x' as const, yref: 'paper' as const,
    line: { color: 'rgba(230,237,243,0.35)', width: 1, dash: 'dot' as const },
  }] : []

  const layout = {
    ...DARK,
    margin:     { t: 8, b: 48, l: 60, r: 8 },
    height:     chartHeight,
    showlegend: true,
    legend:     { bgcolor: 'transparent', font: { color: '#6E7681', size: 11 } },
    hovermode:  'x unified' as const,
    shapes:     clickShape,
    xaxis: { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor },
    yaxis: {
      gridcolor:  DARK.gridcolor,
      linecolor:  DARK.linecolor,
      title:      { text: '% Return', font: { color: '#6E7681', size: 11 } },
      ticksuffix: '%',
    },
  }

  function handleClick(points: PlotClickPoint[]) {
    if (!points.length) return
    const date     = points[0].x
    const stockPt  = stockSeries.find(p => p.date.startsWith(date))
    const sectorPt = sectorSeries.find(p => p.date.startsWith(date))
    if (stockPt || sectorPt) {
      setSnapshot({ date, stockVal: stockPt?.value ?? 0, etfVal: sectorPt?.value ?? 0 })
    }
  }

  return (
    <section className="compare-chart-section" aria-label="Sector performance comparison">
      <div className="compare-chart-header">
        <span className="text-label color-muted">
          vs. Sector{data?.sector ? ` · ${data.sector}` : ''}
        </span>
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

      {snapshot && (
        <div className="chart-snapshot">
          <span className="chart-snapshot__date">{fmtDate(snapshot.date)}</span>
          <span className="chart-snapshot__entry">
            <span className="chart-snapshot__dot" style={{ background: STOCK_COLOR }} />
            <span style={{ color: STOCK_COLOR }}>{ticker}:</span>
            <span style={{ color: snapshot.stockVal >= 0 ? '#2EA043' : '#F85149' }}>
              {snapshot.stockVal >= 0 ? '+' : ''}{snapshot.stockVal.toFixed(2)}%
            </span>
          </span>
          <span className="chart-snapshot__entry">
            <span className="chart-snapshot__dot" style={{ background: SECTOR_COLOR }} />
            <span style={{ color: SECTOR_COLOR }}>{etf}:</span>
            <span style={{ color: snapshot.etfVal >= 0 ? '#2EA043' : '#F85149' }}>
              {snapshot.etfVal >= 0 ? '+' : ''}{snapshot.etfVal.toFixed(2)}%
            </span>
          </span>
          <button className="chart-snapshot__dismiss" onClick={() => setSnapshot(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {isError && (
        <p className="text-caption color-muted compare-chart-error">
          Failed to load sector data.{' '}
          <button className="link-btn text-caption"
            onClick={() => qc.invalidateQueries({ queryKey: ['sector-perf', ticker, range] })}>
            Retry
          </button>
        </p>
      )}

      {isLoading ? (
        <Skeleton width="100%" height="280px" className="compare-chart-skeleton" />
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
