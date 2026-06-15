import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Popconfirm, Modal, Table } from 'antd'
import { Trash2, PencilLine } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FinanceInvestment } from '@/types'
import { TableContainer, TableHeader } from './TableStyles'

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
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [updatingHolding, setUpdatingHolding] = useState<FinanceInvestment | null>(null)

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
      updateForm.resetFields()
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
    updateForm.setFieldsValue({ current_value: String(holding.current_value) })
  }

  const columns = [
    {
      title: 'Asset',
      key: 'asset',
      render: (_: any, record: FinanceInvestment) => {
        const meta = TYPE_META[record.type] ?? TYPE_META.other;
        return (
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{meta.icon}</span>
            <div>
              <div className="font-medium text-foreground">{record.name}</div>
              <div className="text-[10px] text-muted-foreground">{meta.label}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Units',
      dataIndex: 'units',
      key: 'units',
      render: (units: string | number) => units ? Number(units).toLocaleString('en-IN') : '-'
    },
    {
      title: 'Invested',
      dataIndex: 'invested_amount',
      key: 'invested_amount',
      render: (amount: string | number) => `₹${Number(amount).toLocaleString('en-IN')}`
    },
    {
      title: 'Current Value',
      dataIndex: 'current_value',
      key: 'current_value',
      render: (amount: string | number) => `₹${Number(amount).toLocaleString('en-IN')}`
    },
    {
      title: 'Returns',
      key: 'returns',
      render: (_: any, record: FinanceInvestment) => {
        const returns = Number(record.current_value) - Number(record.invested_amount);
        const returnsPct = Number(record.invested_amount) > 0 ? (returns / Number(record.invested_amount)) * 100 : 0;
        const positive = returns >= 0;
        return (
          <div>
            <div className={cn('font-medium', positive ? 'text-emerald-500' : 'text-rose-500')}>
              {positive ? '+' : ''}₹{Math.abs(returns).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className={cn('text-[10px]', positive ? 'text-emerald-500/80' : 'text-rose-500/80')}>
              {positive ? '+' : ''}{returnsPct.toFixed(1)}%
            </div>
          </div>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: FinanceInvestment) => (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="text" size="small" icon={<PencilLine size={14} />} onClick={() => openUpdate(record)} />
          <Popconfirm title="Delete this holding?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    }
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <TableContainer>
      <TableHeader>
        <h3>Portfolio Holdings</h3>
      </TableHeader>

      <Table
        dataSource={holdings}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        rowClassName={() => 'group'}
        summary={() => {
          if (!summary) return null;
          const returnsPositive = summary.returns_amount >= 0;
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>₹{summary.total_invested.toLocaleString('en-IN')}</Table.Summary.Cell>
              <Table.Summary.Cell index={2}>₹{summary.current_value.toLocaleString('en-IN')}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2}>
                <span className={returnsPositive ? 'text-emerald-500' : 'text-rose-500'}>
                  {returnsPositive ? '+' : ''}₹{Math.abs(summary.returns_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  <span className="text-xs ml-1">({returnsPositive ? '+' : ''}{summary.returns_pct.toFixed(1)}%)</span>
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />

      <Modal
        open={!!updatingHolding}
        title={<span className="text-foreground">Update value — {updatingHolding?.name}</span>}
        onCancel={() => { setUpdatingHolding(null); updateForm.resetFields() }}
        footer={null}
        width={360}
      >
        <Form form={updateForm} layout="vertical" onFinish={updateMutation.mutate} requiredMark={false} className="mt-4">
          <Form.Item name="current_value" label={<span className="text-[11px] text-muted-foreground">Current value (₹)</span>} rules={[{ required: true }]}>
            <Input type="number" prefix="₹" placeholder="0" min="0" size="large" />
          </Form.Item>
          <div className="flex gap-2">
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
            <Button type="text" onClick={() => { setUpdatingHolding(null); updateForm.resetFields() }}>Cancel</Button>
          </div>
        </Form>
      </Modal>
    </TableContainer>
  )
}
