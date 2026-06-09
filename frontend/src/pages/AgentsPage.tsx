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
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'
import highchartsMore from 'highcharts/highcharts-more'

if (typeof Highcharts === 'object' && !(Highcharts as any).seriesTypes.areaspline) {
  // Prevent duplicate initialization crashes during Fast Refresh
  try {
    ;(highchartsMore as any)(Highcharts)
  } catch(e) {}
}

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
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  color: #fff;
  min-height: calc(100vh - 64px);
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 1.125rem;
  margin-top: 0.5rem;
`;

const AgentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
`;

const CardContainer = styled.div<{ $status?: string }>`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.75rem;
  backdrop-filter: blur(12px);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out forwards;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $status }) => 
      $status === 'running' ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' :
      $status === 'error' ? '#ef4444' :
      $status === 'success' ? '#10b981' : 'transparent'};
    transition: background 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.2),
                inset 0 0 30px -15px rgba(99, 102, 241, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
`;

const AgentName = styled.h3`
  font-size: 1.35rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 0.35rem 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  letter-spacing: -0.01em;
`;

const AgentDesc = styled.p`
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
`;

const StatusIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: ${({ $status }) => 
    $status === 'running' ? 'rgba(59, 130, 246, 0.15)' :
    $status === 'error' ? 'rgba(239, 68, 68, 0.15)' :
    $status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)'};
  color: ${({ $status }) => 
    $status === 'running' ? '#60a5fa' :
    $status === 'error' ? '#f87171' :
    $status === 'success' ? '#34d399' : '#94a3b8'};
  border: 1px solid currentColor;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${({ $status }) => $status === 'running' && `animation: ${pulseGlow} 2s infinite;`}
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.02);
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const InfoLabel = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
`;

const InfoValue = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const ChartContainer = styled.div`
  height: 65px;
  margin: 1.5rem 0 0 0;
  opacity: 0.85;
  transition: opacity 0.3s;
  &:hover { opacity: 1; }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
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

// --- Helpers ---

function generateSparklineData() {
  const data = [];
  let val = 50;
  for(let i=0; i<24; i++) {
    val += Math.random() * 24 - 12;
    data.push(Math.max(10, Math.min(100, val)));
  }
  return data;
}

const sparklineOptions: Highcharts.Options = {
  chart: {
    type: 'areaspline',
    backgroundColor: 'transparent',
    margin: [0, 0, 0, 0],
    height: 65,
    style: { overflow: 'visible' }
  },
  title: { text: '' },
  credits: { enabled: false },
  xAxis: { visible: false, minPadding: 0, maxPadding: 0 },
  yAxis: { visible: false, minPadding: 0, maxPadding: 0 },
  legend: { enabled: false },
  tooltip: { enabled: false },
  plotOptions: {
    areaspline: {
      animation: false,
      lineWidth: 2.5,
      marker: { enabled: false },
      states: { hover: { lineWidth: 2.5 } },
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(99, 102, 241, 0.4)'],
          [1, 'rgba(99, 102, 241, 0)']
        ]
      }
    }
  },
  series: [{
    type: 'areaspline',
    data: [],
    color: '#818cf8'
  }]
};

// --- Component ---

function AgentCard({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient()
  const [triggering, setTriggering] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [chartData] = useState(() => generateSparklineData())

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
        <CardHeader>
          <div>
            <AgentName>
              <Activity size={20} className="text-indigo-400" />
              {agent.name}
            </AgentName>
            {agent.description && <AgentDesc>{agent.description}</AgentDesc>}
          </div>
          <StatusIndicator $status={status}>
            {status === 'running' ? <RefreshCw size={14} className="animate-spin" /> : 
             status === 'success' ? <CheckCircle size={14} /> : 
             status === 'error' ? <XCircle size={14} /> : null}
            <span>{status}</span>
          </StatusIndicator>
        </CardHeader>

        <InfoGrid>
          <InfoItem>
            <InfoLabel><Calendar size={14} /> Schedule</InfoLabel>
            <InfoValue>{agent.cron_expression || 'Manual'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel><Zap size={14} /> Last Run</InfoLabel>
            <InfoValue>{agent.last_run_at ? formatRelativeTime(agent.last_run_at) : 'Never'}</InfoValue>
          </InfoItem>
        </InfoGrid>

        <ChartContainer>
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              ...sparklineOptions,
              series: [{
                ...((sparklineOptions.series as any[])?.[0] || {}),
                type: 'areaspline',
                data: chartData,
                color: '#818cf8'
              }]
            }}
          />
        </ChartContainer>

        <CardActions>
          <ControlsGroup>
            <Tooltip title={agent.is_active ? "Pause Agent" : "Enable Agent"}>
              <Switch 
                checked={agent.is_active} 
                onChange={(checked) => toggleMutation.mutate(checked)}
                loading={toggleMutation.isPending}
                style={{ background: agent.is_active ? '#10b981' : 'rgba(255,255,255,0.1)' }}
              />
            </Tooltip>
            
            <Button 
              type="primary" 
              shape="round" 
              icon={triggering ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              onClick={() => triggerMutation.mutate()}
              loading={triggerMutation.isPending}
              disabled={triggering}
              size="large"
              style={{ background: '#4f46e5', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              Run Now
            </Button>
          </ControlsGroup>

          <Button 
            type="text" 
            icon={<Terminal size={18} />}
            onClick={() => setTerminalOpen(true)}
            size="large"
            style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', fontWeight: 500 }}
            className="hover:text-white transition-colors"
          >
            Output
          </Button>
        </CardActions>
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
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#4f46e5', fontFamily: 'inherit' } }}>
      <PageContainer>
        <HeaderContainer>
          <div>
            <Title>Autonomous Agents</Title>
            <Subtitle>Monitor and control active swarms and workflows</Subtitle>
          </div>
        </HeaderContainer>

        {isError ? (
          <ErrorCard message="Could not load agents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <AgentsGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-2xl bg-slate-800/50" />
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
