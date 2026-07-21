import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Switch, Tooltip, Select } from "@ledgr/ui";
import { Play, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { agentsApi } from "@aios/shared/api/agents";
import { DigitalCronInput } from "@aios/shared/components/ui/DigitalCronInput";
import { formatRelativeTime } from "@aios/shared/lib/utils";
import type { Agent } from "@aios/shared/types";
import { formatScheduleLabel } from "../lib/cron";
import { getAgentDomain } from "../constants/domains";
import { Stack, SubValue } from "./agents.styles";
import { NextRunCountdown } from "./NextRunCountdown";

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media ${({ theme }) => theme.media.lg} {
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
  color: ${({ theme }) => theme.color.foreground};
  font-size: 13px;
  line-height: 1.65;

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.color.foreground};
    margin-top: 0;
  }

  p, ul, ol, pre, blockquote {
    margin: 0 0 12px;
  }

  code {
    background: ${({ theme }) => theme.color.muted};
    padding: 2px 6px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  pre {
    overflow-x: auto;
    padding: 12px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.color.muted};
  }
`;

const OutputShell = styled.div`
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.background};
`;

const OutputHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

export function AgentDetailDialog({
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

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent!.task_id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`${agent?.name} triggered`);
    },
    onError: () => toast.error(`Failed to trigger ${agent?.name}`),
  });

  const [provider, setProvider] = useState(agent?.llm_provider || "system");
  const [openaiModel, setOpenaiModel] = useState(agent?.openai_chat_model || "");
  const [claudeModel, setClaudeModel] = useState(agent?.claude_model || "");

  useEffect(() => {
    if (agent) {
      setProvider(agent.llm_provider || "system");
      setOpenaiModel(agent.openai_chat_model || "");
      setClaudeModel(agent.claude_model || "");
    }
  }, [agent]);

  const isConfigDirty =
    provider !== (agent?.llm_provider || "system") ||
    openaiModel !== (agent?.openai_chat_model || "") ||
    claudeModel !== (agent?.claude_model || "");

  const saveConfig = () => {
    configMutation.mutate({
      llm_provider: provider,
      openai_chat_model: openaiModel || undefined,
      claude_model: claudeModel || undefined,
    });
  };

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
            <PanelBody style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <MetaKey style={{ display: "block", marginBottom: "4px" }}>LLM Provider</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: "System Default", value: "system" },
                    { label: "OpenAI", value: "openai" },
                    { label: "Anthropic Claude", value: "anthropic" },
                  ]}
                  value={provider}
                  onChange={(val) => setProvider(val as string)}
                />
              </div>

              <div>
                <MetaKey style={{ display: "block", marginBottom: "4px" }}>OpenAI Chat Model</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: "System Default", value: "" },
                    { label: "GPT-4o", value: "gpt-4o" },
                    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
                    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
                    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
                  ]}
                  value={openaiModel}
                  onChange={(val) => setOpenaiModel(val as string)}
                />
              </div>

              <div>
                <MetaKey style={{ display: "block", marginBottom: "4px" }}>Claude Model</MetaKey>
                <Select
                  size="sm"
                  fullWidth
                  options={[
                    { label: "System Default", value: "" },
                    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20240620" },
                    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
                    { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
                    { label: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
                    { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
                  ]}
                  value={claudeModel}
                  onChange={(val) => setClaudeModel(val as string)}
                />
              </div>

              <div style={{ marginTop: "4px" }}>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!isConfigDirty || configMutation.isPending}
                  onClick={saveConfig}
                >
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
                <span>{agent.name} last run</span>
              </OutputHeader>
              <div style={{ padding: 18 }}>
                {agent.last_output_text ? (
                  <OutputBody>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{agent.last_output_text}</ReactMarkdown>
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
