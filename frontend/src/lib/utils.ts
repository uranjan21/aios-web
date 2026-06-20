import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number | null | undefined, currency = '₹'): string {
  if (amount == null) return '—'
  if (Math.abs(amount) >= 1_00_000) {
    return `${currency}${(amount / 1_00_000).toFixed(2)}L`
  }
  return `${currency}${amount.toLocaleString('en-IN')}`
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
