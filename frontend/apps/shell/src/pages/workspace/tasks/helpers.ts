export function priorityTone(p: string): 'danger' | 'warn' | 'default' {
  if (p === 'urgent') return 'danger'
  if (p === 'high') return 'warn'
  return 'default'
}

export function fmtDate(d?: string) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
