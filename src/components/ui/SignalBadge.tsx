import './SignalBadge.css'

export type Verdict = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'

interface Props {
  verdict: Verdict | null | undefined
  size?: 'sm' | 'md'
}

export default function SignalBadge({ verdict, size = 'md' }: Props) {
  if (!verdict) return <span className="signal-badge signal-badge--none text-label">—</span>
  const cls = verdict.toLowerCase().replace(' ', '-')
  return (
    <span
      className={`signal-badge signal-badge--${cls} signal-badge--${size} text-label`}
      aria-label={`Signal: ${verdict}`}
    >
      {verdict.toUpperCase()}
    </span>
  )
}
