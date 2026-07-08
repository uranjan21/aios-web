import { agentsApi } from "@/api/agents";
import ReactMarkdown from "react-markdown";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageContent } from "@/components/layout/PageLayout";
import { PageDivider } from "@/components/layout/PageDivider";
import { DigitalCronInput } from "@/components/ui/DigitalCronInput";
import { formatRelativeTime } from "@/lib/utils";
import type { Agent } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Play,
  RefreshCw,
  Terminal,
  XCircle,
  Zap,
  Filter
} from "lucide-react";
import { Component, ErrorInfo, ReactNode, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

import { Button, PageHeader, Sheet, Switch, Tooltip, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@ledgr/ui";
import { AreaTabs } from "@/components/ui/AreaTabs";
import { AreaToolbar, ToolbarTitle } from "@/components/ui/AreaToolbar";
import styled, {
  createGlobalStyle,
  keyframes,
  useTheme,
} from "styled-components";

import { AgentsToolbar } from "@/features/agents/components/AgentsToolbar";
import { useAgentFilters } from "@/features/agents/hooks/useAgentFilters";
import { getAgentDomain } from "@/features/agents/constants/domains";


class AgentErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
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
        <div
          style={{
            padding: 16,
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            borderRadius: "10px",
            border:
              "1px solid color-mix(in srgb, var(--destructive) 20%, transparent)",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--destructive)",
            }}
          >
            Agent card error
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            {this.state.error?.toString()}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Styled Components ---

const SpinGlobal = createGlobalStyle`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulse-color) 40%, transparent); }
  70% { box-shadow: 0 0 15px 10px color-mix(in srgb, var(--pulse-color) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--pulse-color) 0%, transparent); }
`;


const AgentSkeleton = styled(Skeleton)`
  height: 64px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.color?.muted || "var(--muted)"};
`;

// --- Styled Components ---

const AgentsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TableShell = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.color.card};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: none;
  @media (min-width: 900px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px 110px 110px minmax(180px, auto);
    gap: 16px;
    padding: 10px 16px;
    background: transparent;
    border-bottom: 2px solid ${({ theme }) => theme.color.border};
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`;

const DomainHeaderRow = styled.div<{ $isFirst: boolean, $isExpanded: boolean }>`
  padding: 12px 16px;
  background: color-mix(in srgb, var(--primary) 3%, transparent);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--foreground);
  border-bottom: ${({ $isExpanded }) => ($isExpanded ? '1px solid var(--border)' : 'none')};
  border-top: ${({ $isFirst }) => ($isFirst ? 'none' : '1px solid var(--border)')};
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--primary) 6%, transparent);
  }
`;


const TableHeaderCell = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AgentRow = styled.div<{ $status?: string }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  animation: ${fadeIn} 0.45s ease-out forwards;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: ${({ theme, $status }) =>
      $status === "running"
        ? `linear-gradient(180deg, ${theme.color.primary}, ${theme.color.accent})`
        : $status === "error"
          ? theme.color.destructive
          : $status === "success"
            ? theme.color.success
            : "transparent"};
  }

  &:last-child {
    border-bottom: none;
  }

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) 240px 110px 110px minmax(180px, auto);
    gap: 16px;
    align-items: center;
    padding: 6px 16px;
  }
`;

const AgentMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const AgentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const AgentName = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`;

const AgentDesc = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

const StatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $status }) =>
    $status === "running"
      ? `color-mix(in srgb, ${theme.color.accent} 12%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.destructive} 10%, transparent)`
        : $status === "success"
          ? `color-mix(in srgb, ${theme.color.success} 10%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 10%, transparent)`};
  color: ${({ theme, $status }) =>
    $status === "running"
      ? theme.color.accent
      : $status === "error"
        ? theme.color.destructive
        : $status === "success"
          ? theme.color.success
          : theme.color.mutedForeground};
  text-transform: capitalize;
`;

const MetaCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MetaLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};

  @media (min-width: 900px) {
    display: none;
  }
`;

const MetaValue = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (min-width: 900px) {
    justify-content: flex-end;
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
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $status }) =>
    $status === "running"
      ? `color-mix(in srgb, ${theme.color.accent} 10%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.muted} 10%, transparent)`
        : $status === "success"
          ? `color-mix(in srgb, ${theme.color.primary} 10%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 10%, transparent)`};
  color: ${({ theme, $status }) =>
    $status === "running"
      ? theme.color.accent
      : $status === "error"
        ? theme.color.muted
        : $status === "success"
          ? theme.color.primary
          : theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${({ $status }) =>
    $status === "running" && `animation: ${pulseGlow} 2s infinite;`}
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
  font-size: 12px;
  font-weight: 500;
  color: var(--foreground);
`;

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TerminalContainer = styled.div`
  background: #0F172A;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1E293B;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TerminalHeaderBar = styled.div`
  background: #1E293B;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #334155;
`;

const MacDots = styled.div`
  display: flex;
  gap: 6px;
  
  & > div {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  & > div:nth-child(1) { background: #FF5F56; }
  & > div:nth-child(2) { background: #FFBD2E; }
  & > div:nth-child(3) { background: #27C93F; }
`;

const TerminalTitle = styled.div`
  flex: 1;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: #94A3B8;
  font-family: ${({ theme }) => theme.typography?.fontFamily?.sans || 'sans-serif'};
  letter-spacing: 0.05em;
  margin-right: 42px; /* Offset to center title visually */
`;

const TerminalBody = styled.div`
  padding: 24px 32px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 4px;
  }
`;

const TerminalMarkdownContainer = styled.div`
  color: #E2E8F0;
  font-family: ${({ theme }) => theme.typography?.fontFamily?.sans || 'sans-serif'};
  font-size: 14px;
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    color: #38BDF8;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.3;
  }
  
  h1:first-child, h2:first-child, h3:first-child {
    margin-top: 0;
  }

  p {
    margin-bottom: 1em;
  }

  ul, ol {
    margin-bottom: 1em;
    padding-left: 1.5em;
  }

  li {
    margin-bottom: 0.5em;
  }

  strong {
    color: #FFFFFF;
    font-weight: 600;
  }

  code {
    background: #1E293B;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    color: #22C55E;
  }

  pre {
    background: #0F172A;
    padding: 1em;
    border-radius: 6px;
    border: 1px solid #1E293B;
    overflow-x: auto;
    margin-bottom: 1em;
    code {
      background: transparent;
      padding: 0;
      color: #E2E8F0;
    }
  }

  blockquote {
    border-left: 4px solid #334155;
    padding-left: 1em;
    color: #94A3B8;
    margin-left: 0;
    margin-bottom: 1em;
  }
`;

const TerminalCursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 14px;
  background-color: #22C55E;
  vertical-align: middle;
  margin-left: 2px;
  animation: blink 1s step-end infinite;

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

const SortSelect = styled.select`
  appearance: none;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 6px 32px 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23777%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 8px auto;

  &:hover, &:focus {
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

// --- Cron next-run utility ---

function getNextCronRun(cron: string): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dom, month, dow] = parts;

  const matchField = (field: string, val: number): boolean => {
    if (field === "*") return true;
    if (field.startsWith("*/")) return val % Number(field.slice(2)) === 0;
    return Number(field) === val;
  };

  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Try up to 64,800 minutes (45 days — handles monthly crons)
  for (let i = 0; i < 64800; i++) {
    if (
      matchField(month, next.getMonth() + 1) &&
      matchField(dom, next.getDate()) &&
      matchField(dow, next.getDay()) &&
      matchField(hour, next.getHours()) &&
      matchField(minute, next.getMinutes())
    )
      return new Date(next);
    next.setMinutes(next.getMinutes() + 1);
  }
  return null;
}

function NextRunCountdown({ cron }: { cron: string | null }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    if (!cron || cron === "Manual") {
      setLabel("Manual");
      return;
    }

    const tick = () => {
      const next = getNextCronRun(cron);
      if (!next) {
        setLabel("—");
        return;
      }
      const diff = next.getTime() - Date.now();
      if (diff <= 0) {
        setLabel("now");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cron]);

  return (
    <InfoValue style={{ fontVariantNumeric: "tabular-nums" }}>
      {label}
    </InfoValue>
  );
}

// --- Component ---

function AgentCard({ agent }: { agent: Agent }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      agentsApi.patch(agent.task_id, { is_active }),
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent.name} ${is_active ? "enabled" : "paused"}`);
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const cronMutation = useMutation({
    mutationFn: (cron_expression: string) =>
      agentsApi.patch(agent.task_id, { cron_expression }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent.name} schedule updated`);
    },
    onError: () => toast.error("Failed to update schedule"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
    onSuccess: () => {
      setTriggering(true);
      toast.success(`${agent.name} triggered`);
      setTimeout(() => {
        setTriggering(false);
        queryClient.invalidateQueries({ queryKey: ["agents"] });
      }, 3000);
    },
    onError: () => toast.error(`Failed to trigger ${agent.name}`),
  });

  const status = agent.last_run_status || "idle";

  return (
    <>
      <AgentRow $status={status}>
        <AgentMain>
          <AgentHeader>
            <Tooltip content={agent.is_active ? "Pause Agent" : "Enable Agent"}>
              <Switch
                aria-label={`Toggle ${agent.name}`}
                checked={agent.is_active}
                onChange={(e) => toggleMutation.mutate(e.target.checked)}
                disabled={toggleMutation.isPending}
                size="sm"
                style={{
                  background: agent.is_active
                    ? theme.color.primary
                    : theme.color.muted,
                  marginRight: '6px'
                }}
              />
            </Tooltip>
            <AgentName>{agent.name}</AgentName>
            <StatusPill $status={status}>
              {status === "running" ? (
                <RefreshCw
                  size={12}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : status === "success" ? (
                <CheckCircle size={12} />
              ) : status === "error" ? (
                <XCircle size={12} />
              ) : null}
              <span>{status}</span>
            </StatusPill>
          </AgentHeader>
          <AgentDesc>
            {agent.description || "Scheduled automation agent"}
          </AgentDesc>
        </AgentMain>

        <MetaCell>
          <MetaLabel>
            <Calendar size={12} /> Schedule
          </MetaLabel>
          {agent.cron_expression && agent.cron_expression !== "Manual" ? (
            <DigitalCronInput
              value={agent.cron_expression}
              onChange={(newCron) => cronMutation.mutate(newCron)}
            />
          ) : (
            <MetaValue>{agent.cron_expression || "Manual"}</MetaValue>
          )}
        </MetaCell>

        <MetaCell>
          <MetaLabel>
            <Clock3 size={12} /> Last Run
          </MetaLabel>
          <MetaValue>
            {agent.last_run_at
              ? formatRelativeTime(agent.last_run_at)
              : "Never"}
          </MetaValue>
        </MetaCell>

        <MetaCell>
          <MetaLabel>
            <RefreshCw size={12} /> Next
          </MetaLabel>
          {agent.cron_expression && agent.is_active ? (
            <NextRunCountdown cron={agent.cron_expression} />
          ) : (
            <MetaValue>—</MetaValue>
          )}
        </MetaCell>

        <ActionsCell>
          <ControlsGroup>
            <Button
              variant="primary"
              onClick={() => triggerMutation.mutate()}
              loading={triggerMutation.isPending}
              disabled={triggering}
              size="sm"
              aria-label={`Run ${agent.name}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
              }}
            >
              {triggering ? (
                <RefreshCw
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Play size={14} />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setTerminalOpen(true)}
              size="sm"
              aria-label={`View terminal logs for ${agent.name}`}
              style={{
                color: theme.color.mutedForeground,
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
              }}
            >
              <Terminal size={14} />
            </Button>
          </ControlsGroup>
        </ActionsCell>
      </AgentRow>

      <Sheet
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Terminal size={20} style={{ color: theme.color.primary }} />
            <span style={{ letterSpacing: "0.05em" }}>
              Live Terminal
            </span>
          </div>
        }
        side="right"
        size="800px"
        onOpenChange={(open) => !open && setTerminalOpen(false)}
        open={terminalOpen}
      >
        <div style={{ height: "calc(100vh - 120px)", padding: "16px 0" }}>
          <TerminalContainer>
            <TerminalHeaderBar>
              <MacDots>
                <div />
                <div />
                <div />
              </MacDots>
              <TerminalTitle>bash - {agent.name.toLowerCase().replace(/\s+/g, '-')}</TerminalTitle>
            </TerminalHeaderBar>
            <TerminalBody>
              {agent.last_output_text ? (
                <div style={{ position: "relative" }}>
                  <TerminalMarkdownContainer>
                    <ReactMarkdown>{agent.last_output_text}</ReactMarkdown>
                  </TerminalMarkdownContainer>
                  {status === "running" && <TerminalCursor />}
                </div>
              ) : (
                <div style={{ opacity: 0.5, fontStyle: "italic", color: "#94A3B8" }}>
                  Waiting for output stream...
                  <TerminalCursor />
                </div>
              )}
            </TerminalBody>
          </TerminalContainer>
        </div>
      </Sheet>
    </>
  );
}

export function AgentsPage() {
  const {
    data: agents,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  return (
    <PageContainer>
      <PageContent>
      <SpinGlobal />
      <PageHeader
        title="Agents"
        subtitle="Autonomous agents that manage your life OS."
        icon={<Bot />}
        eyebrow="Automation"
      />
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
              toast.success("Agents pre-seeded! Syncing with workspace...");
              refetch();
            },
          }}
        />
      ) : (
        <AgentsContent agents={agents ?? []} />
      )}
      </PageContent>
    </PageContainer>
  );
}

function DomainSection({ domain, agents, index }: { domain: string, agents: Agent[], index: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasError = agents.some((a) => a.last_run_status === "error");
  
  return (
    <div key={domain}>
      <DomainHeaderRow 
        $isFirst={index === 0} 
        $isExpanded={isExpanded} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div style={{ width: '6px', height: '14px', background: 'var(--primary)', borderRadius: '3px' }} />
        <span style={{ flex: 1 }}>{domain}</span>
        {!isExpanded && hasError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--destructive)' }}>
            <XCircle size={14} />
            <span style={{ fontSize: '10px' }}>Errors inside</span>
          </div>
        )}
      </DomainHeaderRow>
      {isExpanded && agents.map((agent) => (
        <AgentErrorBoundary key={agent.id}>
          <AgentCard agent={agent} />
        </AgentErrorBoundary>
      ))}
    </div>
  );
}

function AgentsContent({ agents }: { agents: Agent[] }) {
  const { tab, search, domain, schedule, status, sort, setFilter } = useAgentFilters();

  const processedAgents = useMemo(() => {
    let filtered = agents;
    if (tab === "active") filtered = filtered.filter((a) => a.is_active);
    if (tab === "paused") filtered = filtered.filter((a) => !a.is_active);
    if (tab === "error") filtered = filtered.filter((a) => a.last_run_status === "error");

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a) => 
        a.name.toLowerCase().includes(q) || 
        (a.description && a.description.toLowerCase().includes(q))
      );
    }

    if (domain !== "all") {
      filtered = filtered.filter((a) => getAgentDomain(a.task_id) === domain);
    }

    if (schedule !== "all") {
      if (schedule === "manual") {
        filtered = filtered.filter((a) => !a.cron_expression || a.cron_expression === "Manual");
      } else if (schedule === "daily") {
        filtered = filtered.filter((a) => a.cron_expression && a.cron_expression !== "Manual" && a.cron_expression.split(" ")[4] === "*");
      } else if (schedule === "weekly") {
        filtered = filtered.filter((a) => a.cron_expression && a.cron_expression !== "Manual" && a.cron_expression.split(" ")[4] !== "*");
      }
    }

    if (status !== "all") {
      filtered = filtered.filter((a) => (a.last_run_status || "idle") === status);
    }

    return filtered.sort((a, b) => {
      if (sort === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sort === "schedule") {
        if (!a.cron_expression || a.cron_expression === "Manual") return 1;
        if (!b.cron_expression || b.cron_expression === "Manual") return -1;
        const nextA = getNextCronRun(a.cron_expression)?.getTime() || Infinity;
        const nextB = getNextCronRun(b.cron_expression)?.getTime() || Infinity;
        return nextA - nextB;
      }
      if (sort === "last_run") {
        const timeA = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
        const timeB = b.last_run_at ? new Date(b.last_run_at).getTime() : 0;
        return timeB - timeA; 
      }
      return 0;
    });
  }, [agents, tab, search, domain, schedule, status, sort]);

  const agentsByDomain = useMemo(() => {
    const grouped: Record<string, Agent[]> = {};
    for (const agent of processedAgents) {
      const d = getAgentDomain(agent.task_id);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(agent);
    }
    return grouped;
  }, [processedAgents]);

  const tableRender = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <AgentsToolbar />
      <Card>
        <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <CardTitle>Agents Roster</CardTitle>
            <CardDescription>All scheduled and manual agents categorized by domain.</CardDescription>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Sort by:</span>
            <SortSelect value={sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="name">Name</option>
              <option value="schedule">Next Run Time</option>
              <option value="last_run">Last Run Time</option>
            </SortSelect>
          </div>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
        <AgentsGrid>
          {processedAgents.length === 0 ? (
            <div style={{ padding: '32px' }}>
              <EmptyState
                icon={Filter}
                title="No agents match this filter"
                description="Try changing your tab or search criteria."
              />
            </div>
          ) : (
            <TableShell style={{ border: 'none', borderRadius: 0 }}>
              <TableHeader>
                <TableHeaderCell>Agent</TableHeaderCell>
                <TableHeaderCell>
                  <Calendar size={12} /> Schedule
                </TableHeaderCell>
                <TableHeaderCell>
                  <Clock3 size={12} /> Last run
                </TableHeaderCell>
                <TableHeaderCell>
                  <RefreshCw size={12} /> Next run
                </TableHeaderCell>
                <TableHeaderCell style={{ justifyContent: 'flex-end' }}>
                  <Zap size={12} /> Actions
                </TableHeaderCell>
              </TableHeader>
              {Object.entries(agentsByDomain).sort(([a], [b]) => a.localeCompare(b)).map(([domain, domainAgents], index) => (
                <DomainSection key={domain} domain={domain} agents={domainAgents} index={index} />
              ))}
            </TableShell>
          )}
        </AgentsGrid>
      </CardContent>
    </Card>
    </div>
  );

  const tabs = [
    { key: "all", label: `All (${agents.length})`, children: tableRender },
    { key: "active", label: `Active (${agents.filter((a) => a.is_active).length})`, children: tableRender },
    { key: "paused", label: `Paused (${agents.filter((a) => !a.is_active).length})`, children: tableRender },
    { key: "error", label: `Needs Attention (${agents.filter((a) => a.last_run_status === "error").length})`, children: tableRender },
  ];

  return (
    <AreaTabs
      activeKey={tab}
      onChange={(key) => setFilter("tab", key)}
      items={tabs}
    />
  );
}
