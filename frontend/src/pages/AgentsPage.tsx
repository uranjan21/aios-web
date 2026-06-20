import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react'
import { toast } from 'sonner'
import { Play, RefreshCw, CheckCircle, XCircle, Zap, Terminal, Activity, Calendar, Bot } from 'lucide-react'
import { agentsApi } from '@/api/agents'
import { formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageLayout'
import type { Agent } from '@/types'

import styled, { keyframes, createGlobalStyle, useTheme } from 'styled-components'
import { Button, Switch, Tooltip, Sheet } from '@ledgr/ui'
import { Card as AppCard } from '@ledgr/ui'

class AgentErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AgentsPage Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, background: 'color-mix(in srgb, var(--destructive) 8%, transparent)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--destructive) 20%, transparent)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--destructive)' }}>Agent card error</h3>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Styled Components ---

const SpinGlobal = createGlobalStyle`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulse-color) 40%, transparent); }
  70% { box-shadow: 0 0 15px 10px color-mix(in srgb, var(--pulse-color) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulse-color) 0%, transparent); }
`;

const PageContainer = styled.div`
  padding: 1.25rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  min-height: calc(100vh - 64px);
  background: ${({ theme }) => theme.color?.background || 'var(--page-bg)'};
`;

const AgentSkeleton = styled(Skeleton)`
  height: 64px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.color?.muted || 'var(--muted)'};
`;

// --- Styled Components ---

const AgentsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AgentCardWrapper = styled(AppCard)<{ $status?: string }>`
  padding: 0.625rem 1rem !important;
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out forwards;

  display: flex !important;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: auto !important;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${({ theme, $status }) =>
      $status === 'running' ? `linear-gradient(180deg, ${theme.color.primary}, ${theme.color.accent})` :
      $status === 'error' ? theme.color.muted :
      $status === 'success' ? theme.color.primary : 'transparent'};
    transition: background 0.3s ease;
  }

  @media (max-width: 800px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const AgentName = styled.h3`
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
`;

const AgentDesc = styled.p`
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;

  @media (max-width: 1000px) {
    max-width: 250px;
  }
`;

const StatusIndicator = styled.div<{ $status: string }>`
  --pulse-color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: ${({ theme, $status }) =>
    $status === 'running' ? `color-mix(in srgb, ${theme.color.accent} 10%, transparent)` :
    $status === 'error' ? `color-mix(in srgb, ${theme.color.muted} 10%, transparent)` :
    $status === 'success' ? `color-mix(in srgb, ${theme.color.primary} 10%, transparent)` : `color-mix(in srgb, ${theme.color.mutedForeground} 10%, transparent)`};
  color: ${({ theme, $status }) =>
    $status === 'running' ? theme.color.accent :
    $status === 'error' ? theme.color.muted :
    $status === 'success' ? theme.color.primary : theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${({ $status }) => $status === 'running' && `animation: ${pulseGlow} 2s infinite;`}
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const InfoLabel = styled.span`
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
`;

const InfoValue = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--foreground);
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;



const TerminalWindow = styled.div`
  padding: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.primary};
  height: 100%;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.color.background};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.muted};
    border-radius: 4px;
  }
`;

// --- Cron next-run utility ---

function getNextCronRun(cron: string): Date | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minute, hour, dom, month, dow] = parts

  const matchField = (field: string, val: number): boolean => {
    if (field === '*') return true
    if (field.startsWith('*/')) return val % Number(field.slice(2)) === 0
    return Number(field) === val
  }

  const next = new Date()
  next.setSeconds(0, 0)
  next.setMinutes(next.getMinutes() + 1)

  // Try up to 64,800 minutes (45 days — handles monthly crons)
  for (let i = 0; i < 64800; i++) {
    if (
      matchField(month, next.getMonth() + 1) &&
      matchField(dom,   next.getDate()) &&
      matchField(dow,   next.getDay()) &&
      matchField(hour,  next.getHours()) &&
      matchField(minute, next.getMinutes())
    ) return new Date(next)
    next.setMinutes(next.getMinutes() + 1)
  }
  return null
}

