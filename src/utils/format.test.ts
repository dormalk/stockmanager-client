import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatAbbrev,
  formatSigned,
  formatSignedCurrency,
  formatShares,
  formatMultiple,
  needsAbbrev,
} from './format'

const MINUS = '−'

describe('formatCurrency', () => {
  it('formats positive number', () => expect(formatCurrency(1234.56)).toBe('$1,234.56'))
  it('formats zero', () => expect(formatCurrency(0)).toBe('$0.00'))
  it('formats negative', () => expect(formatCurrency(-500)).toBe('-$500.00'))
})

describe('formatAbbrev', () => {
  it('returns currency for < $1M', () => expect(formatAbbrev(999_999)).toBe('$999,999.00'))
  it('abbreviates millions', () => expect(formatAbbrev(1_240_000)).toBe('$1.24M'))
  it('abbreviates billions', () => expect(formatAbbrev(3_800_000_000)).toBe('$3.8B'))
  it('strips trailing zeros', () => expect(formatAbbrev(2_000_000)).toBe('$2M'))
})

describe('formatSigned', () => {
  it('prefixes positive with +', () => expect(formatSigned(1.24)).toBe('+1.24%'))
  it('prefixes negative with minus sign (U+2212)', () => {
    const result = formatSigned(-0.87)
    expect(result).toBe(`${MINUS}0.87%`)
    expect(result.charCodeAt(0)).toBe(0x2212)
  })
  it('returns 0.00% for zero', () => expect(formatSigned(0)).toBe('0.00%'))
})

describe('formatSignedCurrency', () => {
  it('prefixes positive with +$', () => expect(formatSignedCurrency(350)).toBe('+$350.00'))
  it('prefixes negative with minus sign', () => {
    const result = formatSignedCurrency(-100)
    expect(result.startsWith(MINUS)).toBe(true)
  })
  it('returns $0.00 for zero', () => expect(formatSignedCurrency(0)).toBe('$0.00'))
})

describe('formatShares', () => {
  it('returns integer string for whole shares', () => expect(formatShares(10)).toBe('10'))
  it('strips trailing zeros', () => expect(formatShares(1.5)).toBe('1.5'))
  it('respects up to 6dp', () => expect(formatShares(0.123456)).toBe('0.123456'))
})

describe('formatMultiple', () => {
  it('appends x suffix', () => expect(formatMultiple(22.5)).toBe('22.5x'))
  it('rounds to 1dp', () => expect(formatMultiple(22.567)).toBe('22.6x'))
})

describe('needsAbbrev', () => {
  it('returns false below $1M', () => expect(needsAbbrev(999_999)).toBe(false))
  it('returns true at $1M', () => expect(needsAbbrev(1_000_000)).toBe(true))
})
