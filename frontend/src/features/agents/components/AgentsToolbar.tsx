import { Input } from "@ledgr/ui";
import { AreaToolbar, ToolbarTitle } from "@/components/ui/AreaToolbar";
import { Search, Filter, PlayCircle, Clock, AlertCircle } from "lucide-react";
import { useAgentFilters } from "../hooks/useAgentFilters";
import styled from "styled-components";
import { DOMAIN_OPTIONS } from "../constants/domains";

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterSelect = styled.select`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 13px;
  padding: 6px 30px 6px 12px;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px top 50%;
  background-size: 10px auto;
  
  &:hover {
    border-color: ${({ theme }) => theme.color.ring};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  width: 200px;
  
  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-foreground);
  }
  
  input {
    width: 100%;
    padding: 6px 12px 6px 32px;
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 6px;
    color: ${({ theme }) => theme.color.foreground};
    font-size: 13px;
    
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
    }
  }
`;

export function AgentsToolbar() {
  const { search, domain, schedule, status, setFilter } = useAgentFilters();

  return (
    <AreaToolbar>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <SearchContainer>
          <Search size={14} />
          <input 
            placeholder="Search agents..." 
            value={search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </SearchContainer>
        
        <FilterGroup>
          <FilterSelect value={domain} onChange={(e) => setFilter("domain", e.target.value)}>
            {DOMAIN_OPTIONS.map(d => (
              <option key={d} value={d === "All" ? "all" : d}>{d} Domain</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterSelect value={schedule} onChange={(e) => setFilter("schedule", e.target.value)}>
            <option value="all">All Schedules</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual</option>
          </FilterSelect>
        </FilterGroup>
        
        <FilterGroup>
          <FilterSelect value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
          </FilterSelect>
        </FilterGroup>
      </div>
    </AreaToolbar>
  );
}
