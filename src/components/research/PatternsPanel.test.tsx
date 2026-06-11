import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PatternsPanel from './PatternsPanel'
import type { ChartPattern } from '../../api/research'

const PATTERNS: ChartPattern[] = [
  {
    name: 'Golden Cross', classification: 'Bullish',
    description: 'The 50-day SMA crossed above the 200-day SMA.',
    date_start: '2024-03-15T00:00:00+00:00', date_end: '2024-03-15T00:00:00+00:00',
    confidence: 'High',
  },
  {
    name: 'RSI Divergence', classification: 'Bearish',
    description: 'Price making higher highs while RSI is making lower highs.',
    date_start: '2024-01-01T00:00:00+00:00', date_end: '2024-01-20T00:00:00+00:00',
    confidence: 'Medium',
  },
]

describe('PatternsPanel', () => {
  it('renders empty state when no patterns', () => {
    render(<PatternsPanel patterns={[]} />)
    expect(screen.getByText(/No significant patterns detected/)).toBeInTheDocument()
  })

  it('renders pattern names', () => {
    render(<PatternsPanel patterns={PATTERNS} />)
    expect(screen.getByText('Golden Cross')).toBeInTheDocument()
    expect(screen.getByText('RSI Divergence')).toBeInTheDocument()
  })

  it('renders classification labels', () => {
    render(<PatternsPanel patterns={PATTERNS} />)
    expect(screen.getByText('Bullish')).toBeInTheDocument()
    expect(screen.getByText('Bearish')).toBeInTheDocument()
  })

  it('applies bull color class to Bullish pattern', () => {
    render(<PatternsPanel patterns={[PATTERNS[0]]} />)
    const nameEl = screen.getByText('Golden Cross')
    expect(nameEl).toHaveClass('color-bull')
  })

  it('applies bear color class to Bearish pattern', () => {
    render(<PatternsPanel patterns={[PATTERNS[1]]} />)
    const nameEl = screen.getByText('RSI Divergence')
    expect(nameEl).toHaveClass('color-bear')
  })

  it('renders confidence badges', () => {
    render(<PatternsPanel patterns={PATTERNS} />)
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<PatternsPanel patterns={[PATTERNS[0]]} />)
    expect(screen.getByText(/50-day SMA crossed above/)).toBeInTheDocument()
  })

  it('shows single date when date_start equals date_end', () => {
    render(<PatternsPanel patterns={[PATTERNS[0]]} />)
    expect(screen.getByText('2024-03-15')).toBeInTheDocument()
  })

  it('shows date range when start differs from end', () => {
    render(<PatternsPanel patterns={[PATTERNS[1]]} />)
    expect(screen.getByText(/2024-01-01.*2024-01-20/)).toBeInTheDocument()
  })
})
