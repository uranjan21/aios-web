import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Switch, Tooltip } from "@ledgr/ui";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { agentsApi } from "@ct/shared/api/agents";
import { DigitalCronInput } from "@ct/shared/components/ui/DigitalCronInput";
import { formatRelativeTime } from "@ct/shared/lib/utils";
import type { Agent } from "@ct/shared/types";
import { formatScheduleLabel } from "../lib/cron";
import { Stack, SubValue } from "./agents.styles";
import { NextRunCountdown } from "./NextRunCountdown";

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[5]}`};

  @media ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1.5fr);
  }
`;

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 2%, ${({ theme }) => theme.color.card});
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[4.5]} ${theme.spacing[3]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const PanelTitle = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.color.foreground};
`;

const PanelBody = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4.5]}`};
`;

const OutputBody = styled.div`
  color: ${({ theme }) => theme.color.foreground};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.65;

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.color.foreground};
    margin-top: 0;
  }

  p, ul, ol, pre, blockquote {
    margin: ${({ theme }) => `0 0 ${theme.spacing[3]}`};
  }

  code {
    background: ${({ theme }) => theme.color.muted};
    padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  pre {
    overflow-x: auto;
    padding: ${({ theme }) => `${theme.spacing[3]}`};
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
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3.5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const MetaList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[3]}`};
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
`;

const MetaKey = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const MetaText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const DialogActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => `${theme.spacing[4.5]}`};
`;

const SectionDivider = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  margin: ${({ theme }) => `${theme.spacing[4]} 0`};
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
              <PanelTitle>Controls</PanelTitle>
            </PanelHeader>
            <PanelBody>
              <MetaList>
                <MetaItem>
                  <MetaKey>Status</MetaKey>
                  <MetaText>{status}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Last Run</MetaKey>
                  <MetaText>{agent.last_run_at ? formatRelativeTime(agent.last_run_at) : "Never"}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Cadence</MetaKey>
                  <MetaText>{schedule.title}</MetaText>
                </MetaItem>
                <MetaItem>
                  <MetaKey>Next Run</MetaKey>
                  <MetaText>
                    <NextRunCountdown cron={agent.cron_expression} isActive={agent.is_active} />
                  </MetaText>
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

              {agent.cron_expression && agent.cron_expression !== "Manual" && (
                <>
                  <SectionDivider />
                  <MetaKey style={{ display: "block", marginBottom: 8 }}>Schedule</MetaKey>
                  <DigitalCronInput
                    value={agent.cron_expression}
                    onChange={(newCron) => cronMutation.mutate(newCron)}
                  />
                </>
              )}
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
