/**
 * Finance → Investments.
 *
 * Composition: tiles(12) · series(7) · donut(5) · bars(12) · holdings(12) ·
 * cashflows(12), all from the live investments API. Clicking a holdings row
 * opens its editor, which is where the old table's pencil/trash column went.
 *
 * 2026-08-03: the two documented departures from the canvas are RESOLVED. Both
 * existed because the page had no dated cashflows to work from; it does now,
 * via `/investments/transactions` and `/investments/performance`.
 *  - XIRR is real, portfolio-level and per holding, solved by
 *    `services/finance/xirr.py`. It is NULL when there are too few dated flows
 *    to solve for a rate — rendered "—", never 0%, because a flat return is a
 *    claim the data does not support.
 *  - The value-over-time chart is real, from the nightly `InvestmentValuation`
 *    rows. Empty until that job has run once, which the empty state says.
 * The absolute-return tile and the per-holding gain bars are KEPT: absolute
 * return answers a different question from annualised, and the bars survive
 * every case where XIRR cannot be computed.
 */
import { useMemo, useState, useCallback} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import dayjs from 'dayjs'
import {
  Button, Card, Dialog, EmptyState, ErrorState, Input, SegmentedControl, Select, SkeletonPage,
} from '@ledgr/ui'
import { ArrowLeftRight, Gem, PieChart, TrendingUp, Trash2 } from 'lucide-react'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import { financeApi, type InvestmentTransaction } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { formatCurrency } from '@ct/shared/lib/utils'
import type { FinanceInvestment } from '@ct/shared/types'
import { InvestmentTxnDialog } from './InvestmentTxnDialog'

/** Cashflow kind → how it reads in the table. Colour is paired with the label,
 *  never carrying the meaning alone. */
