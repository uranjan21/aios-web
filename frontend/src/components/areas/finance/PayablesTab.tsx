import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Button, Switch } from '@ledgr/ui'
import { ChevronLeft, ChevronRight, ListChecks, Wallet, CreditCard } from 'lucide-react'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { financeApi, type PayableItem } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`

const Kpi = styled.div`
  background: ${({ theme }) => theme.color.muted}66;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
`
const KpiLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 4px;
`
const KpiValue = styled.div<{ $tone?: 'danger' | 'success' }>`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.color.destructive : $tone === 'success' ? 'var(--success, #22c55e)' : theme.color.foreground};
`

const Row = styled.div<{ $paid: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  opacity: ${({ $paid }) => ($paid ? 0.55 : 1)};
`
const TypeBadge = styled.span<{ $type: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.4px;
`
const Name = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`
const Meta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`
const Amount = styled.div<{ $paid: boolean }>`
  font-weight: 600;
  text-align: right;
  text-decoration: ${({ $paid }) => ($paid ? 'line-through' : 'none')};
`
const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
const MonthLabel = styled.span`
  font-weight: 600;
  min-width: 96px;
  text-align: center;
`

function dueLabel(item: PayableItem): string {
  if (item.due_date) return `Due ${dayjs(item.due_date).format('DD MMM')}`
  if (item.due_day) return `Due on the ${item.due_day}${suffix(item.due_day)}`
  return '—'
}
function suffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

export function PayablesTab() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'payables', month],
    queryFn: () => financeApi.payables(month),
    staleTime: 30_000,
  })

  const payMutation = useMutation({
    mutationFn: (item: PayableItem) =>
      financeApi.togglePaid({
        obligation_type: item.type,
        obligation_id: item.id,
        period: month,
        paid: !item.paid,
        account_id: item.account_id,
      }),
    onMutate: async (item) => {
      // Optimistic flip for a responsive checklist.
      await queryClient.cancelQueries({ queryKey: ['finance', 'payables', month] })
      const prev = queryClient.getQueryData<typeof data>(['finance', 'payables', month])
      if (prev) {
        queryClient.setQueryData(['finance', 'payables', month], {
          ...prev,
          items: prev.items.map((i) =>
            i.type === item.type && i.id === item.id ? { ...i, paid: !i.paid } : i,
          ),
        })
      }
      return { prev }
    },
    onError: (_e, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['finance', 'payables', month], ctx.prev)
      toast.error('Could not update')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['finance', 'payables', month] }),
  })

  const shift = (delta: number) => setMonth(dayjs(month + '-01').add(delta, 'month').format('YYYY-MM'))

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  const items = data?.items ?? []

  return (
    <Card
      title="Month-end payables"
      subtitle="Everything you owe this month — rent, EMIs, subscriptions, credit-card bills"
      icon={<ListChecks size={16} />}
      action={
        <MonthNav>
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <MonthLabel>{dayjs(month + '-01').format('MMM YYYY')}</MonthLabel>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </Button>
        </MonthNav>
      }
    >
      <KpiRow>
        <Kpi>
          <KpiLabel>Total payable</KpiLabel>
          <KpiValue>{formatCurrency(data?.total ?? 0)}</KpiValue>
        </Kpi>
        <Kpi>
          <KpiLabel>Paid</KpiLabel>
          <KpiValue $tone="success">{formatCurrency(data?.total_paid ?? 0)}</KpiValue>
        </Kpi>
        <Kpi>
          <KpiLabel>Still due</KpiLabel>
          <KpiValue $tone="danger">{formatCurrency(data?.total_unpaid ?? 0)}</KpiValue>
        </Kpi>
      </KpiRow>

      {items.length === 0 ? (
        <Meta style={{ padding: '32px 0', textAlign: 'center' }}>
          Nothing due this month. Add bills, loans (EMIs), or credit-card bills to see them here.
        </Meta>
      ) : (
        items.map((item) => (
          <Row key={`${item.type}-${item.id}`} $paid={item.paid}>
            <Switch
              checked={item.paid}
              onChange={() => payMutation.mutate(item)}
              aria-label={`Mark ${item.name} ${item.paid ? 'unpaid' : 'paid'}`}
            />
            {item.type === 'cc_bill' ? <CreditCard size={16} /> : <Wallet size={16} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Name>{item.name}</Name>
              <Meta>
                {dueLabel(item)}
                {item.account_name ? ` · from ${item.account_name}` : ' · no account set'}
                {item.is_auto_debit ? ' · auto-debit' : ''}
              </Meta>
            </div>
            <TypeBadge $type={item.type}>{item.type === 'cc_bill' ? 'CC' : item.type}</TypeBadge>
            <Amount $paid={item.paid}>{formatCurrency(item.amount)}</Amount>
          </Row>
        ))
      )}
    </Card>
  )
}
