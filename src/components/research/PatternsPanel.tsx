import type { ChartPattern, ChartRange } from '../../api/research'
import './PatternsPanel.css'

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function daysAgo(dateStr: string): number {
  return daysBetween(dateStr, new Date().toISOString())
}

function humanDuration(days: number): string {
  if (days <= 1)  return 'single day'
  if (days < 14)  return `${days} days`
  if (days < 60)  return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}

function humanAgo(days: number): string {
  if (days <= 0)  return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14)  return `${days}d ago`
  if (days < 60)  return `${Math.round(days / 7)}w ago`
  return `${Math.round(days / 30)}mo ago`
}

interface Props {
  patterns: ChartPattern[]
  range?: ChartRange
  onPatternClick?: (p: ChartPattern) => void
}

function classColor(cls: ChartPattern['classification']): string {
  if (cls === 'Bullish') return 'color-bull'
  if (cls === 'Bearish') return 'color-bear'
  return 'color-neutral'
}

function confidenceClass(conf: ChartPattern['confidence']): string {
  return `confidence-badge confidence-badge--${conf.toLowerCase()}`
}

// ── Inline SVG thumbnails — one per pattern name ─────────────────────────────

const BULL  = '#2EA043'
const BEAR  = '#F85149'
const MUTED = '#6E7681'
const GRID  = '#21262D'

function PatternIcon({ name }: { name: string }) {
  const common = { fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

  let inner: React.ReactNode

  switch (name) {
    case 'Golden Cross':
      inner = (
        <>
          {/* 200-day SMA — flat gray */}
          <polyline {...common} points="2,26 78,20" stroke={MUTED} strokeWidth="1.5" />
          {/* 50-day SMA — rising green, crosses above */}
          <polyline {...common} points="2,34 78,8" stroke={BULL} strokeWidth="1.5" />
          {/* Intersection dot */}
          <circle cx="31" cy="25" r="3" fill={BULL} opacity="0.9" />
          {/* Up-arrow at right edge */}
          <polyline {...common} points="70,13 74,9 78,13" stroke={BULL} strokeWidth="1.2" />
        </>
      )
      break

    case 'Death Cross':
      inner = (
        <>
          {/* 200-day SMA — flat gray */}
          <polyline {...common} points="2,16 78,22" stroke={MUTED} strokeWidth="1.5" />
          {/* 50-day SMA — falling red, crosses below */}
          <polyline {...common} points="2,8 78,34" stroke={BEAR} strokeWidth="1.5" />
          {/* Intersection dot */}
          <circle cx="28" cy="18" r="3" fill={BEAR} opacity="0.9" />
          {/* Down-arrow at right edge */}
          <polyline {...common} points="70,29 74,33 78,29" stroke={BEAR} strokeWidth="1.2" />
        </>
      )
      break

    case 'Double Top':
      inner = (
        <>
          {/* Resistance line — dashed red */}
          <line x1="13" y1="9" x2="61" y2="9" stroke={BEAR} strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
          {/* M-shape price path */}
          <polyline {...common} points="2,36 20,9 34,23 50,9 68,36" stroke={BEAR} strokeWidth="1.5" />
        </>
      )
      break

    case 'Double Bottom':
      inner = (
        <>
          {/* Support line — dashed green */}
          <line x1="13" y1="33" x2="61" y2="33" stroke={BULL} strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
          {/* W-shape price path */}
          <polyline {...common} points="2,6 20,33 34,19 50,33 68,6" stroke={BULL} strokeWidth="1.5" />
        </>
      )
      break

    case 'RSI Divergence':
      inner = (
        <>
          {/* Horizontal separator */}
          <line x1="0" y1="20" x2="80" y2="20" stroke={GRID} strokeWidth="0.8" />
          {/* Price line — ascending (solid gray) */}
          <polyline {...common} points="4,16 26,12 52,9 76,5" stroke={MUTED} strokeWidth="1.5" />
          {/* RSI line — descending (dashed red) */}
          <polyline {...common} points="4,24 26,27 52,31 76,36" stroke={BEAR} strokeWidth="1.5" strokeDasharray="4,2" />
          {/* Labels */}
          <text x="4" y="10" fill={MUTED} fontSize="6.5" fontFamily="monospace">Price ↑</text>
          <text x="4" y="38" fill={BEAR} fontSize="6.5" fontFamily="monospace">RSI ↓</text>
        </>
      )
      break

    default:
      return null
  }

  return (
    <svg
      className="pattern-icon"
      viewBox="0 0 80 42"
      width="80"
      height="42"
      aria-hidden="true"
    >
      {inner}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PatternsPanel({ patterns, range, onPatternClick }: Props) {
  return (
    <section className="patterns-panel" aria-label="Detected chart patterns">
      <div className="patterns-panel__header">
        <span className="text-label">Detected Patterns</span>
        {range && <span className="patterns-panel__range text-caption color-muted">{range}</span>}
      </div>

      {patterns.length === 0 ? (
        <p className="text-caption color-muted patterns-empty">
          No significant patterns detected in this timeframe.
        </p>
      ) : (
        <div className="patterns-list">
          {patterns.map((p, i) => (
            <div
              key={i}
              className={`pattern-item${onPatternClick ? ' pattern-item--clickable' : ''}`}
              onClick={() => onPatternClick?.(p)}
              role={onPatternClick ? 'button' : undefined}
              tabIndex={onPatternClick ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && onPatternClick?.(p)}
              aria-label={onPatternClick ? `Focus chart on ${p.name}` : undefined}
            >
              <PatternIcon name={p.name} />
              <div className="pattern-info">
                <div className="pattern-item__header">
                  <span className={`pattern-item__name text-data ${classColor(p.classification)}`}>
                    {p.name}
                  </span>
                  <span className={confidenceClass(p.confidence)}>{p.confidence}</span>
                  <span className={`class-badge ${classColor(p.classification)}`}>
                    {p.classification}
                  </span>
                </div>
                <p className="pattern-item__desc text-caption color-muted">{p.description}</p>
                <div className="pattern-item__time">
                  {p.date_start === p.date_end ? (
                    // Point event — show date + how long ago
                    <>
                      <span className="pattern-time__date text-caption color-muted">
                        {p.date_start.slice(0, 10)}
                      </span>
                      <span className="pattern-time__sep">·</span>
                      <span className="pattern-time__ago text-caption color-muted">
                        {humanAgo(daysAgo(p.date_start))}
                      </span>
                    </>
                  ) : (
                    // Range event — show start → end + span duration
                    <>
                      <span className="pattern-time__date text-caption color-muted">
                        {p.date_start.slice(0, 10)} – {p.date_end.slice(0, 10)}
                      </span>
                      <span className="pattern-time__sep">·</span>
                      <span className="pattern-time__span text-caption">
                        over {humanDuration(daysBetween(p.date_start, p.date_end))}
                      </span>
                      <span className="pattern-time__sep">·</span>
                      <span className="pattern-time__ago text-caption color-muted">
                        ended {humanAgo(daysAgo(p.date_end))}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
