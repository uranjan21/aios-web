import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Popconfirm, Modal } from 'antd'
import { Trash2, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FinanceInvestment } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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

function HoldingRow({ holding, onUpdate }: { holding: FinanceInvestment; onUpdate: (h: FinanceInvestment) => void }) {
  const queryClient = useQueryClient()
  const meta = TYPE_META[holding.type] ?? TYPE_META.other
  const returns = Number(holding.current_value) - Number(holding.invested_amount)
  const returnsPct = Number(holding.invested_amount) > 0 ? (returns / Number(holding.invested_amount)) * 100 : 0
  const positive = returns >= 0

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.deleteInvestment(holding.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
      toast.success(`${holding.name} removed`)
    },
    onError: () => toast.error('Failed to delete holding'),
  })

  return (
    <div className="flex items-center justify-between px-3 py-3 hover:bg-muted/20 rounded-lg transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl leading-none shrink-0">{meta.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{holding.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{meta.label}</span>
            {holding.units != null && (
              <span className="text-[10px] text-muted-foreground/70">· {Number(holding.units).toLocaleString('en-IN')} units</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">₹{Number(holding.current_value).toLocaleString('en-IN')}</p>
          <p className={cn('text-[11px] font-medium', positive ? 'text-emerald-500' : 'text-rose-500')}>
            {positive ? '+' : ''}{returnsPct.toFixed(1)}% ({positive ? '+' : ''}₹{Math.abs(returns).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onUpdate(holding)}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition px-1.5"
          >
            Update
          </button>
          <Popconfirm title="Delete this holding?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  )
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

  const openUpdate = (holding: FinanceInvestment) => {
    setUpdatingHolding(holding)
    updateForm.setFieldsValue({ current_value: String(holding.current_value) })
  }

  const returnsPositive = (summary?.returns_amount ?? 0) >= 0

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Invested</p>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(summary?.total_invested ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current Value</p>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(summary?.current_value ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {returnsPositive ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Returns</p>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-32" /> : (
            <p className={cn('text-2xl font-bold', returnsPositive ? 'text-emerald-500' : 'text-rose-500')}>
              {returnsPositive ? '+' : ''}₹{Math.abs(summary?.returns_amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              <span className="text-sm font-semibold ml-1.5">({returnsPositive ? '+' : ''}{(summary?.returns_pct ?? 0).toFixed(1)}%)</span>
            </p>
          )}
        </div>
      </div>

      {/* Allocation + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Allocation donut */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm lg:col-span-1 flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Asset Allocation</p>
          {loadingSummary ? <Skeleton className="h-[180px]" /> : !summary?.allocation.length ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No holdings yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={summary.allocation}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {summary.allocation.map(entry => (
                      <Cell key={entry.type} fill={TYPE_META[entry.type]?.color ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(val: number, _name, entry) => [`₹${val.toLocaleString('en-IN')}`, TYPE_META[entry.payload.type]?.label ?? entry.payload.type]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {summary.allocation.map(a => (
                  <div key={a.type} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: TYPE_META[a.type]?.color ?? '#6b7280' }} />
                      {TYPE_META[a.type]?.label ?? a.type}
                    </span>
                    <span className="font-medium text-foreground">
                      {summary.current_value > 0 ? Math.round((a.value / summary.current_value) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Holdings list */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm lg:col-span-2 flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Holdings</p>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !holdings?.length ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">No investments tracked. Use the Add panel to add a holding.</p>
            </div>
          ) : (
            <div className="-m-1.5 space-y-0.5">
              {holdings.map(h => <HoldingRow key={h.id} holding={h} onUpdate={openUpdate} />)}
            </div>
          )}
        </div>
      </div>

      {/* Update value modal */}
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
    </div>
  )
}