function NextRunCountdown({ cron }: { cron: string | null }) {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (!cron || cron === 'Manual') { setLabel('Manual'); return }

    const tick = () => {
      const next = getNextCronRun(cron)
      if (!next) { setLabel('—'); return }
      const diff = next.getTime() - Date.now()
      if (diff <= 0) { setLabel('now'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cron])

  return <InfoValue style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</InfoValue>
}

// --- Component ---

function AgentCard({ agent }: { agent: Agent }) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [triggering, setTriggering] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) => agentsApi.patch(agent.task_id, { is_active }),
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success(`${agent.name} ${is_active ? 'enabled' : 'paused'}`)
    },
    onError: () => toast.error('Failed to update agent'),
  })

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
    onSuccess: () => {
      setTriggering(true)
      toast.success(`${agent.name} triggered`)
      setTimeout(() => {
        setTriggering(false)
        queryClient.invalidateQueries({ queryKey: ['agents'] })
      }, 3000)
    },
    onError: () => toast.error(`Failed to trigger ${agent.name}`),
  })

  const status = agent.last_run_status || 'idle'

  return (
    <>
      <AgentCardWrapper $status={status} noPadding hoverable>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
          <Activity size={18} style={{ color: theme.color.primary, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <AgentName>{agent.name}</AgentName>
            {agent.description && <AgentDesc>{agent.description}</AgentDesc>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <StatusIndicator $status={status}>
            {status === 'running' ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> :
             status === 'success' ? <CheckCircle size={12} /> : 
             status === 'error' ? <XCircle size={12} /> : null}
            <span>{status}</span>
          </StatusIndicator>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <InfoItem>
              <InfoLabel><Calendar size={12} /> Schedule</InfoLabel>
              <InfoValue>{agent.cron_expression || 'Manual'}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel><Zap size={12} /> Last Run</InfoLabel>
              <InfoValue>{agent.last_run_at ? formatRelativeTime(agent.last_run_at) : 'Never'}</InfoValue>
            </InfoItem>
            {agent.cron_expression && agent.is_active && (
              <InfoItem>
                <InfoLabel><RefreshCw size={12} /> Next Run</InfoLabel>
                <NextRunCountdown cron={agent.cron_expression} />
              </InfoItem>
            )}
          </div>

          <ControlsGroup>
            <Tooltip content={agent.is_active ? "Pause Agent" : "Enable Agent"}>
              <Switch 
                aria-label={`Toggle ${agent.name}`}
                checked={agent.is_active} 
                onChange={(e) => toggleMutation.mutate(e.target.checked)}
                disabled={toggleMutation.isPending}
                size="sm"
                style={{ background: agent.is_active ? theme.color.primary : theme.color.muted }}
              />
            </Tooltip>
            
            <Button 
              variant="primary" 
              onClick={() => triggerMutation.mutate()}
              loading={triggerMutation.isPending}
              disabled={triggering}
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
               {triggering ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              Run
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setTerminalOpen(true)}
              size="sm"
              style={{ color: theme.color.mutedForeground, display: 'flex', alignItems: 'center' }}
            >
              <Terminal size={14} />
            </Button>
          </ControlsGroup>
        </div>
      </AgentCardWrapper>

      <Sheet
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} style={{ color: theme.color.primary }} />
            <span style={{ letterSpacing: '0.05em' }}>Live Terminal: {agent.name}</span>
          </div>
        }
        side="right"
        size="700px"
        onOpenChange={(open) => !open && setTerminalOpen(false)}
        open={terminalOpen}
      >
        <TerminalWindow>
          {agent.last_output_text ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{agent.last_output_text}</div>
          ) : (
            <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Waiting for output stream...</div>
          )}
        </TerminalWindow>
      </Sheet>
    </>
  )
}

export function AgentsPage() {
  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  return (
      <PageContainer>
        <SpinGlobal />
        <PageHeader title="Agents" description="Autonomous agents that manage your life OS." icon={Bot} category="AUTOMATION" />
        {isError ? (
          <ErrorCard message="Could not load agents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <AgentsGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <AgentSkeleton key={i} />
            ))}
          </AgentsGrid>
        ) : agents?.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No agents yet"
            description="Agents will appear here once seeded."
            action={{
              label: "Seed Agents",
              onClick: () => {
                toast.success('Agents pre-seeded! Syncing with workspace...')
                refetch()
              }
            }}
          />
        ) : (
          <AgentsGrid>
            {agents?.map(agent => (
              <AgentErrorBoundary key={agent.id}>
                <AgentCard agent={agent} />
              </AgentErrorBoundary>
            ))}
          </AgentsGrid>
        )}
      </PageContainer>
  )
}
