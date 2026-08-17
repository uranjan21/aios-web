import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Pull a human-readable message out of a FastAPI error response. */
export function errorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

export function formatCurrency(amount: number | null | undefined, currency = '₹'): string {
  if (amount == null) return '—'
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (abs >= 1_00_000) {
    return `${sign}${currency}${(abs / 1_00_000).toFixed(2)}L`
  }
  return `${sign}${currency}${abs.toLocaleString('en-IN')}`
}

/**
 * Full-precision currency, Indian digit grouping — `₹18,42,650`.
 *
 * `formatCurrency` abbreviates anything over a lakh so it fits a KPI tile. The
 * redesign canvas only wants that abbreviation on the dashboard tiles; every
 * exact figure it draws — a net-worth hero, a budget limit, a ledger amount —
 * is grouped in full. Use this wherever the number IS the content.
 */
export function formatAmount(amount: number | null | undefined, currency = '₹'): string {
  if (amount == null) return '—'
  const sign = amount < 0 ? '-' : ''
  return `${sign}${currency}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never'
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * `${n} ${plural(n, 'day')}` → "1 day" / "2 days".
 *
 * A real streak of 1 rendered as "1 days" on the dashboard — the same class of
 * bug Health hit in 2026-07-03. Pass `irregular` when adding an -s is wrong
 * ("entry" → "entries").
 */
export function plural(n: number, singular: string, irregular?: string): string {
  return Math.abs(n) === 1 ? singular : irregular ?? `${singular}s`
}

export function exportToCsv(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const val = r[h] ?? ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
      }).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
