import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignalBadge from './SignalBadge'

describe('SignalBadge', () => {
  it('renders STRONG BUY with correct class', () => {
    render(<SignalBadge verdict="Strong Buy" />)
    const el = screen.getByText('STRONG BUY')
    expect(el).toHaveClass('signal-badge--strong-buy')
    expect(el).toHaveAttribute('aria-label', 'Signal: Strong Buy')
  })

  it('renders BUY', () => {
    render(<SignalBadge verdict="Buy" />)
    expect(screen.getByText('BUY')).toHaveClass('signal-badge--buy')
  })

  it('renders HOLD', () => {
    render(<SignalBadge verdict="Hold" />)
    expect(screen.getByText('HOLD')).toHaveClass('signal-badge--hold')
  })

  it('renders SELL', () => {
    render(<SignalBadge verdict="Sell" />)
    expect(screen.getByText('SELL')).toHaveClass('signal-badge--sell')
  })

  it('renders STRONG SELL', () => {
    render(<SignalBadge verdict="Strong Sell" />)
    expect(screen.getByText('STRONG SELL')).toHaveClass('signal-badge--strong-sell')
  })

  it('renders dash for null verdict', () => {
    render(<SignalBadge verdict={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('applies sm size class', () => {
    render(<SignalBadge verdict="Buy" size="sm" />)
    expect(screen.getByText('BUY')).toHaveClass('signal-badge--sm')
  })
})
