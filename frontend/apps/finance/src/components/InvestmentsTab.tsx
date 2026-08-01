/**
 * Finance → Investments.
 *
 * Phase 4 conversion to the canvas's `finance:investments` composition —
 * tiles(12) · donut(5) · bars(7) · table(12) — rebuilt from the live
 * investments API. Clicking a holdings row opens its editor, which is where
 * the old table's pencil/trash column went.
 *
 * TWO DEPARTURES FROM THE CANVAS, both for want of a contribution ledger:
 *  - Its third tile is XIRR, which needs dated cash flows. A holding stores an
 *    invested total and a current value, so the tile shows the absolute return
 *    those two give exactly. Its fourth is "monthly SIP" — there is no SIP
 *    model at all, so it counts holdings and names the best performer instead.
 *  - Its bars are portfolio value over eight months. Nothing records portfolio
 *    value historically, so the bars show gain and loss per holding: still the
 *    "where is the money working" question, from data that exists.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Dialog, EmptyState, Input, Select, Card } from '@ledgr/ui'
import { Gem, PieChart, TrendingUp, Trash2 } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { formatCurrency } from '@ct/shared/lib/utils'
import type { FinanceInvestment } from '@ct/shared/types'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const FilterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
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
  const [holdingForm, setHoldingForm] = useState<HoldingForm>(EMPTY_HOLDING_FORM)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: holdings, isLoading } = useQuery({
    queryKey: ['finance', 'investments'],
    queryFn: financeApi.investments,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance', 'investments', 'summary'],
    queryFn: financeApi.investmentsSummary,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'summary'] })
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

  const openUpdate = (holding: FinanceInvestment) => {
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
  }

  const closeEdit = () => {
    setUpdatingHolding(null)
    setHoldingForm(EMPTY_HOLDING_FORM)
  }

  const handleSave = () => {
    const name = holdingForm.name.trim()
    if (!name) { toast.error('Name is required'); return }
    const invested = parseFloat(holdingForm.invested_amount)
    const current = parseFloat(holdingForm.current_value)
    const units = holdingForm.units ? parseFloat(holdingForm.units) : undefined
    if (Number.isNaN(invested) || invested < 0) { toast.error('Invested amount must be a non-negative number'); return }
    if (Number.isNaN(current) || current < 0) { toast.error('Current value must be a non-negative number'); return }
    if (units !== undefined && (Number.isNaN(units) || units < 0)) { toast.error('Units must be a non-negative number'); return }
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
          {
            label: 'Best performer',
            value: best.name,
            sub: `${gainOf(best) >= 0 ? '+' : ''}${formatCurrency(gainOf(best))}`,
            subKey: gainOf(best) >= 0 ? 'success' : 'destructive',
          },
        ],
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
        kind: 'bars',
        span: 7,
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
        subtitle: `${visible.length} instrument${visible.length === 1 ? '' : 's'} · click a row to edit`,
        icon: Gem,
        ...(onAddClick && { action: 'Add holding', onAction: onAddClick }),
        gridCols: '2.2fr 1.2fr 1fr 1fr 0.9fr',
        cols: [
          { l: 'Instrument' },
          { l: 'Type' },
          { l: 'Invested', a: 'right' },
          { l: 'Current', a: 'right' },
          { l: 'Return', a: 'right' },
        ],
        rows: visible.map((h) => {
          const g = gainOf(h)
          const pctH = Number(h.invested_amount) > 0 ? (g / Number(h.invested_amount)) * 100 : 0
          return [
            { t: `${TYPE_META[h.type]?.icon ?? '📦'} ${h.name}`, bold: true },
            TYPE_META[h.type]?.label ?? h.type,
            formatCurrency(h.invested_amount),
            formatCurrency(h.current_value),
            { t: `${pctH >= 0 ? '+' : ''}${pctH.toFixed(1)}%`, colorKey: g >= 0 ? 'success' : 'destructive' },
          ]
        }),
        onRowClick: (i: number) => openUpdate(visible[i]),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, visible, summary, onAddClick])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      {all.length > 0 && (
        <FilterRow>
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
        </FilterRow>
      )}

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
        <FormContainer onSubmit={e => { e.preventDefault(); handleSave() }}>
          <FormGroup>
            <Label>Name</Label>
            <Input value={holdingForm.name} onChange={(e: any) => setHoldingForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HDFC Top 100" autoFocus required />
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormGroup>
              <Label>Type</Label>
              <Select fullWidth value={holdingForm.type} onChange={(v: any) => setHoldingForm(f => ({ ...f, type: String(v) }))} options={Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))} />
            </FormGroup>
            <FormGroup>
              <Label>Units (optional)</Label>
              <Input type="number" min="0" step="0.0001" value={holdingForm.units} onChange={(e: any) => setHoldingForm(f => ({ ...f, units: e.target.value }))} placeholder="0" />
            </FormGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormGroup>
              <Label>Invested amount</Label>
              <Input type="number" startAdornment="₹" min="0" value={holdingForm.invested_amount} onChange={(e: any) => setHoldingForm(f => ({ ...f, invested_amount: e.target.value }))} required />
            </FormGroup>
            <FormGroup>
              <Label>Current value</Label>
              <Input type="number" startAdornment="₹" min="0" value={holdingForm.current_value} onChange={(e: any) => setHoldingForm(f => ({ ...f, current_value: e.target.value }))} required />
            </FormGroup>
          </div>
          <FormGroup>
            <Label>Purchase date</Label>
            <Input type="date" value={holdingForm.purchase_date} onChange={(e: any) => setHoldingForm(f => ({ ...f, purchase_date: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input value={holdingForm.notes} onChange={(e: any) => setHoldingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
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
    </Root>
  )
}
