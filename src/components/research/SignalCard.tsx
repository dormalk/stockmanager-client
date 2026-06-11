import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import SignalBadge from '../ui/SignalBadge'
import Skeleton from '../ui/Skeleton'
import { fetchSignals, type SignalRow } from '../../api/signals'
import './SignalCard.css'

const COLLAPSE_KEY = 'signal_card_collapsed'

function getStored(): boolean {
  return localStorage.getItem(COLLAPSE_KEY) === 'true'
}

function dirLabel(dir: SignalRow['direction']) {
  if (dir === 'bull')    return { label: 'Bullish',  cls: 'color-bull'    }
  if (dir === 'bear')    return { label: 'Bearish',  cls: 'color-bear'    }
  return                        { label: 'Neutral',  cls: 'color-neutral' }
}

interface Props { ticker: string }

export default function SignalCard({ ticker }: Props) {
  const [collapsed, setCollapsed] = useState(getStored)

  const { data, isLoading } = useQuery({
    queryKey: ['signals', ticker],
    queryFn: () => fetchSignals(ticker),
  })

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, String(next))
  }

  if (isLoading) {
    return (
      <section className="signal-card" aria-label="Buy/Hold/Sell signal">
        <div className="signal-card__header">
          <span className="text-label">Signal</span>
          <Skeleton height="26px" width="100px" />
        </div>
      </section>
    )
  }

  if (!data || data.insufficient_data) {
    return (
      <section className="signal-card" aria-label="Buy/Hold/Sell signal">
        <span className="text-label">Signal</span>
        <p className="text-caption color-muted signal-card__insufficient">
          Insufficient data — minimum 3 months of price history required.
        </p>
      </section>
    )
  }

  const total = data.bullish + data.neutral + data.bearish
  const bullPct = total > 0 ? (data.bullish / total) * 100 : 0
  const neutPct = total > 0 ? (data.neutral / total) * 100 : 0
  const bearPct = total > 0 ? (data.bearish / total) * 100 : 0

  return (
    <section className="signal-card" aria-label="Buy/Hold/Sell signal">
      <div className="signal-card__header">
        <span className="text-label">Signal</span>
        <SignalBadge verdict={data.verdict} />
      </div>

      {/* Score bar */}
      <div className="signal-card__counts text-caption color-muted">
        {data.bullish} Bullish / {data.neutral} Neutral / {data.bearish} Bearish
      </div>
      <div className="signal-bar" aria-hidden="true">
        {bullPct > 0 && <div className="signal-bar__bull" style={{ width: `${bullPct}%` }} />}
        {neutPct > 0 && <div className="signal-bar__neut" style={{ width: `${neutPct}%` }} />}
        {bearPct > 0 && <div className="signal-bar__bear" style={{ width: `${bearPct}%` }} />}
      </div>

      {/* Collapsible signals list */}
      <button
        className="signal-card__toggle text-caption"
        onClick={toggleCollapse}
        aria-expanded={!collapsed}
      >
        {collapsed ? '▶ See all signals' : '▼ Hide signals'}
      </button>

      <div className={`signal-card__list${collapsed ? ' signal-card__list--collapsed' : ''}`}>
        {data.signals.map((s, i) => {
          const { label, cls } = dirLabel(s.direction)
          return (
            <div key={i} className="signal-row">
              <span className="signal-row__name text-caption">{s.name}</span>
              <span className={`signal-row__dir text-caption ${cls}`}>{label}</span>
              <span className="signal-row__val text-caption color-muted">{s.value}</span>
            </div>
          )
        })}
      </div>

      <p className="signal-card__disclaimer text-caption color-muted">
        This signal is a quantitative summary tool, not financial advice.
      </p>
    </section>
  )
}
