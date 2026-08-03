/**
 * Settings → Plan & usage.
 *
 * REBUILT 2026-08-03 from the old `billing` tab, which showed the same numbers
 * three times — "AI credits used" as a tile, again as a progress row, and the
 * module list as both a progress row and a table — and ended in a
 * `control: 'select'` chip echoing the Status tile with no handler behind it.
 *
 * It also could not change anything. `billingApi.setModules` was only ever
 * called from the marketing PricingPage, and `billingApi.setFreeArea` had NO
 * caller anywhere in the app — the one free area a user is entitled to was
 * unpickable. Both are controls here now.
 *
 * On an instance with billing disabled every module is entitled regardless, so
 * the switches say so rather than implying a purchase is happening.
 */
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { BarChart3, CreditCard, Gift, LayoutGrid } from 'lucide-react'
import { billingApi } from '@ct/shared/api/billing'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { BUNDLE_PRICE, MODULE_PRICE } from '@ct/shared/lib/pricing'

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function PlanModules() {
  const qc = useQueryClient()

  const { data: sub } = useQuery({ queryKey: ['billing', 'subscription'], queryFn: billingApi.subscription })
  const { data: usage } = useQuery({ queryKey: ['billing', 'usage'], queryFn: billingApi.usage })
  const { data: catalog } = useQuery({
    queryKey: ['billing', 'catalog'],
    queryFn: billingApi.catalog,
    staleTime: 10 * 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['billing'] })

  const setModules = useMutation({
    mutationFn: ({ modules, bundle }: { modules: string[]; bundle: boolean }) =>
      billingApi.setModules(modules, bundle),
    onSuccess: (r) => {
      // Billing on and payment required → Stripe owns the rest of the flow.
      if (r.checkout_url) { window.location.href = r.checkout_url; return }
      invalidate()
      toast.success('Modules updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Could not update your modules'),
  })

  const setFreeArea = useMutation({
    mutationFn: (area: string) => billingApi.setFreeArea(area),
    onSuccess: () => {
      invalidate()
      toast.success('Free area updated')
    },
    onError: () => toast.error('Could not change your free area'),
  })

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
    const billingOn = sub.billing_enabled

    const catalogModules = catalog?.modules ?? []
    const areaKeys = catalogModules.filter(m => m.kind === 'area').map(m => m.key)

    /*
     * NO `tiles` row (removed 2026-08-03). Plan, status, credits and overage
     * were each stated a second time in the three cards below — the module
     * toggles ARE the plan, and "Usage this cycle" is the credit count with a
     * bar. Four static tiles restating three live cards is exactly the noise
     * this tab did not need.
     */
    return [
      {
        kind: 'controls',
        span: 7,
        title: 'Modules',
        subtitle: billingOn
          ? `$${MODULE_PRICE} per module per month, or $${BUNDLE_PRICE} for the Everything bundle`
          : 'Billing is off on this instance — every module is available regardless of what you pick here',
        icon: LayoutGrid,
        rows: [
          {
            title: 'Everything bundle',
            meta: sub.bundle
              ? 'Every module, current and future, included'
              : `All ${catalogModules.length} modules for $${BUNDLE_PRICE}/month`,
            control: 'toggle' as const,
            on: sub.bundle,
            busy: setModules.isPending,
          },
          ...catalogModules.map(m => ({
            title: title(m.key),
            meta: sub.bundle
              ? 'Included in the bundle'
              : m.key === sub.free_area
                ? 'Your free area — included at no cost'
                : m.metered
                  ? `$${MODULE_PRICE}/month plus metered AI usage`
                  : `$${MODULE_PRICE}/month`,
            control: 'toggle' as const,
            // The bundle and the free area both grant access without an
            // explicit module row, so reflect the resolved entitlement.
            on: sub.bundle || sub.modules.includes(m.key) || m.key === sub.free_area,
            busy: setModules.isPending || sub.bundle || m.key === sub.free_area,
          })),
        ],
        onToggle: (i: number, next: boolean) => {
          if (i === 0) {
            // Turning the bundle off leaves the à-la-carte set already stored.
            setModules.mutate({ modules: next ? [] : sub.modules, bundle: next })
            return
          }
          const key = catalogModules[i - 1].key
          const nextModules = next
            ? [...new Set([...sub.modules, key])]
            : sub.modules.filter(m => m !== key)
          setModules.mutate({ modules: nextModules, bundle: false })
        },
      },
      {
        kind: 'controls',
        span: 5,
        title: 'Free area',
        subtitle: billingOn
          ? 'One area is yours at no cost — pick the one you use most'
          : 'Recorded now so it applies if billing is ever switched on',
        icon: Gift,
        rows: [
          {
            title: 'Included area',
            meta: sub.free_area
              ? `${title(sub.free_area)} is free on every plan`
              : 'Not chosen yet — pick one to keep it free',
            control: 'segment' as const,
            options: areaKeys.map(title),
            value: sub.free_area ? title(sub.free_area) : '',
            busy: setFreeArea.isPending,
          },
        ],
        onSelect: (_i: number, value: string) => setFreeArea.mutate(value.toLowerCase()),
      },
      {
        kind: 'progress',
        span: 7,
        title: 'Usage this cycle',
        subtitle: renews ? `Resets on ${renews.format('D MMMM')}` : 'Resets each calendar month',
        icon: BarChart3,
        /*
         * One row, not two. The second was "Modules in use", a bar filling in
         * proportion to how many modules you own — which is the toggle list
         * directly beside it, redrawn as a percentage that means nothing on its
         * own. Credits are the only thing here that actually accrues, which is
         * what a usage card is for.
         */
        rows: [
          {
            title: 'AI credits',
            meta: included > 0
              ? `${used} of ${included} used by chat and agent runs`
              : `${used} used — this instance does not cap AI usage`,
            pct: usedPct,
            value: included > 0 ? `${usedPct}%` : String(used),
            colorKey: usedPct > 90 ? 'destructive' : usedPct > 70 ? 'warning' : 'accent',
          },
          ...((usage?.overage ?? 0) > 0
            ? [{
                title: 'Overage',
                meta: usage?.metered
                  ? 'Beyond the included credits — billed at the end of the cycle'
                  : 'Beyond the included credits — hard-capped, not billed',
                pct: 100,
                value: String(usage?.overage ?? 0),
                colorKey: 'warning' as const,
              }]
            : []),
        ],
      },
      {
        kind: 'rows',
        span: 5,
        title: 'Payment',
        subtitle: billingOn
          ? 'Card, invoices and cancellation live in the Stripe portal'
          : 'No payment method is needed on this instance',
        icon: CreditCard,
        ...(billingOn && { action: 'Open billing portal', onAction: () => portal.mutate() }),
        /*
         * These rows are read-only on purpose — Stripe owns the card, the
         * invoices and the cancellation, and the portal button above is the
         * real control. What they must NOT do is restate the module toggles,
         * so they carry only what the toggles cannot: the resulting charge,
         * the subscription state and the renewal date.
         */
        rows: [
          {
            title: 'Monthly total',
            meta: sub.bundle
              ? 'Everything bundle'
              : owned.length
                ? `${owned.length} module(s) at $${MODULE_PRICE} each`
                : 'Free area only — nothing to pay',
            value: billingOn ? `$${monthly}` : 'Not charged',
            valueKey: billingOn ? undefined : 'mutedFg',
          },
          {
            title: 'Subscription',
            meta: billingOn
              ? 'Managed by Stripe — invoices and receipts are in the portal'
              : 'Billing is disabled on this instance',
            tagLabel: billingOn ? title(sub.status || 'active') : 'Off',
            tagColorKey: !billingOn
              ? 'mutedFg'
              : sub.status === 'past_due' ? 'destructive' : 'success',
          },
          ...(renews
            ? [{
                title: 'Current period ends',
                meta: 'Usage counters reset with the cycle',
                value: renews.format('D MMM YYYY'),
              }]
            : []),
        ],
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, usage, catalog, setModules.isPending, setFreeArea.isPending])

  return <ModuleGrid modules={modules} />
}
