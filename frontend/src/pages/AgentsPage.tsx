import { agentsApi } from "@/api/agents";
import { EmptyState } from "@ledgr/ui";
import { ErrorState } from "@ledgr/ui";
import { PageContainer, PageContent } from "@/components/layout/PageLayout";
import { DigitalCronInput } from "@/components/ui/DigitalCronInput";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentsToolbar, AgentsFilters } from "@/features/agents/components/AgentsToolbar";
import { getAgentDomain, getAgentLongDescription } from "@/features/agents/constants/domains";
import { useAgentFilters } from "@/features/agents/hooks/useAgentFilters";
import { formatScheduleLabel, getNextCronRun, getScheduleSortValue } from "@/features/agents/lib/cron";
import { formatRelativeTime } from "@/lib/utils";
import type { Agent } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle,
  Clock3,
  Play,
  RefreshCw,
  Sparkles,
  TerminalSquare,
  XCircle,
  Zap,
  Filter,
  Info,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import styled, { createGlobalStyle, keyframes, useTheme } from "styled-components";
import ReactMarkdown from "react-markdown";

import {
  Button,
  Card,
  Dialog,
  PageHeader,
  Switch,
  Tooltip,
  Select,
  Input,
} from "@ledgr/ui";
import { AreaTabs } from "@/components/ui/AreaTabs";

const SpinGlobal = createGlobalStyle`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const AgentSkeleton = styled(Skeleton)`
  height: 88px;
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const RosterCard = styled(Card)`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 12px;
  box-shadow: none;

  h2 {
    font-size: 17px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.foreground};
  }
  
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.mutedForeground};
    margin-top: 4px;
  }
`;

const TableShell = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
`;

const TableHeader = styled.div`
  display: none;

  @media (min-width: 980px) {
    display: grid;
    grid-template-columns: minmax(0, 2fr) 95px 140px 110px 110px 110px;
    gap: 12px;
    padding: 12px 16px;
    background: ${({ theme }) => theme.color.muted};
    border-radius: 8px 8px 0 0;
    margin: 12px 20px 0 20px;
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const FooterSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const FooterLabel = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
`;

const FooterValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`;

const TableHeaderCell = styled.div<{ $alignRight?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
  user-select: none;

  svg {
    color: ${({ theme }) => theme.color.foreground};
    opacity: 0.4;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  &:hover svg {
    opacity: 0.8;
    transform: scale(1.05);
  }
  
  @media (min-width: 980px) {
    ${({ $alignRight }) => $alignRight && `
      justify-content: flex-end;
    `}
  }
`;

const RowButton = styled.button<{ $status: string }>`
  width: auto;
  border: none;
  background: transparent;
  padding: 14px 16px;
  margin: 0 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  text-align: left;
  position: relative;
  cursor: pointer;
  animation: ${fadeIn} 0.35s ease-out forwards;
  transition: all 0.2s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 12px auto 12px 0;
    width: 3px;
    border-radius: 0 4px 4px 0;
    background: ${({ theme, $status }) =>
      $status === "running" ? theme.color.accent : "transparent"};
  }

  &:hover {
    background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 2%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, ${({ theme }) => theme.color.border} 40%, transparent);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: -2px;
  }

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 2fr) 95px 140px 110px 110px 110px;
    gap: 12px;
    align-items: center;
  }
`;

const RowDivider = styled.div`
  height: 1px;
  background: color-mix(in srgb, ${({ theme }) => theme.color.border} 30%, transparent);
  margin: 0 20px;
`;

const AgentCell = styled.div`
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

const AgentText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const AgentTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const AgentName = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const AgentSummary = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $status }) =>
    $status === "success"
      ? `color-mix(in srgb, ${theme.color.success} 20%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.destructive} 20%, transparent)`
        : $status === "running"
          ? `color-mix(in srgb, ${theme.color.accent} 20%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 15%, transparent)`};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $status }) =>
    $status === "success"
      ? `color-mix(in srgb, ${theme.color.success} 8%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.destructive} 8%, transparent)`
        : $status === "running"
          ? `color-mix(in srgb, ${theme.color.accent} 10%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 6%, transparent)`};
  color: ${({ theme, $status }) =>
    $status === "success"
      ? theme.color.success
      : $status === "error"
        ? theme.color.destructive
        : $status === "running"
          ? theme.color.accent
          : theme.color.mutedForeground};
  text-transform: capitalize;
