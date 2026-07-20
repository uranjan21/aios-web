import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  ShoppingBag, Clapperboard, Home, Heart, CreditCard, Shirt,
  GraduationCap, Zap, Wallet, TrendingUp, ArrowLeftRight,
} from 'lucide-react'
import type { Txn, SortBy, SortDir } from './types'
import { keyOf } from './types'

export function getCategoryIcon(category: string) {
  const c = category.toLowerCase()
  if (c.includes('transfer')) return <ArrowLeftRight size={15} />
  if (c.includes('sub') || c.includes('tv') || c.includes('netflix') || c.includes('entertain')) return <Clapperboard size={15} />
  if (c.includes('home') || c.includes('rent')) return <Home size={15} />
  if (c.includes('care') || c.includes('health')) return <Heart size={15} />
  if (c.includes('grocer') || c.includes('food')) return <ShoppingBag size={15} />
  if (c.includes('cloth')) return <Shirt size={15} />
  if (c.includes('educat')) return <GraduationCap size={15} />
  if (c.includes('util')) return <Zap size={15} />
  if (c.includes('invest') || c.includes('return')) return <TrendingUp size={15} />
  if (c.includes('salary') || c.includes('freelance') || c.includes('business')) return <Wallet size={15} />
  return <CreditCard size={15} />
}

export function txnColors(type: Txn['type']) {
  const isIncome = type === 'income'
  const isTransfer = type === 'transfer'
  return {
    iconBg: isIncome ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : isTransfer ? 'var(--muted)' : 'var(--muted)',
    iconColor: isIncome ? 'var(--primary)' : 'var(--muted-foreground)',
    amtColor: isIncome ? 'var(--primary)' : isTransfer ? 'var(--muted-foreground)' : 'var(--accent)',
    sign: isIncome ? '+' : isTransfer ? '⇄ ' : '-',
  }
}

export function useCategoryLabel(txn: Txn): string {
  const queryClient = useQueryClient()
  const cats: any[] = queryClient.getQueryData(['finance', 'categories']) ?? []
  if (!txn.category_id) return txn.category
  const leaf = cats.find(c => c.id === txn.category_id)
  if (!leaf) return txn.category
  if (!leaf.parent_id) return leaf.name
  const parent = cats.find(c => c.id === leaf.parent_id)
  return parent ? `${parent.name} › ${leaf.name}` : leaf.name
}

export function useAccountName(accountId?: string | null): string | null {
  const queryClient = useQueryClient()
  if (!accountId) return null
  const accounts: any[] = queryClient.getQueryData(['finance', 'accounts']) ?? []
  return accounts.find(a => a.id === accountId)?.name ?? null
}

export function sortTxns(txns: Txn[], sortBy: SortBy, sortDir: SortDir): Txn[] {
  const mult = sortDir === 'desc' ? -1 : 1
  return [...txns].sort((a, b) => {
    if (sortBy === 'amount') {
      if (a.amount !== b.amount) return (a.amount - b.amount) * mult
      return (new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()) * -1
    }
    return (new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()) * mult
  })
}

export const dayTotals = (txns: Txn[]) => txns.reduce((acc, t) => {
  if (t.type === 'income') acc.income += t.amount
  else if (t.type === 'expense') acc.expense += t.amount
  return acc
}, { income: 0, expense: 0 })

export function buildRenderModel(txns: Txn[], grouping: 'day' | 'week' | 'none', sortBy: SortBy, sortDir: SortDir) {
  const sorted = sortTxns(txns, sortBy, sortDir)
  if (grouping === 'none') {
    return { items: sorted.map((txn, i) => ({ kind: 'row' as const, txn, i })), flat: sorted }
  }
  const keyFn = grouping === 'day'
    ? (t: Txn) => dayjs(t.logged_at).format('YYYY-MM-DD')
    : (t: Txn) => dayjs(t.logged_at).startOf('isoWeek').format('YYYY-MM-DD')
  const groups: { key: string; txns: Txn[] }[] = []
  const map = new Map<string, { key: string; txns: Txn[] }>()
  for (const t of sorted) {
    const k = keyFn(t)
    if (!map.has(k)) { const g = { key: k, txns: [] as Txn[] }; map.set(k, g); groups.push(g) }
    map.get(k)!.txns.push(t)
  }
  const items: any[] = []
  const flat: Txn[] = []
  let i = 0
  for (const g of groups) {
    const totals = dayTotals(g.txns)
    const label = grouping === 'day'
      ? dayjs(g.key).format('ddd, MMM D')
      : `${dayjs(g.key).format('MMM D')} – ${dayjs(g.key).add(6, 'day').format('MMM D')}`
    items.push({ kind: 'header', key: g.key, label, ...totals })
    for (const t of g.txns) { items.push({ kind: 'row', txn: t, i }); flat.push(t); i++ }
  }
  return { items, flat }
}

export { keyOf }
