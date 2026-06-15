import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Popconfirm, Modal, Table } from 'antd'
import { Trash2, PencilLine, CalendarDays } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinancialGoal } from '@/types'
import { differenceInDays } from 'date-fns'
import { TableContainer, TableHeader } from './TableStyles'

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  return differenceInDays(new Date(deadline), new Date())
}

export function GoalsTab() {
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)

  const { data: goals, isLoading } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
  })

  const updateMutation = useMutation({
    mutationFn: (values: { current_amount: string }) =>
      financeApi.patchGoal(updatingGoal!.id, { current_amount: parseFloat(values.current_amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal updated')
      setUpdatingGoal(null)
      updateForm.resetFields()
    },
    onError: () => toast.error('Failed to update goal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal deleted')
    },
    onError: () => toast.error('Failed to delete goal'),
  })

  const openUpdate = (goal: FinancialGoal) => {
    setUpdatingGoal(goal)
    updateForm.setFieldsValue({ current_amount: String(goal.current_amount) })
  }

  const columns = [
    {
      title: 'Goal',
      key: 'name',
      render: (_: any, record: FinancialGoal) => (
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{record.icon || '🎯'}</span>
          <div>
            <div className="font-medium text-foreground">{record.name}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{record.category}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_: any, record: FinancialGoal) => {
        const pct = Math.min(100, record.target_amount > 0 ? Math.round((record.current_amount / record.target_amount) * 100) : 0)
        return (
          <div className="w-[180px]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-medium text-foreground">₹{record.current_amount.toLocaleString('en-IN')}</span>
              <span className="text-muted-foreground">/ ₹{record.target_amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: record.color || '#0D9488' }}
              />
            </div>
          </div>
        )
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: FinancialGoal) => {
        const pct = Math.min(100, record.target_amount > 0 ? Math.round((record.current_amount / record.target_amount) * 100) : 0)
        const days = daysLeft(record.deadline)
        return (
          <div>
            <div className="font-medium" style={{ color: record.color || '#0D9488' }}>{pct}% complete</div>
            {days !== null && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <CalendarDays className="w-3 h-3" />
                {days > 0 ? `${days} days left` : days === 0 ? 'Due today' : 'Overdue'}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FinancialGoal) => (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="text" size="small" icon={<PencilLine size={14} />} onClick={() => openUpdate(record)} />
          <Popconfirm title="Delete this goal?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      )
    }
  ]

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <div>
      <TableContainer>
        <TableHeader>
          <h3>Savings Goals</h3>
        </TableHeader>

        <Table
          dataSource={goals}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          rowClassName={() => 'group'}
        />

        <Modal
          open={!!updatingGoal}
          title={<span className="text-foreground">Update saved amount — {updatingGoal?.name}</span>}
          onCancel={() => { setUpdatingGoal(null); updateForm.resetFields() }}
          footer={null}
          width={360}
        >
          <Form form={updateForm} layout="vertical" onFinish={updateMutation.mutate} requiredMark={false} className="mt-4">
            <Form.Item name="current_amount" label={<span className="text-[11px] text-muted-foreground">Current amount saved (₹)</span>} rules={[{ required: true }]}>
              <Input type="number" prefix="₹" placeholder="0" min="0" size="large" />
            </Form.Item>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
              <Button type="text" onClick={() => { setUpdatingGoal(null); updateForm.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </Modal>
      </TableContainer>
    </div>
  )
}
