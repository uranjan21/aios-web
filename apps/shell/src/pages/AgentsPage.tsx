import { agentsApi } from "@aios/shared/api/agents";
import { EmptyState, ErrorState, Button, PageHeader } from "@ledgr/ui";
import { PageContainer, PageContent } from "@aios/shared/components/layout/PageLayout";
import { PageDivider } from "@aios/shared/components/layout/PageDivider";
import { AreaTabs } from "@aios/shared/components/ui/AreaTabs";
import { AgentsToolbar, AgentsFilters } from "@/features/agents/components/AgentsToolbar";
import { AgentRow } from "@/features/agents/components/AgentRow";
import { AgentCard } from "@/features/agents/components/AgentCard";
import { AgentDetailDialog } from "@/features/agents/components/AgentDetailDialog";
import {
  SpinGlobal,
  AgentSkeleton,
  Stack,
  RosterCard,
  } from "@/features/agents/components/agents.styles";

import { getAgentDomain } from "@/features/agents/constants/domains";
import { useAgentFilters } from "@/features/agents/hooks/useAgentFilters";
import { getNextCronRun, getScheduleSortValue } from "@/features/agents/lib/cron";
import type { Agent } from "@aios/shared/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Calendar,
  Clock3,
  Filter,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import styled from "styled-components";

const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const TableShell = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
`;

const TableHeader = styled.div`
  display: none;

  @media ${({ theme }) => theme.media.lg} {
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

  @media ${({ theme }) => theme.media.lg} {
    ${({ $alignRight }) => $alignRight && `
      justify-content: flex-end;
    `}
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

const EmptyWrap = styled.div`
  padding: 32px;
`;

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

  const selectedAgent =
    processedAgents.find((agent) => agent.id === selectedAgentId) ??
    agents.find((agent) => agent.id === selectedAgentId) ??
    null;

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
        <PageDivider />

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