const KIND_META: Record<string, { label: string; colorKey: string }> = {
  buy: { label: 'Buy', colorKey: 'finance' },
  sell: { label: 'Sell', colorKey: 'warning' },
  dividend: { label: 'Dividend', colorKey: 'success' },
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const FormGroup = styled.div``

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

const TYPE_META: Record<string, { label: string; icon: string }> = {
  stock: { label: 'Stocks', icon: '📈' },
  mutual_fund: { label: 'Mutual Funds', icon: '💼' },
  fd: { label: 'Fixed Deposit', icon: '🏦' },
  ppf: { label: 'PPF', icon: '🛡️' },
  nps: { label: 'NPS', icon: '👴' },
  crypto: { label: 'Crypto', icon: '₿' },
  gold: { label: 'Gold', icon: '🪙' },
  other: { label: 'Other', icon: '📦' },
}

/** Distinct slots so the donut's segments stay tellable apart. */
const SLICE_KEYS = ['accent', 'info', 'success', 'warning', 'career', 'health', 'destructive']

type HoldingForm = {
  name: string; type: string; units: string
  invested_amount: string; current_value: string
  purchase_date: string; notes: string
}
const EMPTY_HOLDING_FORM: HoldingForm = {
  name: '', type: 'stock', units: '', invested_amount: '0', current_value: '0', purchase_date: '', notes: '',
}

export function InvestmentsTab({ onAddClick }: { onAddClick?: () => void } = {}) {
  const queryClient = useQueryClient()
  const [updatingHolding, setUpdatingHolding] = useState<FinanceInvestment | null>(null)
  const f = useFieldErrors<'name' | 'units' | 'invested_amount' | 'current_value'>('edit-holding')
  const [holdingForm, setHoldingForm] = useState<HoldingForm>(EMPTY_HOLDING_FORM)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [rangeDays, setRangeDays] = useState<number>(180)
  const [txnOpen, setTxnOpen] = useState(false)
  const [viewingFlow, setViewingFlow] = useState<InvestmentTransaction | null>(null)

  /* Handled in place below rather than thrown to the route (F1) — see App.tsx.
     A failed holdings or summary request must not render as a ₹0 portfolio. */
  const q = { meta: { inlineError: true } } as const

  const holdingsQ = useQuery({
    queryKey: ['finance', 'investments'],
    queryFn: financeApi.investments,
    ...q,
  })

  const summaryQ = useQuery({
    queryKey: ['finance', 'investments', 'summary'],
    queryFn: financeApi.investmentsSummary,
    ...q,
  })

  const perfQ = useQuery({
    queryKey: ['finance', 'investments', 'performance', rangeDays],
    queryFn: () => financeApi.investmentsPerformance(rangeDays),
    staleTime: 60_000,
    ...q,
  })

  const cashflowsQ = useQuery({
    queryKey: ['finance', 'investments', 'transactions'],
    queryFn: () => financeApi.investmentTransactions({ limit: 25 }),
    staleTime: 60_000,
    ...q,
  })

  const panels = [holdingsQ, summaryQ, perfQ, cashflowsQ]
  const holdings = holdingsQ.data
  const summary = summaryQ.data
  const perf = perfQ.data
  const cashflows = cashflowsQ.data
  const isLoading = panels.some((p) => p.isLoading)
  const isError = panels.some((p) => p.isError)

  /* A cashflow write moves the parent holding's book value server-side, so the
   * holdings list and both derived summaries have to go with it. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'summary'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'performance'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'transactions'] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof financeApi.patchInvestment>[1]) =>
      financeApi.patchInvestment(updatingHolding!.id, patch),
    onSuccess: () => {
      invalidate()
      toast.success('Holding updated')
      setUpdatingHolding(null)
      setHoldingForm(EMPTY_HOLDING_FORM)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update holding'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteInvestment(id),
    onSuccess: () => {
      invalidate()
      toast.success('Holding removed')
      setUpdatingHolding(null)
      setHoldingForm(EMPTY_HOLDING_FORM)
    },
    onError: () => toast.error('Failed to delete holding'),
  })

  const openUpdate = useCallback((holding: FinanceInvestment) => {
    f.reset()
    setUpdatingHolding(holding)
    setHoldingForm({
      name: holding.name ?? '',
      type: holding.type ?? 'stock',
      units: holding.units != null ? String(holding.units) : '',
      invested_amount: String(holding.invested_amount ?? 0),
      current_value: String(holding.current_value ?? 0),
      purchase_date: holding.purchase_date ? String(holding.purchase_date).slice(0, 10) : '',
      notes: holding.notes ?? '',
    })
  }, [f])

  const closeEdit = () => {
    setUpdatingHolding(null)
    setHoldingForm(EMPTY_HOLDING_FORM)
    f.reset()
  }

  /** A non-negative number, or a reason it is not one. */
  const nonNegative = (raw: string, missing: string) => {
    if (raw.trim() === '') return missing
    const n = Number(raw)
    if (!Number.isFinite(n)) return 'Enter a number.'
    return n < 0 ? 'Cannot be negative.' : undefined
  }

  /* Four toasts became four field messages — invested and current sit side by
     side in a grid, so "must be a non-negative number" never said which. */
  const handleSave = () => {
    const name = holdingForm.name.trim()
    const invested = parseFloat(holdingForm.invested_amount)
    const current = parseFloat(holdingForm.current_value)
    const hasUnits = holdingForm.units.trim() !== ''
    const units = hasUnits ? parseFloat(holdingForm.units) : undefined
    const ok = f.submit({
      name: name ? undefined : 'Give the holding a name.',
      invested_amount: nonNegative(holdingForm.invested_amount, 'Enter the amount invested.'),
      current_value: nonNegative(holdingForm.current_value, 'Enter what it is worth now.'),
      units: hasUnits ? nonNegative(holdingForm.units, '') : undefined,
    })
    if (!ok) return
    updateMutation.mutate({
      name,
      type: holdingForm.type,
      invested_amount: invested,
      current_value: current,
      ...(units !== undefined && { units }),
      purchase_date: holdingForm.purchase_date || null,
      notes: holdingForm.notes.trim() || undefined,
    })
  }

  const all = useMemo(() => holdings ?? [], [holdings])
  const visible = useMemo(
    () => (typeFilter === 'all' ? all : all.filter(h => h.type === typeFilter)),
    [all, typeFilter],
  )

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!all.length) return []

    const invested = summary?.total_invested ?? all.reduce((s, h) => s + Number(h.invested_amount), 0)
    const value = summary?.current_value ?? all.reduce((s, h) => s + Number(h.current_value), 0)
    const gain = summary?.returns_amount ?? value - invested
    const gainPct = summary?.returns_pct ?? (invested > 0 ? (gain / invested) * 100 : 0)

    const gainOf = (h: FinanceInvestment) => Number(h.current_value) - Number(h.invested_amount)
    const best = all.reduce((a, b) => (gainOf(a) >= gainOf(b) ? a : b))

    const allocation = summary?.allocation?.length
      ? summary.allocation
      : Object.entries(all.reduce<Record<string, number>>((acc, h) => {
          acc[h.type] = (acc[h.type] ?? 0) + Number(h.current_value)
          return acc
        }, {})).map(([type, v]) => ({ type, value: v }))
    const allocTotal = allocation.reduce((s, a) => s + Number(a.value), 0)

    // Bars run on a shared scale, so a loss has to plot as a positive height
    // with a destructive colour — the axis is magnitude, the colour is sign.
    const byGain = [...all].sort((a, b) => Math.abs(gainOf(b)) - Math.abs(gainOf(a))).slice(0, 8)

    const perfById = new Map((perf?.holdings ?? []).map(h => [h.id, h]))
    const nameById = new Map(all.map(h => [h.id, h.name]))
    const flows = cashflows ?? []

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Portfolio value',
            value: formatCurrency(value),
            sub: `${gain >= 0 ? '+' : ''}${formatCurrency(gain)} against cost`,
            subKey: gain >= 0 ? 'success' : 'destructive',
          },
          { label: 'Invested', value: formatCurrency(invested), sub: `${all.length} holding${all.length === 1 ? '' : 's'}` },
          {
            label: 'Total return',
            value: `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%`,
            sub: 'Absolute, not annualised',
            subKey: gainPct >= 0 ? 'success' : 'destructive',
            dotKey: gainPct >= 0 ? 'success' : 'destructive',
          },
          /* XIRR is null when there are too few dated cashflows to solve for a
           * rate. That is "unknown", NOT zero — rendering 0% would assert a
           * flat return the data does not support. See finance.py:1651. */
          {
            label: 'Annualised (XIRR)',
            value: perf?.xirr_pct == null ? '—' : `${perf.xirr_pct >= 0 ? '+' : ''}${perf.xirr_pct.toFixed(1)}%`,
            sub: perf?.xirr_pct == null ? 'Log buys and sells to compute' : 'Money-weighted, per year',
            ...(perf?.xirr_pct != null && {
              subKey: perf.xirr_pct >= 0 ? 'success' : 'destructive',
              dotKey: perf.xirr_pct >= 0 ? 'success' : 'destructive',
            }),
          },
          {
            label: 'Best performer',
            value: best.name,
            sub: `${gainOf(best) >= 0 ? '+' : ''}${formatCurrency(gainOf(best))}`,
            subKey: gainOf(best) >= 0 ? 'success' : 'destructive',
          },
        ],
      },
      {
        kind: 'series',
        span: 7,
        title: 'Invested vs value',
        subtitle: 'What you put in against what it is worth',
        icon: TrendingUp,
        xKey: 'date',
        /* The nightly valuation job is what fills this, so a fresh install has
         * no history yet. Say that rather than drawing an empty axis. */
        emptyLabel: 'Daily valuations start building tonight — nothing to plot yet.',
        valueFormat: (n: number) => formatCurrency(n),
        lines: [
          { key: 'value', label: 'Current value', colorKey: 'finance' },
          { key: 'invested', label: 'Invested', colorKey: 'mutedFg', dashed: true },
        ],
        points: (perf?.series ?? []).map(p => ({
          date: dayjs(p.date).format('D MMM'),
          invested: Number(p.invested),
          value: Number(p.value),
        })),
        actionNode: (
          <SegmentedControl
            size="sm"
            aria-label="Performance range"
            value={String(rangeDays)}
            onChange={(v: any) => setRangeDays(Number(v))}
            options={[
              { label: '90d', value: '90' },
              { label: '180d', value: '180' },
              { label: '1Y', value: '365' },
            ]}
          />
        ),
      },
      {
        kind: 'donut',
        span: 5,
        title: 'Allocation',
        subtitle: 'By current value',
        icon: PieChart,
        centerValue: formatCurrency(value),
        centerLabel: 'Total',
        slices: allocation.map((a, i) => ({
          label: TYPE_META[a.type]?.label ?? a.type,
          pct: allocTotal > 0 ? Math.round((Number(a.value) / allocTotal) * 100) : 0,
          value: formatCurrency(Number(a.value)),
          colorKey: SLICE_KEYS[i % SLICE_KEYS.length],
        })),
      },
      {
        /* Full width since `series` now takes the 7 beside the donut — at span
         * 7 this would start a new row and leave 5 columns empty. */
        kind: 'bars',
        span: 12,
        title: 'Gain and loss by holding',
        subtitle: 'Current value against what you put in',
        icon: TrendingUp,
        bars: byGain.map((h) => ({
          label: h.name.length > 10 ? `${h.name.slice(0, 9)}…` : h.name,
          v: Math.round(Math.abs(gainOf(h))),
          t: `${gainOf(h) >= 0 ? '+' : '−'}${formatCurrency(Math.abs(gainOf(h)))}`,
          colorKey: gainOf(h) >= 0 ? 'success' : 'destructive',
        })),
      },
      {
        kind: 'table',
        span: 12,
        title: 'Holdings',
        subtitle: visible.length === 0
          ? 'No holdings match this filter'
          : `${visible.length} instrument${visible.length === 1 ? '' : 's'} · click a row to edit`,
        icon: Gem,
        /* This table is the only module the type filter drives — the tiles,
         * donut and bars all read `all`/`summary` — so the control lives in its
         * header rather than portalling up into a page header. */
        actionNode: (
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter holdings by type"
            value={typeFilter}
            onChange={(v: any) => setTypeFilter(String(v))}
            options={[
              { value: 'all', label: 'All types' },
              ...Object.entries(TYPE_META)
                .filter(([key]) => all.some(h => h.type === key))
                .map(([value, meta]) => ({ value, label: meta.label })),
            ]}
          />
        ),
        ...(onAddClick && { action: 'Add holding', onAction: onAddClick }),
        gridCols: '2fr 1.1fr 1fr 1fr 0.8fr 0.8fr',
        cols: [
          { l: 'Instrument' },
          { l: 'Type' },
          { l: 'Invested', a: 'right' },
          { l: 'Current', a: 'right' },
          { l: 'Return', a: 'right' },
          { l: 'XIRR', a: 'right' },
        ],
        rows: visible.map((h) => {
          const g = gainOf(h)
          const pctH = Number(h.invested_amount) > 0 ? (g / Number(h.invested_amount)) * 100 : 0
          const px = perfById.get(h.id)
          return [
            { t: `${TYPE_META[h.type]?.icon ?? '📦'} ${h.name}`, bold: true },
            TYPE_META[h.type]?.label ?? h.type,
            formatCurrency(h.invested_amount),
            formatCurrency(h.current_value),
            { t: `${pctH >= 0 ? '+' : ''}${pctH.toFixed(1)}%`, colorKey: g >= 0 ? 'success' : 'destructive' },
            /* Same null rule as the tile — "—" means not computable. */
            px?.xirr_pct == null
              ? { t: '—', colorKey: 'mutedFg' }
              : { t: `${px.xirr_pct >= 0 ? '+' : ''}${px.xirr_pct.toFixed(1)}%`, colorKey: px.xirr_pct >= 0 ? 'success' : 'destructive' },
          ]
        }),
        onRowClick: (i: number) => openUpdate(visible[i]),
      },
      {
        kind: 'table',
        span: 12,
        title: 'Cashflows',
        subtitle: flows.length
          ? `${flows.length} most recent buy, sell and dividend entries`
          : 'Dated buys and sells — this is what makes XIRR computable',
        icon: ArrowLeftRight,
        action: 'Log cashflow',
        actionVariant: 'primary',
        onAction: () => setTxnOpen(true),
        gridCols: '1fr 2fr 1fr 1fr 1fr',
        cols: [
          { l: 'Date' },
          { l: 'Instrument' },
          { l: 'Kind' },
          { l: 'Units', a: 'right' },
          { l: 'Amount', a: 'right' },
        ],
        rows: flows.map((t) => [
          dayjs(t.transacted_at).format('D MMM YY'),
          { t: nameById.get(t.investment_id) ?? 'Unknown holding', bold: true },
          /* Fall back rather than index blind — `kind` is a plain string
             column, so an unexpected value would crash on `.label`. */
          {
            t: t.is_sip
              ? `${KIND_META[t.kind]?.label ?? t.kind} · SIP`
              : (KIND_META[t.kind]?.label ?? t.kind),
            tag: true,
            colorKey: KIND_META[t.kind]?.colorKey ?? 'mutedFg',
          },
          t.units == null ? '—' : String(Number(t.units)),
          formatCurrency(Number(t.amount)),
        ]),
        /* Cashflows have no PATCH route — they are create-or-remove — so the
         * row opens a read view whose footer carries the only edit there is. */
        onRowClick: (i: number) => setViewingFlow(flows[i]),
      },
    ]
     
  }, [all, visible, summary, typeFilter, onAddClick, perf, cashflows, rangeDays, openUpdate])

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your portfolio"
        description="Nothing has been lost — a request for your holdings or their performance failed."
        onRetry={() => { panels.forEach((p) => { void p.refetch() }) }}
      />
    )
  }

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5, 12, 12]} />

  return (
    <Root>
      {all.length === 0 ? (
        <Card title="Portfolio" subtitle="Track what you hold and how it is doing" icon={<Gem size={16} />}>
          <EmptyState
            icon={<Gem size={20} />}
            title="No holdings yet"
            description="Add a mutual fund, stock or deposit to see allocation and returns."
            action={onAddClick ? <Button size="sm" variant="primary" onClick={onAddClick}>Add holding</Button> : undefined}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={!!updatingHolding}
        icon={<Gem size={18} />}
        eyebrow="Finance"
        title={`Edit holding${updatingHolding?.name ? ` — ${updatingHolding.name}` : ''}`}
        onOpenChange={(open) => { if (!open) closeEdit() }}
        size="md"
      >
        <FormContainer noValidate onSubmit={e => { e.preventDefault(); handleSave() }}>
          <FormGroup>
            <Label>Name</Label>
            <Input value={holdingForm.name} {...f.fieldProps('name')} onChange={(e: any) => { f.clearField('name'); setHoldingForm(prev => ({ ...prev, name: e.target.value })) }} placeholder="e.g. HDFC Top 100" autoFocus />
            <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormGroup>
              <Label>Type</Label>
              <Select fullWidth value={holdingForm.type} onChange={(v: any) => setHoldingForm(prev => ({ ...prev, type: String(v) }))} options={Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))} />
            </FormGroup>
            <FormGroup>
              <Label>Units (optional)</Label>
              <Input type="number" min="0" step="0.0001" value={holdingForm.units} {...f.fieldProps('units')} onChange={(e: any) => { f.clearField('units'); setHoldingForm(prev => ({ ...prev, units: e.target.value })) }} placeholder="0" />
              <FieldError id={f.errorId('units')}>{f.errors.units}</FieldError>
            </FormGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormGroup>
              <Label>Invested amount</Label>
              <Input type="number" startAdornment="₹" min="0" step="0.01" value={holdingForm.invested_amount} {...f.fieldProps('invested_amount')} onChange={(e: any) => { f.clearField('invested_amount'); setHoldingForm(prev => ({ ...prev, invested_amount: e.target.value })) }} />
              <FieldError id={f.errorId('invested_amount')}>{f.errors.invested_amount}</FieldError>
            </FormGroup>
            <FormGroup>
              <Label>Current value</Label>
              <Input type="number" startAdornment="₹" min="0" step="0.01" value={holdingForm.current_value} {...f.fieldProps('current_value')} onChange={(e: any) => { f.clearField('current_value'); setHoldingForm(prev => ({ ...prev, current_value: e.target.value })) }} />
              <FieldError id={f.errorId('current_value')}>{f.errors.current_value}</FieldError>
            </FormGroup>
          </div>
          <FormGroup>
            <Label>Purchase date</Label>
            <Input type="date" value={holdingForm.purchase_date} onChange={(e: any) => setHoldingForm(prev => ({ ...prev, purchase_date: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input value={holdingForm.notes} onChange={(e: any) => setHoldingForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional" />
          </FormGroup>
          <ActionsContainer>
            <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save changes</Button>
            <Button variant="ghost" type="button" onClick={closeEdit} disabled={updateMutation.isPending}>Cancel</Button>
            <Spacer />
            <Popconfirm
              title="Delete this holding?"
              onConfirm={() => { if (updatingHolding) deleteMutation.mutate(updatingHolding.id) }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button variant="destructive" type="button" size="sm" loading={deleteMutation.isPending}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            </Popconfirm>
          </ActionsContainer>
        </FormContainer>
      </Dialog>

      <InvestmentTxnDialog
        open={txnOpen || !!viewingFlow}
        onClose={() => { setTxnOpen(false); setViewingFlow(null) }}
        holdings={all}
        viewing={viewingFlow}
        holdingName={viewingFlow ? all.find(h => h.id === viewingFlow.investment_id)?.name : undefined}
      />
    </Root>
  )
}
