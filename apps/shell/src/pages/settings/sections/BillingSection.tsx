import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { billingApi } from '@aios/shared/api/billing'
import { useFeatures } from '@aios/shared/hooks/useFeatures'
import { Button } from '@ledgr/ui'
import { Row, Section } from '../shared'

// ── Billing (M1) ────────────────────────────────────────────────────────────────

export function BillingSection() {
  const { billing_enabled: billingEnabled } = useFeatures()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingApi.subscription(),
    enabled: billingEnabled,
    staleTime: 60_000,
  })
  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => billingApi.usage(),
    enabled: billingEnabled,
    staleTime: 60_000,
  })

  // Billing is a hosted feature; hidden entirely when Stripe isn't configured.
  if (!billingEnabled) return null

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const bundle = data?.bundle ?? false
  const modules = data?.modules ?? []
  const hasPaid = bundle || modules.length > 0
  const ownedLabel = bundle
    ? 'Everything · all modules'
    : modules.length
      ? modules.map(cap).join(', ')
      : 'Free tier'
  const statusSuffix = data?.status && data.status !== 'active' ? ` · ${data.status}` : ''

  const openPortal = async () => {
    setBusy(true)
    try {
      const { url } = await billingApi.portal()
      window.location.href = url
    } catch {
      toast.error('Could not open billing portal')
      setBusy(false)
    }
  }

  return (
    <Section title="Billing & modules">
      {data?.status === 'past_due' && (
        <Row label="⚠ Payment failed — access continues briefly while we retry">
          <Button size="sm" variant="primary" onClick={openPortal} disabled={busy}>
            <CreditCard size={14} style={{ marginRight: 4 }} /> Update card
          </Button>
        </Row>
      )}
      <Row label="Your modules">
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {isLoading ? '…' : `${ownedLabel}${statusSuffix}`}
        </span>
      </Row>
      <Row label="Pick the modules you pay for">
        <Button size="sm" variant="primary" onClick={() => navigate('/pricing')}>
          Manage modules
        </Button>
      </Row>
      {usage && (
        <Row label="AI usage this month">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {usage.used} / {usage.included}
            {usage.overage > 0 && (
              <span style={{ fontWeight: 400, opacity: 0.75 }}>
                {usage.metered ? ` · +${usage.overage} billed` : ` · ${usage.overage} over cap`}
              </span>
            )}
          </span>
        </Row>
      )}
      {hasPaid && (
        <Row label="Payment method & invoices">
          <Button size="sm" variant="outline" onClick={openPortal} disabled={busy}>
            <CreditCard size={14} style={{ marginRight: 4 }} /> Manage billing
          </Button>
        </Row>
      )}
    </Section>
  )
}