`;

const Cell = styled.div<{ $alignRight?: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  @media (min-width: 980px) {
    ${({ $alignRight }) => $alignRight && `
      align-items: flex-end;
      text-align: right;
    `}
  }
`;

const MobileLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};

  @media (min-width: 980px) {
    display: none;
  }
`;

const Value = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const SubValue = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;

  @media (min-width: 980px) {
    justify-content: flex-end;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 980px) {
    grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.4fr);
  }
`;

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 2%, ${({ theme }) => theme.color.card});
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 16px 18px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const PanelTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.color.foreground};
`;

const PanelBody = styled.div`
  padding: 18px;
`;

const OutputBody = styled.div`
  color: #dbe4f0;
  font-size: 13px;
  line-height: 1.65;

  h1, h2, h3, h4, h5, h6 {
    color: #8fd3ff;
    margin-top: 0;
  }

  p, ul, ol, pre, blockquote {
    margin: 0 0 12px;
  }

  code {
    background: rgba(255,255,255,0.08);
    padding: 2px 6px;
    border-radius: 6px;
  }

  pre {
    overflow-x: auto;
    padding: 12px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.88);
  }
`;

const OutputShell = styled.div`
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid #223149;
  background: linear-gradient(180deg, #122033 0%, #0f172a 100%);
`;

const OutputHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #223149;
  color: #8ea0b8;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Dots = styled.div`
  display: flex;
  gap: 6px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
  }

  span:nth-child(1) { background: #ff5f56; }
  span:nth-child(2) { background: #ffbd2e; }
  span:nth-child(3) { background: #27c93f; }
`;

const MetaList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaKey = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const MetaText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const DialogActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const EmptyWrap = styled.div`
  padding: 32px;
`;

function NextRunCountdown({ cron, isActive }: { cron: string | null; isActive: boolean }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    if (!isActive) {
      setLabel("Paused");
      return;
    }
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
        setLabel("Now");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setLabel(hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cron, isActive]);

  return <Value style={{ fontVariantNumeric: "tabular-nums" }}>{label}</Value>;
}

function AgentDetailDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => agentsApi.patch(agent!.task_id, { is_active: isActive }),
    onSuccess: async (_, isActive) => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent?.name} ${isActive ? "enabled" : "paused"}`);
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const cronMutation = useMutation({
    mutationFn: (cronExpression: string) => agentsApi.patch(agent!.task_id, { cron_expression: cronExpression }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent?.name} schedule updated`);
    },
    onError: () => toast.error("Failed to update schedule"),
  });

  const configMutation = useMutation({
    mutationFn: (payload: { llm_provider?: string; openai_chat_model?: string; claude_model?: string }) =>
      agentsApi.patch(agent!.task_id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent?.name} AI configuration updated`);
    },
    onError: () => toast.error("Failed to update AI configuration"),
  });

  const [provider, setProvider] = useState(agent?.llm_provider || 'system');
  const [openaiModel, setOpenaiModel] = useState(agent?.openai_chat_model || '');
  const [claudeModel, setClaudeModel] = useState(agent?.claude_model || '');

  useEffect(() => {
    if (agent) {
      setProvider(agent.llm_provider || 'system');
      setOpenaiModel(agent.openai_chat_model || '');
      setClaudeModel(agent.claude_model || '');
    }
  }, [agent]);

  const isConfigDirty = provider !== (agent?.llm_provider || 'system') ||
    openaiModel !== (agent?.openai_chat_model || '') ||
    claudeModel !== (agent?.claude_model || '');

  const saveConfig = () => {
    configMutation.mutate({
      llm_provider: provider,
      openai_chat_model: openaiModel || undefined,
      claude_model: claudeModel || undefined,
    });
  };

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent!.task_id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent?.name} triggered`);
    },
    onError: () => toast.error(`Failed to trigger ${agent?.name}`),
  });

  if (!agent) return null;

  const status = agent.last_run_status || "idle";
  const domain = getAgentDomain(agent.task_id);
  const schedule = formatScheduleLabel(agent.cron_expression, agent.is_active);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      eyebrow="Agent Detail"
      icon={<Sparkles />}
      title={agent.name}
      description={agent.description || "Autonomous background workflow for your life OS."}
    >
      <DetailGrid>
        <Stack>
          <Panel>
            <PanelHeader>
              <PanelTitle>Configuration</PanelTitle>
            </PanelHeader>
            <PanelBody>
              <MetaList>
                <MetaItem>
                  <MetaKey>Domain</MetaKey>
                  <MetaText>{domain}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Status</MetaKey>
                  <MetaText>{status}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Cadence</MetaKey>
                  <MetaText>{schedule.title}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Next Window</MetaKey>
                  <MetaText>
                    <NextRunCountdown cron={agent.cron_expression} isActive={agent.is_active} />
                  </MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Last Run</MetaKey>
                  <MetaText>{agent.last_run_at ? formatRelativeTime(agent.last_run_at) : "Never"}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Total Runs</MetaKey>
                  <MetaText>{agent.run_count}</MetaText>
                </MetaItem>
              </MetaList>

              <DialogActions>
                <Tooltip content={agent.is_active ? "Pause agent" : "Enable agent"}>
                  <div>
                    <Switch
                      aria-label={`Toggle ${agent.name}`}
                      checked={agent.is_active}
                      onChange={(e) => toggleMutation.mutate(e.target.checked)}
                      disabled={toggleMutation.isPending}
                      size="sm"
                      style={{ background: agent.is_active ? theme.color.primary : theme.color.muted }}
                    />
                  </div>
                </Tooltip>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => triggerMutation.mutate()}
                  loading={triggerMutation.isPending}
                >
                  <Play size={14} style={{ marginRight: 6 }} />
                  Run now
                </Button>
              </DialogActions>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Schedule</PanelTitle>
            </PanelHeader>
            <PanelBody>
              {agent.cron_expression && agent.cron_expression !== "Manual" ? (
                <DigitalCronInput
                  value={agent.cron_expression}
                  onChange={(newCron) => cronMutation.mutate(newCron)}
                />
              ) : (
                <MetaText>Manual only</MetaText>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>AI Configuration</PanelTitle>
            </PanelHeader>
            <PanelBody style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <MetaKey style={{ display: 'block', marginBottom: '4px' }}>LLM Provider</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: 'System Default', value: 'system' },
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'Anthropic Claude', value: 'anthropic' },
                  ]}
                  value={provider}
                  onChange={(val) => setProvider(val as string)}
                />
              </div>

              <div>
                <MetaKey style={{ display: 'block', marginBottom: '4px' }}>OpenAI Chat Model</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: 'System Default', value: '' },
                    { label: 'GPT-4o', value: 'gpt-4o' },
                    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
                  ]}
                  value={openaiModel}
                  onChange={(val) => setOpenaiModel(val as string)}
                />
              </div>

              <div>
                <MetaKey style={{ display: 'block', marginBottom: '4px' }}>Claude Model</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: 'System Default', value: '' },
                    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
                    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
                    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
                    { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
                    { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
                  ]}
                  value={claudeModel}
                  onChange={(val) => setClaudeModel(val as string)}
                />
              </div>

              <div style={{ marginTop: '4px' }}>
                <Button size="sm" variant="primary" disabled={!isConfigDirty || configMutation.isPending} onClick={saveConfig}>
                  <Save size={12} style={{ marginRight: 6 }} />
                  Save overrides
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </Stack>

        <Panel>
          <PanelHeader>
            <PanelTitle>Latest Output</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <OutputShell>
              <OutputHeader>
                <Dots>
                  <span />
                  <span />
                  <span />
                </Dots>
                <span>{agent.name} last run</span>
              </OutputHeader>
              <div style={{ padding: 18 }}>
                {agent.last_output_text ? (
                  <OutputBody>
                    <ReactMarkdown>{agent.last_output_text}</ReactMarkdown>
                  </OutputBody>
                ) : (
                  <SubValue>No completed run yet. Trigger the agent to inspect the next result here.</SubValue>
                )}
              </div>
            </OutputShell>
          </PanelBody>
        </Panel>
      </DetailGrid>
    </Dialog>
  );
}

function AgentRow({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const [triggering, setTriggering] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => agentsApi.patch(agent.task_id, { is_active: isActive }),
    onSuccess: async (_, isActive) => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent.name} ${isActive ? "enabled" : "paused"}`);
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
    onSuccess: async () => {
      setTriggering(true);
      toast.success(`${agent.name} triggered`);
      setTimeout(() => setTriggering(false), 2500);
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: () => toast.error(`Failed to trigger ${agent.name}`),
  });

  const status = agent.last_run_status || "idle";
  const schedule = formatScheduleLabel(agent.cron_expression, agent.is_active);

  return (
    <>
      <RowButton $status={status} onClick={onOpen} aria-label={`Open details for ${agent.name}`}>
        <AgentCell>
          <AgentText>
            <AgentTop>
              <AgentName>{agent.name}</AgentName>
              <Tooltip content={<div style={{ whiteSpace: 'pre-wrap', maxWidth: 280, fontSize: 12, lineHeight: 1.5 }}>{getAgentLongDescription(agent.task_id, agent.description || "")}</div>}>
                <div style={{ color: theme.color.mutedForeground, display: "flex", cursor: "help" }}>
                  <Info size={14} />
                </div>
              </Tooltip>
            </AgentTop>
            <AgentSummary>
              {agent.description || "Scheduled automation agent."}
            </AgentSummary>
          </AgentText>
        </AgentCell>

        <Cell $alignRight>
          <MobileLabel>
            <Activity size={12} />
            Status
          </MobileLabel>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <StatusBadge $status={status}>
              {status === "success" ? (
                <CheckCircle size={12} />
              ) : status === "error" ? (
                <XCircle size={12} />
              ) : status === "running" ? (
                <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : null}
              {status}
            </StatusBadge>
          </div>
        </Cell>

        <Cell $alignRight>
          <MobileLabel>
            <Calendar size={12} />
            Schedule
          </MobileLabel>
          <Value>{schedule.title}</Value>
          <SubValue>{schedule.subtitle}</SubValue>
        </Cell>

        <Cell $alignRight>
          <MobileLabel>
            <Clock3 size={12} />
            Last Run
          </MobileLabel>
          <Value>{agent.last_run_at ? formatRelativeTime(agent.last_run_at) : "Never"}</Value>
        </Cell>

        <Cell $alignRight>
          <MobileLabel>
            <RefreshCw size={12} />
            Next Run
          </MobileLabel>
          <NextRunCountdown cron={agent.cron_expression} isActive={agent.is_active} />
        </Cell>

        <ActionsCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Tooltip content={agent.is_active ? "Pause agent" : "Enable agent"}>
            <div>
              <Switch
                aria-label={`Toggle ${agent.name}`}
                checked={agent.is_active}
                onChange={(e) => toggleMutation.mutate(e.target.checked)}
                disabled={toggleMutation.isPending}
                size="sm"
                style={{ background: agent.is_active ? theme.color.primary : theme.color.muted }}
              />
            </div>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Run ${agent.name}`}
            onClick={() => triggerMutation.mutate()}
            disabled={triggering}
            style={{ width: 32, height: 32, borderRadius: "50%" }}
          >
            {triggering ? (
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Play size={14} fill="currentColor" opacity={0.8} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open details for ${agent.name}`}
            onClick={onOpen}
            style={{ width: 32, height: 32, borderRadius: "50%" }}
          >
            <TerminalSquare size={14} opacity={0.8} />
          </Button>
        </ActionsCell>
      </RowButton>
      <RowDivider />
    </>
  );
}

