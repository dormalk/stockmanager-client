import { formatAbbrev, formatCurrency, needsAbbrev } from '../../utils/format'
import './SummaryCard.css'

interface SummaryCardProps {
  label: string
  value: number
  colorClass?: 'color-bull' | 'color-bear' | ''
  prefix?: string
  suffix?: string
  isCurrency?: boolean
}

export default function SummaryCard({
  label,
  value,
  colorClass = '',
  prefix = '',
  suffix = '',
  isCurrency = true,
}: SummaryCardProps) {
  const display = isCurrency ? formatAbbrev(value) : `${prefix}${value.toFixed(2)}${suffix}`
  const fullValue = isCurrency ? formatCurrency(value) : display

  return (
    <div className="summary-card">
      <span className="summary-card__label text-label">{label}</span>
      <span
        className={`summary-card__value text-data-lg ${colorClass}`}
        title={needsAbbrev(value) ? fullValue : undefined}
      >
        {prefix}{display}{suffix}
      </span>
    </div>
  )
}
