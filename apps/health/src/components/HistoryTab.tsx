
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, Badge, Button, Card as GlassCard, DataTable } from '@ledgr/ui'
import { Download, Activity, History, Plus } from 'lucide-react'
import { healthApi } from '@aios/shared/api/areas'
import { exportToCsv, formatRelativeTime } from '@aios/shared/lib/utils'
import { format } from 'date-fns'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import styled from 'styled-components'

const TYPE_COLORS: Record<string, "success" | "info" | "warning" | "accent" | "neutral" | "primary" | "destructive"> = {
  gym: 'success',
  weight: 'info',
  water: 'info',
  food: 'warning',
  meal: 'warning',
  steps: 'warning',
  body_fat: 'accent',
  sleep: 'info',
  note: 'neutral',
}

const TYPE_LABELS: Record<string, string> = {
  gym: 'Gym', weight: 'Weight', water: 'Water',
  food: 'Food', meal: 'Meal', steps: 'Steps',
  body_fat: 'Body Fat', sleep: 'Sleep', note: 'Note',
}

const LOG_TYPES = ['all', 'gym', 'weight', 'water', 'meal', 'steps', 'body_fat', 'sleep', 'food', 'note']



const StyledDatePrimary = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledDateSecondary = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledValue = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledNotes = styled.span`
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
`;

const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export function HistoryTab({ onLogClick }: { onLogClick?: () => void }) {
  const [filterType, setFilterType] = useState('all')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['health', 'logs', 'all'],
    queryFn: () => healthApi.logs(),
  })

  const filtered = filterType === 'all' ? logs : logs?.filter(l => l.entry_type === filterType)

  const handleExport = () => {
    if (!filtered?.length) return
    exportToCsv(
      filtered.map(l => ({
        date: l.logged_at,
        type: l.entry_type,
        value: l.value ?? '',
        unit: l.unit ?? '',
        notes: l.notes ?? '',
      })),
      `health-logs-${format(new Date(), 'yyyy-MM-dd')}`,
    )
  }

  const selectOptions = LOG_TYPES.map(t => ({
    value: t,
    label: t === 'all' ? 'All types' : TYPE_LABELS[t] || t
  }))

  const columns = [
    {
      id: 'date',
      header: 'Date',
      cell: (log: any) => (
        <>
          <StyledDatePrimary>{format(new Date(log.logged_at), 'MMM d, yyyy')}</StyledDatePrimary>
          <StyledDateSecondary>{formatRelativeTime(log.logged_at)}</StyledDateSecondary>
        </>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (log: any) => (
        <Badge tone={TYPE_COLORS[log.entry_type] || 'neutral'} size="sm">
          {TYPE_LABELS[log.entry_type] || log.entry_type}
        </Badge>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      cell: (log: any) => (
        <StyledValue>
          {log.value != null ? `${log.value}${log.unit ? ` ${log.unit}` : ''}` : '—'}
        </StyledValue>
      ),
    },
    {
      id: 'notes',
      header: 'Notes',
      hideBelow: 'sm' as const,
      cell: (log: any) => <StyledNotes>{log.notes || '—'}</StyledNotes>,
    },
  ]

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <GlassCard
          title="History Logs"
          subtitle="Recent entries and health logs history"
          icon={<History size={16} />}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExport}
                disabled={!filtered?.length}
              >
                <StyledButtonContent>
                  <Download size={13} />
                  <span>Export CSV</span>
                </StyledButtonContent>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={onLogClick || (() => {})}
              >
                <Plus size={12} style={{ marginRight: 4 }} /> Add Entry
              </Button>
              <Select
                value={filterType}
                onChange={(val) => setFilterType(String(val))}
                size="sm"
                options={selectOptions}
                fullWidth={false}
                aria-label="Filter logs by type"
              />
            </div>
          }
          size="none"
        >
          <DataTable
            columns={columns}
            rows={filtered ?? []}
            getRowKey={(log: any) => log.id}
            loading={isLoading}
            empty={{
              icon: <Activity size={20} />,
              title: 'No logs',
              description: 'Start logging to see your history here.',
              action: <Button size="sm" variant="primary" onClick={onLogClick || (() => {})}>Add Entry</Button>,
            }}
          />
        </GlassCard>
      </WorkspaceLayout>
    </>
  )
}
