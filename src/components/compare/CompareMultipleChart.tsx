import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Plot, { type PlotClickPoint } from '../ui/PlotComponent'
import Skeleton from '../ui/Skeleton'
import { fetchMultiplesCompare, type MultiplePoint } from '../../api/research'
import { useChartHeight } from '../../hooks/useChartHeight'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import '../research/PriceChart.css'      // .range-selector / .range-btn
import './ComparePriceChart.css'          // .chart-snapshot styles

const SERIES_COLORS = ['#00B562', '#58A6FF', '#F0883E', '#BC8CFF']

const DARK = {
  paper_bgcolor: '#161B22',
  plot_bgcolor:  '#161B22',
  font:          { family: "'JetBrains Mono', monospace", color: '#6E7681', size: 11 },
  gridcolor:     '#21262D',
  linecolor:     '#30363D',
}

type MultipleRange = '1M' | '3M' | '6M' | '1Y' | '3Y'
const RANGES: MultipleRange[] = ['1M', '3M', '6M', '1Y', '3Y']

const RANGE_DAYS: Record<MultipleRange, number> = {
  '1M':  30, '3M':  90, '6M': 180, '1Y': 365, '3Y': 1095,
}

function filterByRange(series: MultiplePoint[], range: MultipleRange): MultiplePoint[] {
  if (range === '3Y' || series.length === 0) return series
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range])
  return series.filter(p => new Date(p.date) >= cutoff)
}

function fmtDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Snapshot { date: string; entries: { name: string; value: number; color: string }[] }

interface Props {
  tickers: string[]
  metric: string
  metricLabel: string
}

export default function CompareMultipleChart({ tickers, metric, metricLabel }: Props) {
  const qc = useQueryClient()
  const [range, setRange] = useState<MultipleRange>('1Y')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const chartHeight = useChartHeight(300, 260, 220)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['compare-multiples', tickers.join(','), metric],
    queryFn: () => fetchMultiplesCompare(metric, tickers),
    enabled: tickers.length >= 2,
  })

  const traces = tickers.map((ticker, i) => {
    const raw    = data?.[ticker] ?? []
    const series = filterByRange(raw, range)
    return {
      type: 'scatter' as const,
      mode: 'lines'  as const,
      x: series.map(p => p.date),
      y: series.map(p => p.value),
      name: ticker,
      line: { color: SERIES_COLORS[i % SERIES_COLORS.length], width: 1.5 },
    }
  })

  const clickShape = snapshot ? [{
    type: 'line' as const,
    x0: snapshot.date, x1: snapshot.date,
    y0: 0, y1: 1,
    xref: 'x' as const, yref: 'paper' as const,
    line: { color: 'rgba(230,237,243,0.35)', width: 1, dash: 'dot' as const },
  }] : []

  const layout = {
    ...DARK,
    margin: isMobile ? { t: 8, b: 60, l: 44, r: 4 } : { t: 8, b: 48, l: 60, r: 16 },
    height: chartHeight,
    showlegend: true,
    legend: isMobile
      ? { orientation: 'h' as const, x: 0, y: -0.25, bgcolor: 'transparent', font: { color: '#6E7681', size: 10 } }
      : { bgcolor: 'transparent', font: { color: '#6E7681', size: 11 } },
    hovermode: 'x unified' as const,
    shapes: clickShape,
    xaxis: { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor },
    yaxis: {
      gridcolor:  DARK.gridcolor,
      linecolor:  DARK.linecolor,
      title:      isMobile ? undefined : { text: metricLabel, font: { color: '#6E7681', size: 11 } },
      ticksuffix: 'x',
      tickfont:   { size: isMobile ? 9 : 11 },
    },
  }

  function handleClick(points: PlotClickPoint[]) {
    if (!points.length) return
    const date = points[0].x
    const entries = points
      .filter(p => p.seriesName)
      .map(p => {
        const i = tickers.indexOf(p.seriesName)
        return { name: p.seriesName, value: p.y, color: SERIES_COLORS[i >= 0 ? i : 0] }
      })
    setSnapshot({ date, entries })
  }

  return (
    <div aria-label={`${metricLabel} comparison chart, ${range}`}
         style={isMobile ? { padding: 'var(--space-sm) 0 0' } : undefined}>

      <div className="range-selector"
           style={{ marginBottom: 'var(--space-sm)', ...(isMobile ? { padding: '0 var(--space-md)' } : {}) }}>
        {RANGES.map(r => (
          <button key={r}
            className={`range-btn${range === r ? ' range-btn--active' : ''}`}
            onClick={() => { setRange(r); setSnapshot(null) }}
            aria-pressed={range === r}
          >{r}</button>
        ))}
      </div>

      {/* Snapshot bar */}
      {snapshot && (
        <div className="chart-snapshot" style={{ marginBottom: 'var(--space-sm)' }}>
          <span className="chart-snapshot__date">{fmtDate(snapshot.date)}</span>
          {snapshot.entries.map(e => (
            <span key={e.name} className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: e.color }} />
              <span style={{ color: e.color }}>{e.name}:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{e.value.toFixed(2)}x</span>
            </span>
          ))}
          <button className="chart-snapshot__dismiss" onClick={() => setSnapshot(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {isError && (
        <p className="text-caption color-muted"
           style={{ padding: isMobile ? 'var(--space-sm) var(--space-md)' : 'var(--space-sm) 0' }}>
          Failed to load {metricLabel} data.{' '}
          <button className="link-btn text-caption"
            onClick={() => qc.invalidateQueries({ queryKey: ['compare-multiples', tickers.join(','), metric] })}>
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
    </div>
  )
}
