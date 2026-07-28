import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Switch, Tooltip } from "@ledgr/ui";
import { Calendar, CheckCircle, Play, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { agentsApi } from "@ct/shared/api/agents";
import type { Agent } from "@ct/shared/types";
import { formatScheduleLabel } from "../lib/cron";
import { RowDivider, StatusBadge, Cell, MobileLabel, Value, SubValue } from "./agents.styles";
import { NextRunCountdown } from "./NextRunCountdown";

export function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => agentsApi.patch(agent.task_id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
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
