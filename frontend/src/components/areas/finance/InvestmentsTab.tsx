import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Dialog, Input, DataTable, Select, Card } from '@ledgr/ui'
import { Trash2, PencilLine, TrendingUp, Plus } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinanceInvestment } from '@/types'
import styled from 'styled-components'

const AssetCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const AssetIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`

const AssetName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const AssetLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ReturnAmount = styled.div<{ $positive: boolean }>`
  font-weight: 500;
  color: ${({ $positive, theme }) => $positive ? theme.color.success : theme.color.destructive};
`

const ReturnPct = styled.div<{ $positive: boolean }>`
  font-size: 10px;
  color: ${({ $positive, theme }) => $positive ? theme.color.success : theme.color.destructive};
  opacity: 0.8;
`

const ActionContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s;

  @media (min-width: 768px) {
    opacity: 0;
    tr:hover & {
      opacity: 1;
    }
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadingHeader = styled(Skeleton)`
  height: 40px;
`

const LoadingBody = styled(Skeleton)`
  height: 200px;
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.color.muted}33;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 500;
  font-size: 14px;
`

const SummaryReturnText = styled.span<{ $positive: boolean }>`
  color: ${({ $positive, theme }) => $positive ? theme.color.success : theme.color.destructive};
`

const SummaryReturnPctText = styled.span`
  font-size: 12px;
  margin-left: 0.25rem;
`

const ModalTitle = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`

const FormContainer = styled.form`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FormGroup = styled.div``

const Label = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
  display: block;
`

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
`

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  stock: { label: 'Stocks', icon: '📈', color: '#3b82f6' },
  mutual_fund: { label: 'Mutual Funds', icon: '💼', color: '#0D9488' },
  fd: { label: 'Fixed Deposit', icon: '🏦', color: '#f97316' },
  ppf: { label: 'PPF', icon: '🛡️', color: '#8b5cf6' },
  nps: { label: 'NPS', icon: '👴', color: '#10b981' },
  crypto: { label: 'Crypto', icon: '₿', color: '#f43f5e' },
  gold: { label: 'Gold', icon: '🪙', color: '#eab308' },
  other: { label: 'Other', icon: '📦', color: '#6b7280' },
}

export function InvestmentsTab({ onAddClick }: { onAddClick?: () => void }) {
  type HoldingForm = {
    name: string
    type: string
    units: string
    invested_amount: string
    current_value: string
    purchase_date: string
    notes: string
  }
  const EMPTY_HOLDING_FORM: HoldingForm = {
    name: '', type: 'stock', units: '', invested_amount: '0', current_value: '0', purchase_date: '', notes: '',
  }

  const queryClient = useQueryClient()
  const [updatingHolding, setUpdatingHolding] = useState<FinanceInvestment | null>(null)
  const [holdingForm, setHoldingForm] = useState<HoldingForm>(EMPTY_HOLDING_FORM)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: holdings, isLoading } = useQuery({
    queryKey: ['finance', 'investments'],
    queryFn: financeApi.investments,
  })

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['finance', 'investments', 'summary'],
    queryFn: financeApi.investmentsSummary,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof financeApi.patchInvestment>[1]) =>
      financeApi.patchInvestment(updatingHolding!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'summary'] })
      toast.success('Holding updated')
      setUpdatingHolding(null)
      setHoldingForm(EMPTY_HOLDING_FORM)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update holding'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteInvestment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
      toast.success(`Holding removed`)
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
      purchase_date: (holding as any).purchase_date ? String((holding as any).purchase_date).slice(0, 10) : '',
      notes: (holding as any).notes ?? '',
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

  const columns = [
    {
      id: 'asset',
      header: 'Asset',
      cell: (row: any) => {
        const record = row as FinanceInvestment;
        const meta = TYPE_META[record.type] ?? TYPE_META.other;
        return (
          <AssetCell>
            <AssetIcon>{meta.icon}</AssetIcon>
            <div>
              <AssetName>{record.name}</AssetName>
              <AssetLabel>{meta.label}</AssetLabel>
            </div>
          </AssetCell>
        );
      }
    },
    {
      id: 'units',
      header: 'Units',
      cell: (row: any) => row.units ? Number(row.units).toLocaleString('en-IN') : '-'
    },
    {
      id: 'invested_amount',
      header: 'Invested',
      cell: (row: any) => `₹${Number(row.invested_amount).toLocaleString('en-IN')}`
    },
    {
      id: 'current_value',
      header: 'Current Value',
      cell: (row: any) => `₹${Number(row.current_value).toLocaleString('en-IN')}`
    },
    {
      id: 'returns',
      header: 'Returns',
      cell: (row: any) => {
        const record = row as FinanceInvestment;
        const returns = Number(record.current_value) - Number(record.invested_amount);
        const returnsPct = Number(record.invested_amount) > 0 ? (returns / Number(record.invested_amount)) * 100 : 0;
        const positive = returns >= 0;
        return (
          <div>
            <ReturnAmount $positive={positive}>
              {positive ? '+' : ''}₹{Math.abs(returns).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </ReturnAmount>
            <ReturnPct $positive={positive}>
              {positive ? '+' : ''}{returnsPct.toFixed(1)}%
            </ReturnPct>
          </div>
        );
      }
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => {
        const record = row as FinanceInvestment;
        return (
          <ActionContainer>
            <Button variant="ghost" size="icon" onClick={() => openUpdate(record)}>
              <PencilLine size={14} />
            </Button>
            <Popconfirm title="Delete this holding?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button variant="destructive" size="icon">
                <Trash2 size={14} />
              </Button>
            </Popconfirm>
          </ActionContainer>
        )
      },
    }
  ];

  const holdingTypes = Array.from(new Set((holdings ?? []).map(h => h.type))) as string[]
  const visibleHoldings = (holdings ?? []).filter(h => typeFilter === 'all' || h.type === typeFilter)

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <Card
      title="Portfolio Holdings"
      subtitle="Your investments and their current returns"
      icon={<TrendingUp size={16} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter holdings by asset type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(String(v))}
            options={[
              { value: 'all', label: 'All assets' },
              ...holdingTypes.map(t => ({ value: t, label: TYPE_META[t]?.label ?? t })),
            ]}
          />
          {onAddClick && (
            <Button size="sm" variant="primary" onClick={onAddClick}>
              <Plus size={12} style={{ marginRight: 4 }} /> Add Investment
            </Button>
          )}
        </div>
      }
    >
      <DataTable
        rows={visibleHoldings}
        columns={columns}
        getRowKey={row => row.id}
        empty={{ icon: <TrendingUp size={20} />, title: 'No holdings yet', description: 'Track stocks, mutual funds, and crypto to monitor your portfolio performance.' }}
      />
      {summary && (
        <SummaryGrid>
          <div>Total</div>
          <div>Invested: ₹{summary.total_invested.toLocaleString('en-IN')}</div>
          <div>Current: ₹{summary.current_value.toLocaleString('en-IN')}</div>
          <div>
            Returns: <SummaryReturnText $positive={summary.returns_amount >= 0}>
              {summary.returns_amount >= 0 ? '+' : ''}₹{Math.abs(summary.returns_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              <SummaryReturnPctText>({summary.returns_amount >= 0 ? '+' : ''}{summary.returns_pct.toFixed(1)}%)</SummaryReturnPctText>
            </SummaryReturnText>
          </div>
        </SummaryGrid>
      )}

      <Dialog
        open={!!updatingHolding}
        title={<ModalTitle>Edit Holding{updatingHolding?.name ? ` — ${updatingHolding.name}` : ''}</ModalTitle>}
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
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Card>
  )
}
