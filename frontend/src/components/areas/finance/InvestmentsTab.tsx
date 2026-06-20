import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Dialog, Input, DataTable, Select, Card } from '@ledgr/ui'
import { Trash2, PencilLine, TrendingUp } from 'lucide-react'
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

export function InvestmentsTab() {
  const queryClient = useQueryClient()
  const [updatingHolding, setUpdatingHolding] = useState<FinanceInvestment | null>(null)
  const [currentValue, setCurrentValue] = useState<string>('')
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
    mutationFn: (values: { current_value: string }) =>
      financeApi.patchInvestment(updatingHolding!.id, { current_value: parseFloat(values.current_value) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
      toast.success('Holding updated')
      setUpdatingHolding(null)
      setCurrentValue('')
    },
    onError: () => toast.error('Failed to update holding'),
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
    setCurrentValue(String(holding.current_value))
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
      }
    >
      <DataTable
        rows={visibleHoldings}
        columns={columns}
        getRowKey={row => row.id}
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
        title={<ModalTitle>Update value — {updatingHolding?.name}</ModalTitle>}
        onOpenChange={(open) => { if (!open) { setUpdatingHolding(null); setCurrentValue('') } }}
        size="sm"
      >
        <FormContainer onSubmit={e => { e.preventDefault(); updateMutation.mutate({ current_value: currentValue }) }}>
          <FormGroup>
            <Label>Current value (₹)</Label>
            <Input type="number" startAdornment="₹" placeholder="0" min="0" size="lg" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} required />
          </FormGroup>
          <ActionsContainer>
            <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save</Button>
            <Button variant="ghost" onClick={() => { setUpdatingHolding(null); setCurrentValue('') }} type="button">Cancel</Button>
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Card>
  )
}
