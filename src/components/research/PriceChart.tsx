import { useState, useEffect, useRef } from 'react'
import Plot, { type PlotClickPoint } from '../ui/PlotComponent'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Skeleton from '../ui/Skeleton'
import { fetchHistory, type ChartRange, type ChartPattern } from '../../api/research'
import { useChartHeight } from '../../hooks/useChartHeight'
import '../compare/ComparePriceChart.css'  // .chart-snapshot styles
import './PriceChart.css'

const RANGES: ChartRange[] = ['5m', '15m', '1H', 'D', 'W', 'M']

const DARK = {
  paper_bgcolor: '#161B22',
  plot_bgcolor:  '#161B22',
  font:          { family: "'JetBrains Mono', monospace", color: '#6E7681', size: 11 },
  gridcolor:     '#21262D',
  linecolor:     '#30363D',
}

const BULL    = '#2EA043'
const BEAR    = '#F85149'
const NEUTRAL = '#6E7681'

interface Props {
  ticker: string
  range?: ChartRange
  onRangeChange?: (r: ChartRange) => void
  focusPattern?: ChartPattern | null
}

interface CandleSnapshot { date: string; open: number; high: number; low: number; close: number; volume: number }

function fmtVol(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}
function fmtDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PriceChart({ ticker, range: controlledRange, onRangeChange, focusPattern }: Props) {
  const [internalRange, setInternalRange] = useState<ChartRange>('D')
  const range = controlledRange ?? internalRange
  const [xAxisRange, setXAxisRange] = useState<[string, string] | null>(null)
  const [showSma50,  setShowSma50]  = useState(false)
  const [showSma200, setShowSma200] = useState(false)
  const [snapshot, setSnapshot] = useState<CandleSnapshot | null>(null)
  const qc = useQueryClient()
  const baseHeight = useChartHeight(300, 260, 200)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['history', ticker, range],
    queryFn: () => fetchHistory(ticker, range),
  })

  const candlesRef = useRef(data?.candles ?? [])
  candlesRef.current = data?.candles ?? []

  useEffect(() => {
    if (!focusPattern) {
      setXAxisRange(null)
      return
    }

    const start = focusPattern.date_start.slice(0, 10)
    const end   = focusPattern.date_end.slice(0, 10)
    let x0: string, x1: string

    if (start === end) {
      const candles = candlesRef.current
      const idx = candles.findIndex(c => c.date.slice(0, 10) === start)
      if (idx < 0) return
      const i0 = Math.max(0, idx - 20)
      const i1 = Math.min(candles.length - 1, idx + 20)
      x0 = candles[i0].date.slice(0, 10)
      x1 = candles[i1].date.slice(0, 10)
    } else {
      const s   = new Date(start).getTime()
      const e   = new Date(end).getTime()
      const pad = (e - s) * 0.15
      x0 = new Date(s - pad).toISOString().slice(0, 10)
      x1 = new Date(e + pad).toISOString().slice(0, 10)
    }

    setXAxisRange(prev => (prev?.[0] === x0 && prev?.[1] === x1 ? prev : [x0, x1]))
  }, [focusPattern])

  const candles   = data?.candles  ?? []
  const sma50pts  = data?.sma50    ?? []
  const sma200pts = data?.sma200   ?? []
  const patternPts = data?.patterns ?? []

  const dates  = candles.map(c => c.date)
  const opens  = candles.map(c => c.open)
  const highs  = candles.map(c => c.high)
  const lows   = candles.map(c => c.low)
  const closes = candles.map(c => c.close)
  const vols   = candles.map(c => c.volume)

  const patternBadges = patternPts
    .map(p => {
      const refDate = p.date_end.slice(0, 10)
      const candle =
        candles.find(c => c.date.slice(0, 10) === refDate) ??
        candles.find(c => c.date.slice(0, 10) === p.date_start.slice(0, 10))
      if (!candle) return null
      return {
        x:              candle.date,
        y:              candle.high,
        name:           p.name,
        classification: p.classification,
        confidence:     p.confidence,
        description:    p.description,
        color:          p.classification === 'Bullish' ? BULL :
                        p.classification === 'Bearish' ? BEAR : NEUTRAL,
      }
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patternAnnotations: any[] = patternBadges.map(b => ({
    x:           b.x,
    y:           b.y,
    xref:        'x',
    yref:        'y',
    text:        '<b>P</b>',
    showarrow:   false,
    yshift:      16,
    font:        { color: '#FFFFFF', size: 10, family: "'JetBrains Mono', monospace" },
    bgcolor:     b.color,
    bordercolor: 'rgba(0,0,0,0.2)',
    borderwidth: 1,
    borderpad:   3,
    opacity:     0.9,
    cliponaxis:  false,
  }))

  const traces: Plotly.Data[] = [
    { type: 'candlestick', x: dates, open: opens, high: highs, low: lows, close: closes,
      name: ticker, increasing: { line: { color: BULL } }, decreasing: { line: { color: BEAR } },
      xaxis: 'x', yaxis: 'y' } as Plotly.Data,
    { type: 'bar', x: dates, y: vols, name: 'Volume', marker: { color: '#30363D' },
      xaxis: 'x', yaxis: 'y2' } as Plotly.Data,
  ]

  if (showSma50 && sma50pts.length) traces.push(
    { type: 'scatter', mode: 'lines', x: sma50pts.map(p => p.date), y: sma50pts.map(p => p.value),
      name: 'SMA 50', line: { color: '#D29922', width: 1.5, dash: 'dot' }, xaxis: 'x', yaxis: 'y' } as Plotly.Data
  )
  if (showSma200 && sma200pts.length) traces.push(
    { type: 'scatter', mode: 'lines', x: sma200pts.map(p => p.date), y: sma200pts.map(p => p.value),
      name: 'SMA 200', line: { color: BULL, width: 1.5, dash: 'dot' }, xaxis: 'x', yaxis: 'y' } as Plotly.Data
  )

  if (patternBadges.length) {
    traces.push({
      type: 'scatter', mode: 'markers',
      x: patternBadges.map(b => b.x),
      y: patternBadges.map(b => b.y),
      name: 'Pattern',
      showlegend: false,
      marker: { color: patternBadges.map(b => b.color), size: 16, opacity: 0 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customdata: patternBadges.map(b => [b.name, b.classification, b.confidence, b.description]) as any,
      hovertemplate: '<b>%{customdata[0]}</b><br>%{customdata[1]} · %{customdata[2]}<br><i style="color:#8B949E">%{customdata[3]}</i><extra>Pattern</extra>',
      xaxis: 'x', yaxis: 'y',
    } as Plotly.Data)
  }

  const layout: Partial<Plotly.Layout> = {
    ...DARK,
    margin:      { t: 8, b: 40, l: 60, r: 8 },
    height:      baseHeight,
    showlegend:  false,
    hovermode:   'x unified',
    annotations: patternAnnotations,
    xaxis:  { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor, rangeslider: { visible: false },
              ...(xAxisRange ? { range: xAxisRange } : {}) },
    yaxis:  { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor, domain: [0.18, 1.0] },
    yaxis2: { gridcolor: DARK.gridcolor, linecolor: DARK.linecolor, domain: [0.0, 0.15]  },
    shapes: snapshot ? [{
      type: 'line' as const,
      x0: snapshot.date, x1: snapshot.date,
      y0: 0, y1: 1,
      xref: 'x' as const, yref: 'paper' as const,
      line: { color: 'rgba(230,237,243,0.35)', width: 1, dash: 'dot' as const },
    }] : [],
  }

  function handleChartClick(points: PlotClickPoint[]) {
    if (!points.length) return
    const date = points[0].x
    const candle = candles.find(c => c.date.startsWith(date) || date.startsWith(c.date.slice(0, 10)))
    if (candle) {
      setSnapshot({ date: candle.date, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume })
    }
  }

  return (
    <section aria-label={`${ticker} candlestick chart, ${range} range`}>
      <div className="price-chart-panel">
        <div className="price-chart-panel__controls">
          <div className="range-selector">
            {RANGES.map(r => (
              <button key={r}
                className={`range-btn${range === r ? ' range-btn--active' : ''}`}
                onClick={() => {
                  setInternalRange(r)
                  setXAxisRange(null)
                  onRangeChange?.(r)
                }}
                aria-pressed={range === r}>{r}
              </button>
            ))}
          </div>
          <div className="sma-toggles">
            <label className="sma-label text-caption">
              <input type="checkbox" checked={showSma50}  onChange={e => setShowSma50(e.target.checked)}  /> SMA 50
            </label>
            <label className="sma-label text-caption">
              <input type="checkbox" checked={showSma200} onChange={e => setShowSma200(e.target.checked)} /> SMA 200
            </label>
          </div>
        </div>

        {snapshot && (
          <div className="chart-snapshot">
            <span className="chart-snapshot__date">{fmtDate(snapshot.date)}</span>
            <span className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: '#6E7681' }} />
              <span className="color-muted">O</span>
              <span>${snapshot.open.toFixed(2)}</span>
            </span>
            <span className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: '#2EA043' }} />
              <span className="color-muted">H</span>
              <span style={{ color: '#2EA043' }}>${snapshot.high.toFixed(2)}</span>
            </span>
            <span className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: '#F85149' }} />
              <span className="color-muted">L</span>
              <span style={{ color: '#F85149' }}>${snapshot.low.toFixed(2)}</span>
            </span>
            <span className="chart-snapshot__entry">
              <span className="chart-snapshot__dot" style={{ background: '#E6EDF3' }} />
              <span className="color-muted">C</span>
              <span style={{ color: snapshot.close >= snapshot.open ? '#2EA043' : '#F85149' }}>
                ${snapshot.close.toFixed(2)}
              </span>
            </span>
            <span className="chart-snapshot__entry">
              <span className="color-muted">Vol</span>
              <span>{fmtVol(snapshot.volume)}</span>
            </span>
            <button className="chart-snapshot__dismiss" onClick={() => setSnapshot(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        {isError && (
          <p className="text-caption color-muted chart-error">
            Failed to load price data.{' '}
            <button className="link-btn text-caption"
              onClick={() => qc.invalidateQueries({ queryKey: ['history', ticker, range] })}>
              Retry
            </button>
          </p>
        )}

        <div className="chart-container">
          {isLoading ? <Skeleton width="100%" height="300px" /> :
           candles.length === 0 ? <p className="text-caption color-muted" style={{ padding: 'var(--space-xl)' }}>No price data available.</p> : (
            <Plot data={traces} layout={layout as Plotly.Layout}
              config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }}
              onPlotClick={handleChartClick} />
          )}
        </div>
      </div>
    </section>
  )
}
