import { useSearchParams } from "react-router-dom";

export type AgentTab = "all" | "active" | "paused" | "error";

export function useAgentFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get("tab") as AgentTab) || "all";
  const search = searchParams.get("search") || "";
  const domain = searchParams.get("domain") || "all";
  const schedule = searchParams.get("schedule") || "all";
  const status = searchParams.get("status") || "all";
  const sort = searchParams.get("sort") || "name";

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (value === "all" || value === "") {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return {
    tab,
    search,
    domain,
    schedule,
    status,
    sort,
    setFilter,
    clearFilters,
  };
}