function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => agentsApi.patch(agent.id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.id),
    onSuccess: () => {
      toast.success(`Triggered ${agent.name}`);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const status = agent.last_run_status || "idle";
  const triggering = triggerMutation.isPending || status === "running";
  const schedule = formatScheduleLabel(agent.cron_expression, agent.is_active);

  return (
    <Card
      interactive
      title={agent.name}
      subtitle={agent.description || "Scheduled automation agent."}
      onClick={onOpen}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column", height: "100%" }}
      action={
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={agent.is_active ? "Pause agent" : "Enable agent"}>
            <div>
              <Switch
                aria-label={`Toggle ${agent.name}`}
                checked={agent.is_active}
                onChange={(e) => toggleMutation.mutate(e.target.checked)}
                disabled={toggleMutation.isPending}
                size="sm"
              />
            </div>
          </Tooltip>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px", flex: 1 }}>
        <RowDivider style={{ margin: "0 -24px" }} />
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <StatusBadge $status={status}>
            {status === "success" ? (
              <CheckCircle size={12} />
            ) : status === "error" ? (
              <XCircle size={12} />
            ) : status === "running" ? (
              <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : null}
            {status}
          </StatusBadge>
          
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Run ${agent.name}`}
            onClick={(e) => { e.stopPropagation(); triggerMutation.mutate(); }}
            disabled={triggering}
            style={{ minWidth: 38, paddingInline: 10, height: 28 }}
          >
            {triggering ? (
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>
                <Play size={14} fill="currentColor" opacity={0.8} />
                <span style={{ marginLeft: 6, fontSize: 12 }}>Run</span>
              </>
            )}
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "auto" }}>
          <Cell>
            <MobileLabel style={{ display: "flex" }}>
              <Calendar size={12} />
              Schedule
            </MobileLabel>
            <Value>{schedule.title}</Value>
            <SubValue>{schedule.subtitle}</SubValue>
          </Cell>
          <Cell>
            <MobileLabel style={{ display: "flex" }}>
              <RefreshCw size={12} />
              Next Run
            </MobileLabel>
            <NextRunCountdown cron={agent.cron_expression} isActive={agent.is_active} />
          </Cell>
        </div>
      </div>
    </Card>
  );
}

function AgentsContent({ agents }: { agents: Agent[] }) {
  const { tab, search, domain, schedule, status, sort, view, setFilter } = useAgentFilters();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const processedAgents = useMemo(() => {
    let filtered = agents;

    if (tab === "active") filtered = filtered.filter((agent) => agent.is_active);
    if (tab === "paused") filtered = filtered.filter((agent) => !agent.is_active);
    if (tab === "error") filtered = filtered.filter((agent) => agent.last_run_status === "error");

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          (agent.description || "").toLowerCase().includes(query) ||
          (agent.last_output_text || "").toLowerCase().includes(query),
      );
    }

    if (domain !== "all") {
      filtered = filtered.filter((agent) => getAgentDomain(agent.task_id) === domain);
    }

    if (schedule !== "all") {
      if (schedule === "manual") {
        filtered = filtered.filter((agent) => !agent.cron_expression || agent.cron_expression === "Manual");
      } else if (schedule === "daily") {
        filtered = filtered.filter(
          (agent) => agent.cron_expression && agent.cron_expression !== "Manual" && agent.cron_expression.split(" ")[4] === "*",
        );
      } else if (schedule === "weekly") {
        filtered = filtered.filter(
          (agent) => agent.cron_expression && agent.cron_expression !== "Manual" && agent.cron_expression.split(" ")[4] !== "*",
        );
      }
    }

    if (status !== "all") {
      filtered = filtered.filter((agent) => (agent.last_run_status || "idle") === status);
    }

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "schedule") {
        const nextA = a.cron_expression && a.cron_expression !== "Manual" ? getNextCronRun(a.cron_expression)?.getTime() || Infinity : Infinity;
        const nextB = b.cron_expression && b.cron_expression !== "Manual" ? getNextCronRun(b.cron_expression)?.getTime() || Infinity : Infinity;
        return nextA - nextB;
      }
      if (sort === "time") {
        const nextA = a.cron_expression && a.cron_expression !== "Manual" ? getScheduleSortValue(a.cron_expression) : Infinity;
        const nextB = b.cron_expression && b.cron_expression !== "Manual" ? getScheduleSortValue(b.cron_expression) : Infinity;
        return nextA - nextB;
      }
      const timeA = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
      const timeB = b.last_run_at ? new Date(b.last_run_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [agents, domain, schedule, search, sort, status, tab]);

  const selectedAgent = processedAgents.find((agent) => agent.id === selectedAgentId) ?? agents.find((agent) => agent.id === selectedAgentId) ?? null;

  const tableRender = (
    <Stack>
      {view === "grid" && <AgentsToolbar />}

      {view === "grid" ? (
        processedAgents.length === 0 ? (
          <EmptyWrap>
            <EmptyState
              icon={<Filter size={24} />}
              title="No agents match this filter"
              description="Tighten or clear filters to see more of the roster."
            />
          </EmptyWrap>
        ) : (
          <AgentGrid>
            {processedAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onOpen={() => setSelectedAgentId(agent.id)} />
            ))}
          </AgentGrid>
        )
      ) : (
        <RosterCard
          noPadding
          title="Agents Roster"
          subtitle="One clean list. Scan fast, open details only when you need them."
          action={<AgentsFilters />}
        >
            {processedAgents.length === 0 ? (
              <EmptyWrap>
                <EmptyState
                  icon={<Filter size={24} />}
                  title="No agents match this filter"
                  description="Tighten or clear filters to see more of the roster."
                />
              </EmptyWrap>
            ) : (
              <TableShell>
                <TableHeader>
                  <TableHeaderCell>Agent</TableHeaderCell>
                  <TableHeaderCell $alignRight>
                    <Activity size={12} />
                    Status
                  </TableHeaderCell>
                  <TableHeaderCell $alignRight>
                    <Calendar size={12} />
                    Schedule
                  </TableHeaderCell>
                  <TableHeaderCell $alignRight>
                    <Clock3 size={12} />
                    Last run
                  </TableHeaderCell>
                  <TableHeaderCell $alignRight>
                    <RefreshCw size={12} />
                    Next run
                  </TableHeaderCell>
                  <TableHeaderCell $alignRight>
                    <Zap size={12} />
                    Actions
                  </TableHeaderCell>
                </TableHeader>
                {processedAgents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} onOpen={() => setSelectedAgentId(agent.id)} />
                ))}
              </TableShell>
            )}
            
            {processedAgents.length > 0 && (
              <FooterSection>
                <FooterLabel>Total Agents Matching Filters</FooterLabel>
                <FooterValue>{processedAgents.length}</FooterValue>
              </FooterSection>
            )}
        </RosterCard>
      )}

      <AgentDetailDialog
        agent={selectedAgent}
        open={Boolean(selectedAgent)}
        onOpenChange={(open) => {
          if (!open) setSelectedAgentId(null);
        }}
      />
    </Stack>
  );

  const tabs = [
    { key: "all", label: `All (${agents.length})`, children: tableRender },
    { key: "active", label: `Active (${agents.filter((agent) => agent.is_active).length})`, children: tableRender },
    { key: "paused", label: `Paused (${agents.filter((agent) => !agent.is_active).length})`, children: tableRender },
    { key: "error", label: `Needs Attention (${agents.filter((agent) => agent.last_run_status === "error").length})`, children: tableRender },
  ];

  return <AreaTabs activeKey={tab} onChange={(key) => setFilter("tab", key)} items={tabs} />;
}

export function AgentsPage() {
  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  const seedMutation = useMutation({
    mutationFn: () => agentsApi.seed(),
    onSuccess: async () => {
      await refetch();
      toast.success("Default agents seeded");
    },
    onError: () => toast.error("Failed to seed agents"),
  });

  return (
    <PageContainer>
      <PageContent>
        <SpinGlobal />
        <PageHeader
          title="Agents"
          subtitle="A compact control room for autonomous workflows across your life OS."
          icon={<Bot />}
          eyebrow="Automation"
        />

        {isError ? (
          <ErrorState title="Could not load agents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <Stack>
            {Array.from({ length: 6 }).map((_, index) => (
              <AgentSkeleton key={index} />
            ))}
          </Stack>
        ) : agents?.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No agents yet"
            description="Seed the default roster, then refine with filters as your setup grows."
            action={
              <Button variant="secondary" size="sm" onClick={() => seedMutation.mutate()}>
                {seedMutation.isPending ? "Seeding..." : "Seed Agents"}
              </Button>
            }
          />
        ) : (
          <AgentsContent agents={agents ?? []} />
        )}
      </PageContent>
    </PageContainer>
  );
}
