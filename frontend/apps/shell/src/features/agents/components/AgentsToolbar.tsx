import { Search, LayoutGrid, List } from "lucide-react";
import { AreaToolbar, Input, Select, SegmentedControl } from "@ledgr/ui";
import styled from "styled-components";
import { useAgentFilters } from "../hooks/useAgentFilters";
import { DOMAIN_OPTIONS } from "../constants/domains";

const FiltersRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  flex-wrap: wrap;
`;

export function AgentsFilters() {
  const { search, domain, schedule, status, view, setFilter } = useAgentFilters();

  return (
    <FiltersRow>
      <div style={{ width: 180 }}>
        <Input
          size="sm"
          placeholder="Search..."
          value={search}
          onChange={(e) => setFilter("search", e.target.value)}
          startAdornment={<Search size={14} />}
        />
      </div>

      <Select
        size="sm"
        fullWidth={false}
        value={domain}
        onChange={(val) => setFilter("domain", val as string)}
        options={DOMAIN_OPTIONS.map(d => ({ label: `${d} Domain`, value: d === "All" ? "all" : d }))}
      />

      <Select
        size="sm"
        fullWidth={false}
        value={schedule}
        onChange={(val) => setFilter("schedule", val as string)}
        options={[
          { label: "All Schedules", value: "all" },
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
          { label: "Manual", value: "manual" },
        ]}
      />

      <Select
        size="sm"
        fullWidth={false}
        value={status}
        onChange={(val) => setFilter("status", val as string)}
        options={[
          { label: "All Statuses", value: "all" },
          { label: "Success", value: "success" },
          { label: "Error", value: "error" },
          { label: "Running", value: "running" },
          { label: "Idle", value: "idle" },
        ]}
      />

      <SegmentedControl
        size="sm"
        aria-label="View"
        value={view}
        onChange={(val) => setFilter("view", val)}
        options={[
          { value: "list", label: <List size={14} /> },
          { value: "grid", label: <LayoutGrid size={14} /> },
        ]}
      />
    </FiltersRow>
  );
}

export function AgentsToolbar() {
  return (
    <AreaToolbar divider={false}>
      <AgentsFilters />
    </AreaToolbar>
  );
}
