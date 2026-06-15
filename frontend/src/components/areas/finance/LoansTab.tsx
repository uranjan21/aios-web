import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Switch, Popconfirm, Modal, Tag, Table } from 'antd'
import { Trash2, PencilLine } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinanceLoan } from '@/types'
import { TableContainer, TableHeader } from './TableStyles'
import { PayoffPlanner } from './PayoffPlanner'

const LOAN_TYPE_META: Record<string, { label: string; icon: string }> = {
  home: { label: 'Home Loan', icon: '🏠' },
  personal: { label: 'Personal Loan', icon: '💵' },
  car: { label: 'Car Loan', icon: '🚗' },
  education: { label: 'Education Loan', icon: '🎓' },
  credit_card: { label: 'Credit Card', icon: '💳' },
  other: { label: 'Other', icon: '📄' },
}

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
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

export function LoansTab() {
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [updatingLoan, setUpdatingLoan] = useState<FinanceLoan | null>(null)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance', 'loans', 'summary'],
    queryFn: financeApi.loansSummary,
  })

  const updateMutation = useMutation({
    mutationFn: (values: { outstanding_amount: string }) =>
      financeApi.patchLoan(updatingLoan!.id, { outstanding_amount: parseFloat(values.outstanding_amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success('Loan updated')
      setUpdatingLoan(null)
      updateForm.resetFields()
    },
    onError: () => toast.error('Failed to update loan'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => financeApi.patchLoan(id, { is_active: active }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(vars.active ? 'Loan marked active' : 'Loan marked paid off')
    },
    onError: () => toast.error('Failed to update loan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(`Loan removed`)
    },
    onError: () => toast.error('Failed to delete loan'),
  })

  const openUpdate = (loan: FinanceLoan) => {
    setUpdatingLoan(loan)
    updateForm.setFieldsValue({ outstanding_amount: String(loan.outstanding_amount) })
  }

  const columns = [
    {
      title: 'Loan',
      key: 'loan',
      render: (_: any, record: FinanceLoan) => {
        const meta = LOAN_TYPE_META[record.loan_type] ?? LOAN_TYPE_META.other
        return (
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{meta.icon}</span>
            <div>
              <div className="font-medium text-foreground">{record.name}</div>
              <div className="text-[10px] text-muted-foreground">{meta.label} {record.lender ? `· ${record.lender}` : ''}</div>
            </div>
          </div>
        )
      }
    },
    {
      title: 'Principal',
      dataIndex: 'principal_amount',
      key: 'principal_amount',
      render: (amount: string | number) => `₹${Number(amount).toLocaleString('en-IN')}`
    },
    {
      title: 'Outstanding',
      key: 'outstanding_amount',
      render: (_: any, record: FinanceLoan) => {
        const principal = Number(record.principal_amount)
        const outstanding = Number(record.outstanding_amount)
        const paidPct = principal > 0 ? Math.min(100, Math.round(((principal - outstanding) / principal) * 100)) : 0
        return (
          <div>
            <div className="font-medium">₹{outstanding.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-muted-foreground">{paidPct}% paid</div>
          </div>
        )
      }
    },
    {
      title: 'EMI Details',
      key: 'emi',
      render: (_: any, record: FinanceLoan) => {
        const days = getDaysUntilDue(record.emi_day)
        return (
          <div>
            <div className="font-medium">₹{Number(record.emi_amount).toLocaleString('en-IN')}/mo</div>
            {record.is_active && (
              <Tag color={urgencyColor(days)} className="text-[10px] leading-tight py-0 mt-0.5" bordered={false}>
                Due {days === 0 ? 'Today' : `${days}d`} ({ordinal(record.emi_day)})
              </Tag>
            )}
          </div>
        )
      }
    },
    {
      title: 'Rate',
      dataIndex: 'interest_rate',
      key: 'interest_rate',
      render: (rate: string | number) => `${Number(rate).toFixed(2)}%`
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: FinanceLoan) => (
        <Switch
          size="small"
          checked={record.is_active}
          onChange={v => toggleMutation.mutate({ id: record.id, active: v })}
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FinanceLoan) => (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="text" size="small" icon={<PencilLine size={14} />} onClick={() => openUpdate(record)} />
          <Popconfirm title="Delete this loan?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    }
  ]

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <div className="space-y-4">
      <TableContainer>
        <TableHeader>
          <h3>Loans & EMIs</h3>
        </TableHeader>

        <Table
          dataSource={loans}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          rowClassName={(record) => record.is_active ? 'group' : 'group opacity-60'}
          summary={() => {
            if (!summary) return null;
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>Active Total</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>₹{summary.total_outstanding.toLocaleString('en-IN')}</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>₹{summary.total_emi.toLocaleString('en-IN')}/mo</Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={3}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />

        <Modal
          open={!!updatingLoan}
          title={<span className="text-foreground">Update outstanding — {updatingLoan?.name}</span>}
          onCancel={() => { setUpdatingLoan(null); updateForm.resetFields() }}
          footer={null}
          width={360}
        >
          <Form form={updateForm} layout="vertical" onFinish={updateMutation.mutate} requiredMark={false} className="mt-4">
            <Form.Item name="outstanding_amount" label={<span className="text-[11px] text-muted-foreground">Outstanding amount (₹)</span>} rules={[{ required: true }]}>
              <Input type="number" prefix="₹" placeholder="0" min="0" size="large" />
            </Form.Item>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
              <Button type="text" onClick={() => { setUpdatingLoan(null); updateForm.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </Modal>
      </TableContainer>

      {loans && loans.some(l => l.is_active) && <PayoffPlanner loans={loans} />}
    </div>
  )
}
