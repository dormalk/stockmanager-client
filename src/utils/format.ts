const MINUS = '−' // U+2212 minus sign, not hyphen

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatAbbrev(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? MINUS : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  return formatCurrency(n)
}

export function formatSigned(n: number, suffix = '%', decimals = 2): string {
  const abs = Math.abs(n).toFixed(decimals)
  if (n > 0) return `+${abs}${suffix}`
  if (n < 0) return `${MINUS}${abs}${suffix}`
  return `0.00${suffix}`
}

export function formatSignedCurrency(n: number): string {
  const abs = formatCurrency(Math.abs(n))
  if (n > 0) return `+${abs}`
  if (n < 0) return `${MINUS}${abs.slice(1)}`
  return '$0.00'
}

export function formatShares(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  return parseFloat(n.toFixed(6)).toString()
}

export function formatMultiple(n: number): string {
  return `${parseFloat(n.toFixed(1))}x`
}

export function needsAbbrev(n: number): boolean {
  return Math.abs(n) >= 1_000_000
}
