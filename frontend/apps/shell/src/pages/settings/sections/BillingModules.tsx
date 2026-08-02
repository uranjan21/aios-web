/**
 * Settings → Billing.
 *
 * Phase 4 conversion to the canvas's `settings:billing` composition —
 * tiles(12) · progress(5) · table(7) · controls(12) — from the live billing
 * endpoints. It absorbs the old AI-usage gauge, which the 2026-08-01 IA folded
 * in here.
 *
 * ONE DEPARTURE: the canvas's table is a list of invoices. There is no invoice
 * endpoint — Stripe owns that record and the portal is where you read it — so
 * the table lists the modules you own and what each costs, which is the other
 * half of "what am I paying for". The portal button is right beside it.
 */
import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { BarChart3, CreditCard, FileText } from 'lucide-react'
import { billingApi } from '@ct/shared/api/billing'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { BUNDLE_PRICE, MODULE_PRICE } from '@ct/shared/lib/pricing'

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function BillingModules() {
  const { data: sub } = useQuery({ queryKey: ['billing', 'subscription'], queryFn: billingApi.subscription })
  const { data: usage } = useQuery({ queryKey: ['billing', 'usage'], queryFn: billingApi.usage })

  const portal = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (r) => { if (r.url) window.location.href = r.url },
    onError: () => toast.error('Could not open the billing portal'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!sub) return []

    const owned = sub.bundle ? sub.entitled : sub.modules
    const monthly = sub.bundle ? BUNDLE_PRICE : owned.length * MODULE_PRICE
    const used = usage?.used ?? 0
    const included = usage?.included ?? 0
    const usedPct = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0
    const renews = sub.current_period_end ? dayjs(sub.current_period_end) : null

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Plan',
            value: sub.bundle ? 'Everything' : owned.length ? `${owned.length} modules` : 'Free',
            sub: sub.billing_enabled ? `$${monthly}/month` : 'Billing is off on this instance',
            subKey: 'success',
          },
          {
            label: 'Status',
            value: title(sub.status || 'active'),
            sub: renews ? `Renews ${renews.format('D MMM YYYY')}` : 'No renewal date',
            dotKey: sub.status === 'past_due' ? 'destructive' : 'success',
          },
          {
            label: 'AI credits used',
            value: String(used),
            sub: included > 0 ? `of ${included} included` : 'Unlimited on this instance',
            ...(included > 0 && { bar: usedPct, barKey: usedPct > 90 ? 'destructive' : 'accent' }),
          },
          {
            label: 'Overage',
            value: String(usage?.overage ?? 0),
            sub: usage?.metered ? 'Billed at the end of the cycle' : 'Hard-capped, not billed',
            subKey: (usage?.overage ?? 0) > 0 ? 'warning' : undefined,
          },
        ],
      },
      {
        kind: 'progress',
        span: 5,
        title: 'Usage this cycle',
        subtitle: renews ? `Resets on ${renews.format('D MMMM')}` : 'Resets each calendar month',
        icon: BarChart3,
        rows: [
          {
            title: 'AI messages',
            meta: included > 0 ? `${used} of ${included} credits` : `${used} credits used`,
            pct: usedPct,
            value: included > 0 ? `${usedPct}%` : String(used),
            colorKey: usedPct > 90 ? 'destructive' : usedPct > 70 ? 'warning' : 'accent',
          },
          {
            title: 'Modules owned',
            meta: owned.length ? owned.map(title).join(', ') : 'None — using the free area only',
            pct: Math.min(100, Math.round((owned.length / 6) * 100)),
            value: String(owned.length),
            colorKey: 'success',
          },
        ],
      },
      {
        kind: 'table',
        span: 7,
        title: 'What you are paying for',
        subtitle: sub.bundle ? 'Everything bundle' : `${owned.length} module(s) at $${MODULE_PRICE} each`,
        icon: FileText,
        gridCols: '1.4fr 1fr 1fr',
        cols: [{ l: 'Module' }, { l: 'Access' }, { l: 'Price', a: 'right' }],
        rows: (owned.length ? owned : sub.free_area ? [sub.free_area] : []).map(m => [
          { t: title(m), bold: true },
          {
            t: sub.bundle ? 'Bundle' : owned.includes(m) ? 'Owned' : 'Free area',
            tag: true,
            colorKey: sub.bundle ? 'accent' : owned.includes(m) ? 'success' : 'info',
          },
          sub.bundle ? 'Included' : owned.includes(m) ? `$${MODULE_PRICE}` : 'Free',
        ]),
      },
      {
        kind: 'controls',
        span: 12,
        title: 'Payment and invoicing',
        subtitle: sub.billing_enabled
          ? 'Card, invoices and cancellation live in the Stripe portal'
          : 'Billing is disabled on this instance — every module is available',
        icon: CreditCard,
        ...(sub.billing_enabled && { action: 'Open billing portal', onAction: () => portal.mutate() }),
        rows: [
          {
            title: 'Billing status',
            meta: sub.status === 'past_due'
              ? 'Payment failed — update your card to keep access'
              : 'Managed by Stripe',
            control: 'select',
            value: title(sub.status || 'active'),
          },
        ],
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, usage])

  return <ModuleGrid modules={modules} />
}
