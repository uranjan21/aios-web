import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button, Tag, Space, Popconfirm, Segmented } from 'antd'
import { Plus, ExternalLink, Trash2, Briefcase, XCircle } from 'lucide-react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import { careerApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { formatRelativeTime } from '@/lib/utils'
import type { JobOpportunity, OpportunityStatus } from '@/types'
import { format } from 'date-fns'

const STATUS_COLORS: Record<OpportunityStatus, string> = {
  prospect: 'default',
  applied: 'processing',
  screening: 'warning',
  interview: 'purple',
  offer: 'success',
  rejected: 'error',
  closed: 'default',
}

const STATUS_ORDER: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer', 'rejected', 'closed']

function OppRow({ opp }: { opp: JobOpportunity }) {
  const queryClient = useQueryClient()

  const patchMutation = useMutation({
    mutationFn: (status: OpportunityStatus) => careerApi.patchOpportunity(opp.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => careerApi.deleteOpportunity(opp.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      toast.success('Removed')
    },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-muted/20 rounded-lg transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-foreground">{opp.role}</span>
          <span className="text-[11px] text-muted-foreground">@ {opp.company}</span>
          {opp.url && (
            <a href={opp.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition" aria-label="Open job posting">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Select
            value={opp.status}
            size="small"
            onChange={v => patchMutation.mutate(v)}
            loading={patchMutation.isPending}
            style={{ width: 110 }}
          >
            {STATUS_ORDER.map(s => (
              <Select.Option key={s} value={s}>
                <Tag color={STATUS_COLORS[s]} className="text-[10px] m-0">{s}</Tag>
              </Select.Option>
            ))}
          </Select>
          {opp.applied_date && (
            <span className="text-[10px] text-muted-foreground">Applied {format(new Date(opp.applied_date), 'MMM d')}</span>
          )}
          {opp.notes && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{opp.notes}</span>
          )}
        </div>
      </div>
      <Popconfirm
        title="Remove this opportunity?"
        onConfirm={() => deleteMutation.mutate()}
        okText="Remove"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <button
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
          aria-label="Delete opportunity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </Popconfirm>
    </div>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: Record<string, string>) =>
      careerApi.createOpportunity({
        company: values.company.trim(),
        role: values.role.trim(),
        status: (values.status as OpportunityStatus) || 'prospect',
        url: values.url?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      toast.success('Opportunity added')
      form.resetFields()
      onClose()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  return (
    <div className="bg-muted/40 border border-border/60 rounded-xl p-3 mb-3">
      <Form form={form} layout="vertical" onFinish={mutate} requiredMark={false}>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="company" label={<span className="text-[11px] text-muted-foreground">Company</span>} rules={[{ required: true }]}>
            <Input placeholder="Stripe, Notion…" />
          </Form.Item>
          <Form.Item name="role" label={<span className="text-[11px] text-muted-foreground">Role</span>} rules={[{ required: true }]}>
            <Input placeholder="Software Engineer" />
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="status" label={<span className="text-[11px] text-muted-foreground">Status</span>} initialValue="prospect">
            <Select>
              {STATUS_ORDER.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="url" label={<span className="text-[11px] text-muted-foreground">URL</span>}>
            <Input placeholder="https://…" type="url" />
          </Form.Item>
        </div>
        <Form.Item name="notes" label={<span className="text-[11px] text-muted-foreground">Notes</span>}>
          <Input placeholder="Referral via X, recruiter name…" />
        </Form.Item>
        <Space className="justify-end w-full">
          <Button type="text" onClick={onClose} size="small">Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} size="small">Add Opportunity</Button>
        </Space>
      </Form>
    </div>
  )
}

const PIPELINE_STAGES: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer']

function PipelineCard({ opp }: { opp: JobOpportunity }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing shadow-sm ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="text-[12px] font-semibold text-foreground leading-snug">{opp.role}</div>
      <div className="text-[11px] text-muted-foreground">{opp.company}</div>
      {opp.notes && <div className="text-[10px] text-muted-foreground mt-1 truncate">{opp.notes}</div>}
    </div>
  )
}

function PipelineColumn({ status, opps }: { status: OpportunityStatus; opps: JobOpportunity[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-2 min-h-[140px] transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20'}`}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <Tag color={STATUS_COLORS[status]} className="!text-[10px] !m-0 capitalize">{status}</Tag>
        <span className="text-[10px] font-mono text-muted-foreground">{opps.length}</span>
      </div>
      <div className="space-y-2">
        {opps.map(o => <PipelineCard key={o.id} opp={o} />)}
      </div>
    </div>
  )
}

function RejectZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'rejected' })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 transition-colors ${isOver ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border/60 text-muted-foreground'}`}
    >
      <XCircle className="w-3.5 h-3.5" />
      <span className="text-[11px] font-medium">Drop here to mark rejected</span>
    </div>
  )
}

function PipelineBoard({ opps }: { opps: JobOpportunity[] }) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) =>
      careerApi.patchOpportunity(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      toast.success('Stage updated')
    },
    onError: () => toast.error('Failed to update stage'),
  })

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const target = e.over?.id as OpportunityStatus | undefined
    if (!target) return
    const opp = opps.find(o => o.id === e.active.id)
    if (opp && opp.status !== target) moveMutation.mutate({ id: opp.id, status: target })
  }

  const activeOpp = opps.find(o => o.id === activeId)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        {PIPELINE_STAGES.map(s => (
          <PipelineColumn key={s} status={s} opps={opps.filter(o => o.status === s)} />
        ))}
      </div>
      <RejectZone />
      <DragOverlay>
        {activeOpp && (
          <div className="bg-card border-2 border-primary rounded-lg p-2.5 shadow-2xl rotate-2 w-[200px]">
            <div className="text-[12px] font-semibold text-foreground">{activeOpp.role}</div>
            <div className="text-[11px] text-muted-foreground">{activeOpp.company}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export function OpportunitiesTab() {
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<'Pipeline' | 'List'>('Pipeline')

  const { data: opps, isLoading } = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
  })

  const active = opps?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const closed = opps?.filter(o => ['rejected', 'closed'].includes(o.status)) ?? []

  return (
    <div className={view === 'Pipeline' ? 'space-y-3' : 'max-w-2xl space-y-3'}>
      <div className="flex items-center justify-between">
        <Segmented size="small" options={['Pipeline', 'List']} value={view} onChange={v => setView(v as typeof view)} />
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {showForm && <AddForm onClose={() => setShowForm(false)} />}

      {view === 'Pipeline' ? (
        isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[140px] rounded-xl" />)}
          </div>
        ) : !active.length ? (
          <EmptyState icon={Briefcase} title="No active opportunities" description="Track jobs you're applying to here." />
        ) : (
          <PipelineBoard opps={active} />
        )
      ) : (
      <div className="bg-card border border-subtle rounded-xl overflow-hidden shadow-premium-sm">
        <div className="px-3 py-2.5 border-b border-border/40">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active</span>
        </div>

        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !active.length ? (
          <EmptyState icon={Briefcase} title="No active opportunities" description="Track jobs you're applying to here." />
        ) : (
          <div className="p-1.5">
            {active.map(o => <OppRow key={o.id} opp={o} />)}
          </div>
        )}
      </div>
      )}

      {closed.length > 0 && (
        <div className="bg-card border border-subtle rounded-xl overflow-hidden shadow-premium-sm">
          <div className="px-3 py-2.5 border-b border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Closed / Rejected</span>
          </div>
          <div className="p-1.5">
            {closed.map(o => <OppRow key={o.id} opp={o} />)}
          </div>
        </div>
      )}
    </div>
  )
}
