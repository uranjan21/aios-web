import { focusRing } from '@ledgr/ui'
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Switch, Tooltip } from "@ledgr/ui";
import { Activity, Calendar, CheckCircle, Clock3, Info, Play, RefreshCw, TerminalSquare, XCircle } from "lucide-react";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { agentsApi } from "@aios/shared/api/agents";
import { formatRelativeTime } from "@aios/shared/lib/utils";
import type { Agent } from "@aios/shared/types";
import { formatScheduleLabel } from "../lib/cron";
import { getAgentLongDescription } from "../constants/domains";
import {
  fadeIn,
  RowDivider,
  StatusBadge,
  Cell,
  MobileLabel,
  Value,
  SubValue,
} from "./agents.styles";
import { NextRunCountdown } from "./NextRunCountdown";

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

  ${focusRing}

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 2fr) 95px 140px 110px 110px 110px;
    gap: 12px;
    align-items: center;
  }
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

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;

  @media (min-width: 980px) {
    justify-content: flex-end;
  }
`;

export function AgentRow({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
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
              <Tooltip content={<div style={{ whiteSpace: "pre-wrap", maxWidth: 280, fontSize: 12, lineHeight: 1.5 }}>{getAgentLongDescription(agent.task_id, agent.description || "")}</div>}>
                <div style={{ color: theme.color.mutedForeground, display: "flex", cursor: "help" }}>
                  <Info size={14} />
                </div>
              </Tooltip>
            </AgentTop>
            <AgentSummary>{agent.description || "Scheduled automation agent."}</AgentSummary>
          </AgentText>
        </AgentCell>

        <Cell $alignRight>
          <MobileLabel>
            <Activity size={12} />
            Status
          </MobileLabel>
          <div style={{ display: "flex", alignItems: "center" }}>
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
