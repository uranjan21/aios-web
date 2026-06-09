import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, Component, ErrorInfo, ReactNode } from 'react'
import { toast } from 'sonner'
import { Play, RefreshCw, CheckCircle, XCircle, Zap, Terminal, Activity, Calendar } from 'lucide-react'
import { agentsApi } from '@/api/agents'
import { formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import type { Agent } from '@/types'

import styled, { keyframes } from 'styled-components'
import { Switch, Button, Drawer, Tooltip, ConfigProvider, theme } from 'antd'

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
        <div style={{ padding: 20, background: 'rgba(255,0,0,0.1)', color: 'white', borderRadius: 8 }}>
          <h3>Card Crashed!</h3>
          <p style={{ fontFamily: 'monospace' }}>{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Styled Components ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 15px 10px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
`;

const PageContainer = styled.div`
  padding: 1.25rem;
  max-width: 1400px;
  margin: 0 auto;
  color: hsl(var(--foreground));
  min-height: calc(100vh - 64px);
`;

// Removed page headers as per global UI rules

const AgentsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CardContainer = styled.div<{ $status?: string }>`
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 0.6);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out forwards;
  
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: auto;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${({ $status }) => 
      $status === 'running' ? 'linear-gradient(180deg, #3b82f6, #8b5cf6)' :
      $status === 'error' ? 'hsl(var(--destructive))' :
      $status === 'success' ? '#10b981' : 'transparent'};
    transition: background 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: hsl(var(--border));
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 800px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const AgentName = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
`;

const AgentDesc = styled.p`
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
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
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background: ${({ $status }) => 
    $status === 'running' ? 'rgba(59, 130, 246, 0.1)' :
    $status === 'error' ? 'rgba(239, 68, 68, 0.1)' :
    $status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)'};
  color: ${({ $status }) => 
    $status === 'running' ? '#3b82f6' :
    $status === 'error' ? '#ef4444' :
    $status === 'success' ? '#10b981' : 'hsl(var(--muted-foreground))'};
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
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
`;

const InfoValue = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(var(--foreground));
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StyledTerminalDrawer = styled(Drawer)`
  .ant-drawer-content {
    background: #09090b !important;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }
  .ant-drawer-header {
    background: #0f172a !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    .ant-drawer-title {
      color: #f8fafc !important;
      font-weight: 600;
    }
    .ant-drawer-close {
      color: #94a3b8 !important;
      &:hover { color: #fff !important; }
    }
  }
  .ant-drawer-body {
    padding: 0;
    background: #000;
  }
`;

const TerminalWindow = styled.div`
  padding: 1.5rem;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #a7f3d0;
  height: 100%;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #000;
  }
  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 4px;
  }
`;

// --- Component ---

function AgentCard({ agent }: { agent: Agent }) {
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
      <CardContainer $status={status}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
          <Activity size={18} className="text-indigo-400 flex-shrink-0" />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <AgentName>{agent.name}</AgentName>
            {agent.description && <AgentDesc>{agent.description}</AgentDesc>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <StatusIndicator $status={status}>
            {status === 'running' ? <RefreshCw size={12} className="animate-spin" /> : 
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
          </div>

          <ControlsGroup>
            <Tooltip title={agent.is_active ? "Pause Agent" : "Enable Agent"}>
              <Switch 
                checked={agent.is_active} 
                onChange={(checked) => toggleMutation.mutate(checked)}
                loading={toggleMutation.isPending}
                size="small"
                style={{ background: agent.is_active ? '#10b981' : 'rgba(255,255,255,0.1)' }}
              />
            </Tooltip>
            
            <Button 
              type="primary" 
              shape="round" 
              icon={triggering ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              onClick={() => triggerMutation.mutate()}
              loading={triggerMutation.isPending}
              disabled={triggering}
              size="small"
              style={{ background: '#4f46e5', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              Run
            </Button>
            
            <Button 
              type="text" 
              icon={<Terminal size={14} />}
              onClick={() => setTerminalOpen(true)}
              size="small"
              style={{ color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center' }}
              className="hover:text-foreground transition-colors"
            />
          </ControlsGroup>
        </div>
      </CardContainer>

      <StyledTerminalDrawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} className="text-indigo-400" />
            <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>Live Terminal: {agent.name}</span>
          </div>
        }
        placement="right"
        width={700}
        onClose={() => setTerminalOpen(false)}
        open={terminalOpen}
      >
        <TerminalWindow>
          {agent.last_output_text ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{agent.last_output_text}</div>
          ) : (
            <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Waiting for output stream...</div>
          )}
        </TerminalWindow>
      </StyledTerminalDrawer>
    </>
  )
}

export function AgentsPage() {
  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', fontFamily: 'inherit', colorBgContainer: 'hsl(var(--card))', colorText: 'hsl(var(--foreground))' } }}>
      <PageContainer>
        {isError ? (
          <ErrorCard message="Could not load agents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <AgentsGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[64px] rounded-xl bg-muted" />
            ))}
          </AgentsGrid>
        ) : agents?.length === 0 ? (
          <EmptyState icon={Zap} title="No agents yet" description="Agents will appear here once seeded." />
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
    </ConfigProvider>
  )
}
