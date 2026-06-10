import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button, Tag, Timeline, Space } from 'antd'
import { Plus, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { businessApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'green',
  decision: 'blue',
  revenue: 'gold',
  blocker: 'red',
  milestone: 'purple',
  note: 'default',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  feature_shipped: 'Feature Shipped',
  decision: 'Decision',
  revenue: 'Revenue',
  blocker: 'Blocker',
  milestone: 'Milestone',
  note: 'Note',
}

function NewEventForm({ onClose }: { onClose: () => void }) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: Record<string, string>) =>
      businessApi.createEvent({
        event_type: values.eventType,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        mrr: values.mrr ? parseFloat(values.mrr) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      toast.success('Event logged')
      form.resetFields()
      onClose()
    },
    onError: () => toast.error('Failed to log event'),
  })

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Form form={form} layout="vertical" onFinish={mutate} requiredMark={false}
        className="p-3 bg-muted/40 rounded-xl mb-3 border border-border/60">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="eventType" label={<span className="text-[11px] text-muted-foreground">Type</span>}
            initialValue="feature_shipped" rules={[{ required: true }]}>
            <Select>
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                <Select.Option key={v} value={v}>{l}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="mrr" label={<span className="text-[11px] text-muted-foreground">MRR (optional)</span>}>
            <Input type="number" prefix="₹" placeholder="0" min="0" />
          </Form.Item>
        </div>
        <Form.Item name="title" label={<span className="text-[11px] text-muted-foreground">Title</span>}
          rules={[{ required: true, message: 'Title is required' }]}>
          <Input placeholder="What happened?" maxLength={200} />
        </Form.Item>
        <Form.Item name="description" label={<span className="text-[11px] text-muted-foreground">Description</span>}>
          <Input.TextArea placeholder="More context (optional)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose} size="small">Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} size="small">Log Event</Button>
        </Space>
      </Form>
    </motion.div>
  )
}

export function EventsTab() {
  const [showForm, setShowForm] = useState(false)

  const { data: events, isLoading } = useQuery({
    queryKey: ['business', 'events'],
    queryFn: businessApi.events,
  })

  const timelineItems = events?.map(event => ({
    key: event.id,
    dot: <div className="w-2.5 h-2.5 rounded-full bg-primary/80 border-2 border-background mt-0.5" />,
    children: (
      <div className="pb-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Tag color={EVENT_TYPE_COLORS[event.event_type] || 'default'} className="text-[10px] m-0">
            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
          </Tag>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(event.occurred_at), 'MMM d, yyyy')}
          </span>
          {event.mrr != null && event.mrr > 0 && (
            <Tag color="gold" className="text-[10px] m-0">MRR ₹{event.mrr}</Tag>
          )}
        </div>
        <p className="text-[12px] font-medium text-foreground">{event.title}</p>
        {event.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{event.description}</p>
        )}
      </div>
    ),
  })) ?? []

  return (
    <div className="max-w-2xl space-y-3">
      <AnimatePresence>
        {showForm && <NewEventForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>

      <div className="bg-card border border-border/60 shadow-sm rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Event Log</span>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition"
            >
              <Plus className="w-3 h-3" /> Log Event
            </button>
          )}
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !events?.length ? (
            <EmptyState icon={History} title="No events yet" description="Log feature ships, decisions, and milestones here." />
          ) : (
            <Timeline items={timelineItems} />
          )}
        </div>
      </div>
    </div>
  )
}
