import { describe, it, expect } from 'vitest'
import { formatAmount, formatCurrency, plural } from './utils'

/**
 * These two are the money surface of the whole app and had no coverage. The
 * split is deliberate and easy to get backwards: `formatCurrency` abbreviates
 * over a lakh for KPI tiles, `formatAmount` never abbreviates because it is
 * used where the number IS the content (a ledger row, a budget limit).
 */
describe('formatCurrency', () => {
  it('renders an em dash for null and undefined, not ₹0', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('groups Indian-style below a lakh', () => {
    expect(formatCurrency(0)).toBe('₹0')
    expect(formatCurrency(999)).toBe('₹999')
    expect(formatCurrency(99_999)).toBe('₹99,999')
  })

  it('abbreviates to lakhs from exactly 1,00,000 up', () => {
    expect(formatCurrency(1_00_000)).toBe('₹1.00L')
    expect(formatCurrency(18_42_650)).toBe('₹18.43L')
  })

  it('puts the sign before the currency symbol, never inside the number', () => {
    expect(formatCurrency(-5_94_000)).toBe('-₹5.94L')
    expect(formatCurrency(-250)).toBe('-₹250')
  })

  it('honours a non-default currency symbol', () => {
    expect(formatCurrency(500, '$')).toBe('$500')
  })
})

describe('formatAmount', () => {
  it('renders an em dash for null and undefined', () => {
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount(undefined)).toBe('—')
  })

  it('never abbreviates — a lakh stays fully grouped', () => {
    expect(formatAmount(1_00_000)).toBe('₹1,00,000')
    expect(formatAmount(18_42_650)).toBe('₹18,42,650')
    expect(formatAmount(1_23_45_678)).toBe('₹1,23,45,678')
  })

  it('drops the fractional part rather than rounding into a stray decimal', () => {
    expect(formatAmount(1234.56)).toBe('₹1,235')
    expect(formatAmount(0.4)).toBe('₹0')
  })

  it('signs negatives ahead of the symbol', () => {
    expect(formatAmount(-1_00_000)).toBe('-₹1,00,000')
  })

  it('honours a non-default currency symbol', () => {
    expect(formatAmount(1_00_000, '$')).toBe('$1,00,000')
  })
})

describe('plural', () => {
  it('does not say "1 days"', () => {
    expect(plural(1, 'day')).toBe('day')
    expect(plural(0, 'day')).toBe('days')
    expect(plural(2, 'day')).toBe('days')
  })

  it('takes an irregular plural when adding -s is wrong', () => {
    expect(plural(2, 'entry', 'entries')).toBe('entries')
    expect(plural(1, 'entry', 'entries')).toBe('entry')
  })
})
