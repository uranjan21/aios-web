import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Switch, Badge } from '@ledgr/ui'
import { Trash2, Zap } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinanceBill } from '@/types'
import { Table } from '@/components/ui/Table'
import styled from 'styled-components'

const NameText = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const SubtitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.125rem;
`

const CategoryText = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: capitalize;
`

const AutoText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-size: 10px;
  color: #3b82f6;
  font-weight: 500;
  margin-left: 0.25rem;
`

const AmountText = styled.span`
  font-weight: 500;
`

const DueContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const DueText = styled.span`
  font-size: 14px;
`

const ActionContainer = styled.div`
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

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) {
    return dueDay - currentDay
  }
  return daysInMonth - currentDay + dueDay
}

function urgencyColor(days: number): 'destructive' | 'warning' | 'success' {
  if (days <= 3) return 'destructive'
  if (days <= 7) return 'warning'
  return 'success'
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function BillsTab() {
  const queryClient = useQueryClient()
  const { data: bills, isLoading } = useQuery({
    queryKey: ['finance', 'bills'],
    queryFn: financeApi.bills,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => financeApi.patchBill(id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] }),
    onError: () => toast.error('Failed to update bill'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success('Bill removed')
    },
    onError: () => toast.error('Failed to delete bill'),
  })

  const sorted = [...(bills ?? [])].sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day))
  const activeBills = sorted.filter(b => b.is_active)
  const totalAmount = activeBills.reduce((s, b) => s + Number(b.amount), 0)

  const columns = [
    {
      id: 'name',
      header: 'Bill Name',
      cell: (row: any) => {
        const record = row as FinanceBill;
        return (
          <div>
            <NameText>{record.name}</NameText>
            <SubtitleContainer>
              <CategoryText>{record.category}</CategoryText>
              {record.is_auto_debit && (
                <AutoText>
                  <Zap size={10} /> Auto
                </AutoText>
              )}
            </SubtitleContainer>
          </div>
        )
      }
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row: any) => <AmountText>₹{Number(row.amount).toLocaleString('en-IN')}</AmountText>
    },
    {
      id: 'due',
      header: 'Due Date',
      cell: (row: any) => {
        const record = row as FinanceBill;
        const days = getDaysUntilDue(record.due_day)
        const color = urgencyColor(days)
        return (
          <DueContainer>
            <DueText>Due {ordinal(record.due_day)}</DueText>
            {record.is_active && (
              <Badge tone={color} size="sm">
                {days === 0 ? 'Today' : `${days}d`}
              </Badge>
            )}
          </DueContainer>
        )
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: any) => {
        const record = row as FinanceBill;
        return (
          <Switch
            size="sm"
            checked={record.is_active}
            onChange={e => toggleMutation.mutate({ id: record.id, active: e.target.checked })}
            disabled={toggleMutation.isPending}
          />
        )
      }
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => {
        const record = row as FinanceBill;
        return (
          <ActionContainer>
            <Popconfirm title="Delete this bill?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button variant="destructive" size="icon">
                <Trash2 size={14} />
              </Button>
            </Popconfirm>
          </ActionContainer>
        )
      }
    }
  ]

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <Table
      title="Recurring Bills"
      rows={sorted}
      columns={columns}
      getRowKey={row => row.id}
      footer={
        <>
          <span>Monthly Total ({activeBills.length} active)</span>
          <span>₹{totalAmount.toLocaleString('en-IN')}</span>
        </>
      }
    />
  )
}
