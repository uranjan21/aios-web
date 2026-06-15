import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Switch, Popconfirm, Tag, Table, Button } from 'antd'
import { Trash2, Zap } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinanceBill } from '@/types'
import { TableContainer, TableHeader } from './TableStyles'

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) {
    return dueDay - currentDay
  }
  return daysInMonth - currentDay + dueDay
}

function urgencyColor(days: number): 'error' | 'warning' | 'success' {
  if (days <= 3) return 'error'
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

  // Sort by days until due
  const sorted = [...(bills ?? [])].sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day))
  const activeBills = sorted.filter(b => b.is_active)
  const totalAmount = activeBills.reduce((s, b) => s + Number(b.amount), 0)

  const columns = [
    {
      title: 'Bill Name',
      key: 'name',
      render: (_: any, record: FinanceBill) => (
        <div>
          <div className="font-medium text-foreground">{record.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground capitalize">{record.category}</span>
            {record.is_auto_debit && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-medium ml-1">
                <Zap className="w-2.5 h-2.5" /> Auto
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string | number) => <span className="font-medium">₹{Number(amount).toLocaleString('en-IN')}</span>
    },
    {
      title: 'Due Date',
      key: 'due',
      render: (_: any, record: FinanceBill) => {
        const days = getDaysUntilDue(record.due_day)
        const color = urgencyColor(days)
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Due {ordinal(record.due_day)}</span>
            {record.is_active && (
              <Tag color={color} className="text-[10px] leading-tight py-0 m-0" bordered={false}>
                {days === 0 ? 'Today' : `${days}d`}
              </Tag>
            )}
          </div>
        )
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: FinanceBill) => (
        <Switch
          size="small"
          checked={record.is_active}
          onChange={v => toggleMutation.mutate({ id: record.id, active: v })}
          loading={toggleMutation.isPending}
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FinanceBill) => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Popconfirm title="Delete this bill?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      )
    }
  ]

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <TableContainer>
      <TableHeader>
        <h3>Recurring Bills</h3>
      </TableHeader>
      
      <Table
        dataSource={sorted}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        rowClassName={(record) => record.is_active ? 'group' : 'group opacity-50'}
        summary={() => {
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Monthly Total ({activeBills.length} active)</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={4}>₹{totalAmount.toLocaleString('en-IN')}</Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </TableContainer>
  )
}
